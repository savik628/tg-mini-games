---
name: tg-platform-rules
description: >-
  Use this skill whenever developing, modifying, testing, or auditing code, UI screens,
  or APIs in the Telegram Mini Games Platform (tg_mini_apps). Enforces platform philosophy,
  strict server-side security, zero-trust client rules, single profile, unified minute balance,
  and mandatory compliance with RULES.md, GAMES.md, and UI-KIT.md.
---

# Telegram Mini Games Platform Rules & Architecture Skill

Этот скилл содержит обязательный свод правил архитектуры, безопасности и бизнес-логики для платформы «Мини игры» (репозиторий `tg-mini-games` / `tg_mini_apps`).

## 1. Источник истины (Source of Truth)
- При любых изменениях функционала источником истины является [RULES.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/RULES.md).
- При конфликте между кодом и правилами — **всегда побеждают правила**.
- Стандарты игр описаны в [GAMES.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/GAMES.md).
- Дизайн-система и стили строго берутся из [UI-KIT.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/UI-KIT.md).

## 2. Ключевые архитектурные принципы
1. **Единая экосистема**: «Мини игры» — это единая платформа с общим каталогом (плитки игр), общим профилем, единым балансом минут и общей подпиской. Игра **не имеет права** создавать отдельного бота, отдельный баланс, собственную платежную систему или изолированный профиль.
2. **Нулевое доверие к клиенту (Zero-Trust Client)**:
   - Клиент — это исключительно интерфейс отображения (UI).
   - Все минуты, балансы, списания, подписки, расчеты сессий и доступы вычисляются **исключительно на сервере** (`server/engine.py`, `server/main.py`).
   - Клиент не может передавать параметры вида `add_minutes` или `grant_subscription`.
3. **Единая система минут и сессий**:
   - Бесплатный лимит: 10 минут в день на всю платформу (сброс в 00:00 UTC).
   - Единый сессионный цикл: старт через `POST /api/session/start`, периодические подтверждения `POST /api/session/heartbeat` (каждые 30 секунд), завершение через `POST /api/session/end`.
   - Если минуты исчерпаны — сервер возвращает ошибку, клиент блокирует доступ к игре и открывает единый Paywall платформы.
4. **Безопасность авторизации**:
   - Валидация Telegram `initData` через HMAC-SHA256 с токеном бота (`server/auth.py`).
   - Использование временных токенов сессии (`session_token`) и токенов офлайн-режима (`offline_token`) с ограниченным TTL (15 минут).
   - Защита от накрутки рефералов (проверка даты регистрации в TG, единого устройства/IP).

## 3. Обязательный чеклист перед сдачей изменений
- [ ] Не нарушен ли принцип единого баланса минут?
- [ ] Проверено ли, что новые эндпоинты защищены проверкой сессии/токена?
- [ ] Все ли денежные операции и Stars идут через единый Paywall платформы?
- [ ] Запущены ли тесты: `python3 -m unittest discover tg_mini_apps/tests`?
