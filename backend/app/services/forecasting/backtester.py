import pandas as pd
import numpy as np
from typing import Dict, Any, Optional


class WalkForwardBacktester:
    """
    Walk-forward evaluation of a simple next-day momentum drift model.
    Reports MAE, RMSE, directional accuracy, and an empirical calibration proxy.
    """

    @staticmethod
    def evaluate_model_performance(
        df: Optional[pd.DataFrame],
        asset_class: str,
        model_name: str = "Quant Ensemble v1",
        horizon_label: str = "1d",
    ) -> Dict[str, Any]:
        if df is None or getattr(df, "empty", True) or len(df) < 60:
            return {
                "model_name": model_name,
                "asset_class": asset_class,
                "horizon": horizon_label,
                "mae": None,
                "rmse": None,
                "directional_accuracy": None,
                "calibration_score": None,
                "sample_size": 0,
                "status": "insufficient_data",
                "evaluated_at": pd.Timestamp.now("UTC").isoformat(),
            }

        close = df["close"].astype(float).values
        window = 30
        predictions = []
        actuals = []
        bases = []

        for i in range(len(close) - window - 1):
            hist = close[: i + window]
            actual_next = close[i + window]
            returns = np.diff(np.log(np.clip(hist, 1e-12, None)))
            if len(returns) < 5:
                continue
            mean_ret = np.mean(returns[-14:])
            pred_next = hist[-1] * np.exp(mean_ret)
            predictions.append(pred_next)
            actuals.append(actual_next)
            bases.append(hist[-1])

        if len(predictions) < 10:
            return {
                "model_name": model_name,
                "asset_class": asset_class,
                "horizon": horizon_label,
                "mae": None,
                "rmse": None,
                "directional_accuracy": None,
                "calibration_score": None,
                "sample_size": len(predictions),
                "status": "insufficient_folds",
                "evaluated_at": pd.Timestamp.now("UTC").isoformat(),
            }

        preds = np.array(predictions)
        acts = np.array(actuals)
        bases_arr = np.array(bases)

        errors = preds - acts
        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))

        pred_dirs = np.sign(preds - bases_arr)
        act_dirs = np.sign(acts - bases_arr)
        # Ignore flat moves
        mask = (pred_dirs != 0) & (act_dirs != 0)
        dir_acc = float(np.mean(pred_dirs[mask] == act_dirs[mask])) if mask.any() else 0.5

        # Calibration proxy: fraction of absolute % errors within rolling residual sigma
        pct_err = (acts - preds) / np.clip(np.abs(preds), 1e-9, None)
        sigma = float(np.std(pct_err)) or 0.02
        within_1sigma = float(np.mean(np.abs(pct_err) <= sigma))
        calibration = float(np.clip(0.55 * within_1sigma + 0.45 * dir_acc, 0.0, 1.0))

        return {
            "model_name": model_name,
            "asset_class": asset_class,
            "horizon": horizon_label,
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "directional_accuracy": round(dir_acc, 2),
            "calibration_score": round(calibration, 2),
            "sample_size": int(len(predictions)),
            "status": "ok",
            "evaluated_at": pd.Timestamp.now("UTC").isoformat(),
        }
