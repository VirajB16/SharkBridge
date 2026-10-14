from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import datetime

class InvestorPreferencesBase(BaseModel):
    sectors: List[str] = Field(default_factory=list)
    min_amount_inr: Optional[float] = None
    max_amount_inr: Optional[float] = None
    preferred_stages: List[str] = Field(default_factory=list)
    preferred_locations: Optional[List[str]] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_amount_range(self):
        if self.min_amount_inr is not None and self.min_amount_inr < 0:
            raise ValueError("Minimum funding amount cannot be negative")
        if self.max_amount_inr is not None and self.max_amount_inr < 0:
            raise ValueError("Maximum funding amount cannot be negative")
        if (
            self.min_amount_inr is not None
            and self.max_amount_inr is not None
            and self.min_amount_inr > self.max_amount_inr
        ):
            raise ValueError("Minimum amount cannot exceed maximum amount")
        return self

class InvestorPreferencesCreate(InvestorPreferencesBase):
    pass

class InvestorPreferencesUpdate(InvestorPreferencesBase):
    pass

class InvestorPreferencesResponse(InvestorPreferencesBase):
    id: str
    investor_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvestorPublicProfile(BaseModel):
    id: str
    full_name: str
    email: str
    preferences: Optional[InvestorPreferencesBase] = None

