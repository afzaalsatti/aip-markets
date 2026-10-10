import pandas as pd
import numpy as np
from typing import Dict, Any, Optional


class TechnicalAnalysisEngine:
    """
    Quantitative technical analysis: indicators, regimes, and risk metrics.
    Optional benchmark OHLCV enables real market beta (vs SPY by default).
    """

    @staticmethod
    def _empty_summary(message: str) -> Dict[str, Any]:
        # Honest empty shape — no invented indicator values
        return {
            "error": message,
            "summary": None,
            "dataframe": pd.DataFrame(),
        }

    @staticmethod
    def compute_all_indicators(
        df: pd.DataFrame,
        risk_free_rate: float = 0.04,
        benchmark_df: Optional[pd.DataFrame] = None,
        beta_benchmark: str = "SPY",
    ) -> Dict[str, Any]:
        if df is None or df.empty or len(df) < 14:
            return TechnicalAnalysisEngine._empty_summary(
                "Insufficient data points to compute indicators (min 14 required)"
            )

        df = df.copy()
        close = df["close"]
        high = df["high"]
        low = df["low"]

        df["sma_20"] = close.rolling(window=20, min_periods=1).mean()
        df["sma_50"] = close.rolling(window=50, min_periods=1).mean()
        df["sma_200"] = close.rolling(window=200, min_periods=1).mean()

        df["ema_12"] = close.ewm(span=12, adjust=False).mean()
        df["ema_26"] = close.ewm(span=26, adjust=False).mean()

        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / loss.replace(0, np.nan)
        df["rsi_14"] = 100 - (100 / (1 + rs))
        df["rsi_14"] = df["rsi_14"].fillna(50.0)

        df["macd_line"] = df["ema_12"] - df["ema_26"]
        df["macd_signal"] = df["macd_line"].ewm(span=9, adjust=False).mean()
        df["macd_hist"] = df["macd_line"] - df["macd_signal"]

        std_20 = close.rolling(window=20, min_periods=1).std()
        df["bollinger_middle"] = df["sma_20"]
        df["bollinger_upper"] = df["sma_20"] + (std_20 * 2)
        df["bollinger_lower"] = df["sma_20"] - (std_20 * 2)

        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df["atr_14"] = tr.rolling(window=14, min_periods=1).mean()

        daily_returns = close.pct_change().dropna()
        log_returns = np.log(close / close.shift(1)).dropna()
        log_returns_30 = log_returns.tail(30)
        annual_vol = (
            float(log_returns_30.std() * np.sqrt(252))
            if len(log_returns_30) > 5
            else float(log_returns.std() * np.sqrt(252)) if len(log_returns) > 5 else 0.20
        )

        mean_daily_return = daily_returns.mean() if len(daily_returns) > 0 else 0.0
        daily_rf = risk_free_rate / 252.0
        excess_daily_returns = daily_returns - daily_rf
        daily_std = daily_returns.std() if len(daily_returns) > 1 else 0.0
        sharpe_ratio = (
            float((excess_daily_returns.mean() / daily_std) * np.sqrt(252))
            if daily_std and daily_std > 0
            else 0.0
        )

        downside_returns = daily_returns[daily_returns < 0]
        downside_std = downside_returns.std() if len(downside_returns) > 1 else 0.0
        sortino_ratio = (
            float((excess_daily_returns.mean() / downside_std) * np.sqrt(252))
            if downside_std and downside_std > 0
            else 0.0
        )

        rolling_peak = close.cummax()
        drawdown = (close - rolling_peak) / rolling_peak
        max_drawdown_pct = float(drawdown.min() * 100.0) if not np.isnan(drawdown.min()) else 0.0

        var_95_percentile = np.percentile(daily_returns, 5) if len(daily_returns) > 10 else -0.025
        tail_losses = daily_returns[daily_returns <= var_95_percentile]
        cvar_95_pct = float(tail_losses.mean() * 100.0) if len(tail_losses) > 0 else 0.0

        # Real beta vs benchmark when overlapping returns are available
        beta_est = 1.0
        if (
            benchmark_df is not None
            and not benchmark_df.empty
            and "close" in benchmark_df.columns
            and len(benchmark_df) > 20
        ):
            try:
                asset_rets = close.pct_change()
                bench_close = benchmark_df["close"]
                if "timestamp" in df.columns and "timestamp" in benchmark_df.columns:
                    a = pd.DataFrame({"ts": pd.to_datetime(df["timestamp"]), "r": asset_rets.values})
                    b = pd.DataFrame(
                        {
                            "ts": pd.to_datetime(benchmark_df["timestamp"]),
                            "br": bench_close.pct_change().values,
                        }
                    )
                    merged = pd.merge(a, b, on="ts", how="inner").dropna()
                    if len(merged) > 20:
                        cov = np.cov(merged["r"], merged["br"])[0, 1]
                        var_b = np.var(merged["br"])
                        if var_b > 0:
                            beta_est = float(cov / var_b)
                else:
                    # Align by index length from the end
                    n = min(len(asset_rets.dropna()), len(bench_close.pct_change().dropna()))
                    if n > 20:
                        ar = asset_rets.dropna().tail(n).values
                        br = bench_close.pct_change().dropna().tail(n).values
                        cov = np.cov(ar, br)[0, 1]
                        var_b = np.var(br)
                        if var_b > 0:
                            beta_est = float(cov / var_b)
            except Exception:
                beta_est = 1.0

        latest = df.iloc[-1]
        price = float(latest["close"])
        sma20 = float(latest["sma_20"])
        sma50 = float(latest["sma_50"])
        rsi = float(latest["rsi_14"])
        macd_h = float(latest["macd_hist"])
        bb_u = float(latest["bollinger_upper"])
        bb_l = float(latest["bollinger_lower"])
        bb_width = bb_u - bb_l
        bollinger_pct_b = float((price - bb_l) / bb_width) if bb_width else 0.5

        if price > sma50 and sma20 > sma50 and rsi > 50:
            trend = "Bullish Strong"
        elif price < sma50 and sma20 < sma50 and rsi < 50:
            trend = "Bearish Weak"
        else:
            trend = "Neutral Range-Bound"

        if annual_vol > 0.35:
            vol_regime = "High Volatility Reg."
        elif annual_vol < 0.15:
            vol_regime = "Low Volatility Reg."
        else:
            vol_regime = "Normal Volatility Reg."

        return {
            "summary": {
                "latest_price": price,
                "rsi_14": rsi,
                "macd_line": float(latest["macd_line"]),
                "macd_signal": float(latest["macd_signal"]),
                "macd_hist": macd_h,
                "sma_20": sma20,
                "sma_50": sma50,
                "sma_200": float(latest["sma_200"]),
                "bollinger_upper": bb_u,
                "bollinger_lower": bb_l,
                "bollinger_pct_b": round(bollinger_pct_b, 3),
                "atr_14": float(latest["atr_14"]),
                "volatility_30d_annualized": float(annual_vol),
                "trend_classification": trend,
                "volatility_regime": vol_regime,
                "sharpe_ratio": round(sharpe_ratio, 2),
                "sortino_ratio": round(sortino_ratio, 2),
                "beta_market": round(beta_est, 2),
                "beta_benchmark": beta_benchmark,
                "max_drawdown_pct": round(max_drawdown_pct, 2),
                "cvar_95_pct": round(cvar_95_pct, 2),
            },
            "dataframe": df,
        }
