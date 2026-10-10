from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class NewsArticleSchema(BaseModel):
    id: int
    title: str
    url: str
    source_name: str
    summary: Optional[str] = None
    published_at: datetime
    sentiment_score: float
    impact_rating: str
    category: str
    feed_scope: str = "markets"
    used_in_analysis: bool = True
    related_symbols: List[str] = []

    model_config = ConfigDict(from_attributes=True)
