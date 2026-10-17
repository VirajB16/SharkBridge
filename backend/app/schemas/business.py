from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sector: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=5)
    stage: str = Field(..., min_length=1)
    location: Optional[str] = None
    target_customers: Optional[str] = None
    monthly_revenue_inr: Optional[float] = None
    monthly_expenses_inr: Optional[float] = None
    growth_plan: Optional[str] = None
    website_url: Optional[str] = None
    gstin: Optional[str] = None

    @field_validator("monthly_revenue_inr", "monthly_expenses_inr")
    @classmethod
    def validate_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Financial figures in INR cannot be negative")
        return v

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    stage: Optional[str] = None
    location: Optional[str] = None
    target_customers: Optional[str] = None
    monthly_revenue_inr: Optional[float] = None
    monthly_expenses_inr: Optional[float] = None
    growth_plan: Optional[str] = None
    website_url: Optional[str] = None
    gstin: Optional[str] = None

    @field_validator("monthly_revenue_inr", "monthly_expenses_inr")
    @classmethod
    def validate_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Financial figures in INR cannot be negative")
        return v

class BusinessResponse(BusinessBase):
    id: str
    owner_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

