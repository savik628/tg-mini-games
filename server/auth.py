import hmac
import hashlib
import json
import os
import time
from typing import Optional, Dict, Any
from urllib.parse import parse_qsl, unquote
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
SECRET_KEY = os.getenv("APP_SECRET_KEY", "minigames_super_secret_key_2026")

def verify_telegram_init_data(init_data_raw: str) -> Optional[Dict[str, Any]]:
    """
    Валидация initData от Telegram Web App по алгоритму HMAC-SHA256.
    Раздел 12.1: initData Telegram проверяется на сервере для каждой значимой операции.
    """
    if not init_data_raw or not BOT_TOKEN:
        return None

    try:
        parsed_data = dict(parse_qsl(init_data_raw, keep_blank_values=True))
        received_hash = parsed_data.pop("hash", None)
        if not received_hash:
            return None

        # Сортируем пары ключ=значение в алфавитном порядке
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))

        # Секретный ключ из BOT_TOKEN
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode("utf-8"), hashlib.sha256).digest()
        # Вычисляем проверочный хэш
        calculated_hash = hmac.new(secret, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

        if hmac.compare_digest(calculated_hash, received_hash):
            if "user" in parsed_data:
                parsed_data["user"] = json.loads(parsed_data["user"])
            return parsed_data
        return None
    except Exception as e:
        print(f"Ошибка валидации initData: {e}")
        return None

def create_session_token(tg_id: int) -> str:
    """Генерация подписанного сессионного токена для клиента"""
    expires = int(time.time()) + 86400 * 3  # 3 дня
    payload = f"{tg_id}:{expires}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

def verify_session_token(token: str) -> Optional[int]:
    """Проверка подписанного сессионного токена"""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        tg_id, expires, sig = int(parts[0]), int(parts[1]), parts[2]
        if time.time() > expires:
            return None
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{tg_id}:{expires}".encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected_sig, sig):
            return tg_id
        return None
    except Exception:
        return None

def create_offline_token(user_id: int, device_id: str, validity_hours: int = 48) -> str:
    """
    Раздел 8.2-8.3 RULES.md:
    В токене: user_id, device_id, expires_at, offline_allowed, подпись сервера.
    """
    expires_at = int(time.time()) + validity_hours * 3600
    payload = json.dumps({
        "user_id": user_id,
        "device_id": device_id,
        "expires_at": expires_at,
        "offline_allowed": True
    }, sort_keys=True)
    
    signature = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}::{signature}"

def verify_offline_token(token_str: str) -> Optional[Dict[str, Any]]:
    """Проверка офлайн-токена клиентом или сервером"""
    try:
        payload_str, signature = token_str.split("::")
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            return None
        data = json.loads(payload_str)
        if time.time() > data.get("expires_at", 0):
            return None
        return data
    except Exception:
        return None
