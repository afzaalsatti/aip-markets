import asyncio
import httpx
import feedparser
from datetime import datetime, timezone
import re
from typing import List, Dict, Any, Optional, Literal

FeedScope = Literal["markets", "world"]

# Markets / finance — public/gov & public-broadcaster RSS only (free personal research).
# Avoid aggregator/commercial scrapes (Google News, Reddit, paid wires).
MARKET_RSS_FEEDS = [
    {
        "source": "Federal Reserve (Fed)",
        "url": "https://www.federalreserve.gov/feeds/press_all.xml",
        "category": "Central Banking & Monetary Policy",
        "scope": "markets",
    },
    {
        "source": "ECB Press",
        "url": "https://www.ecb.europa.eu/rss/press.html",
        "category": "Central Banking & Monetary Policy",
        "scope": "markets",
    },
    {
        "source": "SEC Press Releases",
        "url": "https://www.sec.gov/news/pressreleases.rss",
        "category": "Corporate Fundamentals & Earnings",
        "scope": "markets",
    },
    {
        "source": "BBC Business",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "category": "General Market",
        "scope": "markets",
    },
    {
        "source": "NPR Business",
        "url": "https://feeds.npr.org/1006/rss.xml",
        "category": "General Market",
        "scope": "markets",
    },
    {
        "source": "Deutsche Welle Business",
        "url": "https://rss.dw.com/rdf/rss-en-bus",
        "category": "Geopolitics & Supply Chain",
        "scope": "markets",
    },
]

# General world news — public broadcasters & IGOs only; NOT used in research analysis
WORLD_RSS_FEEDS = [
    {
        "source": "BBC World",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "category": "World · Top Stories",
        "scope": "world",
    },
    {
        "source": "NPR News",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "category": "World · Top Stories",
        "scope": "world",
    },
    {
        "source": "Deutsche Welle",
        "url": "https://rss.dw.com/rdf/rss-en-world",
        "category": "World · Geopolitics",
        "scope": "world",
    },
    {
        "source": "France 24",
        "url": "https://www.france24.com/en/rss",
        "category": "World · Top Stories",
        "scope": "world",
    },
    {
        "source": "BBC Science",
        "url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        "category": "World · Science & Health",
        "scope": "world",
    },
    {
        "source": "BBC Technology",
        "url": "https://feeds.bbci.co.uk/news/technology/rss.xml",
        "category": "World · Technology",
        "scope": "world",
    },
    {
        "source": "NASA Breaking News",
        "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss",
        "category": "World · Science & Health",
        "scope": "world",
    },
    {
        "source": "WHO News",
        "url": "https://www.who.int/rss-feeds/news-english.xml",
        "category": "World · Science & Health",
        "scope": "world",
    },
    {
        "source": "UN News",
        "url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
        "category": "World · Geopolitics",
        "scope": "world",
    },
]

# Reliable public backups if primary URLs fail
BACKUP_WORLD_FEEDS = [
    {
        "source": "BBC World (alt)",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "category": "World · Top Stories",
        "scope": "world",
    },
    {
        "source": "NPR News (alt)",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "category": "World · Top Stories",
        "scope": "world",
    },
]

POSITIVE_KEYWORDS = [
    "surge", "jump", "pivot", "boost", "growth", "rally", "profit", "bullish",
    "record", "gain", "easing", "upward", "expansion", "soar", "peace", "deal",
]
NEGATIVE_KEYWORDS = [
    "drop", "fall", "plunge", "slump", "concern", "inflation", "recession",
    "bearish", "loss", "crash", "tension", "war", "tariff", "risk", "debt",
    "deficit", "attack", "crisis", "sanctions",
]

SYMBOL_KEYWORDS = {
    "AAPL": ["apple", "iphone", "aapl", "macbook"],
    "NVDA": ["nvidia", "nvda", "gpu", "ai chip", "semiconductor"],
    "MSFT": ["microsoft", "msft", "azure", "openai"],
    "AMZN": ["amazon", "amzn", "aws"],
    "GOOGL": ["alphabet", "google", "googl"],
    "META": ["meta", "facebook"],
    "TSLA": ["tesla", "tsla", "musk"],
    "GC=F": ["gold", "bullion", "precious metal", "xau"],
    "SI=F": ["silver", "xag"],
    "CL=F": ["crude oil", "wti", "oil futures", "brent", "petroleum", "energy"],
    "BZ=F": ["brent", "oil"],
    "BTC-USD": ["bitcoin", "btc", "crypto"],
    "ETH-USD": ["ethereum", "eth"],
    "EURUSD=X": ["euro", "eur/usd", "ecb"],
    "^TNX": [
        "treasury", "yield", "fed", "federal reserve", "interest rate",
        "inflation", "fomc", "cpi", "pce",
    ],
}

USER_AGENT = (
    "AIPMarkets/1.0 (+local personal research; open-source; respectful RSS client; "
    "not a commercial scraper)"
)


