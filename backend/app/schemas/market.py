from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class MarketObservationSchema(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = 0.0
    adjusted_close: Optional[float] = None
    provider: str = "yfinance"

    model_config = ConfigDict(from_attributes=True)

class AssetBase(BaseModel):
    symbol: str
    name: str
    asset_class: str
    currency: str = "USD"
    exchange: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None

class AssetRead(AssetBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class AssetOverview(AssetRead):
    latest_price: Optional[float] = None
    change_24h: Optional[float] = None
    change_percent_24h: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    sparkline: List[float] = []

class AssetDetailResponse(AssetRead):
    latest_price: float
    price_change_24h: float
    price_change_percent_24h: float
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    volatility_30d: Optional[float] = None
    rsi_14: Optional[float] = None
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_lower: Optional[float] = None
    bollinger_pct_b: Optional[float] = None
    atr_14: Optional[float] = None
    trend_classification: Optional[str] = None
    volatility_regime: Optional[str] = None
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    beta_market: Optional[float] = None
    beta_benchmark: Optional[str] = "SPY"
    max_drawdown_pct: Optional[float] = None
    cvar_95_pct: Optional[float] = None
    history: List[MarketObservationSchema] = []
