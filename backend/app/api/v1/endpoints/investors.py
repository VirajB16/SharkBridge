from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_investor
from app.schemas.profile import ProfileResponse
from app.schemas.investor import (
    InvestorPreferencesBase,
    InvestorPreferencesCreate,
    InvestorPreferencesUpdate,
    InvestorPreferencesResponse,
)
from app.db.supabase import get_supabase_admin_client
from app.services.demo_store import DEMO_INVESTOR_PREFERENCES
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.get("/investor/preferences", response_model=InvestorPreferencesResponse, tags=["Investor Preferences"])
async def get_my_preferences(
    current_user: ProfileResponse = Depends(require_investor)
):
    """
    Returns the investment preferences for the authenticated investor.
    """
    admin_sb = get_supabase_admin_client()

    try:
        res = admin_sb.table("investor_preferences").select("*").eq("investor_id", current_user.id).single().execute()
        if res.data:
            return InvestorPreferencesResponse(**res.data)
    except Exception:
        pass

    if current_user.id in DEMO_INVESTOR_PREFERENCES:
        return InvestorPreferencesResponse(**DEMO_INVESTOR_PREFERENCES[current_user.id])

    # If demo investor, return default
    if current_user.email.startswith("demo_"):
        return InvestorPreferencesResponse(
            id="20000000-0000-0000-0000-000000000001",
            investor_id=current_user.id,
            sectors=["AgriTech & Cold Chain", "Clean Energy", "Logistics"],
            min_amount_inr=1500000.0,
            max_amount_inr=7500000.0,
            preferred_stages=["Early Growth", "Seed", "Revenue Generating"],
            preferred_locations=["Maharashtra", "Gujarat", "Karnataka"],
        )

    # Return empty initial preferences
    return InvestorPreferencesResponse(
        id=str(uuid.uuid4()),
        investor_id=current_user.id,
        sectors=[],
        min_amount_inr=None,
        max_amount_inr=None,
        preferred_stages=[],
        preferred_locations=[],
    )

@router.put("/investor/preferences", response_model=InvestorPreferencesResponse, tags=["Investor Preferences"])
async def set_my_preferences(
    pref_in: InvestorPreferencesUpdate,
    current_user: ProfileResponse = Depends(require_investor)
):
    """
    Creates or updates the authenticated investor's investment preferences.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "investor_id": current_user.id,
        "sectors": pref_in.sectors,
        "min_amount_inr": pref_in.min_amount_inr,
        "max_amount_inr": pref_in.max_amount_inr,
        "preferred_stages": pref_in.preferred_stages,
        "preferred_locations": pref_in.preferred_locations or [],
        "updated_at": now_iso,
    }

    try:
        res = admin_sb.table("investor_preferences").upsert(
            record, on_conflict="investor_id"
        ).execute()
        if res.data and len(res.data) > 0:
            return InvestorPreferencesResponse(**res.data[0])
    except Exception:
        pass

    # Store in memory
    record_id = DEMO_INVESTOR_PREFERENCES.get(current_user.id, {}).get("id", str(uuid.uuid4()))
    full_rec = {
        "id": record_id,
        "created_at": now_iso,
        **record
    }
    DEMO_INVESTOR_PREFERENCES[current_user.id] = full_rec
    return InvestorPreferencesResponse(**full_rec)

