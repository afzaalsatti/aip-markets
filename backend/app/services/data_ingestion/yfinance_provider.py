import asyncio
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from app.config import settings
from app.services.data_ingestion.base import BaseDataProvider
from app.services.data_ingestion.mock_provider import MockDataProvider

# Process-wide quote cache so overview / refresh don't re-hammer Yahoo.
# value: (fetched_monotonic, quote_dict)
_QUOTE_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_LOCK = asyncio.Lock()
_FRESH_TTL_SEC = 90.0
_STALE_TTL_SEC = 900.0  # serve stale up to 15m when Yahoo rate-limits
_RATE_LIMIT_COOLDOWN_UNTIL = 0.0
_BATCH_CHUNK = 12
_BATCH_PAUSE_SEC = 2.0
_QUOTE_SEMAPHORE: Optional[asyncio.Semaphore] = None


def _sema() -> asyncio.Semaphore:
    global _QUOTE_SEMAPHORE
    if _QUOTE_SEMAPHORE is None:
        _QUOTE_SEMAPHORE = asyncio.Semaphore(4)
    return _QUOTE_SEMAPHORE


def _empty_ohlcv() -> pd.DataFrame:
    df = pd.DataFrame(
        columns=["timestamp", "open", "high", "low", "close", "volume", "adjusted_close"]
    )
    df.attrs["data_source"] = "unavailable"
    df.attrs["realtime"] = False
    return df


def _unavailable(symbol: str, detail: str = "No live quote") -> Dict[str, Any]:
    return {
        "symbol": symbol,
        "latest_price": None,
        "change_24h": None,
        "change_percent_24h": None,
        "high_24h": None,
        "low_24h": None,
        "volume_24h": None,
        "provider": "yfinance",
        "realtime": False,
        "available": False,
        "detail": detail,
    }


def _quote_from_closes(
    symbol: str,
    last: float,
    prev: Optional[float],
    high: Optional[float] = None,
    low: Optional[float] = None,
    volume: Optional[float] = None,
    *,
    cached: bool = False,
) -> Dict[str, Any]:
    prev_close = float(prev) if prev is not None and not pd.isna(prev) else float(last)
    change = float(last) - prev_close
    change_pct = (change / prev_close) * 100 if prev_close else 0.0
    return {
        "symbol": symbol,
        "latest_price": round(float(last), 4),
        "change_24h": round(change, 4),
        "change_percent_24h": round(change_pct, 2),
        "high_24h": round(float(high), 4) if high is not None and not pd.isna(high) else None,
        "low_24h": round(float(low), 4) if low is not None and not pd.isna(low) else None,
        "volume_24h": float(volume) if volume is not None and not pd.isna(volume) else None,
        "provider": "yfinance_cache" if cached else "yfinance",
        "realtime": not cached,
        "available": True,
        "cached": cached,
    }


def _cache_get(symbol: str, *, allow_stale: bool) -> Optional[Dict[str, Any]]:
    row = _QUOTE_CACHE.get(symbol)
    if not row:
        return None
    ts, quote = row
    age = time.monotonic() - ts
    if age <= _FRESH_TTL_SEC:
        return dict(quote)
    if allow_stale and age <= _STALE_TTL_SEC and quote.get("latest_price") is not None:
        q = dict(quote)
        q["realtime"] = False
        q["cached"] = True
        q["provider"] = "yfinance_cache"
        q["detail"] = f"Cached quote ({int(age)}s old) — Yahoo rate-limited"
        return q
    return None


def _cache_put(symbol: str, quote: Dict[str, Any]) -> None:
    if quote.get("latest_price") is None:
        return
    _QUOTE_CACHE[symbol] = (time.monotonic(), dict(quote))


def _rate_limited_now() -> bool:
    return time.monotonic() < _RATE_LIMIT_COOLDOWN_UNTIL


def _mark_rate_limited(seconds: float = 120.0) -> None:
    global _RATE_LIMIT_COOLDOWN_UNTIL
    _RATE_LIMIT_COOLDOWN_UNTIL = max(_RATE_LIMIT_COOLDOWN_UNTIL, time.monotonic() + seconds)


def _is_rate_limit_error(exc: BaseException) -> bool:
    name = type(exc).__name__
    msg = str(exc).lower()
    return "ratelimit" in name.lower() or "too many requests" in msg or "rate limit" in msg


