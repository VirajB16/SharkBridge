from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_entrepreneur
from app.schemas.profile import ProfileResponse
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse
from app.db.supabase import get_supabase_admin_client
from app.services.demo_store import DEMO_BUSINESSES
from typing import List
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.post("/businesses", response_model=BusinessResponse, tags=["Businesses"])
async def create_business(
    biz_in: BusinessCreate,
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Creates a new business profile owned by the authenticated entrepreneur.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    biz_id = str(uuid.uuid4())
    
    record = {
        "id": biz_id,
        "owner_id": current_user.id,
        "name": biz_in.name,
        "sector": biz_in.sector,
        "description": biz_in.description,
        "stage": biz_in.stage,
        "location": biz_in.location,
        "target_customers": biz_in.target_customers,
        "monthly_revenue_inr": biz_in.monthly_revenue_inr,
        "monthly_expenses_inr": biz_in.monthly_expenses_inr,
        "growth_plan": biz_in.growth_plan,
        "website_url": biz_in.website_url,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        res = admin_sb.table("businesses").insert(record).execute()
        if res.data and len(res.data) > 0:
            return BusinessResponse(**res.data[0])
    except Exception:
        pass

    DEMO_BUSINESSES[biz_id] = record
    return BusinessResponse(**record)

@router.get("/businesses/mine", response_model=List[BusinessResponse], tags=["Businesses"])
async def list_my_businesses(
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Lists all businesses owned by the authenticated entrepreneur.
    """
    admin_sb = get_supabase_admin_client()

    try:
        res = admin_sb.table("businesses").select("*").eq("owner_id", current_user.id).execute()
        if res.data:
            return [BusinessResponse(**item) for item in res.data]
    except Exception:
        pass

    # Search local store
    results = [
        BusinessResponse(**b)
        for b in DEMO_BUSINESSES.values()
        if b["owner_id"] == current_user.id
    ]
    # If empty and user is demo entrepreneur, return demo business
    if not results and current_user.email.startswith("demo_"):
        results = [BusinessResponse(**b) for b in DEMO_BUSINESSES.values()]

    return results

@router.get("/businesses/{business_id}", response_model=BusinessResponse, tags=["Businesses"])
async def get_business_detail(
    business_id: str,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Returns business details. Authorized for the owner entrepreneur or any authenticated investor.
    """
    admin_sb = get_supabase_admin_client()

    try:
        res = admin_sb.table("businesses").select("*").eq("id", business_id).single().execute()
        if res.data:
            data = res.data
            # Authorization check: owner or investor
            if current_user.role != "investor" and data["owner_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view this business profile."
                )
            return BusinessResponse(**data)
    except HTTPException:
        raise
    except Exception:
        pass

    if business_id in DEMO_BUSINESSES:
        data = DEMO_BUSINESSES[business_id]
        if current_user.role != "investor" and data["owner_id"] != current_user.id and not current_user.email.startswith("demo_"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this business profile."
            )
        return BusinessResponse(**data)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Business profile not found."
    )

@router.patch("/businesses/{business_id}", response_model=BusinessResponse, tags=["Businesses"])
async def update_business(
    business_id: str,
    biz_in: BusinessUpdate,
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Updates a business profile. Restricted strictly to the owner entrepreneur.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {k: v for k, v in biz_in.dict(exclude_unset=True).items()}
    updates["updated_at"] = now_iso

    try:
        # Check ownership first
        existing = admin_sb.table("businesses").select("owner_id").eq("id", business_id).single().execute()
        if existing.data and existing.data["owner_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own business profile."
            )

        res = admin_sb.table("businesses").update(updates).eq("id", business_id).execute()
        if res.data and len(res.data) > 0:
            return BusinessResponse(**res.data[0])
    except HTTPException:
        raise
    except Exception:
        pass

    if business_id in DEMO_BUSINESSES:
        if DEMO_BUSINESSES[business_id]["owner_id"] != current_user.id and not current_user.email.startswith("demo_"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own business profile."
            )
        DEMO_BUSINESSES[business_id].update(updates)
        return BusinessResponse(**DEMO_BUSINESSES[business_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Business profile not found."
    )

