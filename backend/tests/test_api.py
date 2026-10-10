import pytest
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from app.services.technical_ta.ta_engine import TechnicalAnalysisEngine
from app.services.forecasting.engine import QuantitativeForecastingEngine
from app.services.forecasting.backtester import WalkForwardBacktester
from app.services.llm_adapter.mock_llm_adapter import MockLLMAdapter

def test_technical_analysis_engine():
    # Build sample OHLCV dataframe
    dates = [datetime.utcnow() - timedelta(days=i) for i in range(100)]
    dates.reverse()
    
    df = pd.DataFrame({
        "timestamp": dates,
        "open": [100.0 + i*0.2 for i in range(100)],
        "high": [102.0 + i*0.2 for i in range(100)],
        "low": [99.0 + i*0.2 for i in range(100)],
        "close": [101.0 + i*0.2 for i in range(100)],
        "volume": [100000.0 for _ in range(100)]
    })

    result = TechnicalAnalysisEngine.compute_all_indicators(df)
    assert "summary" in result
    summary = result["summary"]
    assert "rsi_14" in summary
    assert "macd_line" in summary
    assert "trend_classification" in summary
    assert summary["rsi_14"] >= 0 and summary["rsi_14"] <= 100

def test_quantitative_forecasting_engine():
    dates = [datetime.utcnow() - timedelta(days=i) for i in range(60)]
    dates.reverse()
    df = pd.DataFrame({
        "timestamp": dates,
        "open": [150.0 + (i % 5) for i in range(60)],
        "high": [152.0 + (i % 5) for i in range(60)],
        "low": [148.0 + (i % 5) for i in range(60)],
        "close": [151.0 + (i % 5) for i in range(60)],
        "volume": [500000.0 for _ in range(60)]
    })

    forecast = QuantitativeForecastingEngine.generate_forecast(
        asset_id=1, symbol="TEST", asset_class="Equities", ohlcv_df=df, horizon="1m"
    )

    assert forecast["symbol"] == "TEST"
    assert "bullish_scenario" in forecast
    assert "base_scenario" in forecast
    assert "bearish_scenario" in forecast
    assert forecast["prob_positive"] + forecast["prob_negative"] + forecast["prob_neutral"] == pytest.approx(1.0, 0.05)

def test_backtester_handles_none_and_sparse():
    sparse = WalkForwardBacktester.evaluate_model_performance(None, "Equities")
    assert sparse["status"] == "insufficient_data"
    assert sparse["mae"] is None

    dates = [datetime.utcnow() - timedelta(days=i) for i in range(120)]
    dates.reverse()
    df = pd.DataFrame({
        "timestamp": dates,
        "open": [100.0 + i * 0.1 for i in range(120)],
        "high": [101.0 + i * 0.1 for i in range(120)],
        "low": [99.0 + i * 0.1 for i in range(120)],
        "close": [100.5 + i * 0.1 for i in range(120)],
        "volume": [1e5 for _ in range(120)],
    })
    ok = WalkForwardBacktester.evaluate_model_performance(df, "Equities", horizon_label="1d")
    assert ok["status"] == "ok"
    assert ok["sample_size"] > 10
    assert 0.0 <= ok["calibration_score"] <= 1.0
    assert ok["horizon"] == "1d"


def test_ta_empty_dataframe_has_summary():
    result = TechnicalAnalysisEngine.compute_all_indicators(pd.DataFrame())
    assert "summary" in result
    assert "error" in result


def test_plain_english_analysis_brief():
    from app.services.analysis.plain_english import build_analysis_brief

    brief = build_analysis_brief(
        symbol="AAPL",
        name="Apple Inc.",
        asset_class="Equities",
        technical_signals={
            "latest_price": 200.0,
            "rsi_14": 62.0,
            "sma_20": 198.0,
            "sma_50": 190.0,
            "macd_hist": 0.4,
            "bollinger_pct_b": 0.72,
            "volatility_30d_annualized": 0.22,
            "volatility_regime": "Normal Volatility Reg.",
            "trend_classification": "Bullish Strong",
            "sharpe_ratio": 1.4,
            "beta_market": 1.1,
            "beta_benchmark": "SPY",
            "max_drawdown_pct": -12.0,
            "cvar_95_pct": -2.5,
        },
        forecast={"horizon": "1m", "expected_return_pct": 3.5, "base_scenario": {"target_price": 207}},
    )
    assert brief["overall"]["label"]
    assert len(brief["takeaways"]) >= 3
    assert "key_drivers" in brief["fundamentals"]
    assert brief["technical"]["momentum"]["text"]


def test_mock_llm_adapter():
    async def _run():
        adapter = MockLLMAdapter()
        assert await adapter.health_check() is True

        report = await adapter.generate_research_report(
            asset_info={"symbol": "AAPL", "name": "Apple Inc.", "asset_class": "Equities"},
            market_snapshot={"latest_price": 225.0},
            technical_signals={"rsi_14": 55.0, "macd_hist": 0.5},
            quant_forecast={"ref_price": 225.0, "expected_return_pct": 4.5, "target_price": 235.0},
            news_items=[{"source_name": "Reuters", "title": "Apple Q3 Earnings", "url": "https://reuters.com"}]
        )

        assert report["symbol"] == "AAPL"
        assert len(report["grounded_citations"]) > 0
        assert "market_overview" in report

    asyncio.run(_run())
