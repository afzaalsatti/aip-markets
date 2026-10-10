import datetime
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import Asset, MarketObservation
from app.services.data_ingestion.yfinance_provider import YFinanceProvider
from app.services.data_ingestion.mock_provider import MockDataProvider

# Compact liquid universe (~32) — sized for reliable yfinance quote refresh.
DEFAULT_ASSET_UNIVERSE = [
    # Equities & benchmark ETFs
    {"symbol": "AAPL", "name": "Apple Inc.", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Information Technology"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Semiconductors"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Software"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Interactive Media"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Communication Services"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Automotive"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "asset_class": "Equities", "currency": "USD", "exchange": "NYSE", "sector": "Banks"},
    {"symbol": "XOM", "name": "Exxon Mobil Corporation", "asset_class": "Equities", "currency": "USD", "exchange": "NYSE", "sector": "Energy"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "asset_class": "Equities", "currency": "USD", "exchange": "NYSE", "sector": "Healthcare"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "asset_class": "Equities", "currency": "USD", "exchange": "NYSE Arca", "sector": "Broad Market Index"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust (Nasdaq-100)", "asset_class": "Equities", "currency": "USD", "exchange": "NASDAQ", "sector": "Tech Index ETF"},

    # Commodities (most liquid futures)
    {"symbol": "GC=F", "name": "Gold Futures (XAU/USD)", "asset_class": "Commodities", "currency": "USD", "exchange": "COMEX", "sector": "Precious Metals"},
    {"symbol": "SI=F", "name": "Silver Futures (XAG/USD)", "asset_class": "Commodities", "currency": "USD", "exchange": "COMEX", "sector": "Precious Metals"},
    {"symbol": "CL=F", "name": "Crude Oil WTI Futures", "asset_class": "Commodities", "currency": "USD", "exchange": "NYMEX", "sector": "Energy"},
    {"symbol": "BZ=F", "name": "Brent Crude Oil Futures", "asset_class": "Commodities", "currency": "USD", "exchange": "ICE", "sector": "Energy"},
    {"symbol": "NG=F", "name": "Natural Gas Futures", "asset_class": "Commodities", "currency": "USD", "exchange": "NYMEX", "sector": "Energy"},
    {"symbol": "HG=F", "name": "High Grade Copper Futures", "asset_class": "Commodities", "currency": "USD", "exchange": "COMEX", "sector": "Industrial Metals"},

    # Forex majors
    {"symbol": "EURUSD=X", "name": "EUR/USD (Euro / US Dollar)", "asset_class": "Forex", "currency": "USD", "exchange": "FX", "sector": "Major Pair"},
    {"symbol": "GBPUSD=X", "name": "GBP/USD (British Pound / US Dollar)", "asset_class": "Forex", "currency": "USD", "exchange": "FX", "sector": "Major Pair"},
    {"symbol": "USDJPY=X", "name": "USD/JPY (US Dollar / Japanese Yen)", "asset_class": "Forex", "currency": "JPY", "exchange": "FX", "sector": "Major Pair"},
    {"symbol": "AUDUSD=X", "name": "AUD/USD (Australian Dollar / USD)", "asset_class": "Forex", "currency": "USD", "exchange": "FX", "sector": "Commodity Pair"},
    {"symbol": "USDCAD=X", "name": "USD/CAD (US Dollar / Canadian Dollar)", "asset_class": "Forex", "currency": "CAD", "exchange": "FX", "sector": "Major Pair"},
    {"symbol": "USDCHF=X", "name": "USD/CHF (US Dollar / Swiss Franc)", "asset_class": "Forex", "currency": "CHF", "exchange": "FX", "sector": "Safe Haven Pair"},

    # Cryptocurrencies
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "asset_class": "Cryptocurrencies", "currency": "USD", "exchange": "Crypto", "sector": "Layer 1 Store of Value"},
    {"symbol": "ETH-USD", "name": "Ethereum USD", "asset_class": "Cryptocurrencies", "currency": "USD", "exchange": "Crypto", "sector": "Layer 1 Smart Contracts"},
    {"symbol": "SOL-USD", "name": "Solana USD", "asset_class": "Cryptocurrencies", "currency": "USD", "exchange": "Crypto", "sector": "High-Performance L1"},
    {"symbol": "XRP-USD", "name": "XRP USD", "asset_class": "Cryptocurrencies", "currency": "USD", "exchange": "Crypto", "sector": "Cross-Border Payments"},

    # Fixed income
    {"symbol": "^TNX", "name": "US 10-Year Treasury Yield", "asset_class": "Fixed Income", "currency": "USD", "exchange": "CBOE", "sector": "Government Benchmark"},
    {"symbol": "^IRX", "name": "US 13-Week Treasury Bill Yield", "asset_class": "Fixed Income", "currency": "USD", "exchange": "CBOE", "sector": "Short Term Money Market"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "asset_class": "Fixed Income", "currency": "USD", "exchange": "NASDAQ", "sector": "Long Duration Treasuries"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "asset_class": "Fixed Income", "currency": "USD", "exchange": "NASDAQ", "sector": "Aggregate Bond Index"},
]


