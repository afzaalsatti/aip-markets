from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.domain import Asset
from app.services.data_ingestion.yfinance_provider import YFinanceProvider
from app.services.technical_ta.ta_engine import TechnicalAnalysisEngine
from app.services.forecasting.engine import QuantitativeForecastingEngine
from app.services.news.news_service import NewsIntelligenceService
from app.services.llm_adapter.ollama_adapter import OllamaLLMAdapter

router = APIRouter(tags=["AI Research Reports"])
provider = YFinanceProvider()
llm_adapter = OllamaLLMAdapter()

@router.get("/assets/{symbol}/analysis")
async def get_ai_research_report(
    symbol: str, 
    horizon: str = Query("1m", pattern="^(1d|1w|1m|3m)$"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Asset).where(Asset.symbol == symbol)
    res = await db.execute(stmt)
    asset = res.scalar_one_or_none()
    if not asset:
        stmt = select(Asset).where(Asset.symbol == symbol.upper())
        res = await db.execute(stmt)
        asset = res.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset symbol {symbol} not found.")

    # 1. Fetch Market Data & Technical Signals (live only)
    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=180)
    df = await provider.fetch_historical_ohlcv(asset.symbol, asset.asset_class, start_d, end_d)
    if df is None or df.empty or not getattr(df, "attrs", {}).get("realtime", False):
        raise HTTPException(
            status_code=422,
            detail="Live market data unavailable — research note not generated from placeholders.",
        )

    ta_data = TechnicalAnalysisEngine.compute_all_indicators(df)
    technical_signals = ta_data.get("summary") or {}
    if not technical_signals:
        raise HTTPException(status_code=422, detail=ta_data.get("error") or "Insufficient market data for analysis.")

    # 2. Compute Quantitative Forecast
    try:
        quant_forecast = QuantitativeForecastingEngine.generate_forecast(
            asset_id=asset.id,
            symbol=asset.symbol,
            asset_class=asset.asset_class,
            ohlcv_df=df,
            horizon=horizon
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # 3. Fetch News Evidence (may be empty — that is OK)
    news_items = await NewsIntelligenceService.get_news_for_asset(db, asset.id, limit=5)

    # 4. Synthesize via Grounded LLM Adapter (mock only if Ollama down)
    asset_info = {
        "id": asset.id,
        "symbol": asset.symbol,
        "name": asset.name,
        "asset_class": asset.asset_class,
        "currency": asset.currency,
        "sector": asset.sector
    }

    quote = await provider.fetch_latest_quote(asset.symbol, asset.asset_class)
    if not quote.get("available"):
        quote = {
            **quote,
            "latest_price": technical_signals.get("latest_price"),
            "available": technical_signals.get("latest_price") is not None,
        }

    report = await llm_adapter.generate_research_report(
        asset_info=asset_info,
        market_snapshot=quote,
        technical_signals=technical_signals,
        quant_forecast=quant_forecast,
        news_items=news_items
    )

    report["market_data_realtime"] = True
    report["news_count"] = len(news_items)
    return report
