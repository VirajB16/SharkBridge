from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any, Dict, Literal
from datetime import datetime
from app.schemas.business import BusinessResponse
from app.schemas.profile import ProfileResponse

ApplicationStatus = Literal[
    "submitted",
    "under_review",
    "request_information",
    "interested",
    "declined",
    "closed"
]

class ApplicationCreate(BaseModel):
    business_id: str
    investor_id: str
    amount_requested_inr: float = Field(..., gt=0, description="Funding amount requested in INR; must be > 0")
    use_of_funds: str = Field(..., min_length=5, description="Intended purpose of funds")
    growth_plan: str = Field(..., min_length=5, description="Growth and milestone plan")
    additional_notes: Optional[str] = None
    confirmation: bool = Field(..., description="Confirmation that submitted information is accurate")

    @field_validator("confirmation")
    @classmethod
    def validate_confirmation(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must confirm that the submitted information is accurate to the best of your knowledge.")
        return v

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus

class ApplicationResponse(BaseModel):
    id: str
    business_id: str
    entrepreneur_id: str
    investor_id: str
    amount_requested_inr: float
    use_of_funds: str
    growth_plan: str
    additional_notes: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_missing_information: Optional[Any] = None
    status: ApplicationStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Optional expanded entities
    business: Optional[BusinessResponse] = None
    entrepreneur: Optional[ProfileResponse] = None
    investor: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True

