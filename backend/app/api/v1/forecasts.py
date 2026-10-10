from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.domain import Asset
from app.services.data_ingestion.yfinance_provider import YFinanceProvider
from app.services.forecasting.engine import QuantitativeForecastingEngine
from app.services.forecasting.backtester import WalkForwardBacktester
from app.services.technical_ta.ta_engine import TechnicalAnalysisEngine
from app.services.analysis.plain_english import build_analysis_brief
from app.services.data_quality import freshness, utc_now_iso

router = APIRouter(tags=["Forecasts & Validation"])
provider = YFinanceProvider()

# Representative liquid symbols for walk-forward evaluation per class
CLASS_BENCHMARKS = {
    "Equities": ("SPY", "Equities"),
    "Forex": ("EURUSD=X", "Forex"),
    "Cryptocurrencies": ("BTC-USD", "Cryptocurrencies"),
    "Commodities": ("GC=F", "Commodities"),
    "Fixed Income": ("BND", "Fixed Income"),
}


@router.get("/assets/{symbol}/forecast")
async def get_asset_forecast(
    symbol: str,
    horizon: str = Query("1m", pattern="^(1d|1w|1m|3m)$"),
    db: AsyncSession = Depends(get_db),
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

    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=180)
    df = await provider.fetch_historical_ohlcv(asset.symbol, asset.asset_class, start_d, end_d)
    source = getattr(df, "attrs", {}).get("data_source", "unavailable")
    live = bool(getattr(df, "attrs", {}).get("realtime", False))

    if df is None or df.empty or not live:
        raise HTTPException(
            status_code=422,
            detail="Live market history unavailable — forecast not computed from placeholders.",
        )

    try:
        forecast = QuantitativeForecastingEngine.generate_forecast(
            asset_id=asset.id,
            symbol=asset.symbol,
            asset_class=asset.asset_class,
            ohlcv_df=df,
            horizon=horizon,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    ta_summary = TechnicalAnalysisEngine.compute_all_indicators(df).get("summary") or {}
    if ta_summary:
        forecast["analysis_brief"] = build_analysis_brief(
            symbol=asset.symbol,
            name=asset.name,
            asset_class=asset.asset_class,
            technical_signals={
                **ta_summary,
                "volatility_30d": ta_summary.get("volatility_30d_annualized"),
            },
            forecast=forecast,
        )
    forecast["freshness"] = freshness(
        source=source,
        realtime=True,
        status="ok",
        as_of=utc_now_iso(),
        detail="Scenarios from live OHLCV + quant engine (not LLM prices)",
    )
    return forecast


@router.get("/models/performance")
async def get_model_performance(db: AsyncSession = Depends(get_db)):
    """
    Walk-forward next-day momentum model metrics on a liquid proxy per asset class.
    """
    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=240)
    results = []

    for asset_class, (symbol, cls) in CLASS_BENCHMARKS.items():
        try:
            df = await provider.fetch_historical_ohlcv(symbol, cls, start_d, end_d)
        except Exception:
            df = None
        metrics = WalkForwardBacktester.evaluate_model_performance(
            df=df,
            asset_class=asset_class,
            model_name="Quant Ensemble GARCH v1.0",
            horizon_label="1d",
        )
        metrics["proxy_symbol"] = symbol
        results.append(metrics)

    live_ok = sum(1 for m in results if m.get("status") == "ok" or m.get("mae") is not None)
    return {
        "evaluation_timestamp": datetime.utcnow().isoformat(),
        "methodology": (
            "Walk-forward chronological rolling window: train on trailing 30 bars, "
            "predict next-day close via short-horizon log-return drift; "
            "report MAE/RMSE, directional accuracy, and residual-sigma calibration proxy."
        ),
        "models": results,
        "freshness": freshness(
            source="yfinance",
            realtime=live_ok > 0,
            status="ok" if live_ok else "unavailable",
            as_of=utc_now_iso(),
            detail=f"{live_ok}/{len(results)} class proxies evaluated on live history",
        ),
    }
