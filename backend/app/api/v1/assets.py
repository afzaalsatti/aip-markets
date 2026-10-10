from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.domain import Asset
from app.services.data_ingestion.yfinance_provider import YFinanceProvider
from app.services.technical_ta.ta_engine import TechnicalAnalysisEngine
from app.services.analysis.plain_english import build_analysis_brief
from app.services.data_quality import freshness, utc_now_iso

router = APIRouter(prefix="/assets", tags=["Assets"])
provider = YFinanceProvider()

BENCHMARK_SYMBOL = "SPY"
BENCHMARK_CLASS = "Equities"


async def _resolve_asset(symbol: str, db: AsyncSession) -> Asset:
    candidates = [symbol, symbol.upper(), symbol.lower()]
    for cand in candidates:
        stmt = select(Asset).where(Asset.symbol == cand)
        res = await db.execute(stmt)
        asset = res.scalar_one_or_none()
        if asset:
            return asset
    raise HTTPException(status_code=404, detail=f"Asset symbol {symbol} not found.")


def _df_meta(df):
    source = getattr(df, "attrs", {}).get("data_source", "unavailable")
    realtime = bool(getattr(df, "attrs", {}).get("realtime", False))
    detail = getattr(df, "attrs", {}).get("detail")
    status = "ok" if realtime and source == "yfinance" else (
        "fallback" if source == "synthetic_mock" else "unavailable"
    )
    return freshness(
        source=source,
        realtime=realtime,
        status=status,
        as_of=utc_now_iso(),
        detail=detail,
    )


@router.get("")
async def list_assets(db: AsyncSession = Depends(get_db)):
    stmt = select(Asset).where(Asset.is_active == True)
    res = await db.execute(stmt)
    assets = res.scalars().all()
    return [
        {
            "id": a.id,
            "symbol": a.symbol,
            "name": a.name,
            "asset_class": a.asset_class,
            "currency": a.currency,
        }
        for a in assets
    ]


@router.get("/{symbol}")
async def get_asset_detail(symbol: str, db: AsyncSession = Depends(get_db)):
    asset = await _resolve_asset(symbol, db)
    quote = await provider.fetch_latest_quote(asset.symbol, asset.asset_class)

    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=180)
    df = await provider.fetch_historical_ohlcv(asset.symbol, asset.asset_class, start_d, end_d)

    benchmark_df = None
    if asset.symbol != BENCHMARK_SYMBOL and not df.empty:
        try:
            benchmark_df = await provider.fetch_historical_ohlcv(
                BENCHMARK_SYMBOL, BENCHMARK_CLASS, start_d, end_d
            )
            if benchmark_df is not None and benchmark_df.empty:
                benchmark_df = None
        except Exception:
            benchmark_df = None

    ta_data = TechnicalAnalysisEngine.compute_all_indicators(
        df, benchmark_df=benchmark_df, beta_benchmark=BENCHMARK_SYMBOL
    )
    ta_summary = ta_data.get("summary") or {}
    quote_live = bool(quote.get("realtime")) and quote.get("latest_price") is not None
    hist_meta = _df_meta(df)

    return {
        "id": asset.id,
        "symbol": asset.symbol,
        "name": asset.name,
        "asset_class": asset.asset_class,
        "currency": asset.currency,
        "exchange": asset.exchange,
        "sector": asset.sector,
        "latest_price": quote.get("latest_price"),
        "price_change_24h": quote.get("change_24h"),
        "price_change_percent_24h": quote.get("change_percent_24h"),
        "high_24h": quote.get("high_24h"),
        "low_24h": quote.get("low_24h"),
        "volume_24h": quote.get("volume_24h"),
        "available": quote_live or bool(ta_summary),
        "rsi_14": ta_summary.get("rsi_14"),
        "volatility_30d": ta_summary.get("volatility_30d_annualized"),
        "trend_classification": ta_summary.get("trend_classification"),
        "volatility_regime": ta_summary.get("volatility_regime"),
        "macd_hist": ta_summary.get("macd_hist"),
        "macd_line": ta_summary.get("macd_line"),
        "macd_signal": ta_summary.get("macd_signal"),
        "sma_20": ta_summary.get("sma_20"),
        "sma_50": ta_summary.get("sma_50"),
        "sma_200": ta_summary.get("sma_200"),
        "bollinger_upper": ta_summary.get("bollinger_upper"),
        "bollinger_lower": ta_summary.get("bollinger_lower"),
        "bollinger_pct_b": ta_summary.get("bollinger_pct_b"),
        "atr_14": ta_summary.get("atr_14"),
        "sharpe_ratio": ta_summary.get("sharpe_ratio"),
        "sortino_ratio": ta_summary.get("sortino_ratio"),
        "beta_market": ta_summary.get("beta_market"),
        "beta_benchmark": ta_summary.get("beta_benchmark", BENCHMARK_SYMBOL),
        "max_drawdown_pct": ta_summary.get("max_drawdown_pct"),
        "cvar_95_pct": ta_summary.get("cvar_95_pct"),
        "analysis_brief": build_analysis_brief(
            symbol=asset.symbol,
            name=asset.name,
            asset_class=asset.asset_class,
            technical_signals={
                **ta_summary,
                "volatility_30d": ta_summary.get("volatility_30d_annualized"),
            },
        )
        if ta_summary
        else None,
        "freshness": freshness(
            source="yfinance" if quote_live or hist_meta.get("realtime") else hist_meta.get("source", "unavailable"),
            realtime=quote_live or bool(hist_meta.get("realtime")),
            status="ok" if quote_live else hist_meta.get("status", "unavailable"),
            as_of=utc_now_iso(),
            detail=quote.get("detail") or hist_meta.get("detail"),
        ),
        "error": ta_data.get("error") if not ta_summary else None,
    }


@router.get("/{symbol}/history")
async def get_asset_history(
    symbol: str,
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    asset = await _resolve_asset(symbol, db)
    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=days)
    df = await provider.fetch_historical_ohlcv(asset.symbol, asset.asset_class, start_d, end_d)
    meta = _df_meta(df)

    records = []
    for _, row in df.iterrows():
        ts = row["timestamp"]
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        records.append(
            {
                "timestamp": ts_str,
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row["volume"]),
            }
        )
    return {
        "symbol": asset.symbol,
        "timeframe": "1d",
        "days": days,
        "data": records,
        "freshness": meta,
        "available": len(records) > 0,
    }


@router.get("/{symbol}/indicators")
async def get_asset_indicators(symbol: str, db: AsyncSession = Depends(get_db)):
    asset = await _resolve_asset(symbol, db)
    end_d = datetime.utcnow()
    start_d = end_d - timedelta(days=180)
    df = await provider.fetch_historical_ohlcv(asset.symbol, asset.asset_class, start_d, end_d)

    benchmark_df = None
    if asset.symbol != BENCHMARK_SYMBOL and not df.empty:
        try:
            benchmark_df = await provider.fetch_historical_ohlcv(
                BENCHMARK_SYMBOL, BENCHMARK_CLASS, start_d, end_d
            )
            if benchmark_df is not None and benchmark_df.empty:
                benchmark_df = None
        except Exception:
            benchmark_df = None

    ta_data = TechnicalAnalysisEngine.compute_all_indicators(
        df, benchmark_df=benchmark_df, beta_benchmark=BENCHMARK_SYMBOL
    )

    return {
        "symbol": asset.symbol,
        "summary": ta_data.get("summary"),
        "error": ta_data.get("error"),
        "freshness": _df_meta(df),
    }
