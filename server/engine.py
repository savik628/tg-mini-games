from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple
import aiosqlite
import uuid

# Раздел 4 RULES.md v1.1:
# 4.2. Бесплатный лимит — 10 минут в день на все игры вместе.
# 4.4. Daily Streak: +1 мин за каждый день непрерывного захода (макс +5 мин/день).
# 4.5. Максимальный дневной потолок с бонусами: не более 60 минут.
DAILY_FREE_SECONDS = 10 * 60       # 600 сек (10 мин)
DAILY_CAP_SECONDS = 60 * 60        # 3600 сек (60 мин)
HEARTBEAT_INTERVAL_SEC = 30        # п. 4.8: heartbeat раз в 30 секунд

def get_utc_date_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_yesterday_utc_date_str() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

def get_seconds_until_utc_midnight() -> int:
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())

async def update_user_streak(db: aiosqlite.Connection, user_id: int) -> int:
    """Обновляет стрик ежедневных посещений пользователя (Daily Streak)"""
    today = get_utc_date_str()
    yesterday = get_yesterday_utc_date_str()
    
    cursor = await db.execute("SELECT streak_days, last_visit_date FROM users WHERE tg_id = ?", (user_id,))
    row = await cursor.fetchone()
    if not row:
        return 1

    last_date = row["last_visit_date"]
    current_streak = row["streak_days"] or 1

    if last_date == today:
        return current_streak
    elif last_date == yesterday:
        new_streak = current_streak + 1
    else:
        new_streak = 1

    await db.execute("UPDATE users SET streak_days = ?, last_visit_date = ? WHERE tg_id = ?", (new_streak, today, user_id))
    await db.commit()
    return new_streak

async def get_or_create_daily_usage(db: aiosqlite.Connection, user_id: int, date_str: str) -> Dict[str, Any]:
    cursor = await db.execute("SELECT * FROM daily_usage WHERE user_id = ? AND date = ?", (user_id, date_str))
    row = await cursor.fetchone()
    if row:
        return dict(row)
    
    await db.execute("""
    INSERT INTO daily_usage (user_id, date, free_sec, referral_sec, ad_sec, streak_sec, pack_sec, total_sec)
    VALUES (?, ?, 0, 0, 0, 0, 0, 0)
    """, (user_id, date_str))
    await db.commit()
    return {
        "user_id": user_id,
        "date": date_str,
        "free_sec": 0,
        "referral_sec": 0,
        "ad_sec": 0,
        "streak_sec": 0,
        "pack_sec": 0,
        "total_sec": 0
    }

async def calculate_user_entitlements(db: aiosqlite.Connection, user_id: int) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = await db.execute("""
    SELECT * FROM entitlements 
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
    """, (user_id, now_iso))
    rows = await cursor.fetchall()
    
    is_plus = False
    is_admin = False
    special_role = None
    pack_seconds_available = 0

    for r in rows:
        etype = r["type"]
        if etype in ("plus", "admin"):
            is_plus = True
            if etype == "admin":
                is_admin = True
        elif etype in ("tester", "partner", "support"):
            is_plus = True
            special_role = etype
        elif etype == "time_pack":
            pack_seconds_available += (r["minutes"] * 60)

    u_cursor = await db.execute("SELECT status FROM users WHERE tg_id = ?", (user_id,))
    u_row = await u_cursor.fetchone()
    if u_row and u_row["status"] in ("Plus", "Admin", "Partner", "Tester"):
        is_plus = True
        if u_row["status"] == "Admin":
            is_admin = True

    return {
        "is_plus": is_plus,
        "is_admin": is_admin,
        "special_role": special_role,
        "pack_seconds_available": pack_seconds_available
    }

