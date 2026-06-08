# DevSync AI

> AI-powered real-time team collaboration platform — channels, DMs, task boards, file uploads, and an integrated AI assistant.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

---

## Features

| Area | What's included |
|---|---|
| **Messaging** | Public & private channels, 1:1 direct messages, real-time delivery via WebSockets, emoji reactions, file/image uploads |
| **Task Management** | Kanban boards per project, priorities, labels, assignees, admin-controlled due dates |
| **Notifications** | Real-time bell-icon badge, task-created / task-assigned / overdue alerts, Celery scheduled reminders |
| **AI Assistant** | Floating chat panel powered by Claude (Anthropic) for workspace-aware Q&A |
| **Auth** | JWT access + refresh tokens, bcrypt passwords, role-based access (owner / admin / member / guest) |
| **Search** | PostgreSQL full-text search across tasks and messages with relevance ranking |
| **Admin Tools** | Remove members from channels or workspaces, manage channel visibility, set task deadlines |

---

## Tech Stack

### Backend
- **FastAPI** + **Uvicorn** (ASGI) — async Python web framework
- **SQLAlchemy 2.0** async ORM + **asyncpg** driver
- **PostgreSQL 16** — primary database with FTS indexes
- **Alembic** — database migrations
- **Redis 7** — caching (DB0), Celery broker (DB1), WebSocket Pub/Sub (DB2)
- **Celery** + **Celery Beat** — background tasks and scheduled jobs
- **Pydantic v2** — request/response validation
- **structlog** + **Prometheus** — structured logging and metrics

### Frontend
- **React 18** + **TypeScript 5** + **Vite**
- **React Router v6** — client-side routing
- **TanStack Query (React Query v5)** — server state, caching, real-time cache updates
- **Zustand** — lightweight client-side state
- **Tailwind CSS** + **Framer Motion** + **Lucide React**
- **Zod** + **React Hook Form** — type-safe form validation

### Infrastructure
- **Docker Compose** — 7-service local dev environment
- **Nginx** — reverse proxy (production)
- **GitHub Actions** — CI/CD: lint, test, type-check, Docker build

---

## Architecture

```
Browser
  │
  ├── HTTP/REST  ──►  Nginx  ──►  FastAPI  ──►  PostgreSQL
  │                                   │
  └── WebSocket  ──►  FastAPI  ──►  Redis Pub/Sub
                                       │
                              Celery Workers (background tasks)
                                       │
                                  Email / AI / Notifications
```

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Git](https://git-scm.com/)

### 1. Clone
```bash
git clone https://github.com/Utkarsh-1307/DevSync-AI.git
cd DevSync-AI
```

### 2. Configure environment
```bash
cp .env.example .env
```

Open `.env` and set at minimum:
```env
SECRET_KEY=<run: openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-...   # get from console.anthropic.com
```

### 3. Start all services
```bash
docker compose up --build
```

First build takes ~3–5 minutes. Subsequent starts are fast.

### 4. Open the app
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/docs |
| Celery Flower | http://localhost:5555 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Register a new account at http://localhost:3000/register to get started.

---

## Project Structure

```
DevSync-AI/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/v1/          # Route handlers
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access layer
│   │   ├── workers/         # Celery tasks
│   │   └── websockets/      # WebSocket connection manager
│   ├── alembic/             # Database migrations
│   └── tests/               # pytest test suite
│
├── frontend/                # React + Vite application
│   └── src/
│       ├── features/        # Feature-based modules (auth, channels, tasks, …)
│       ├── layouts/         # AppLayout with sidebar
│       ├── stores/          # Zustand stores
│       ├── lib/             # Axios client, WebSocket client
│       └── types/           # Shared TypeScript interfaces
│
├── nginx/                   # Nginx config (production)
├── .github/workflows/       # GitHub Actions CI
├── docker-compose.yml       # Development stack
├── docker-compose.prod.yml  # Production stack
└── .env.example             # Environment variable template
```

---

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing key — generate with `openssl rand -hex 32` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI assistant |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Optional | Email delivery |
| `S3_BUCKET` / `AWS_ACCESS_KEY_ID` | Optional | Cloud file storage (falls back to local) |

---

## Contributing

This project uses a trunk-based branching strategy:

```
main        ← stable, never push directly
  └── develop  ← integration branch
        └── feature/your-feature  ← your work
```

1. Branch off `develop`: `git checkout -b feature/my-feature develop`
2. Make changes, commit with conventional commits (`feat:`, `fix:`, `chore:`)
3. Open a PR targeting `develop`
4. After review, merge to `develop` → periodically merged to `main` for releases

### Running tests locally
```bash
# Backend
cd backend && pytest tests/ -v

# Frontend type-check
cd frontend && npm run type-check
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
