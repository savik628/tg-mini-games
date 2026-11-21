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
    update_user_streak,
    DAILY_FREE_SECONDS,
    DAILY_CAP_SECONDS
)

class TestPlatformRulesV11(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        await init_db()
        self.db = await get_db()
        self.test_user_id = 888777666

        await self.db.execute("DELETE FROM users WHERE tg_id = ?", (self.test_user_id,))
        await self.db.execute("""
        INSERT INTO users (tg_id, username, first_name, status, streak_days) 
        VALUES (?, 'tester_v11', 'Test V11', 'Free', 3)
        """, (self.test_user_id,))
        await self.db.commit()

    async def asyncTearDown(self):
        await self.db.execute("DELETE FROM users WHERE tg_id = ?", (self.test_user_id,))
        await self.db.commit()
        await self.db.close()

    async def test_streak_bonus_calculation(self):
        """Пункт 4.4 RULES v1.1: Стрик 3 дня дает +2 бонусные минуты"""
        summary = await get_user_minutes_summary(self.db, self.test_user_id)
        self.assertEqual(summary["streak_days"], 3)
        # 10 мин free + 2 мин streak = 12 минут (720 сек)
        self.assertEqual(summary["breakdown"]["streak_minutes"], 2)
        self.assertEqual(summary["remaining_minutes"], 12.0)

    async def test_heartbeat_consumption_and_cutoff(self):
        """Пункт 4.8: Списание времени heartbeat раз в 30 секунд"""
        ok, session_id, _ = await start_game_session(self.db, self.test_user_id, "matrix_grid")
        self.assertTrue(ok)

        hb_ok, msg, data = await process_heartbeat(self.db, session_id, self.test_user_id)
        self.assertTrue(hb_ok)
        self.assertEqual(data["spent_seconds_today"], 30)

        await end_game_session(self.db, session_id, self.test_user_id)

    async def test_plus_app_locked_for_free_user(self):
        """Пункт 2.6: У заблокированной игры (plus_only) старт сессии возвращает paywall"""
        ok, msg, extra = await start_game_session(self.db, self.test_user_id, "cyber_dodge")
        self.assertFalse(ok)
        self.assertTrue(extra.get("require_paywall"))

    async def test_offline_token_protection(self):
        """Пункт 8.1-8.3: Офлайн-токен выдается и валидируется сервером"""
        device_id = "test_dev_v11"
        token = create_offline_token(self.test_user_id, device_id, validity_hours=48)
        parsed = verify_offline_token(token)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["user_id"], self.test_user_id)
        self.assertTrue(parsed["offline_allowed"])

if __name__ == "__main__":
    unittest.main()
