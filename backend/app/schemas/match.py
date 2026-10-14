from pydantic import BaseModel
from typing import List, Optional
from app.schemas.investor import InvestorPreferencesBase
from app.schemas.business import BusinessBase

class MatchBreakdown(BaseModel):
    sector_points: int = 0
    amount_points: int = 0
    stage_points: int = 0
    location_points: int = 0
    total_score: int = 0

class MatchResultResponse(BaseModel):
    investor_id: Optional[str] = None
    investor_name: Optional[str] = None
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    score: int
    reasons: List[str]
    breakdown: MatchBreakdown
    notice: str = "This match score is an explainable recommendation aid, not an investment endorsement or risk rating."
    preferences: Optional[InvestorPreferencesBase] = None
    business: Optional[BusinessBase] = None