class IngestionManager:
    def __init__(self, db: AsyncSession, provider=None):
        self.db = db
        self.provider = provider or YFinanceProvider()

    async def seed_initial_assets(self):
        """Upsert core universe and deactivate symbols outside it (keeps yfinance load small)."""
        keep = {item["symbol"] for item in DEFAULT_ASSET_UNIVERSE}
        for item in DEFAULT_ASSET_UNIVERSE:
            stmt = select(Asset).where(Asset.symbol == item["symbol"])
            result = await self.db.execute(stmt)
            existing = result.scalar_one_or_none()
            if not existing:
                self.db.add(
                    Asset(
                        symbol=item["symbol"],
                        name=item["name"],
                        asset_class=item["asset_class"],
                        currency=item["currency"],
                        exchange=item["exchange"],
                        sector=item["sector"],
                        is_active=True,
                    )
                )
            else:
                existing.is_active = True
                existing.name = item["name"]
                existing.asset_class = item["asset_class"]
                existing.currency = item["currency"]
                existing.exchange = item["exchange"]
                existing.sector = item["sector"]

        all_assets = (await self.db.execute(select(Asset))).scalars().all()
        for asset in all_assets:
            if asset.symbol not in keep and asset.is_active:
                asset.is_active = False
        await self.db.commit()

    async def sync_asset_market_data(self, asset: Asset, days_back: int = 180):
        """Fetch and insert historical market data for asset."""
        end_date = datetime.datetime.utcnow()
        start_date = end_date - datetime.timedelta(days=days_back)

        df = await self.provider.fetch_historical_ohlcv(
            asset.symbol, asset.asset_class, start_date, end_date
        )

        for _, row in df.iterrows():
            ts = row["timestamp"]
            if hasattr(ts, "to_pydatetime"):
                ts = ts.to_pydatetime()

            stmt = select(MarketObservation).where(
                MarketObservation.asset_id == asset.id,
                MarketObservation.timestamp == ts,
                MarketObservation.timeframe == "1d",
            )
            res = await self.db.execute(stmt)
            existing_obs = res.scalar_one_or_none()

            if not existing_obs:
                obs = MarketObservation(
                    asset_id=asset.id,
                    timestamp=ts,
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=float(row["volume"])
                    if "volume" in row and not pd.isna(row["volume"])
                    else 0.0,
                    adjusted_close=float(row["adjusted_close"])
                    if "adjusted_close" in row and not pd.isna(row["adjusted_close"])
                    else float(row["close"]),
                    provider=self.provider.provider_name,
                    timeframe="1d",
                )
                self.db.add(obs)
        await self.db.commit()
