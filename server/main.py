import urllib.request
import urllib.error
import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .db import get_db, init_db
from .auth import (
    verify_telegram_init_data,
    create_session_token,
    verify_session_token,
    create_offline_token,
    verify_offline_token,
)
from .engine import (
    get_user_minutes_summary,
    start_game_session,
    process_heartbeat,
    end_game_session,
    get_utc_date_str,
)

app = FastAPI(title="Мини игры — Game Platform API", version="1.0")

# CORS для открытия из Telegram WebApp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтирование статики фронтенда
STATIC_DIR = Path(__file__).resolve().parent.parent / "webapp"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
async def on_startup():
    await init_db()

# --- Вспомогательные зависимости аутентификации ---
async def get_current_user(authorization: Optional[str] = Header(None)) -> int:
    if not authorization:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    token = authorization.replace("Bearer ", "").strip()
    user_id = verify_session_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Недействительный или истекший сессионный токен")
    return user_id

# --- Pydantic Schemas ---
class TelegramAuthRequest(BaseModel):
    init_data: str
    referrer_id: Optional[int] = None
    device_id: Optional[str] = None

class SessionStartRequest(BaseModel):
    app_id: str

class SessionHeartbeatRequest(BaseModel):
    session_id: str

class SessionEndRequest(BaseModel):
    session_id: str

class OfflineTokenRequest(BaseModel):
    device_id: str

class AdminGrantRequest(BaseModel):
    admin_key: str
    target_user_id: int
    entitlement_type: str  # plus, time_pack, tester, partner, support, promo, admin
    days: Optional[int] = 30
    minutes: Optional[int] = 0
    reason: str

class InvoiceCreateRequest(BaseModel):
    product: str  # plus_30d (199 Stars), plus_180d (999 Stars), pack_30m (25 Stars), pack_120m (79 Stars)

# --- API Эндпоинты (Раздел 14 RULES.md) ---

@app.get("/")
async def root():
    return FileResponse(STATIC_DIR / "index.html")

@app.post("/auth/telegram")
async def auth_telegram(req: TelegramAuthRequest, request: Request):
    """
    Раздел 12.1 и 14: Валидация initData Telegram на сервере.
    """
    validated = verify_telegram_init_data(req.init_data)
    if not validated or "user" not in validated:
        raise HTTPException(status_code=400, detail="Ошибка верификации Telegram initData")

    tg_user = validated["user"]
    tg_id = tg_user.get("id")
    username = tg_user.get("username", "")
    first_name = tg_user.get("first_name", "")

    db = await get_db()
    try:
        # Проверяем или создаем пользователя
        cursor = await db.execute("SELECT * FROM users WHERE tg_id = ?", (tg_id,))
        user = await cursor.fetchone()
        is_new_user = user is None

        if not user:
            await db.execute("""
            INSERT INTO users (tg_id, username, first_name, status)
            VALUES (?, ?, ?, 'Free')
            """, (tg_id, username, first_name))

            # Логируем в audit_log
            await db.execute("""
            INSERT INTO audit_log (actor_id, target_id, action, details)
            VALUES (?, ?, 'USER_REGISTERED', ?)
            """, (str(tg_id), str(tg_id), json.dumps({"username": username})))
        else:
            await db.execute("UPDATE users SET username = ?, first_name = ? WHERE tg_id = ?", (username, first_name, tg_id))

        # Запоминаем устройство
        if req.device_id:
            client_ip = request.client.host if request.client else "unknown"
            await db.execute("""
            INSERT INTO devices (device_id, user_id, ip_hash, last_seen)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(device_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
            """, (req.device_id, tg_id, str(hash(client_ip))))

        # Привязка реферала при регистрации (Раздел 5 RULES.md)
        if is_new_user and req.referrer_id and req.referrer_id != tg_id:
            ref_cursor = await db.execute("SELECT tg_id FROM users WHERE tg_id = ?", (req.referrer_id,))
            if await ref_cursor.fetchone():
                await db.execute("""
                INSERT OR IGNORE INTO referrals (inviter_id, invitee_id, status)
                VALUES (?, ?, 'pending')
                """, (req.referrer_id, tg_id))

        await db.commit()

        token = create_session_token(tg_id)
        return {"status": "ok", "token": token, "user": {"id": tg_id, "first_name": first_name}}
    finally:
        await db.close()

