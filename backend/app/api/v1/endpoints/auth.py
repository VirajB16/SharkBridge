from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.schemas.profile import ProfileResponse, ProfileCreate, ProfileUpdate, UserRegisterRequest
from app.schemas.investor import InvestorPublicProfile, InvestorPreferencesBase
from app.db.supabase import get_supabase_admin_client
from app.services.demo_store import DEMO_PROFILES, DEMO_INVESTOR_PREFERENCES
from typing import List
from datetime import datetime, timezone

router = APIRouter()

@router.post("/register", response_model=ProfileResponse, tags=["Auth"])
async def register_user(reg_data: UserRegisterRequest):
    """
    Registers a new user directly in Supabase Auth using the server-side admin client.
    Sets email_confirm=True, eliminating Supabase Auth's 429 email rate-limit and 400 redirect_to issues.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        user_attributes = {
            "email": reg_data.email,
            "password": reg_data.password,
            "email_confirm": True,
            "user_metadata": {
                "role": reg_data.role,
                "full_name": reg_data.full_name,
            },
        }
        res = admin_sb.auth.admin.create_user(user_attributes)
        user_id = str(res.user.id)
    except Exception as e:
        err_msg = str(e)
        if "already been registered" in err_msg.lower() or "already exists" in err_msg.lower() or "duplicate" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please log in.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {err_msg}",
        )

    profile_record = {
        "id": user_id,
        "email": reg_data.email,
        "role": reg_data.role,
        "full_name": reg_data.full_name,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    try:
        admin_sb.table("profiles").upsert(profile_record).execute()
    except Exception:
        pass

    DEMO_PROFILES[user_id] = profile_record
    return ProfileResponse(**profile_record)


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
    from app.api.v1.endpoints.investors import INVESTOR_CV_STORE
    admin_sb = get_supabase_admin_client()
    investors: List[InvestorPublicProfile] = []

    try:
        profiles_res = admin_sb.table("profiles").select("id, full_name, email").eq("role", "investor").execute()
        prefs_res = admin_sb.table("investor_preferences").select("*").execute()
        prefs_map = {p["investor_id"]: p for p in (prefs_res.data or [])}

        for p in (profiles_res.data or []):
            pref_data = dict(prefs_map.get(p["id"]) or {})
            stored_cv = INVESTOR_CV_STORE.get(p["id"])
            if stored_cv:
                if not pref_data.get("cv_file_url"):
                    pref_data["cv_file_url"] = stored_cv.get("cv_file_url")
                    pref_data["cv_file_name"] = stored_cv.get("cv_file_name")
                if not pref_data.get("ocr_result"):
                    pref_data["ocr_result"] = stored_cv.get("ocr_result")

            pref_obj = InvestorPreferencesBase(**pref_data) if pref_data else None
            investors.append(InvestorPublicProfile(
                id=p["id"],
                full_name=p["full_name"],
                email=p["email"],
                cv_file_url=pref_data.get("cv_file_url"),
                cv_file_name=pref_data.get("cv_file_name"),
                ocr_result=pref_data.get("ocr_result"),
                preferences=pref_obj
            ))
        if investors:
            return investors
    except Exception:
        pass

    # Use seed demo investors
    for pid, profile in DEMO_PROFILES.items():
        if profile["role"] == "investor":
            pref = dict(DEMO_INVESTOR_PREFERENCES.get(pid) or {})
            stored_cv = INVESTOR_CV_STORE.get(pid)
            if stored_cv:
                pref["cv_file_url"] = stored_cv.get("cv_file_url")
                pref["cv_file_name"] = stored_cv.get("cv_file_name")
                pref["ocr_result"] = stored_cv.get("ocr_result")

            investors.append(InvestorPublicProfile(
                id=pid,
                full_name=profile["full_name"],
                email=profile["email"],
                cv_file_url=pref.get("cv_file_url"),
                cv_file_name=pref.get("cv_file_name"),
                ocr_result=pref.get("ocr_result"),
                preferences=InvestorPreferencesBase(**pref) if pref else None
            ))

    return investors

