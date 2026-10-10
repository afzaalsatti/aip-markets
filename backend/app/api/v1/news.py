from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Literal
from app.db.database import get_db
from app.services.news.news_service import NewsIntelligenceService
from app.services.news.rss_collector import LiveNewsCollector

router = APIRouter(prefix="/news", tags=["Global Intelligence & Real-Time News"])

ScopeParam = Literal["markets", "world", "all"]


@router.get("/sources")
async def list_news_sources(
    scope: Optional[Literal["markets", "world"]] = Query(
        None, description="Filter sources by feed scope"
    ),
):
    """Catalog of RSS outlets the platform can pull on demand."""
    return {
        "sources": LiveNewsCollector.list_sources(scope),
        "scopes": {
            "markets": "Finance / macro headlines used in research notes",
            "world": "General world news for user knowledge — not used in analysis",
        },
    }


@router.get("")
async def list_global_news(
    category: Optional[str] = None,
    source: Optional[str] = None,
    scope: ScopeParam = Query(
        "markets",
        description="markets = research feed; world = general knowledge; all = both",
    ),
    limit: int = Query(40, ge=1, le=100),
    max_age_hours: Optional[int] = Query(
        None,
        ge=1,
        le=720,
        description="If set, only return articles newer than this many hours",
    ),
    refresh: bool = Query(False, description="When true, sync live RSS before responding"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns stored news with optional on-demand RSS refresh from multiple sources.
    World-scope articles are for context only and are excluded from research analysis.

    Not a paid real-time wire — freshness depends on each outlet's RSS update cadence.
    Tap refresh=true to pull the latest items now.
    """
    sync_meta = None
    if refresh:
        try:
            sync_meta = await NewsIntelligenceService.fetch_and_sync_live_news(db, scope=scope)
        except Exception as exc:
            sync_meta = {"error": str(exc), "synced_new": 0}

    articles = await NewsIntelligenceService.list_articles(
        db,
        scope=scope,
        category=category,
        source=source,
        limit=limit,
        max_age_hours=max_age_hours,
    )

    newest = articles[0]["published_at"] if articles else None

    pulled_live = bool(refresh and sync_meta and not sync_meta.get("error") and (sync_meta.get("fetched") or 0) > 0)
    return {
        "scope": scope,
        "count": len(articles),
        "refresh": refresh,
        "sync": sync_meta,
        "newest_published_at": newest,
        "articles": articles,
        "realtime": pulled_live,
        "freshness": {
            "source": "rss",
            "realtime": pulled_live,
            "status": "ok" if articles else "unavailable",
            "detail": (
                "Live RSS pull this request"
                if pulled_live
                else ("Stored headlines — tap Refresh for live RSS" if articles else "No headlines available")
            ),
        },
        "note": (
            "World headlines are for general knowledge and are not used in research notes or forecasts."
            if scope in ("world", "all")
            else "Markets headlines may be cited in research notes when relevant."
        ),
    }


@router.post("/refresh")
async def refresh_news_on_demand(
    scope: ScopeParam = Query("all", description="Which feed group to pull now"),
    db: AsyncSession = Depends(get_db),
):
    """Explicit on-demand pull from configured RSS outlets."""
    try:
        meta = await NewsIntelligenceService.fetch_and_sync_live_news(db, scope=scope)
        return {"ok": True, **meta}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "synced_new": 0}