class LiveNewsCollector:
    """Fetches markets + general world RSS from multiple public sources."""

    @staticmethod
    def list_sources(scope: Optional[FeedScope] = None) -> List[Dict[str, str]]:
        feeds = MARKET_RSS_FEEDS + WORLD_RSS_FEEDS
        if scope in ("markets", "world"):
            feeds = [f for f in feeds if f["scope"] == scope]
        return [
            {
                "source": f["source"],
                "category": f["category"],
                "scope": f["scope"],
                "url": f["url"],
            }
            for f in feeds
        ]

    @staticmethod
    def parse_entry_date(entry: Any) -> datetime:
        for attr in ("published_parsed", "updated_parsed"):
            parsed = getattr(entry, attr, None)
            if parsed:
                try:
                    return datetime(*parsed[:6], tzinfo=timezone.utc)
                except Exception:
                    pass
        return datetime.now(timezone.utc)

    @staticmethod
    def clean_summary(summary: str, title: str, max_len: int = 320) -> str:
        text = re.sub(r"<[^>]+>", " ", summary or "")
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            return title
        if len(text) > max_len:
            return text[: max_len - 1].rstrip() + "…"
        return text

    @staticmethod
    def calculate_sentiment_and_impact(text: str, scope: str) -> tuple[float, str]:
        text_lower = text.lower()
        pos_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
        neg_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)
        total = pos_count + neg_count
        score = 0.0 if total == 0 else (pos_count - neg_count) / float(total)

        if scope == "world":
            # Softer impact for general knowledge headlines
            if any(k in text_lower for k in ["war", "attack", "earthquake", "pandemic"]):
                impact = "High"
            elif abs(score) > 0.5:
                impact = "Medium"
            else:
                impact = "Low"
        else:
            if abs(score) > 0.4 or any(
                k in text_lower for k in ["fed", "federal reserve", "cpi", "inflation", "war"]
            ):
                impact = "High"
            else:
                impact = "Medium"

        return round(score, 2), impact

    @staticmethod
    def extract_related_symbols(text: str, scope: str) -> List[str]:
        if scope == "world":
            return []  # never force-map world news onto tickers
        text_lower = text.lower()
        matched = [sym for sym, kws in SYMBOL_KEYWORDS.items() if any(kw in text_lower for kw in kws)]
        return matched

    @classmethod
    async def _fetch_one_feed(
        cls,
        client: httpx.AsyncClient,
        feed: Dict[str, str],
        per_feed: int,
    ) -> List[Dict[str, Any]]:
        try:
            res = await client.get(feed["url"], headers={"User-Agent": USER_AGENT})
            if res.status_code != 200 or not res.content:
                return []
            parsed = feedparser.parse(res.content)
            out: List[Dict[str, Any]] = []
            for entry in parsed.entries[:per_feed]:
                title = getattr(entry, "title", "") or ""
                title = title.strip()
                link = (getattr(entry, "link", "") or "").strip()
                summary = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
                if not title or not link:
                    continue
                summary_clean = cls.clean_summary(summary, title)
                pub_dt = cls.parse_entry_date(entry)
                # Drop broken / ancient stamps (bad RSS clocks)
                age_hours = (
                    datetime.now(timezone.utc) - pub_dt.astimezone(timezone.utc)
                ).total_seconds() / 3600
                if age_hours > 24 * 14 or age_hours < -6:
                    continue
                scope = feed["scope"]
                combined = f"{title} {summary_clean}"
                sentiment, impact = cls.calculate_sentiment_and_impact(combined, scope)
                out.append(
                    {
                        "title": title[:256],
                        "url": link[:512],
                        "source_name": feed["source"],
                        "summary": summary_clean,
                        "category": feed["category"],
                        "feed_scope": scope,
                        "published_at": pub_dt.astimezone(timezone.utc).strftime(
                            "%Y-%m-%dT%H:%M:%SZ"
                        ),
                        "sentiment_score": sentiment,
                        "impact_rating": impact,
                        "related_symbols": cls.extract_related_symbols(combined, scope),
                    }
                )
            return out
        except Exception:
            return []

    @classmethod
    def _diversify_by_source(cls, articles: List[Dict[str, Any]], max_per_source: int = 4) -> List[Dict[str, Any]]:
        """Keep newest overall, but avoid one slow outlet flooding the top of the list."""
        articles = sorted(articles, key=lambda a: a["published_at"], reverse=True)
        counts: Dict[str, int] = {}
        primary: List[Dict[str, Any]] = []
        overflow: List[Dict[str, Any]] = []
        for item in articles:
            src = item.get("source_name") or "unknown"
            n = counts.get(src, 0)
            if n < max_per_source:
                primary.append(item)
                counts[src] = n + 1
            else:
                overflow.append(item)
        return primary + overflow

    @classmethod
    async def fetch_live_news(
        cls,
        scope: FeedScope = "markets",
        per_feed: int = 8,
    ) -> List[Dict[str, Any]]:
        if scope == "world":
            feeds = list(WORLD_RSS_FEEDS) + list(BACKUP_WORLD_FEEDS)
        else:
            feeds = list(MARKET_RSS_FEEDS)

        articles: List[Dict[str, Any]] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            results = await asyncio.gather(
                *[cls._fetch_one_feed(client, feed, per_feed) for feed in feeds]
            )

        for batch in results:
            for item in batch:
                url = item["url"]
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                articles.append(item)

        # Never invent headlines — empty list when feeds are unreachable
        return cls._diversify_by_source(articles, max_per_source=4 if scope == "markets" else 6)

    @classmethod
    async def fetch_live_global_news(cls) -> List[Dict[str, Any]]:
        """Back-compat: markets feed only (analysis path)."""
        return await cls.fetch_live_news(scope="markets")
