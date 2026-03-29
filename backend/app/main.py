import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.router import api_router
from app.config import settings
from app.core.exceptions import AppException
from app.database import Base, engine
from app.models import *  # noqa: F401, F403 — ensure all models are registered
from app.services.seed import seed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting QA Sandbox API...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    # Seed data on first run
    from app.models.user import User
    from sqlalchemy import select

    async with AsyncSession(engine) as session:
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none() is None:
            logger.info("Seeding initial data...")
            await seed_data(session)
            await session.commit()
            logger.info("Seed data created successfully")
        else:
            logger.info("Data already exists, skipping seed")

    yield
    logger.info("Shutting down QA Sandbox API...")


SWAGGER_DESCRIPTION = """
## QA Sandbox — Social Network API

A practice sandbox for QA automation engineers. Full CRUD API with authentication, social features, and rich test data.

### Quick Start

1. **Login** via `POST /api/auth/login` with test credentials (e.g. `alice@buzzhive.com` / `alice123`)
2. Copy the `access_token` from the response
3. Click **Authorize** button above and paste: `Bearer <your_token>`

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@buzzhive.com` | `admin123` | Admin |
| `mod@buzzhive.com` | `mod123` | Moderator |
| `alice@buzzhive.com` | `alice123` | User (active) |
| `bob@buzzhive.com` | `bob123` | User |
| `carol@buzzhive.com` | `carol123` | User |
| `dave@buzzhive.com` | `dave123` | User (private) |
| `eve@buzzhive.com` | `eve123` | User (new) |
| `frank@buzzhive.com` | `frank123` | User (banned) |

### Database Access

```
Host: localhost:5432 | DB: buzzhive | User: buzzhive_user | Password: buzzhive_password
```

### Reset Database

`POST /api/reset` — drops all tables and re-seeds initial data.
"""

app = FastAPI(
    title="QA Sandbox API",
    description=SWAGGER_DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# API routes
app.include_router(api_router)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "status_code": exc.status_code,
        },
    )
