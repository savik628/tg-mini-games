---
name: tg-backend-engine
description: >-
  Use this skill when developing, refactoring, fixing bugs, or testing the backend server
  of the Telegram Mini Games Platform (tg_mini_apps). Covers FastAPI architecture,
  SQLite database schema and queries, HMAC validation of Telegram WebApp initData,
  session minute tracking, daily limits reset in UTC, referral fraud prevention,
  and running unit tests via python3 -m unittest.
---

# Telegram Mini Games Backend & Engine Skill

Этот скилл содержит стандарты разработки, тестирования и архитектуры бэкенд-сервера платформы «Мини игры» (FastAPI + SQLite + aiogram).

## 1. Структура бэкенда
- `server/main.py`: Точка входа FastAPI, маршрутизация эндпоинтов, CORS, раздача статики.
- `server/db.py`: Модели данных SQLite, инициализация таблиц (`users`, `devices`, `daily_usage`, `sessions`, `referrals`, `entitlements`, `payments`, `audit_log`, `apps`).
- `server/auth.py`: Валидация Telegram `initData` через HMAC-SHA256, выпуск сессионных токенов JWT/HMAC, проверка оффлайн-токенов.
- `server/engine.py`: Ядро бизнес-логики:
  - Расчет минут пользователя на текущие сутки (UTC).
  - Списание минут (сначала сгораемые ежедневные 10 минут, затем бонусные/пакетные минуты).
  - Учет активности в сессиях (`start_game_session`, `process_heartbeat`, `end_game_session`).
  - Проверка активной подписки `Plus` (безлимитные минуты).

## 2. Ключевые требования к API и базе данных
1. **Только UTC**: все отметки времени (`created_at`, `expires_at`, даты `daily_usage.date`) строго в формате ISO-8601 UTC (`YYYY-MM-DD` и `YYYY-MM-DDTHH:MM:SSZ`). Сброс ежедневных бесплатных минут происходит строго в 00:00:00 UTC.
2. **Идемпотентность и целостность**:
   - Операции начисления/списания минут логируются в `audit_log`.
   - Защита от дублирующих сессий: если у пользователя уже есть активная сессия в другой игре, она автоматически финализируется перед созданием новой.
3. **Безопасность Telegram**:
   - Запрещено доверять `user_id` из тела запроса. `user_id` извлекается **исключительно** из проверенного `initData` или валидированного сессионного токена.
   - Проверка срока годности `auth_date` (не старше 24 часов).

## 3. Запуск тестов и валидация
Перед коммитом изменений в бэкенд обязательно выполнение набора unit-тестов:
```bash
python3 -m unittest discover tg_mini_apps/tests
```
При добавлении новых правил в `RULES.md` необходимо обновлять или расширять тесты в `tg_mini_apps/tests/test_rules.py`.
