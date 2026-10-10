from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config import settings
from app.db.database import engine, Base, AsyncSessionLocal
from app.api.v1.markets import router as markets_router
from app.api.v1.assets import router as assets_router
from app.api.v1.forecasts import router as forecasts_router
from app.api.v1.reports import router as reports_router
from app.api.v1.news import router as news_router
from app.api.v1.system import router as system_router
from app.services.data_ingestion.ingestion_manager import IngestionManager
from app.services.news.news_service import NewsIntelligenceService


def _ensure_schema(sync_conn):
    """Lightweight SQLite column patches for existing local DBs."""
    inspector = inspect(sync_conn)
    if "news_articles" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("news_articles")}
    if "feed_scope" not in cols:
        sync_conn.execute(
            text(
                "ALTER TABLE news_articles "
                "ADD COLUMN feed_scope VARCHAR(16) DEFAULT 'markets'"
            )
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables & Seed Universe
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_schema)

    async with AsyncSessionLocal() as session:
        ingestion = IngestionManager(session)
        await ingestion.seed_initial_assets()
        await NewsIntelligenceService.seed_initial_news(session)

    yield

    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "AIP Markets local research API — delayed public quotes, technicals, "
        "probabilistic scenarios, public RSS, and optional local LLM notes. "
        "Informational / educational only; not a broker or investment advice."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Version 1 Routers
app.include_router(markets_router, prefix=settings.API_V1_STR)
app.include_router(assets_router, prefix=settings.API_V1_STR)
app.include_router(forecasts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(news_router, prefix=settings.API_V1_STR)
app.include_router(system_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "ok",
        "mode": "local_research_demo",
        "disclaimer": "Informational only — not investment advice",
    }