class YFinanceProvider(BaseDataProvider):
    """
    Live market data via yfinance.
    Synthetic mock is ONLY used when settings.USE_MOCK_MARKET_DATA is explicitly True.
    """

    def __init__(self):
        self._mock = MockDataProvider()

    @property
    def provider_name(self) -> str:
        return "yfinance"

    def _allow_synthetic(self) -> bool:
        return bool(getattr(settings, "USE_MOCK_MARKET_DATA", False))

    async def fetch_historical_ohlcv(
        self,
        symbol: str,
        asset_class: str,
        start_date: datetime,
        end_date: datetime,
        interval: str = "1d",
    ) -> pd.DataFrame:
        if self._allow_synthetic():
            df = await self._mock.fetch_historical_ohlcv(
                symbol, asset_class, start_date, end_date, interval
            )
            df.attrs["data_source"] = "synthetic_mock"
            df.attrs["realtime"] = False
            return df

        try:
            import yfinance as yf

            def _download():
                ticker = yf.Ticker(symbol)
                return ticker.history(
                    start=start_date.strftime("%Y-%m-%d"),
                    end=end_date.strftime("%Y-%m-%d"),
                    interval=interval,
                )

            loop = asyncio.get_running_loop()
            async with _sema():
                df = await loop.run_in_executor(None, _download)

            if df is None or df.empty or len(df) < 5:
                empty = _empty_ohlcv()
                empty.attrs["detail"] = f"No live history for {symbol}"
                return empty

            df = df.reset_index()
            col_map = {
                "Date": "timestamp",
                "Datetime": "timestamp",
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            }
            df = df.rename(columns=col_map)
            if "Adj Close" in df.columns:
                df["adjusted_close"] = df["Adj Close"]
            else:
                df["adjusted_close"] = df["close"]

            df["timestamp"] = pd.to_datetime(df["timestamp"])
            required_cols = [
                "timestamp",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "adjusted_close",
            ]
            out = df[required_cols].copy()
            out.attrs["data_source"] = "yfinance"
            out.attrs["realtime"] = True
            return out

        except Exception as exc:
            if _is_rate_limit_error(exc):
                _mark_rate_limited()
            empty = _empty_ohlcv()
            empty.attrs["detail"] = f"yfinance history failed: {exc}"
            return empty

    def _quote_from_history_df(self, symbol: str, hist: pd.DataFrame) -> Optional[Dict[str, Any]]:
        if hist is None or hist.empty or "Close" not in hist.columns:
            return None
        closes = hist["Close"].dropna()
        if closes.empty:
            return None
        last = float(closes.iloc[-1])
        prev = float(closes.iloc[-2]) if len(closes) > 1 else last
        high = float(hist["High"].iloc[-1]) if "High" in hist.columns else None
        low = float(hist["Low"].iloc[-1]) if "Low" in hist.columns else None
        volume = float(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else None
        return _quote_from_closes(symbol, last, prev, high, low, volume)

    async def fetch_latest_quote(self, symbol: str, asset_class: str) -> Dict[str, Any]:
        if self._allow_synthetic():
            q = await self._mock.fetch_latest_quote(symbol, asset_class)
            q["provider"] = "synthetic_mock"
            q["realtime"] = False
            q["available"] = True
            return q

        # Prefer fresh cache; if Yahoo is cooling down, allow stale
        async with _CACHE_LOCK:
            cached = _cache_get(symbol, allow_stale=_rate_limited_now())
        if cached and (cached.get("realtime") or _rate_limited_now()):
            return cached

        if _rate_limited_now():
            async with _CACHE_LOCK:
                stale = _cache_get(symbol, allow_stale=True)
            return stale or _unavailable(symbol, "Yahoo rate-limited — try again shortly")

        try:
            import yfinance as yf

            def _get_quote():
                # Prefer short history — fewer crumb/quote round-trips than fast_info
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d", auto_adjust=False)
                q = self._quote_from_history_df(symbol, hist)
                if q:
                    return q
                # Fallback fast_info
                fast_info = ticker.fast_info
                price = getattr(fast_info, "last_price", None)
                if price is None or (isinstance(price, float) and pd.isna(price)):
                    return None
                prev_close = getattr(fast_info, "previous_close", None) or price
                return _quote_from_closes(
                    symbol,
                    float(price),
                    float(prev_close) if prev_close is not None else None,
                    getattr(fast_info, "day_high", None),
                    getattr(fast_info, "day_low", None),
                    getattr(fast_info, "last_volume", None),
                )

            loop = asyncio.get_running_loop()
            async with _sema():
                quote = await loop.run_in_executor(None, _get_quote)

            if quote is None:
                async with _CACHE_LOCK:
                    stale = _cache_get(symbol, allow_stale=True)
                return stale or _unavailable(symbol)

            async with _CACHE_LOCK:
                _cache_put(symbol, quote)
            return quote

        except Exception as exc:
            if _is_rate_limit_error(exc):
                _mark_rate_limited()
            async with _CACHE_LOCK:
                stale = _cache_get(symbol, allow_stale=True)
            if stale:
                return stale
            return _unavailable(symbol, str(exc))

    async def fetch_quotes_batch(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Batch-fetch quotes with chunking + cache.
        Returns map symbol -> quote dict (always includes every requested symbol).
        """
        if not symbols:
            return {}

        if self._allow_synthetic():
            out: Dict[str, Dict[str, Any]] = {}
            for s in symbols:
                q = await self._mock.fetch_latest_quote(s, "Equities")
                q["provider"] = "synthetic_mock"
                q["realtime"] = False
                q["available"] = True
                out[s] = q
            return out

        results: Dict[str, Dict[str, Any]] = {}
        need_fetch: List[str] = []

        async with _CACHE_LOCK:
            cooling = _rate_limited_now()
            for s in symbols:
                hit = _cache_get(s, allow_stale=cooling)
                if hit and (hit.get("realtime") or cooling):
                    results[s] = hit
                else:
                    need_fetch.append(s)

        if not need_fetch:
            return {s: results.get(s) or _unavailable(s) for s in symbols}

        if _rate_limited_now():
            # Don't hammer Yahoo during cooldown — fill remaining from stale/unavailable
            async with _CACHE_LOCK:
                for s in need_fetch:
                    results[s] = _cache_get(s, allow_stale=True) or _unavailable(
                        s, "Yahoo rate-limited — try again shortly"
                    )
            return {s: results.get(s) or _unavailable(s) for s in symbols}

        import yfinance as yf

        loop = asyncio.get_running_loop()

        def _download_chunk(chunk: List[str]) -> Dict[str, Dict[str, Any]]:
            parsed: Dict[str, Dict[str, Any]] = {}
            try:
                raw = yf.download(
                    tickers=chunk,
                    period="5d",
                    group_by="ticker",
                    auto_adjust=False,
                    threads=False,
                    progress=False,
                )
            except Exception as exc:
                if _is_rate_limit_error(exc):
                    _mark_rate_limited()
                return parsed

            if raw is None or raw.empty:
                return parsed

            # Single-ticker download has flat columns
            if len(chunk) == 1:
                sym = chunk[0]
                q = self._quote_from_history_df(sym, raw)
                if q:
                    parsed[sym] = q
                return parsed

            # MultiIndex columns: (Ticker, Price) or (Price, Ticker) depending on yfinance
            if isinstance(raw.columns, pd.MultiIndex):
                level0 = list(raw.columns.get_level_values(0).unique())
                # Prefer ticker-first layout
                if any(s in level0 for s in chunk):
                    for sym in chunk:
                        try:
                            sub = raw[sym]
                        except Exception:
                            continue
                        q = self._quote_from_history_df(sym, sub)
                        if q:
                            parsed[sym] = q
                else:
                    for sym in chunk:
                        try:
                            sub = raw.xs(sym, axis=1, level=1)
                        except Exception:
                            continue
                        q = self._quote_from_history_df(sym, sub)
                        if q:
                            parsed[sym] = q
            return parsed

        for i in range(0, len(need_fetch), _BATCH_CHUNK):
            if _rate_limited_now():
                break
            chunk = need_fetch[i : i + _BATCH_CHUNK]
            async with _sema():
                chunk_quotes = await loop.run_in_executor(None, _download_chunk, chunk)

            async with _CACHE_LOCK:
                for sym, q in chunk_quotes.items():
                    _cache_put(sym, q)
                    results[sym] = q
                # Symbols missing from chunk → try stale
                for sym in chunk:
                    if sym not in results:
                        stale = _cache_get(sym, allow_stale=True)
                        if stale:
                            results[sym] = stale

            if i + _BATCH_CHUNK < len(need_fetch) and not _rate_limited_now():
                await asyncio.sleep(_BATCH_PAUSE_SEC)

        # Final fill
        async with _CACHE_LOCK:
            for s in symbols:
                if s not in results:
                    results[s] = _cache_get(s, allow_stale=True) or _unavailable(
                        s,
                        "Yahoo rate-limited — try again shortly"
                        if _rate_limited_now()
                        else "No live quote",
                    )

        return results
