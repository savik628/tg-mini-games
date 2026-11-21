---
name: tg-game-builder
description: >-
  Use this skill when creating, integrating, or refactoring games and frontend components
  in the Telegram Mini Games Platform (tg_mini_apps). Covers GAME-TEMPLATE.md specification,
  HTML5 Canvas/WebGL games, mobile portrait 100vh layout, UI-KIT.md styling, Telegram WebApp SDK,
  Haptic feedback, and session lifecycle integration via session.js and api.js.
---

# Telegram Mini Game Builder & Integration Skill

Этот скилл определяет порядок создания, оформления и интеграции мини-игры в каталог платформы «Мини игры».

## 1. Регламент добавления новой игры
1. **Паспорт и спецификация**:
   - Перед кодом заполняется спецификация по шаблону [GAME-TEMPLATE.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/GAME-TEMPLATE.md).
   - Игра получает уникальный `app_id` (например, `tap_ninja`, `space_runner`).
2. **Технические стандарты (согласно [GAMES.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/GAMES.md))**:
   - Технологии: Vanilla JavaScript / HTML5 Canvas / WebGL. Никаких тяжелых внешних движков, раздувающих бандл.
   - Размер ассетов: первоначальная загрузка не более 2-3 МБ.
   - Ориентация: строго вертикальная (Portrait, `100vh` / `100dvh`), поддержка управления одной рукой.
   - FPS: стабильные 60 FPS на средних смартфонах.
   - Звуки: Web Audio API с кнопкой Mute и уважением системных настроек.
   - Тактильный отклик: интеграция Telegram `HapticFeedback` (`impactOccurred`, `notificationOccurred`).

## 2. Подключение к сессионному движку платформы
Игра обязана использовать встроенные клиенты сессии ([js/session.js](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/js/session.js) и [js/api.js](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/js/api.js)):
```javascript
// Запуск игровой сессии при старте раунда
const session = await SessionManager.startSession(appId);
if (!session.allowed) {
    UIManager.showPaywall("Закончились минуты платформы");
    return;
}

// Heartbeat каждые 30 секунд в фоне
// При завершении раунда или выходе:
await SessionManager.endSession();
```

## 3. Требования к UI и стилизации ([UI-KIT.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/UI-KIT.md))
- Все компоненты должны использовать переменные CSS-темы платформы (`--bg-main`, `--card-bg`, `--primary`, `--text-main`, `--radius-md`).
- Поддержка Safe Area (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
- Индикатор оставшихся минут должен быть виден в хедере или оверлее игры. При остатке < 2 минут активируется предупреждающий пульс `.minutes-badge.warning`.
- Экран GameOver должен предлагать сыграть снова (если есть минуты) или перейти на витрину платформы.
