# QA Sandbox — Social Network for Test Automation Practice

**A free, open-source, full-stack social network designed specifically as a practice environment for QA automation engineers.**

One command to launch. UI, API, Database — all yours to test. 55+ ready-made test cases. Reset anytime.

---

## Why QA Sandbox?

Most QA engineers learn automation on unstable public demos or toy apps with 2 endpoints. This is different:

- **Real full-stack app** — not a mock. React frontend + FastAPI backend + PostgreSQL database
- **One command setup** — `docker-compose up --build` and you're ready
- **65 API endpoints** with Swagger documentation — test every HTTP method, status code, and edge case
- **Modern UI** with `data-testid` on every element — write Selenium/Playwright/Cypress tests immediately
- **8 pre-seeded users** with different roles and states — admin, moderator, private account, banned user
- **55+ documented test cases** with preconditions, steps, expected results, and exact selectors
- **Database access** — practice SQL queries, verify data directly, test at the DB level
- **Reset button** — one click to restore everything to default. Tests broke your data? Reset and continue
- **Completely free and local** — no accounts, no rate limits, no API keys. Runs on your machine

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Launch
```bash
git clone <repo-url> qa-sandbox
cd qa-sandbox
docker-compose up --build
```

Wait ~30 seconds for all services to start. That's it.

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Social network UI |
| **Swagger** | http://localhost:8000/docs | Interactive API documentation |
| **ReDoc** | http://localhost:8000/redoc | API reference (alternative) |
| **pgweb** | http://localhost:8081 | Database web UI (zero-config) |
| **PostgreSQL** | localhost:5432 | Direct DB connection |

---

## What's Inside

### Social Network Features
A fully functional mini social network with:

- **Authentication** — Register, login, JWT tokens (access + refresh), logout
- **User profiles** — Avatar upload, bio, private/public accounts, verified badges
- **Posts** — Create, edit (15-min window), delete, pin, repost, quote. Text + image upload
- **Comments** — Nested replies (3 levels), like, delete
- **Likes & Reactions** — 6 types: like, love, laugh, wow, sad, angry
- **Follow system** — Follow/unfollow, pending requests for private accounts, accept/reject
- **News feed** — Personalized feed from followed users
- **Direct messages** — 1:1 and group conversations, unread tracking, real-time badge updates
- **Notifications** — Like, comment, follow, repost notifications with read/unread state
- **Search** — Users, posts, hashtags, trending topics
- **Bookmarks** — Save posts for later
- **Admin panel** — User management, content moderation, statistics dashboard
- **File upload** — Images up to 5MB (JPEG, PNG, GIF, WebP)

### Test Accounts

All accounts are pre-seeded. Password pattern: `{prefix}123`

| Username | Email | Password | Role | Special |
|----------|-------|----------|------|---------|
| `admin` | admin@buzzhive.com | `admin123` | Admin | Full access to admin panel |
| `moderator` | mod@buzzhive.com | `mod123` | Moderator | Can moderate content |
| `alice_dev` | alice@buzzhive.com | `alice123` | User | Active poster, verified, many followers |
| `bob_photo` | bob@buzzhive.com | `bob123` | User | Photography posts with images |
| `carol_writes` | carol@buzzhive.com | `carol123` | User | Long-form content writer |
| `dave_quiet` | dave@buzzhive.com | `dave123` | User | **Private account** — requires follow request |
| `eve_new` | eve@buzzhive.com | `eve123` | User | New user, zero posts — tests empty states |
| `frank_banned` | frank@buzzhive.com | `frank123` | User | **Banned** — login returns error |

### Pre-seeded Data
- 8 users (admin, moderator, 4 active, 1 new, 1 banned)
- 26 posts with hashtags, images, edge cases
- 30+ comments with nested replies (3 levels deep)
- 25+ likes with various reaction types
- 3 conversations (2 DMs + 1 group chat) with messages
- 17 notifications (mix of read/unread)
- Follow graph with accepted and pending relationships
- 5 bookmarks

---

## For UI Test Automation

### data-testid Selectors
Every interactive element has a `data-testid` attribute. Pattern: `{domain}-{element}-{shortId}`.

Short IDs for seed data: post 1 = `post-card-1`, post 25 = `post-card-25`.

**Examples:**
```
auth-email-input          auth-password-input       auth-login-btn
post-card-{id}            post-like-btn-{id}        post-composer-submit
comment-input             comment-submit-btn        comment-reply-btn-{id}
profile-follow-btn        profile-message-btn       profile-followers-count
message-input             message-send-btn          new-conversation-btn
notification-{id}         notifications-mark-all-btn
admin-ban-btn-{id}        admin-role-select-{id}    reset-database-btn
```

