from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import NewsArticle, Asset, AssetNewsRelation
from app.services.news.rss_collector import LiveNewsCollector

FeedScope = Literal["markets", "world", "all"]


class NewsIntelligenceService:
    """
    Collects, classifies, and persists RSS news.
    Markets scope can map to assets for research.
    World scope is knowledge-only and never used in analysis.
    """

    @staticmethod
    def _utc_iso(dt: datetime) -> str:
        """Always emit UTC with Z so browsers don't treat naive stamps as local time."""
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + "Z"

    @staticmethod
    def _serialize(article: NewsArticle) -> Dict[str, Any]:
        scope = getattr(article, "feed_scope", None) or "markets"
        pub = article.published_at
        return {
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "source_name": article.source_name,
            "summary": article.summary,
            "published_at": NewsIntelligenceService._utc_iso(pub),
            "formatted_datetime": pub.strftime("%b %d, %Y • %I:%M %p UTC"),
            "sentiment_score": article.sentiment_score,
            "impact_rating": article.impact_rating,
            "category": article.category,
            "feed_scope": scope,
            "used_in_analysis": scope == "markets",
        }

    @staticmethod
    async def fetch_and_sync_live_news(
        db: AsyncSession,
        scope: FeedScope = "markets",
    ) -> Dict[str, Any]:
        scopes: List[str]
        if scope == "all":
            scopes = ["markets", "world"]
        else:
            scopes = [scope]

        synced = 0
        live_total = 0
        by_scope: Dict[str, int] = {}

        for sc in scopes:
            live_articles = await LiveNewsCollector.fetch_live_news(scope=sc)  # type: ignore[arg-type]
            live_total += len(live_articles)
            inserted = 0

            for item in live_articles:
                stmt = select(NewsArticle).where(NewsArticle.url == item["url"])
                res = await db.execute(stmt)
                existing = res.scalar_one_or_none()

                pub_dt = (
                    datetime.fromisoformat(item["published_at"])
                    if isinstance(item["published_at"], str)
                    else item["published_at"]
                )
                if pub_dt.tzinfo is not None:
                    pub_dt = pub_dt.astimezone(timezone.utc).replace(tzinfo=None)

                feed_scope = item.get("feed_scope") or sc

                if existing:
                    # Keep metadata + publish time fresh if we re-fetch
                    existing.title = item["title"][:256]
                    existing.summary = item.get("summary")
                    existing.category = item.get("category") or existing.category
                    existing.published_at = pub_dt
                    existing.sentiment_score = item.get("sentiment_score", existing.sentiment_score)
                    existing.impact_rating = item.get("impact_rating", existing.impact_rating)
                    if hasattr(existing, "feed_scope"):
                        existing.feed_scope = feed_scope
                    continue

                article = NewsArticle(
                    title=item["title"][:256],
                    url=item["url"][:512],
                    source_name=item["source_name"],
                    summary=item.get("summary"),
                    category=item.get("category") or "General Market",
                    published_at=pub_dt,
                    sentiment_score=item.get("sentiment_score", 0.0),
                    impact_rating=item.get("impact_rating", "Medium"),
                    feed_scope=feed_scope,
                    is_duplicate=False,
                )
                db.add(article)
                await db.flush()
                inserted += 1
                synced += 1

                # Only markets articles map to instruments for research
                if feed_scope == "markets":
                    for symbol in item.get("related_symbols") or []:
                        asset_stmt = select(Asset).where(Asset.symbol == symbol)
                        asset_res = await db.execute(asset_stmt)
                        asset_obj = asset_res.scalar_one_or_none()
                        if asset_obj:
                            rel = AssetNewsRelation(
                                asset_id=asset_obj.id,
                                news_id=article.id,
                                relevance_score=0.9,
                            )
                            db.add(rel)

            by_scope[sc] = inserted

        await db.commit()
        return {
            "synced_new": synced,
            "fetched": live_total,
            "scopes": by_scope,
            "scope": scope,
        }

    @staticmethod
    async def seed_initial_news(db: AsyncSession):
        try:
            await NewsIntelligenceService.fetch_and_sync_live_news(db, scope="markets")
        except Exception:
            pass

    @staticmethod
    async def list_articles(
        db: AsyncSession,
        *,
        scope: FeedScope = "markets",
        category: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 40,
        max_age_hours: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        stmt = select(NewsArticle).where(NewsArticle.is_duplicate == False)
        if scope in ("markets", "world"):
            # Older rows without column treated as markets via default
            stmt = stmt.where(NewsArticle.feed_scope == scope)
        if category and category != "All":
            stmt = stmt.where(NewsArticle.category == category)
        if source and source != "All":
            stmt = stmt.where(NewsArticle.source_name == source)
        if max_age_hours:
            cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
            stmt = stmt.where(NewsArticle.published_at >= cutoff)

        stmt = stmt.order_by(NewsArticle.published_at.desc()).limit(limit)
        res = await db.execute(stmt)
        articles = res.scalars().all()
        return [NewsIntelligenceService._serialize(a) for a in articles]

    @staticmethod
    async def get_news_for_asset(db: AsyncSession, asset_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Research path: markets news only — never world/general knowledge."""
        try:
            await NewsIntelligenceService.fetch_and_sync_live_news(db, scope="markets")
        except Exception:
            pass

        stmt = (
            select(NewsArticle)
            .join(AssetNewsRelation, AssetNewsRelation.news_id == NewsArticle.id)
            .where(
                AssetNewsRelation.asset_id == asset_id,
                NewsArticle.feed_scope == "markets",
            )
            .order_by(NewsArticle.published_at.desc())
            .limit(limit)
        )
        res = await db.execute(stmt)
        articles = list(res.scalars().all())

        if len(articles) < 3:
            global_stmt = (
                select(NewsArticle)
                .where(NewsArticle.feed_scope == "markets")
                .order_by(NewsArticle.published_at.desc())
                .limit(limit)
            )
            global_res = await db.execute(global_stmt)
            articles = list(global_res.scalars().all())

        return [NewsIntelligenceService._serialize(a) for a in articles]
