# UI-Kit и дизайн-система платформы «Мини игры» (UI-KIT.md)

Версия: 1.0  
Целевая аудитория: UI/UX дизайнеры, верстальщики, фронтенд-разработчики  
Согласовано с: [RULES.md (Разделы 11, 16)](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/RULES.md) и [webapp/css/style.css](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/webapp/css/style.css)

---

## 1. Цветовая палитра и дизайн-токены

Дизайн-система платформы поддерживает две цветовые схемы: базовую темную тему (Dark Mode по умолчанию) и адаптивную интеграцию с цветовой палитрой Telegram WebApp (`--tg-theme-*`).

### CSS-переменные базовой темы
| Токен | Значение HEX | Назначение |
| :--- | :--- | :--- |
| `--bg-color` | `#0f172a` (Slate 900) | Основной фон страницы и приложения |
| `--card-bg` | `#1e293b` (Slate 800) | Фон карточек, плиток игр, всплывающих окон |
| `--card-border` | `#334155` (Slate 700) | Границы карточек, разделители, обводки инпутов |
| `--text-main` | `#f8fafc` (Slate 50) | Заголовки, первичный контрастный текст |
| `--text-muted` | `#94a3b8` (Slate 400) | Второстепенные подписи, лейблы, метаданные |
| `--primary` | `#38bdf8` (Sky 400) | Акцентный фирменный цвет, основные кнопки, активные ссылки |
| `--primary-hover`| `#0284c7` (Sky 600) | Состояние наведения/нажатия на primary кнопки |
| `--accent` | `#f59e0b` (Amber 500) | Бейджи Plus-подписки, звезды Stars, спец-предложения |
| `--success` | `#10b981` (Emerald 500)| Успешные операции, подтвержденные рефералы |
| `--danger` | `#ef4444` (Red 500) | Ошибки, предупреждения об исчерпании лимита, удаление |

### Интеграция с Telegram Theme
```css
body.tg-theme {
  --bg-color: var(--tg-theme-bg-color, #0f172a);
  --text-main: var(--tg-theme-text-color, #f8fafc);
  --card-bg: var(--tg-theme-secondary-bg-color, #1e293b);
  --primary: var(--tg-theme-button-color, #38bdf8);
}
```

---

## 2. Типографика

Используется системный нативный шрифт мобильных платформ (San Francisco на iOS, Roboto на Android) для обеспечения максимальной скорости рендеринга и органичного вида в Telegram.

```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Шкала размеров текста:
- **Title H1 (Заголовок экрана)**: `20px` (1.25rem), `font-weight: 700`, `line-height: 1.2`
- **Title H2 (Секции / Карточки)**: `16px` (1.0rem), `font-weight: 600`, `line-height: 1.3`
- **Body Regular (Основной текст)**: `14px` (0.875rem), `font-weight: 400`, `line-height: 1.5`
- **Body Medium (Акцентный текст)**: `14px` (0.875rem), `font-weight: 500`
- **Caption / Badge (Подписи, бейджи)**: `12px` (0.75rem), `font-weight: 600`, `text-transform: uppercase` (для бейджей)

---

## 3. Сетки, отступы и радиусы скругления

- **Базовый шаг отступов**: кратен 4px / 8px (4px, 8px, 12px, 16px, 20px, 24px).
- **Safe Area Insets**: обязательный учет нижней и верхней безопасной зоны мобильных устройств:
  ```css
  --safe-bottom: env(safe-area-inset-bottom, 16px);
  padding-bottom: calc(70px + var(--safe-bottom));
  ```
- **Сетка плиток главного экрана (Grid)**:
  - Смартфоны: `repeat(2, 1fr)`, промежуток `gap: 12px`.
  - Планшеты и Desktop: `repeat(auto-fill, minmax(180px, 1fr))`, промежуток `gap: 16px`.
- **Радиусы скругления (Border Radius)**:
  - `--radius-sm`: `8px` (бейджи, мелкие теги, инпуты)
  - `--radius-md`: `14px` (кнопки, карточки списков)
  - `--radius-lg`: `20px` (плитки игр, модальные окна, нижний navigation bar)

---

## 4. Базовые компоненты интерфейса

### 4.1. Кнопки (Buttons)
1. **Primary Button** (`.btn-primary`):
   - Фон `--primary`, текст темный или контрастный белый, `border-radius: var(--radius-md)`.
   - Высота: `44px`–`48px` (комфортная зона нажатия под палец по гайдлайнам Apple/Google).
2. **Secondary / Outline Button** (`.btn-secondary`):
   - Прозрачный фон, граница `1px solid var(--card-border)`, текст `--text-main`.
3. **Accent / Stars Button** (`.btn-stars`):
   - Градиент с использованием `--accent`, акцент на Telegram Stars покупках.
4. **Состояния кнопок**:
   - `Default`: полная непрозрачность.
   - `Active / Tap`: `transform: scale(0.97)`, подсветка `--primary-hover`.
   - `Disabled`: `opacity: 0.5`, `pointer-events: none`.
   - `Loading`: отображение встроенного спиннера вместо текста.

### 4.2. Плитка игры (Game Card)
- Контейнер со скруглением `--radius-lg`, фон `--card-bg`, легкая обводка `1px solid var(--card-border)`.
- Содержит:
  - Анимированную/статичную иконку (56x56px или 64x64px).
  - Название игры (H2).
  - Статус доступности (например, «10 мин сегодня» или «Plus»).
  - Бейдж в верхнем правом углу (`NEW`, `PLUS`, `LOCKED`).
- Интерактивность: легкое пружинящее уменьшение при тапе.

### 4.3. Бейджи (Badges & Pills)
- `NEW`: цвет фона `rgba(56, 189, 248, 0.15)`, текст `--primary`.
- `PLUS`: цвет фона `rgba(245, 158, 11, 0.15)`, текст `--accent`.
- `LOCKED`: цвет фона `rgba(239, 68, 68, 0.15)`, текст `--danger`.

### 4.4. Индикатор баланса минут (Minutes Counter)
- Закреплен в шапке (Header) или плавающей панели.
- Отображает оставшиеся минуты, иконку таймера и значок тарифа (Free / Plus).

### 4.5. Модальные окна и Bottom Sheets (Paywall)
- Плавный выезд снизу с затемнением оверлея (`backdrop-filter: blur(8px)`).
- Скругление верхних углов: `20px 20px 0 0`.
- Закрытие свайпом вниз или тапом на крестик в правом верхнем углу.

---

## 5. Анимации и микровзаимодействия

- Плавные переходы экранов: `transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)`.
- Скелетон-загрузчики (Shimmer Effect): пульсирующий градиент для загружающихся плиток игр и карточек профиля.
- Обязательная поддержка нативного Telegram Taptic Engine при тапах на кнопки, получении наград и переключении вкладок.
