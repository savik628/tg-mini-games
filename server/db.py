import aiosqlite
import os
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).resolve().parent.parent / "platform.db"

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        
        # 1. users (с поддержкой streak_days и last_visit_date)
        await db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            tg_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            status TEXT DEFAULT 'Free',
            risk_score REAL DEFAULT 0.0,
            streak_days INTEGER DEFAULT 1,
            last_visit_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 2. devices
        await db.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            ip_hash TEXT,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 3. daily_usage (с поддержкой streak_sec)
        await db.execute("""
        CREATE TABLE IF NOT EXISTS daily_usage (
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            free_sec INTEGER DEFAULT 0,
            referral_sec INTEGER DEFAULT 0,
            ad_sec INTEGER DEFAULT 0,
            streak_sec INTEGER DEFAULT 0,
            pack_sec INTEGER DEFAULT 0,
            total_sec INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 4. sessions
        await db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            app_id TEXT NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            charged_sec INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 5. referrals
        await db.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inviter_id INTEGER NOT NULL,
            invitee_id INTEGER UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            verified_at TIMESTAMP,
            reward_granted_at TIMESTAMP,
            risk_flags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inviter_id) REFERENCES users(tg_id) ON DELETE CASCADE,
            FOREIGN KEY (invitee_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 6. entitlements
        await db.execute("""
        CREATE TABLE IF NOT EXISTS entitlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            expires_at TIMESTAMP,
            minutes INTEGER DEFAULT 0,
            source TEXT,
            granted_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 7. payments
        await db.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            charge_id TEXT UNIQUE NOT NULL,
            stars INTEGER NOT NULL,
            status TEXT NOT NULL,
            product TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(tg_id) ON DELETE CASCADE
        )
        """)

        # 8. audit_log
        await db.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_id TEXT NOT NULL,
            target_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 9. apps
        await db.execute("""
        CREATE TABLE IF NOT EXISTS apps (
            app_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            icon TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            badge TEXT,
            sort_order INTEGER DEFAULT 0
        )
        """)

        initial_apps = [
            ("matrix_grid", "Сетка памяти", "🧩", "Запоминайте узор плиток", "active", "NEW", 1),
            ("stroop_focus", "Цвет и слово", "🎨", "Тест когнитивного внимания", "active", None, 2),
            ("reaction_tap", "Перехватчик", "⚡️", "Моторная реакция на скорость", "active", None, 3),
            ("cyber_dodge", "Кибер-уворот", "🚀", "Только для подписчиков Plus", "plus_only", "PLUS", 4),
        ]

        await db.executemany("""
        INSERT OR IGNORE INTO apps (app_id, title, icon, description, status, badge, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, initial_apps)

        # Миграции
        try:
            await db.execute("ALTER TABLE users ADD COLUMN streak_days INTEGER DEFAULT 1")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN last_visit_date TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE daily_usage ADD COLUMN streak_sec INTEGER DEFAULT 0")
        except Exception:
            pass

        await db.commit()
    print(" База данных SQLite v1.1 обновлена (таблицы и миграции успешны)")

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
