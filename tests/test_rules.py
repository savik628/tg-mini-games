import asyncio
import os
import unittest
from datetime import datetime, timezone

from tg_mini_apps.server.db import get_db, init_db
from tg_mini_apps.server.auth import create_session_token, verify_session_token, create_offline_token, verify_offline_token
from tg_mini_apps.server.engine import (
    get_user_minutes_summary,
    start_game_session,
    process_heartbeat,
    end_game_session,
    DAILY_FREE_SECONDS,
    DAILY_CAP_SECONDS
)

class TestPlatformRules(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        await init_db()
        self.db = await get_db()
        self.test_user_id = 999111222

        # Очистим тестового пользователя если был
        await self.db.execute("DELETE FROM users WHERE tg_id = ?", (self.test_user_id,))
        await self.db.execute("INSERT INTO users (tg_id, username, first_name, status) VALUES (?, 'tester', 'Test User', 'Free')", (self.test_user_id,))
        await self.db.commit()

    async def asyncTearDown(self):
        await self.db.execute("DELETE FROM users WHERE tg_id = ?", (self.test_user_id,))
        await self.db.commit()
        await self.db.close()

    async def test_free_daily_limit_10_minutes(self):
        """Пункт 4.2: Бесплатный лимит — 10 минут в день на все игры вместе"""
        summary = await get_user_minutes_summary(self.db, self.test_user_id)
        self.assertFalse(summary["is_plus"])
        self.assertEqual(summary["remaining_seconds"], DAILY_FREE_SECONDS)
        self.assertEqual(summary["remaining_minutes"], 10.0)

    async def test_heartbeat_consumption_and_cutoff(self):
        """Пункт 4.8: Списание времени heartbeat раз в 30 секунд"""
        ok, session_id, _ = await start_game_session(self.db, self.test_user_id, "matrix_grid")
        self.assertTrue(ok)

        # 1 heartbeat
        hb_ok, msg, data = await process_heartbeat(self.db, session_id, self.test_user_id)
        self.assertTrue(hb_ok)
        self.assertEqual(data["remaining_seconds"], DAILY_FREE_SECONDS - 30)

        await end_game_session(self.db, session_id, self.test_user_id)

    async def test_plus_app_locked_for_free_user(self):
        """Пункт 2.6: У заблокированной игры (plus_only) старт сессии возвращает запрет"""
        ok, msg, extra = await start_game_session(self.db, self.test_user_id, "cyber_dodge")
        self.assertFalse(ok)
        self.assertTrue(extra.get("require_paywall"))

    async def test_offline_token_protection(self):
        """Пункт 8.1-8.3: Офлайн-токен выдается и валидируется сервером"""
        device_id = "test_dev_1"
        token = create_offline_token(self.test_user_id, device_id, validity_hours=24)
        parsed = verify_offline_token(token)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["user_id"], self.test_user_id)
        self.assertTrue(parsed["offline_allowed"])

if __name__ == "__main__":
    unittest.main()
