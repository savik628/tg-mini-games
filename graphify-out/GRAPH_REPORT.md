# Graph Report - tg_mini_apps  (2026-11-22)

## Corpus Check
- 33 files · ~17,021 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 363 nodes · 536 edges · 30 communities (17 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d9d027c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server/main.py
- deploy.yml
- auth.py
- engine.py
- Мини игры — Правила платформы (v1.1)
- MatrixGridGame
- MatrixGridGame
- bot/main.py
- test_rules.py
- Шаблон спецификации мини-игры (GAME-TEMPLATE.md)
- PlatformAPI
- PlatformAPI
- SoundAndHaptics
- SoundAndHaptics
- services
- base_game.js
- Руководство разработчика игр для платформы «Мини игры» (GAMES.md)
- 2. Системные компоненты платформы поверх игр
- reaction_games.js
- SessionManager
- SessionManager
- Инструкции и правила для ИИ-агента (Telegram Mini Games Platform)
- Telegram Mini Game Builder & Integration Skill
- Telegram Mini Games Platform Rules & Architecture Skill
- docs/privacy.md
- docs/subscription.md
- docs/terms.md
- webapp/docs/privacy.md
- webapp/docs/subscription.md
- webapp/docs/terms.md

## God Nodes (most connected - your core abstractions)
1. `Мини игры — Правила платформы (v1.1)` - 17 edges
2. `get_user_minutes_summary()` - 14 edges
3. `PlatformAPI` - 13 edges
4. `get_db()` - 13 edges
5. `PlatformAPI` - 13 edges
6. `SoundAndHaptics` - 11 edges
7. `SoundAndHaptics` - 11 edges
8. `auth_telegram()` - 9 edges
9. `start_game_session()` - 8 edges
10. `process_heartbeat()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `1. Структура бэкенда` --references--> `start_game_session()`  [INFERRED]
  .agents/skills/tg-backend-engine/SKILL.md → server/engine.py
- `1. Структура бэкенда` --references--> `process_heartbeat()`  [INFERRED]
  .agents/skills/tg-backend-engine/SKILL.md → server/engine.py
- `1. Структура бэкенда` --references--> `end_game_session()`  [INFERRED]
  .agents/skills/tg-backend-engine/SKILL.md → server/engine.py
- `get_current_user()` --calls--> `verify_session_token()`  [EXTRACTED]
  server/main.py → server/auth.py
- `issue_offline_token()` --calls--> `create_offline_token()`  [EXTRACTED]
  server/main.py → server/auth.py

## Import Cycles
- None detected.

## Communities (30 total, 13 thin omitted)

### Community 0 - "server/main.py"
Cohesion: 0.08
Nodes (20): get_db(), init_db(), admin_grant(), AdminGrantRequest, claim_ad_reward(), create_stars_invoice(), end_session(), get_apps() (+12 more)

### Community 1 - "deploy.yml"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+16 more)

### Community 2 - "auth.py"
Cohesion: 0.15
Nodes (7): create_offline_token(), create_session_token(), verify_offline_token(), verify_session_token(), verify_telegram_init_data(), auth_telegram(), get_current_user()

### Community 3 - "engine.py"
Cohesion: 0.22
Nodes (14): 1. Структура бэкенда, 2. Ключевые требования к API и базе данных, 3. Запуск тестов и валидация, Telegram Mini Games Backend & Engine Skill, calculate_user_entitlements(), end_game_session(), get_or_create_daily_usage(), get_seconds_until_utc_midnight() (+6 more)

### Community 4 - "Мини игры — Правила платформы (v1.1)"
Cohesion: 0.11
Nodes (18): 10. Особые доступы (Tester / Partner / Support / Admin / Promo), 11. Единый стиль, Haptics и Звуки (UI-Kit & UX), 12. Безопасность и антифрод, 13. Модель данных (минимум), 14. API-минимум системы, 15. Критерии приемки системы, 16. Что запрещено, 1. Философия проекта (+10 more)

### Community 5 - "MatrixGridGame"
Cohesion: 0.18
Nodes (3): MatrixGridGame, SpeedReactionGame, StroopFocusGame

### Community 6 - "MatrixGridGame"
Cohesion: 0.18
Nodes (3): MatrixGridGame, SpeedReactionGame, StroopFocusGame

### Community 7 - "bot/main.py"
Cohesion: 0.15
Nodes (6): grant_entitlement_db(), handle_start(), main(), process_pre_checkout(), process_successful_payment(), set_menu_button()

### Community 9 - "Шаблон спецификации мини-игры (GAME-TEMPLATE.md)"
Cohesion: 0.14
Nodes (13): 1. Паспорт игры, 2.1. Описание игрового процесса, 2.2. Управление (Controls), 2.3. Стандартизированный тактильный отклик (Haptic Feedback), 2. Игровая механика и Core Loop, 3.1. Интеграция с Telegram BackButton и Паузой, 3.2. Поведение при истечении лимита минут, 3. Системные события платформы и поведение экрана (+5 more)

### Community 14 - "services"
Cohesion: 0.18
Nodes (10): generateValue, key, sync, services, buildCommand, env, envVars, name (+2 more)

### Community 15 - "base_game.js"
Cohesion: 0.24
Nodes (3): _bindEvents(), constructor(), resize()

### Community 16 - "Руководство разработчика игр для платформы «Мини игры» (GAMES.md)"
Cohesion: 0.20
Nodes (9): 1.1. Жизненный цикл игры, 1. Архитектурная оболочка и интеграция, 2. Стандарты интерфейса (Гибридный подход), 3. Навигация и системная кнопка «Назад» (Telegram BackButton), 4. Обработка лимита минут и предупреждение за 60 секунд, 5. Единый оверлей результатов (Game Over / Victory), 6. Обязательный стандарт тактильной отдачи (Taptic Engine), 7. Строгие запреты для разработчиков игр (+1 more)

### Community 17 - "2. Системные компоненты платформы поверх игр"
Cohesion: 0.20
Nodes (9): 1. Концепция и визуальный фундамент (Dark Slate Native), 2.1. Игровая шапка (Game Header HUD), 2.2. Модальное окно паузы (при клике на Telegram BackButton или Pause), 2.3. Унифицированный оверлей результатов (Game Over Overlay), 2.4. Состояние «Предупреждение T-60s» (Pulse Warning), 2. Системные компоненты платформы поверх игр, 3. Типографика, кнопки и формы, CSS-токены (+1 more)

### Community 18 - "reaction_games.js"
Cohesion: 0.50
Nodes (8): click(), constructor(), draw(), hit(), loop(), nextRound(), startRound(), tap()

### Community 21 - "Инструкции и правила для ИИ-агента (Telegram Mini Games Platform)"
Cohesion: 0.33
Nodes (5): 1. Обязательное использование скиллов (Skill-First Architecture), 2. Иерархия источников истины, 3. Неприкосновенные принципы, 4. Обязательный запуск тестов, Инструкции и правила для ИИ-агента (Telegram Mini Games Platform)

### Community 22 - "Telegram Mini Game Builder & Integration Skill"
Cohesion: 0.40
Nodes (4): 1. Регламент добавления новой игры, 2. Подключение к сессионному движку платформы, 3. Требования к UI и стилизации ([UI-KIT.md](file:///Users/savelijkoselev/Library/CloudStorage/GoogleDrive-savelii.k28@gmail.com/Мой%20диск/2026-2027/PET/tg_mini_apps/UI-KIT.md)), Telegram Mini Game Builder & Integration Skill

### Community 23 - "Telegram Mini Games Platform Rules & Architecture Skill"
Cohesion: 0.40
Nodes (4): 1. Источник истины (Source of Truth), 2. Ключевые архитектурные принципы, 3. Обязательный чеклист перед сдачей изменений, Telegram Mini Games Platform Rules & Architecture Skill

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `server/main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._
- **Should `deploy.yml` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Should `Мини игры — Правила платформы (v1.1)` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `bot/main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Should `test_rules.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Шаблон спецификации мини-игры (GAME-TEMPLATE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._