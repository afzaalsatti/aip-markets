from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.domain import Asset
from app.services.data_ingestion.yfinance_provider import YFinanceProvider
from app.services.data_quality import freshness

router = APIRouter(prefix="/markets", tags=["Markets"])
provider = YFinanceProvider()


@router.get("/overview")
async def get_market_overview(db: AsyncSession = Depends(get_db)):
    """
    Live market summary across Equities, Forex, Crypto, Commodities, and Fixed Income.
    Quotes are batched + cached to avoid Yahoo rate limits. Failed quotes are marked
    unavailable — never replaced with synthetic prices.
    """
    stmt = select(Asset).where(Asset.is_active == True)
    res = await db.execute(stmt)
    assets = res.scalars().all()

    symbols = [a.symbol for a in assets]
    quotes = await provider.fetch_quotes_batch(symbols)

    overview = []
    live_count = 0
    cached_count = 0
    for asset in assets:
        quote = quotes.get(asset.symbol) or {}
        available = bool(quote.get("available")) and quote.get("latest_price") is not None
        is_cached = bool(quote.get("cached")) or (quote.get("provider") == "yfinance_cache")
        is_live = bool(quote.get("realtime")) and available and not is_cached
        if is_live:
            live_count += 1
        elif available and is_cached:
            cached_count += 1
        overview.append(
            {
                "id": asset.id,
                "symbol": asset.symbol,
                "name": asset.name,
                "asset_class": asset.asset_class,
                "currency": asset.currency,
                "exchange": asset.exchange,
                "latest_price": quote.get("latest_price"),
                "change_24h": quote.get("change_24h"),
                "change_percent_24h": quote.get("change_percent_24h"),
                "high_24h": quote.get("high_24h"),
                "low_24h": quote.get("low_24h"),
                "volume_24h": quote.get("volume_24h"),
                "available": available,
                "realtime": is_live,
                "cached": is_cached and available,
                "provider": quote.get("provider", "yfinance"),
            }
        )

    priced = live_count + cached_count
    failed = len(overview) - priced
    as_of = datetime.now(timezone.utc).isoformat()

    if live_count > 0 and failed == 0:
        status = "ok"
        detail = f"{live_count} live quotes"
        realtime = True
    elif live_count > 0:
        status = "degraded"
        detail = f"{live_count} live · {cached_count} cached · {failed} unavailable"
        realtime = True
    elif cached_count > 0:
        status = "degraded"
        detail = f"{cached_count} cached quotes (Yahoo rate-limited) · {failed} unavailable"
        realtime = False
    else:
        status = "unavailable"
        detail = f"0 live quotes · {failed} unavailable — Yahoo may be rate-limiting"
        realtime = False

    return {
        "timestamp": as_of,
        "market_regime": None,
        "active_assets_count": len(overview),
        "live_quotes_count": live_count,
        "cached_quotes_count": cached_count,
        "unavailable_count": failed,
        "assets": overview,
        "freshness": freshness(
            source="yfinance",
            realtime=realtime,
            status=status,
            as_of=as_of,
            detail=detail,
        ),
    }