async def get_user_minutes_summary(db: aiosqlite.Connection, user_id: int) -> Dict[str, Any]:
    today = get_utc_date_str()
    usage = await get_or_create_daily_usage(db, user_id, today)
    entitlements = await calculate_user_entitlements(db, user_id)
    
    is_plus = entitlements["is_plus"]
    
    # 1. Серия заходов (Daily Streak: +1 мин за день со 2-го дня, макс +5 мин = 300 сек)
    u_cursor = await db.execute("SELECT streak_days FROM users WHERE tg_id = ?", (user_id,))
    u_row = await u_cursor.fetchone()
    streak_days = u_row["streak_days"] if u_row and u_row["streak_days"] else 1
    streak_bonus_sec = min(max(0, streak_days - 1) * 60, 5 * 60)

    # 2. Реферальные секунды (+15 мин за друга, макс 30 мин/день)
    ref_cursor = await db.execute("""
    SELECT COUNT(*) as cnt FROM referrals 
    WHERE inviter_id = ? AND status = 'verified' AND reward_granted_at >= ?
    """, (user_id, f"{today} 00:00:00"))
    ref_row = await ref_cursor.fetchone()
    referral_bonus_sec = min((ref_row["cnt"] if ref_row else 0) * 15 * 60, 30 * 60)

    # 3. Рекламные секунды (макс 10 мин/день)
    ad_bonus_sec = usage.get("ad_sec", 0)

    # 4. Пакетные секунды
    pack_available = entitlements["pack_seconds_available"]

    # Итоговый лимит с потолком 60 мин (3600 сек)
    if is_plus:
        remaining_sec = 999999
    else:
        total_allowance_sec = min(DAILY_FREE_SECONDS + streak_bonus_sec + referral_bonus_sec + ad_bonus_sec + pack_available, DAILY_CAP_SECONDS)
        spent_sec = usage["total_sec"]
        remaining_sec = max(0, total_allowance_sec - spent_sec)

    return {
        "is_plus": is_plus,
        "remaining_minutes": round(remaining_sec / 60, 1) if not is_plus else "Unlimited",
        "remaining_seconds": remaining_sec,
        "spent_seconds_today": usage["total_sec"],
        "streak_days": streak_days,
        "breakdown": {
            "free_minutes": round(DAILY_FREE_SECONDS / 60),
            "streak_minutes": round(streak_bonus_sec / 60),
            "referral_minutes": round(referral_bonus_sec / 60),
            "ad_minutes": round(ad_bonus_sec / 60),
            "pack_minutes": round(pack_available / 60),
            "daily_cap_minutes": round(DAILY_CAP_SECONDS / 60)
        },
        "seconds_to_reset": get_seconds_until_utc_midnight(),
        "reset_utc": "00:00 UTC"
    }

async def start_game_session(db: aiosqlite.Connection, user_id: int, app_id: str) -> Tuple[bool, str, Dict[str, Any]]:
    app_cursor = await db.execute("SELECT * FROM apps WHERE app_id = ?", (app_id,))
    app = await app_cursor.fetchone()
    if not app:
        return False, "Приложение не найдено", {}

    summary = await get_user_minutes_summary(db, user_id)
    
    if app["status"] == "plus_only" and not summary["is_plus"]:
        return False, "Игра доступна только по подписке Plus", {"require_paywall": True}

    if not summary["is_plus"] and summary["remaining_seconds"] <= 0:
        return False, "Дневной лимит минут исчерпан", {"require_paywall": True, "limit_exceeded": True}

    session_id = str(uuid.uuid4())
    await db.execute("""
    INSERT INTO sessions (session_id, user_id, app_id, started_at, last_heartbeat, charged_sec, status)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 'active')
    """, (session_id, user_id, app_id))
    await db.commit()

    return True, session_id, summary

async def process_heartbeat(db: aiosqlite.Connection, session_id: str, user_id: int) -> Tuple[bool, str, Dict[str, Any]]:
    cursor = await db.execute("SELECT * FROM sessions WHERE session_id = ? AND user_id = ? AND status = 'active'", (session_id, user_id))
    session = await cursor.fetchone()
    if not session:
        return False, "Активная сессия не найдена", {}

    summary = await get_user_minutes_summary(db, user_id)

    if not summary["is_plus"]:
        if summary["remaining_seconds"] < HEARTBEAT_INTERVAL_SEC:
            await db.execute("UPDATE sessions SET status = 'ended' WHERE session_id = ?", (session_id,))
            await db.commit()
            return False, "Время вышло! Оформите Plus или пригласите друзей.", {"time_up": True}

        today = get_utc_date_str()
        await db.execute("""
        UPDATE daily_usage 
        SET total_sec = total_sec + ?,
            free_sec = free_sec + ?
        WHERE user_id = ? AND date = ?
        """, (HEARTBEAT_INTERVAL_SEC, HEARTBEAT_INTERVAL_SEC, user_id, today))

    await db.execute("""
    UPDATE sessions 
    SET last_heartbeat = CURRENT_TIMESTAMP,
        charged_sec = charged_sec + ?
    WHERE session_id = ?
    """, (HEARTBEAT_INTERVAL_SEC, session_id))

    await db.commit()
    updated_summary = await get_user_minutes_summary(db, user_id)
    return True, "Heartbeat принят", updated_summary

async def end_game_session(db: aiosqlite.Connection, session_id: str, user_id: int):
    await db.execute("UPDATE sessions SET status = 'ended' WHERE session_id = ? AND user_id = ?", (session_id, user_id))
    await db.commit()
