import asyncio
import os
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, MenuButtonWebApp, PreCheckoutQuery

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://savik628.github.io/tg-mini-games/")
DB_PATH = Path(__file__).resolve().parent.parent / 'server' / 'minigames.db'

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в .env файле!")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def grant_entitlement_db(user_id: int, product_key: str, charge_id: str, stars_amount: int):
    """Синхронное начисление покупки в базу данных платформы."""
    products = {
        "plus_30d": {"type": "plus", "days": 30, "title": "Plus на 30 дней"},
        "plus_180d": {"type": "plus", "days": 180, "title": "Plus на 180 дней"},
        "pack_30m": {"type": "time_pack", "minutes": 30, "days": 7, "title": "Пакет +30 минут"},
        "pack_120m": {"type": "time_pack", "minutes": 120, "days": 7, "title": "Пакет +120 минут"},
    }
    prod = products.get(product_key)
    if not prod:
        return False

    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO payments (user_id, charge_id, stars, status, product)
        VALUES (?, ?, ?, 'completed', ?)
        """, (user_id, charge_id, stars_amount, product_key))

        expires_at = (datetime.now(timezone.utc) + timedelta(days=prod["days"])).isoformat()
        if prod["type"] == "plus":
            cursor.execute("""
            INSERT INTO entitlements (user_id, type, expires_at, source, granted_by)
            VALUES (?, 'plus', ?, 'stars_purchase', 'telegram_bot')
            """, (user_id, expires_at))
            cursor.execute("UPDATE users SET status = 'Plus' WHERE tg_id = ?", (user_id,))
        elif prod["type"] == "time_pack":
            cursor.execute("""
            INSERT INTO entitlements (user_id, type, expires_at, minutes, source, granted_by)
            VALUES (?, 'time_pack', ?, ?, 'stars_purchase', 'telegram_bot')
            """, (user_id, expires_at, prod["minutes"]))

        conn.commit()
        return True
    except Exception as e:
        print(f"Ошибка сохранения оплаты в БД: {e}")
        return False
    finally:
        conn.close()

@dp.message(CommandStart())
async def handle_start(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎮 Открыть Game Hub",
                    web_app=WebAppInfo(url=WEBAPP_URL)
                )
            ]
        ]
    )
    
    welcome_text = (
        f"👋 Привет, {message.from_user.first_name or 'друг'}!\n\n"
        "Добро пожаловать в **Game Hub** — экосистему мини-игр на внимание и реакцию.\n\n"
        "⚡️ 30 легковесных игр\n"
        "⭐️ Оплата и подписка Plus через Telegram Stars\n"
        "📶 Поддержка офлайн-режима\n"
        "🔒 Сохранение рекордов в защищенном облаке Telegram\n\n"
        "Нажми кнопку ниже, чтобы начать играть!"
    )
    
    await message.answer(welcome_text, parse_mode="Markdown", reply_markup=keyboard)

@dp.pre_checkout_query()
async def process_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    """
    Обязательное подтверждение инвойса Telegram Stars (п. 6.2 RULES.md).
    Отвечаем ok=True в течение нескольких секунд, чтобы платеж прошел.
    """
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@dp.message(F.successful_payment)
async def process_successful_payment(message: types.Message):
    """
    Обработка успешной оплаты Telegram Stars.
    Фиксирует покупку в базе данных и благодарит пользователя.
    """
    payment = message.successful_payment
    payload = payment.invoice_payload  # Формат: stars_{user_id}_{product}_{timestamp}
    user_id = message.from_user.id
    charge_id = payment.telegram_payment_charge_id
    total_stars = payment.total_amount

    product_key = "unknown"
    parts = payload.split("_")
    if len(parts) >= 3:
        product_key = f"{parts[2]}_{parts[3]}" if len(parts) >= 4 else parts[2]

    # Начисляем в БД
    grant_entitlement_db(user_id, product_key, charge_id, total_stars)

    await message.answer(
        f"🎉 **Оплата получена!**\n\n"
        f"Списано: {total_stars} ⭐️ Telegram Stars.\n"
        f"Доступ мгновенно активирован в вашем профиле Game Hub!\n"
        f"Возвращайтесь в приложение и наслаждайтесь игрой.",
        parse_mode="Markdown"
    )

async def set_menu_button():
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Играть",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
    except Exception as e:
        print(f"Не удалось установить MenuButton: {e}")

async def main():
    print(f"🤖 Запуск бота с поддержкой Telegram Stars...")
    me = await bot.get_me()
    print(f"Успешное подключение к @{me.username} (ID: {me.id})")
    await set_menu_button()
    print("Бот готов принимать платежи Stars и запускать WebApp!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Бот остановлен.")
