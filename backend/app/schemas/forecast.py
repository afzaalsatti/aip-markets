from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ScenarioDetail(BaseModel):
    scenario_type: str  # Bullish, Base, Bearish
    target_price: float
    expected_return_pct: float
    probability: float
    key_drivers: List[str]

class ForecastResponse(BaseModel):
    asset_id: int
    symbol: str
    horizon: str
    generated_at: datetime
    ref_price: float
    expected_return_pct: float
    target_price: float
    prob_positive: float
    prob_negative: float
    prob_neutral: float
    volatility_est: float
    value_at_risk_95: float
    trend_classification: str
    bullish_scenario: ScenarioDetail
    base_scenario: ScenarioDetail
    bearish_scenario: ScenarioDetail
    model_version: str
    trajectory_points: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

class ModelPerformanceMetrics(BaseModel):
    model_name: str
    asset_class: str
    horizon: str
    mae: float
    rmse: float
    directional_accuracy: float
    calibration_score: float
    evaluated_at: datetime