Full list with all selectors available in the built-in docs at `/docs` page.

### Frameworks Compatibility
Works with any UI automation framework:
- Selenium (Python, Java, C#, JavaScript)
- Playwright
- Cypress
- WebDriverIO
- Puppeteer

---

## For API Test Automation

### 65 Endpoints
Full REST API with Swagger documentation.

**Groups:** Auth (5) | Users (9) | Follows (5) | Posts (9) | Comments (6) | Likes (5) | Bookmarks (3) | Messages (8) | Notifications (4) | Search (4) | Admin (6) | System (3)

### Authentication
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@buzzhive.com","password":"alice123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Use in requests
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### What You Can Test
- All CRUD operations (Create, Read, Update, Delete)
- Pagination (`page`, `per_page`, `total`, `pages`)
- Sorting (`sort_by`, `sort_order`)
- Filtering (by role, status, hashtag, etc.)
- Error codes: 400, 401, 403, 404, 409, 422
- Validation errors with field-level details
- File upload (multipart/form-data)
- Token refresh flow
- Role-based access control

### Error Format
```json
{
  "detail": "Post not found",
  "error_code": "NOT_FOUND",
  "status_code": 404
}
```

### Frameworks Compatibility
- Python: `requests`, `httpx`, `pytest`
- Java: `RestAssured`, `OkHttp`
- JavaScript: `axios`, `supertest`, `fetch`
- C#: `RestSharp`, `HttpClient`
- Any HTTP client

---

## For Database Testing

### Connection
```
Host: localhost
Port: 5432
Database: buzzhive
User: buzzhive_user
Password: buzzhive_password
```

**Connection string:** `postgresql://buzzhive_user:buzzhive_password@localhost:5432/buzzhive`

**JDBC:** `jdbc:postgresql://localhost:5432/buzzhive`

### Web UI
Open http://localhost:8081 — pgweb is pre-configured and connected. Write SQL queries instantly.

### Tables (13)
`users` `refresh_tokens` `follows` `posts` `hashtags` `post_hashtags` `comments` `likes` `bookmarks` `conversations` `conversation_participants` `messages` `notifications`

### Integration Testing Ideas
- Create data via API, verify in DB
- Create data in DB, verify via API and UI
- Test cascade deletes (delete user → check posts, comments, likes)
- Verify denormalized counters (likes_count, comments_count)
- Test soft delete (is_deleted flag) vs hard delete
- Validate data integrity (foreign keys, unique constraints)

---

## Built-in Test Cases (55+)

The app includes a built-in documentation page at `/docs` with:

- **55+ test cases** organized by module (Auth, Posts, Comments, Follows, Messages, Notifications, Search, Admin, Edge Cases)
- **Interactive table** with filters by module, priority, and type
- **Each test case includes:**
  - Preconditions (what to prepare, DB state, SQL queries)
  - Step-by-step instructions
  - Expected results
  - Relevant `data-testid` selectors
  - Related API endpoints
- **Types:** UI, API, Integration, Security, Edge Case
- **Priorities:** Critical, High, Medium, Low

### Edge Cases & Security Tests
Pre-seeded data includes intentional edge cases:
- Post with **2000 characters** (max length)
- Post with **Unicode**: Chinese, Arabic, Russian, emoji, flags
- Post with **XSS attempt**: `<script>alert('xss')</script>`
- Post with **SQL injection**: `'; DROP TABLE posts; --`
- **Private account** with pending follow requests
- **Banned user** (login fails)
- **Soft-deleted** content (visible in admin only)
- **Nested comments** (3 levels deep)

---

## Reset Data

If your tests mess up the data, reset everything to default state:

**Via UI:** Settings → Reset Sandbox (red button at bottom)

**Via API:**
```bash
curl -X POST http://localhost:8000/api/reset
```

This drops all tables and re-seeds the default data. Takes ~2 seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) |
| Docs | Swagger UI (auto-generated), ReDoc |
| DB UI | pgweb |
| Infrastructure | Docker Compose |

---

## Project Structure

```
qa-sandbox/
├── docker-compose.yml        # All services configuration
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # FastAPI app entry point
│       ├── config.py          # Settings
│       ├── database.py        # SQLAlchemy async engine
│       ├── models/            # 11 SQLAlchemy models
│       ├── schemas/           # Pydantic request/response models
│       ├── api/               # 12 route modules (65 endpoints)
│       ├── core/              # Auth, exceptions, dependencies
│       └── services/          # Seed data
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx            # Routes
│       ├── api/               # API client modules
│       ├── components/        # Reusable UI components
│       ├── context/           # Auth context
│       ├── pages/             # 17 pages
│       └── types/             # TypeScript interfaces
└── README.md
```

