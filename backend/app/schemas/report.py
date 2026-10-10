from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class GroundedCitation(BaseModel):
    source: str
    url: str
    title: str
    published_at: str
    claim_supported: str

class AIResearchReportResponse(BaseModel):
    asset_id: int
    symbol: str
    asset_name: str
    generated_at: datetime
    model_used: str
    market_overview: str
    technical_outlook: str
    fundamental_outlook: str
    news_impact_assessment: str
    scenarios: Dict[str, Any]
    key_risks: List[str]
    grounded_citations: List[GroundedCitation]
    confidence_score: float

    model_config = ConfigDict(from_attributes=True)
