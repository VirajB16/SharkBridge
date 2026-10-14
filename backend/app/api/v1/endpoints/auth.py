from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.schemas.profile import ProfileResponse, ProfileCreate, ProfileUpdate
from app.schemas.investor import InvestorPublicProfile, InvestorPreferencesBase
from app.db.supabase import get_supabase_admin_client
from app.services.demo_store import DEMO_PROFILES, DEMO_INVESTOR_PREFERENCES
from typing import List
from datetime import datetime, timezone

router = APIRouter()

@router.get("/me", response_model=ProfileResponse, tags=["Profile"])
async def get_my_profile(current_user: ProfileResponse = Depends(get_current_user)):
    """
    Returns the authenticated user's profile derived from the validated JWT token.
    """
    return current_user

@router.post("/profile", response_model=ProfileResponse, tags=["Profile"])
async def create_profile(
    profile_in: ProfileCreate,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Creates or initializes profile for authenticated user after registration.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": current_user.id,
        "email": current_user.email,
        "role": profile_in.role,
        "full_name": profile_in.full_name,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        res = admin_sb.table("profiles").upsert(record).execute()
        if res.data and len(res.data) > 0:
            return ProfileResponse(**res.data[0])
    except Exception as e:
        # Fallback to local store if tables are being set up
        pass

    DEMO_PROFILES[current_user.id] = record
    return ProfileResponse(**record)

@router.patch("/profile", response_model=ProfileResponse, tags=["Profile"])
async def update_profile(
    profile_in: ProfileUpdate,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Updates the authenticated user's own profile.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now_iso}
    if profile_in.full_name is not None:
        updates["full_name"] = profile_in.full_name

    try:
        res = admin_sb.table("profiles").update(updates).eq("id", current_user.id).execute()
        if res.data and len(res.data) > 0:
            return ProfileResponse(**res.data[0])
    except Exception:
        pass

    if current_user.id in DEMO_PROFILES:
        DEMO_PROFILES[current_user.id].update(updates)
        return ProfileResponse(**DEMO_PROFILES[current_user.id])

    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        full_name=profile_in.full_name or current_user.full_name
    )

@router.get("/investors", response_model=List[InvestorPublicProfile], tags=["Profile"])
async def list_investors():
    """
    Lists investors and their published investment criteria for discovery.
    """
    admin_sb = get_supabase_admin_client()
    investors: List[InvestorPublicProfile] = []

    try:
        profiles_res = admin_sb.table("profiles").select("id, full_name, email").eq("role", "investor").execute()
        prefs_res = admin_sb.table("investor_preferences").select("*").execute()
        prefs_map = {p["investor_id"]: p for p in (prefs_res.data or [])}

        for p in (profiles_res.data or []):
            pref_data = prefs_map.get(p["id"])
            pref_obj = InvestorPreferencesBase(**pref_data) if pref_data else None
            investors.append(InvestorPublicProfile(
                id=p["id"],
                full_name=p["full_name"],
                email=p["email"],
                preferences=pref_obj
            ))
        if investors:
            return investors
    except Exception:
        pass

    # Use seed demo investors
    for pid, profile in DEMO_PROFILES.items():
        if profile["role"] == "investor":
            pref = DEMO_INVESTOR_PREFERENCES.get(pid)
            investors.append(InvestorPublicProfile(
                id=pid,
                full_name=profile["full_name"],
                email=profile["email"],
                preferences=InvestorPreferencesBase(**pref) if pref else None
            ))

    return investors

