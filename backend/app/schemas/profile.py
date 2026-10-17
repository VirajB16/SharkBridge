from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

UserRole = Literal["entrepreneur", "investor"]

class ProfileBase(BaseModel):
    full_name: str
    role: UserRole

class ProfileCreate(ProfileBase):
    email: Optional[EmailStr] = None

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    full_name: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None

class ProfileResponse(ProfileBase):
    id: str
    email: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

