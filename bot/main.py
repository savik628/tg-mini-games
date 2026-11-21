import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, MenuButtonWebApp

# Load env variables from tg_mini_apps/.env
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://savik628.github.io/tg-mini-games/")  # Будет заменен на ваш HTTPS URL

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в .env файле!")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def handle_start(message: types.Message):
    # Кнопка с WebApp прямо под сообщением
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
        "⚡️ Легковесные игры\n"
        "📶 Поддержка офлайн-режима\n"
        "🔒 Сохранение рекордов в защищенном облаке Telegram\n\n"
        "Нажми кнопку ниже, чтобы начать играть!"
    )
    
    await message.answer(welcome_text, parse_mode="Markdown", reply_markup=keyboard)

async def set_menu_button():
    # Настраиваем постоянную кнопку Mini App внизу чата слева от ввода сообщения
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
    print(f"🤖 Запуск бота...")
    me = await bot.get_me()
    print(f"Успешное подключение к @{me.username} (ID: {me.id})")
    
    await set_menu_button()
    print("Бот готов к работе и ожидает сообщений!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Бот остановлен.")
