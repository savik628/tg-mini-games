# UI-Kit и дизайн-система платформы «Мини игры» (UI-KIT.md)

Версия: 1.1  
Целевая аудитория: UI/UX дизайнеры, верстальщики, фронтенд-разработчики  
Согласовано с: [RULES.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/RULES.md), [GAMES.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/GAMES.md)

---

## 1. Концепция и визуальный фундамент (Dark Slate Native)

Визуальная концепция платформы базируется на строгом **Telegram-native / Dark Slate** стиле:
- **Глубокий стеклянный фон**: `#0f172a` с карточками `#1e293b` и границами `#334155`.
- **Неоновый небесный акцент (Sky)**: `#38bdf8` для интерактивных элементов, кнопок первого порядка и активных табов.
- **Премиальный золотой акцент (Amber/Stars)**: `#f59e0b` для Telegram Stars, бейджей Plus и подписки.
- **Telegram Theme Adaptivity**: автоматическое считывание цветовой схемы пользователя из `window.Telegram.WebApp.themeParams`.

### CSS-токены
```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --bg-color: #0f172a;
  --card-bg: #1e293b;
  --card-border: #334155;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --primary: #38bdf8;
  --primary-hover: #0284c7;
  --accent: #f59e0b;
  --success: #10b981;
  --danger: #ef4444;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --safe-bottom: env(safe-area-inset-bottom, 16px);
}

body.tg-theme {
  --bg-color: var(--tg-theme-bg-color, #0f172a);
  --text-main: var(--tg-theme-text-color, #f8fafc);
  --card-bg: var(--tg-theme-secondary-bg-color, #1e293b);
  --primary: var(--tg-theme-button-color, #38bdf8);
}
```

---

## 2. Системные компоненты платформы поверх игр

### 2.1. Игровая шапка (Game Header HUD)
Закрепленная панель поверх игрового поля:
- Высота: `48px`, полупрозрачный фон `rgba(15, 23, 42, 0.75)` с `backdrop-filter: blur(12px)`.
- **Слева**: Название запущенной игры (Typography H2).
- **Справа**:
  - **Индикатор минут**: плашка с таймером (например, `⏱ 08:45`). При времени ≤ 60 сек активируется класс `.pulsing-warning` с анимацией пульсации красным цветом.
  - **Кнопка паузы**: иконка паузы (открывает системное модальное окно паузы).
  - **Кнопка звука**: переключатель звуковых эффектов.

### 2.2. Модальное окно паузы (при клике на Telegram BackButton или Pause)
- Выезжающее или центрированное модальное окно с затемнением `rgba(0, 0, 0, 0.6)`.
- Заголовок: «Игра на паузе».
- Подпись: «Списание минут приостановлено. Ваш прогресс сохранен.»
- Кнопки:
  - `btn-primary`: «Продолжить игру»
  - `btn-secondary`: «Выйти в главное меню»

### 2.3. Унифицированный оверлей результатов (Game Over Overlay)
- Полноэкранный оверлей с плавным появлением (`fade-in`, 0.25s).
- Карточка результатов (`--card-bg` с обводкой `--card-border`):
  - Значок кубка или медали (при новом рекорде).
  - Блок счета: крупная цифра очков (32px, `font-weight: 800`).
  - Статистика матча: собранные монеты, пройденная дистанция, поверженные противники.
  - Состояние лимита минут: остаток на сегодня.
  - Кнопка «Сыграть снова» (при наличии минут) либо «Разблокировать безлимит Plus».
  - Кнопка «В каталог игр».

### 2.4. Состояние «Предупреждение T-60s» (Pulse Warning)
```css
@keyframes warning-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 4px rgba(239, 68, 68, 0.6); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.minutes-badge.warning {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(239, 68, 68, 0.15);
  animation: warning-pulse 1.2s infinite;
}
```

---

## 3. Типографика, кнопки и формы

- **H1 (Заголовки экранов)**: 20px, bold, интерлиньяж 1.2.
- **H2 (Секции и карточки)**: 16px, semibold.
- **Body**: 14px, regular (400) / medium (500).
- **Кнопки**: высота 48px, радиус скругления `var(--radius-md)` (14px).
  - Нажатие сопровождается скейлом: `transform: scale(0.97)` и нативным Taptic Engine откликом.