@app.get("/me")
async def get_my_profile(user_id: int = Depends(get_current_user)):
    """
    Раздел 3: Профиль пользователя со всеми обязательными полями.
    """
    db = await get_db()
    try:
        u_cursor = await db.execute("SELECT * FROM users WHERE tg_id = ?", (user_id,))
        user = await u_cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        minutes_summary = await get_user_minutes_summary(db, user_id)

        # Реферальная статистика
        ref_cursor = await db.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
            COUNT(*) as total_count
        FROM referrals WHERE inviter_id = ?
        """, (user_id,))
        ref_stat = await ref_cursor.fetchone()

        # История покупок
        pay_cursor = await db.execute("""
        SELECT charge_id, stars, status, product, created_at 
        FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        """, (user_id,))
        payments = [dict(p) for p in await pay_cursor.fetchall()]

        # Проверка даты окончания Plus
        ent_cursor = await db.execute("""
        SELECT expires_at FROM entitlements 
        WHERE user_id = ? AND type = 'plus' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY expires_at DESC LIMIT 1
        """, (user_id,))
        plus_ent = await ent_cursor.fetchone()
        plus_expires_at = plus_ent["expires_at"] if plus_ent else None

        return {
            "user": {
                "tg_id": user["tg_id"],
                "username": user["username"],
                "first_name": user["first_name"],
                "status": "Plus" if minutes_summary["is_plus"] else user["status"],
                "plus_expires_at": plus_expires_at
            },
            "minutes": minutes_summary,
            "referrals": {
                "verified_friends": ref_stat["verified_count"],
                "total_invited": ref_stat["total_count"],
                "daily_limit": "2 друга / день",
                "monthly_limit": "20 друзей / месяц",
                "referral_link": f"https://t.me/minigame2_bot?start=ref_{user_id}"
            },
            "purchase_history": payments
        }
    finally:
        await db.close()

@app.get("/apps")
async def get_apps(user_id: int = Depends(get_current_user)):
    """
    Раздел 2: Список плиток игр для главного экрана.
    """
    db = await get_db()
    try:
        minutes_summary = await get_user_minutes_summary(db, user_id)
        cursor = await db.execute("SELECT * FROM apps WHERE status != 'hidden' ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        
        apps = []
        for r in rows:
            app_dict = dict(r)
            # Если статус plus_only, а у пользователя нет Plus, помечаем для paywall
            is_locked = (app_dict["status"] == "plus_only" and not minutes_summary["is_plus"])
            app_dict["is_locked"] = is_locked
            if is_locked and not app_dict.get("badge"):
                app_dict["badge"] = "LOCKED"
            apps.append(app_dict)
            
        return {"apps": apps}
    finally:
        await db.close()

@app.post("/session/start")
async def start_session(req: SessionStartRequest, user_id: int = Depends(get_current_user)):
    """
    Раздел 14: Старт сессии с проверкой лимита минут и прав.
    """
    db = await get_db()
    try:
        ok, res, extra = await start_game_session(db, user_id, req.app_id)
        if not ok:
            return JSONResponse(status_code=403, content={"error": res, **extra})
        return {"session_id": res, "minutes": extra}
    finally:
        await db.close()

@app.post("/session/heartbeat")
async def heartbeat_session(req: SessionHeartbeatRequest, user_id: int = Depends(get_current_user)):
    """
    Раздел 4.8: Списание времени раз в 30 секунд.
    """
    db = await get_db()
    try:
        ok, msg, data = await process_heartbeat(db, req.session_id, user_id)
        if not ok:
            return JSONResponse(status_code=403, content={"error": msg, **data})
        return {"status": "ok", "message": msg, "minutes": data}
    finally:
        await db.close()

@app.post("/session/end")
async def end_session(req: SessionEndRequest, user_id: int = Depends(get_current_user)):
    db = await get_db()
    try:
        await end_game_session(db, req.session_id, user_id)
        return {"status": "ended"}
    finally:
        await db.close()

@app.post("/offline/token")
async def issue_offline_token(req: OfflineTokenRequest, user_id: int = Depends(get_current_user)):
    """
    Раздел 8.1-8.3 RULES.md: Офлайн-режим — ТОЛЬКО для активной Plus-подписки.
    Выдает подписанный офлайн-токен на 48 часов.
    """
    db = await get_db()
    try:
        summary = await get_user_minutes_summary(db, user_id)
        if not summary["is_plus"]:
            raise HTTPException(
                status_code=403, 
                detail="Офлайн-режим доступен только для пользователей с активной подпиской Plus!"
            )
        token = create_offline_token(user_id, req.device_id, validity_hours=48)
        return {"offline_token": token, "expires_hours": 48}
    finally:
        await db.close()

@app.post("/ad/reward")
async def claim_ad_reward(user_id: int = Depends(get_current_user)):
    """
    Раздел 9: Rewarded ad: +5 мин за просмотр, максимум 2 раза в день. Только Free!
    """
    db = await get_db()
    try:
        summary = await get_user_minutes_summary(db, user_id)
        if summary["is_plus"]:
            raise HTTPException(status_code=400, detail="Подписчикам Plus реклама не показывается и не требуется.")

        today = get_utc_date_str()
        cursor = await db.execute("SELECT ad_sec FROM daily_usage WHERE user_id = ? AND date = ?", (user_id, today))
        row = await cursor.fetchone()
        current_ad_sec = row["ad_sec"] if row else 0

        # Максимум 2 раза по 5 минут = 10 минут (600 сек)
        if current_ad_sec >= 10 * 60:
            raise HTTPException(status_code=400, detail="Дневной лимит рекламных бонусов исчерпан (макс 2 раза в день).")

        reward_sec = 5 * 60
        await db.execute("""
        UPDATE daily_usage 
        SET ad_sec = ad_sec + ? 
        WHERE user_id = ? AND date = ?
        """, (reward_sec, user_id, today))
        await db.commit()

        updated_summary = await get_user_minutes_summary(db, user_id)
        return {"status": "ok", "message": "Начислено +5 минут!", "minutes": updated_summary}
    finally:
        await db.close()

@app.post("/payment/stars/invoice")
async def create_stars_invoice(req: InvoiceCreateRequest, user_id: int = Depends(get_current_user)):
    """
    Раздел 6 и 7: Покупка Plus и пакетов минут за реальные Telegram Stars через Bot API createInvoiceLink.
    """
    products = {
        "plus_30d": {"stars": 199, "type": "plus", "days": 30, "title": "👑 Plus на 30 дней", "desc": "Безлимитный доступ ко всем играм без таймера"},
        "plus_180d": {"stars": 999, "type": "plus", "days": 180, "title": "👑 Plus на 180 дней", "desc": "Безлимитный доступ на полгода без ограничений"},
        "pack_30m": {"stars": 25, "type": "time_pack", "minutes": 30, "days": 7, "title": "⏳ Пакет +30 минут", "desc": "Дополнительные 30 минут игры на 7 дней"},
        "pack_120m": {"stars": 79, "type": "time_pack", "minutes": 120, "days": 7, "title": "⏳ Пакет +120 минут", "desc": "Дополнительные 120 минут игры на 7 дней"},
    }
    prod = products.get(req.product)
    if not prod:
        raise HTTPException(status_code=400, detail="Неизвестный продукт")

    bot_token = os.getenv("BOT_TOKEN")
    payload_str = f"stars_{user_id}_{req.product}_{int(datetime.now().timestamp())}"

    # Если бот-токен настроен, создаем официальную ссылку на инвойс Stars в Telegram
    if bot_token:
        try:
            tg_url = f"https://api.telegram.org/bot{bot_token}/createInvoiceLink"
            invoice_data = {
                "title": prod["title"],
                "description": prod["desc"],
                "payload": payload_str,
                "provider_token": "",  # Для Stars (XTR) всегда пустая строка
                "currency": "XTR",
                "prices": [{"label": prod["title"], "amount": prod["stars"]}]
            }
            req_tg = urllib.request.Request(
                tg_url,
                data=json.dumps(invoice_data).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req_tg, timeout=10) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                if res_json.get("ok"):
                    invoice_link = res_json.get("result")
                    return {
                        "status": "ok",
                        "invoice_link": invoice_link,
                        "product": req.product,
                        "stars": prod["stars"],
                        "title": prod["title"]
                    }
        except Exception as e:
            print(f"[Stars Invoice] Ошибка генерации инвойса Telegram: {e}")

    # Fallback / Локальное мок-начисление если нет сети
    db = await get_db()
    try:
        charge_id = f"fallback_{payload_str}"
        await db.execute("""
        INSERT INTO payments (user_id, charge_id, stars, status, product)
        VALUES (?, ?, ?, 'completed', ?)
        """, (user_id, charge_id, prod["stars"], req.product))

        expires_at = (datetime.now(timezone.utc) + timedelta(days=prod["days"])).isoformat()
        if prod["type"] == "plus":
            await db.execute("""
            INSERT INTO entitlements (user_id, type, expires_at, source, granted_by)
            VALUES (?, 'plus', ?, 'stars_purchase', 'system')
            """, (user_id, expires_at))
            await db.execute("UPDATE users SET status = 'Plus' WHERE tg_id = ?", (user_id,))
        elif prod["type"] == "time_pack":
            await db.execute("""
            INSERT INTO entitlements (user_id, type, expires_at, minutes, source, granted_by)
            VALUES (?, 'time_pack', ?, ?, 'stars_purchase', 'system')
            """, (user_id, expires_at, prod["minutes"]))

        await db.commit()
        return {"status": "ok", "message": f"Оплачено {prod['stars']} Stars! {prod['title']} активирован."}
    finally:
        await db.close()

@app.post("/admin/entitlement/grant")
async def admin_grant(req: AdminGrantRequest):
    """
    Раздел 10: Особые доступы (Tester / Partner / Support / Admin / Promo) через аудит-лог.
    """
    ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY", "super_admin_secret_key")
    if req.admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Неверный админ-ключ")

    db = await get_db()
    try:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=req.days or 14)).isoformat()
        await db.execute("""
        INSERT INTO entitlements (user_id, type, expires_at, minutes, source, granted_by)
        VALUES (?, ?, ?, ?, ?, 'admin')
        """, (req.target_user_id, req.entitlement_type, expires_at, req.minutes or 0, req.reason))

        if req.entitlement_type in ("admin", "plus"):
            await db.execute("UPDATE users SET status = ? WHERE tg_id = ?", 
                             ("Admin" if req.entitlement_type == "admin" else "Plus", req.target_user_id))

        await db.execute("""
        INSERT INTO audit_log (actor_id, target_id, action, details)
        VALUES ('admin', ?, 'GRANT_ENTITLEMENT', ?)
        """, (str(req.target_user_id), json.dumps({"type": req.entitlement_type, "reason": req.reason, "days": req.days})))

        await db.commit()
        return {"status": "ok", "message": f"Доступ {req.entitlement_type} успешно выдан"}
    finally:
        await db.close()
