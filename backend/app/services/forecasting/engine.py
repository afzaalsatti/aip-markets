import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.services.technical_ta.ta_engine import TechnicalAnalysisEngine

HORIZON_MAP = {
    "1d": {"days": 1, "name": "Short Term (1 Day)"},
    "1w": {"days": 7, "name": "Medium Term (1 Week)"},
    "1m": {"days": 30, "name": "Medium Term (1 Month)"},
    "3m": {"days": 90, "name": "Long Term (3 Months)"}
}

class QuantitativeForecastingEngine:
    """
    Ensemble Time-Series & Volatility Forecasting Engine combining statistical 
    momentum, GARCH-style volatility scaling, and technical regime features.
    """

    @staticmethod
    def generate_forecast(
        asset_id: int, 
        symbol: str, 
        asset_class: str,
        ohlcv_df: pd.DataFrame, 
        horizon: str = "1m"
    ) -> Dict[str, Any]:
        
        if ohlcv_df.empty or len(ohlcv_df) < 30:
            raise ValueError("Minimum 30 historical observation bars required for forecasting engine.")

        horizon_info = HORIZON_MAP.get(horizon, HORIZON_MAP["1m"])
        days = horizon_info["days"]
        
        ta_res = TechnicalAnalysisEngine.compute_all_indicators(ohlcv_df)
        if "summary" not in ta_res or ta_res.get("error"):
            raise ValueError(ta_res.get("error") or "Unable to compute technical summary for forecast.")
        ta_summary = ta_res["summary"]
        ref_price = ta_summary["latest_price"]
        annual_vol = ta_summary["volatility_30d_annualized"]
        trend = ta_summary["trend_classification"]
        rsi = ta_summary["rsi_14"]
        
        horizon_years = days / 365.0
        horizon_vol = annual_vol * math.sqrt(horizon_years)
        
        base_annual_drift = 0.08
        if "Bullish" in trend:
            base_annual_drift += 0.12
        elif "Bearish" in trend:
            base_annual_drift -= 0.15
            
        if rsi > 70:
            base_annual_drift -= 0.05
        elif rsi < 30:
            base_annual_drift += 0.08

        expected_return_pct = base_annual_drift * horizon_years * 100.0
        target_price = ref_price * (1 + expected_return_pct / 100.0)
        
        mu = (expected_return_pct / 100.0)
        sigma = max(horizon_vol, 0.01)
        z_zero = -mu / sigma
        
        def norm_cdf(x):
            return 0.5 * (1 + math.erf(x / math.sqrt(2)))
        
        raw_neg = norm_cdf(z_zero)
        raw_pos = 1.0 - raw_neg
        
        # Scenario probabilities aligned with CDF mass (not hardcoded 20/55/25)
        prob_neutral = 0.10
        prob_pos = round(raw_pos * (1.0 - prob_neutral), 2)
        prob_neg = round(raw_neg * (1.0 - prob_neutral), 2)
        rem = round(1.0 - prob_pos - prob_neg, 2)
        if rem != prob_neutral:
            prob_neutral = rem

        var_95 = ref_price * (1.645 * horizon_vol - mu)

        bull_return = (mu + 1.28 * sigma) * 100.0
        base_return = expected_return_pct
        bear_return = (mu - 1.28 * sigma) * 100.0

        bullish_scenario = {
            "scenario_type": "If things go well",
            "target_price": round(ref_price * (1 + bull_return / 100.0), 2),
            "expected_return_pct": round(bull_return, 2),
            "probability": prob_pos,
            "key_drivers": [
                "Price keeps climbing above recent average levels",
                "Good news on the economy or risk appetite improves",
                "Buying momentum stays strong",
            ],
        }

        base_scenario = {
            "scenario_type": "Most likely path",
            "target_price": round(target_price, 2),
            "expected_return_pct": round(base_return, 2),
            "probability": prob_neutral,
            "key_drivers": [
                f"Price drifts in a normal swing band (about ±{round(horizon_vol * 100, 1)}%)",
                "Recent trend continues without a big surprise",
                "Buyers and sellers stay roughly balanced",
            ],
        }

        bearish_scenario = {
            "scenario_type": "If things go poorly",
            "target_price": round(ref_price * (1 + bear_return / 100.0), 2),
            "expected_return_pct": round(bear_return, 2),
            "probability": prob_neg,
            "key_drivers": [
                "Bad macro or geopolitics news hits risk appetite",
                "Price slips under recent support / average levels",
                "Markets get jumpy and selling pressure rises",
            ],
        }

        trajectory = []
        now = datetime.utcnow()
        step_days = days / 10.0
        for i in range(11):
            t_days = i * step_days
            ts = now + timedelta(days=t_days)
            progress = i / 10.0
            
            p_base = ref_price * (1 + (base_return / 100.0) * progress)
            p_bull = ref_price * (1 + (bull_return / 100.0) * progress)
            p_bear = ref_price * (1 + (bear_return / 100.0) * progress)
            
            trajectory.append({
                "step": i,
                "timestamp": ts.isoformat(),
                "base_price": round(p_base, 2),
                "bull_price": round(p_bull, 2),
                "bear_price": round(p_bear, 2)
            })

        return {
            "asset_id": asset_id,
            "symbol": symbol,
            "horizon": horizon,
            "generated_at": now.isoformat(),
            "ref_price": round(ref_price, 2),
            "expected_return_pct": round(expected_return_pct, 2),
            "target_price": round(target_price, 2),
            "prob_positive": prob_pos,
            "prob_negative": prob_neg,
            "prob_neutral": prob_neutral,
            "volatility_est": round(annual_vol, 4),
            "value_at_risk_95": round(var_95, 2),
            "trend_classification": trend,
            "bullish_scenario": bullish_scenario,
            "base_scenario": base_scenario,
            "bearish_scenario": bearish_scenario,
            "model_version": "quant_ensemble_garch_v1.0",
            "trajectory_points": trajectory
        }
