from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd

class BaseDataProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def fetch_historical_ohlcv(
        self, 
        symbol: str, 
        asset_class: str,
        start_date: datetime, 
        end_date: datetime, 
        interval: str = "1d"
    ) -> pd.DataFrame:
        """
        Returns DataFrame with columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'adjusted_close']
        """
        pass

    @abstractmethod
    async def fetch_latest_quote(self, symbol: str, asset_class: str) -> Dict[str, Any]:
        """
        Returns dict with current price, 24h change, high, low, volume
        """
        pass
