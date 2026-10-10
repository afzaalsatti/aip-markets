import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from app.db.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    asset_class = Column(String(32), index=True, nullable=False)  # Equities, Forex, Cryptocurrencies, Commodities, Fixed Income
    currency = Column(String(16), default="USD")
    exchange = Column(String(64), nullable=True)
    sector = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    observations = relationship("MarketObservation", back_populates="asset", cascade="all, delete-orphan")
    forecasts = relationship("ForecastRecord", back_populates="asset", cascade="all, delete-orphan")
    reports = relationship("AIResearchReport", back_populates="asset", cascade="all, delete-orphan")


class MarketObservation(Base):
    __tablename__ = "market_observations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=True, default=0.0)
    adjusted_close = Column(Float, nullable=True)
    provider = Column(String(32), default="yfinance")
    timeframe = Column(String(16), default="1d")  # 1h, 1d, 1wk

    asset = relationship("Asset", back_populates="observations")

    __table_args__ = (
        Index("idx_asset_timestamp_tf", "asset_id", "timestamp", "timeframe", unique=True),
    )


class IndicatorObservation(Base):
    __tablename__ = "indicator_observations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    timeframe = Column(String(16), default="1d")
    indicator_name = Column(String(32), nullable=False)  # RSI_14, MACD, SMA_50, EMA_200, BOLL_UPPER, etc.
    value = Column(Float, nullable=False)
    additional_data = Column(JSON, nullable=True)  # Signal lines, upper/lower bounds


class ForecastRecord(Base):
    __tablename__ = "forecast_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    horizon = Column(String(16), nullable=False)  # 1d, 1w, 1m, 3m
    ref_price = Column(Float, nullable=False)
    expected_return = Column(Float, nullable=False)  # percentage expected return
    target_price = Column(Float, nullable=False)
    
    # Probabilities
    prob_positive = Column(Float, nullable=False)
    prob_negative = Column(Float, nullable=False)
    prob_neutral = Column(Float, nullable=False)
    
    # Risk & Scenarios
    volatility_est = Column(Float, nullable=False)
    value_at_risk_95 = Column(Float, nullable=True)
    trend_classification = Column(String(32), nullable=False)  # Bullish, Bearish, Neutral
    
    bullish_scenario = Column(JSON, nullable=False)  # target, return, factors
    base_scenario = Column(JSON, nullable=False)
    bearish_scenario = Column(JSON, nullable=False)
    
    model_version = Column(String(64), default="ensemble_v1.0")

    asset = relationship("Asset", back_populates="forecasts")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    url = Column(String(512), unique=True, nullable=False)
    source_name = Column(String(64), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=False, index=True)
    ingested_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    sentiment_score = Column(Float, default=0.0)  # -1.0 to +1.0
    impact_rating = Column(String(16), default="Medium")  # Low, Medium, High, Critical
    category = Column(String(64), default="General Market")
    # markets = used in research; world = general knowledge only
    feed_scope = Column(String(16), default="markets", index=True)
    is_duplicate = Column(Boolean, default=False)


class AssetNewsRelation(Base):
    __tablename__ = "asset_news_relations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    news_id = Column(Integer, ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    relevance_score = Column(Float, default=1.0)


class AIResearchReport(Base):
    __tablename__ = "ai_research_reports"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    model_used = Column(String(64), nullable=False)
    
    market_overview = Column(Text, nullable=False)
    technical_outlook = Column(Text, nullable=False)
    fundamental_outlook = Column(Text, nullable=False)
    news_impact_assessment = Column(Text, nullable=False)
    scenarios_json = Column(JSON, nullable=False)  # bull, base, bear detailed narratives
    risks_json = Column(JSON, nullable=False)
    grounded_citations = Column(JSON, nullable=False)
    confidence_score = Column(Float, default=0.85)

    asset = relationship("Asset", back_populates="reports")


class ModelPerformanceRecord(Base):
    __tablename__ = "model_performance_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_class = Column(String(32), index=True, nullable=False)
    model_name = Column(String(64), nullable=False)
    horizon = Column(String(16), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    directional_accuracy = Column(Float, nullable=False)
    calibration_score = Column(Float, nullable=False)
    evaluated_at = Column(DateTime, default=datetime.datetime.utcnow)