---

## License

Free to use for learning and practice. Built for the QA community.

---

# QA Sandbox — Песочница для автоматизаторов тестирования

**Бесплатная полноценная соцсеть, созданная специально как среда для практики автоматизации тестирования.**

Одна команда для запуска. UI, API, база данных — всё для тестирования. 55+ готовых тест-кейсов. Сброс в один клик.

---

## Зачем?

Большинство QA-автоматизаторов учатся на нестабильных публичных демо или игрушечных приложениях с 2 эндпоинтами. Здесь всё по-другому:

- **Настоящее full-stack приложение** — React фронтенд + FastAPI бэкенд + PostgreSQL база данных
- **Запуск одной командой** — `docker-compose up --build` и готово
- **65 API эндпоинтов** со Swagger документацией — тестируй любые HTTP методы, статус-коды и edge-кейсы
- **Современный UI** с `data-testid` на каждом элементе — сразу пиши тесты на Selenium/Playwright/Cypress
- **8 предустановленных пользователей** с разными ролями — админ, модератор, приватный аккаунт, забаненный
- **55+ задокументированных тест-кейсов** с предусловиями, шагами, ожидаемыми результатами и селекторами
- **Доступ к базе данных** — SQL запросы, проверка данных напрямую, тестирование на уровне БД
- **Кнопка сброса** — один клик и всё как новое. Тесты сломали данные? Сбросил и продолжил
- **Полностью бесплатно и локально** — никаких аккаунтов, лимитов, API-ключей. Работает на твоей машине

## Быстрый старт

```bash
git clone <repo-url> qa-sandbox
cd qa-sandbox
docker-compose up --build
```

Подожди ~30 секунд. Открывай:
- **UI:** http://localhost:3000
- **Swagger:** http://localhost:8000/docs
- **База данных:** http://localhost:8081

## Что можно автоматизировать

### UI тесты
- Авторизация (логин, регистрация, невалидные данные, забаненный аккаунт)
- Посты (создание, редактирование, удаление, лайки, закладки, хэштеги)
- Комментарии (добавление, вложенные ответы, лайки)
- Подписки (подписка, отписка, приватный аккаунт, pending-запросы)
- Сообщения (создание диалога, отправка, непрочитанные, групповой чат)
- Уведомления (бейджи, фильтры, навигация по клику)
- Поиск (пользователи, посты, хэштеги)
- Админ-панель (статистика, бан, смена ролей, модерация)
- Профиль (редактирование, аватар, приватность)

### API тесты
- Все CRUD операции
- Пагинация, сортировка, фильтрация
- Коды ошибок: 400, 401, 403, 404, 409, 422
- Загрузка файлов
- Refresh-токены
- Ролевой доступ (user, moderator, admin)

### Интеграционные тесты
- Создать данные через API → проверить в UI
- Создать данные в БД → проверить через API
- Каскадное удаление
- Проверка счётчиков (лайки, комментарии)
- Soft delete vs hard delete

### Security тесты
- XSS инъекции в контенте
- SQL инъекции
- Доступ без токена (401)
- Доступ без прав (403)
- Загрузка невалидных файлов

## Сброс данных

Через UI: Настройки → красная кнопка "Reset Sandbox"

Через API:
```bash
curl -X POST http://localhost:8000/api/reset
```

Полный сброс за ~2 секунды. Все таблицы пересоздаются, данные засеиваются заново.

## Тестовые аккаунты

| Логин | Пароль | Роль | Особенность |
|-------|--------|------|-------------|
| admin@buzzhive.com | admin123 | Админ | Полный доступ |
| mod@buzzhive.com | mod123 | Модератор | Модерация контента |
| alice@buzzhive.com | alice123 | Юзер | Активный, верифицирован |
| bob@buzzhive.com | bob123 | Юзер | Посты с картинками |
| carol@buzzhive.com | carol123 | Юзер | Длинные тексты |
| dave@buzzhive.com | dave123 | Юзер | Приватный аккаунт |
| eve@buzzhive.com | eve123 | Юзер | Новый, 0 постов |
| frank@buzzhive.com | frank123 | Юзер | Забанен |

## Подключение к БД

```
Host: localhost | Port: 5432 | DB: buzzhive | User: buzzhive_user | Password: buzzhive_password
```

Веб-интерфейс: http://localhost:8081 (pgweb, уже подключён)

---

Built with FastAPI, React, PostgreSQL, Docker. Made for the QA community.
