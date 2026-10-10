import math
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from app.services.data_ingestion.base import BaseDataProvider

class MockDataProvider(BaseDataProvider):
    """
    Realistic synthetic data generator using stochastic processes (Geometric Brownian Motion + Jump Diffusion).
    Provides benchmark prices and historical bars for all institutional assets.
    """
    
    BASE_PRICES = {
        # Equities
        "AAPL": 225.50,
        "NVDA": 132.80,
        "MSFT": 418.20,
        "AMZN": 186.40,
        "GOOGL": 164.50,
        "META": 582.10,
        "TSLA": 218.90,
        "SPY": 575.20,
        "QQQ": 488.30,
        "IWM": 218.40,

        # Commodities
        "GC=F": 2650.00,  # Gold Futures
        "SI=F": 31.80,    # Silver Futures
        "CL=F": 74.30,    # Crude Oil WTI
        "BZ=F": 78.10,    # Brent Crude
        "NG=F": 2.65,     # Natural Gas
        "HG=F": 4.45,     # Copper Futures

        # Forex
        "EURUSD=X": 1.0920,
        "GBPUSD=X": 1.3050,
        "USDJPY=X": 148.50,
        "AUDUSD=X": 0.6740,
        "USDCAD=X": 1.3650,
        "USDCHF=X": 0.8580,

        # Cryptocurrencies
        "BTC-USD": 64500.00,
        "ETH-USD": 3450.00,
        "SOL-USD": 145.20,
        "XRP-USD": 0.5420,

        # Fixed Income & Yields
        "^TNX": 4.08,     # 10Y Treasury Yield %
        "^IRX": 4.62,     # 13W T-Bill Yield %
        "^TYX": 4.38,     # 30Y Treasury Bond Yield %
        "BND": 73.50,     # Total Bond Market ETF
    }

    VOLATILITIES = {
        "Equities": 0.22,
        "Forex": 0.09,
        "Cryptocurrencies": 0.55,
        "Commodities": 0.28,
        "Fixed Income": 0.15,
    }

    @property
    def provider_name(self) -> str:
        return "synthetic_mock_engine"

    async def fetch_historical_ohlcv(
        self, 
        symbol: str, 
        asset_class: str,
        start_date: datetime, 
        end_date: datetime, 
        interval: str = "1d"
    ) -> pd.DataFrame:
        base_price = self.BASE_PRICES.get(symbol, 100.0)
        vol = self.VOLATILITIES.get(asset_class, 0.20)
        
        days = (end_date - start_date).days
        if days <= 0:
            days = 90
            
        timestamps = [start_date + timedelta(days=i) for i in range(days)]
        
        # Seed generator for reproducible symbol data
        rng = np.random.default_rng(seed=abs(hash(symbol)) % (2**32))
        dt = 1 / 252.0  # Daily step
        
        drift = 0.08  # 8% annual drift
        shocks = rng.normal(loc=0, scale=1, size=days)
        
        prices = [base_price]
        for i in range(1, days):
            ret = (drift - 0.5 * vol**2) * dt + vol * math.sqrt(dt) * shocks[i]
            if rng.random() < 0.03:
                jump = rng.normal(loc=-0.01, scale=0.03)
                ret += jump
            next_price = max(0.01, prices[-1] * math.exp(ret))
            prices.append(next_price)

        data = []
        for ts, p in zip(timestamps, prices):
            daily_range = p * (vol / math.sqrt(252)) * rng.uniform(0.5, 1.8)
            open_p = p + rng.uniform(-daily_range * 0.4, daily_range * 0.4)
            high_p = max(open_p, p) + rng.uniform(0, daily_range * 0.5)
            low_p = min(open_p, p) - rng.uniform(0, daily_range * 0.5)
            close_p = p
            vol_val = float(rng.integers(1_000_000, 50_000_000)) if asset_class in ["Equities", "Cryptocurrencies"] else float(rng.integers(10_000, 500_000))
            
            data.append({
                "timestamp": ts,
                "open": round(open_p, 4),
                "high": round(high_p, 4),
                "low": round(low_p, 4),
                "close": round(close_p, 4),
                "volume": vol_val,
                "adjusted_close": round(close_p, 4)
            })

        return pd.DataFrame(data)

    async def fetch_latest_quote(self, symbol: str, asset_class: str) -> Dict[str, Any]:
        base_price = self.BASE_PRICES.get(symbol, 100.0)
        rng = np.random.default_rng()
        change_pct = rng.uniform(-2.5, 3.2)
        change_val = base_price * (change_pct / 100.0)
        
        return {
            "symbol": symbol,
            "latest_price": round(base_price + change_val, 4),
            "change_24h": round(change_val, 4),
            "change_percent_24h": round(change_pct, 2),
            "high_24h": round(base_price * 1.015, 4),
            "low_24h": round(base_price * 0.985, 4),
            "volume_24h": 25_450_000.0,
            "provider": self.provider_name
        }
