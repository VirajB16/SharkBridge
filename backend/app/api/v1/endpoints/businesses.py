from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_entrepreneur
from app.schemas.profile import ProfileResponse
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse
from app.db.supabase import get_supabase_admin_client, safe_supabase_insert, safe_supabase_update
from app.services.demo_store import DEMO_BUSINESSES
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for newly added fields (e.g. gstin) if DB migration hasn't been executed
BUSINESS_EXTRAS = {}

@router.post("/businesses", response_model=BusinessResponse, tags=["Businesses"])
async def create_business(
    biz_in: BusinessCreate,
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Creates a new business profile owned by the authenticated entrepreneur.
    """
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
        "gstin": biz_in.gstin,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    if biz_in.gstin:
        BUSINESS_EXTRAS[biz_id] = {"gstin": biz_in.gstin}

    try:
        data = safe_supabase_insert("businesses", record)
        if data and len(data) > 0:
            full_data = {**record, **data[0]}
            DEMO_BUSINESSES[biz_id] = full_data
            return BusinessResponse(**full_data)
    except Exception as e:
        logger.error(f"Error inserting business into Supabase: {e}")

    DEMO_BUSINESSES[biz_id] = record
    return BusinessResponse(**record)

@router.get("/businesses/mine", response_model=List[BusinessResponse], tags=["Businesses"])
async def list_my_businesses(
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Lists all businesses owned by the authenticated entrepreneur.
    Shows empty list for new users with no businesses.
    """
    admin_sb = get_supabase_admin_client()

    try:
        res = admin_sb.table("businesses").select("*").eq("owner_id", current_user.id).execute()
        if res.data is not None and len(res.data) > 0:
            results = []
            for item in res.data:
                b_dict = dict(item)
                if b_dict.get("gstin") is None and b_dict.get("id") in BUSINESS_EXTRAS:
                    b_dict["gstin"] = BUSINESS_EXTRAS[b_dict["id"]].get("gstin")
                results.append(BusinessResponse(**b_dict))
            return results
    except Exception as e:
        logger.error(f"Error fetching businesses from Supabase: {e}")

    # Check in-memory store for businesses created by this entrepreneur
    local_businesses = [
        BusinessResponse(**b)
        for b in DEMO_BUSINESSES.values()
        if b.get("owner_id") == current_user.id
    ]
    if local_businesses:
        return local_businesses

    # Fallback to seed demo businesses strictly for demo accounts
    if current_user.email.startswith("demo_"):
        return [BusinessResponse(**b) for b in DEMO_BUSINESSES.values()]

    return []


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
    updates = {k: v for k, v in biz_in.model_dump(exclude_unset=True).items()}
    updates["updated_at"] = now_iso

    if biz_in.gstin is not None:
        if business_id not in BUSINESS_EXTRAS:
            BUSINESS_EXTRAS[business_id] = {}
        BUSINESS_EXTRAS[business_id]["gstin"] = biz_in.gstin

    try:
        # Check ownership first
        existing = admin_sb.table("businesses").select("owner_id").eq("id", business_id).single().execute()
        if existing.data and existing.data["owner_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own business profile."
            )

        data = safe_supabase_update("businesses", updates, "id", business_id)
        if data and len(data) > 0:
            res_dict = {**updates, **data[0]}
            if biz_in.gstin is not None:
                res_dict["gstin"] = biz_in.gstin
            if business_id in DEMO_BUSINESSES:
                DEMO_BUSINESSES[business_id].update(res_dict)
            else:
                DEMO_BUSINESSES[business_id] = res_dict
            return BusinessResponse(**res_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating business in Supabase: {e}")

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


