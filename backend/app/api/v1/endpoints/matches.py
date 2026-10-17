from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.profile import ProfileResponse
from app.schemas.match import MatchResultResponse
from app.schemas.investor import InvestorPreferencesBase
from app.schemas.business import BusinessBase
from app.services.matching import calculate_match_score
from app.db.supabase import get_supabase_admin_client
from app.services.demo_store import (
    DEMO_PROFILES,
    DEMO_BUSINESSES,
    DEMO_INVESTOR_PREFERENCES,
)
from typing import List

router = APIRouter()

@router.get("/matches", response_model=List[MatchResultResponse], tags=["Matching"])
async def get_matches(current_user: ProfileResponse = Depends(get_current_user)):
    """
    Returns explainable investor matches for an entrepreneur,
    or business pipeline matches for an investor, ranked by deterministic score.
    """
    admin_sb = get_supabase_admin_client()
    matches: List[MatchResultResponse] = []

    # 1. ENTREPRENEUR PERSPECTIVE: Match own business against all investors
    if current_user.role == "entrepreneur":
        # Find entrepreneur's business
        business_data = None
        try:
            biz_res = admin_sb.table("businesses").select("*").eq("owner_id", current_user.id).limit(1).execute()
            if biz_res.data:
                business_data = biz_res.data[0]
        except Exception:
            pass

        if not business_data:
            # Fallback to local store strictly for demo accounts
            if current_user.email.startswith("demo_"):
                for b in DEMO_BUSINESSES.values():
                    if b["owner_id"] == current_user.id or current_user.email.startswith("demo_"):
                        business_data = b
                        break

        if not business_data:
            return []

        # Find all investors and their preferences
        investors_list = []
        try:
            prof_res = admin_sb.table("profiles").select("id, full_name, email").eq("role", "investor").execute()
            prefs_res = admin_sb.table("investor_preferences").select("*").execute()
            prefs_map = {p["investor_id"]: p for p in (prefs_res.data or [])}

            for p in (prof_res.data or []):
                pref = prefs_map.get(p["id"])
                if pref:
                    investors_list.append((p, pref))
        except Exception:
            pass

        if not investors_list and current_user.email.startswith("demo_"):
            for pid, prof in DEMO_PROFILES.items():
                if prof["role"] == "investor":
                    pref = DEMO_INVESTOR_PREFERENCES.get(pid)
                    if pref:
                        investors_list.append((prof, pref))

        # Score against each investor
        for investor_profile, pref in investors_list:
            match_res = calculate_match_score(
                business=business_data,
                investor_pref=pref,
            )
            match_res.investor_id = investor_profile["id"]
            match_res.investor_name = investor_profile["full_name"]
            match_res.preferences = InvestorPreferencesBase(**pref)
            matches.append(match_res)

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches

    # 2. INVESTOR PERSPECTIVE: Match own preferences against all businesses
    else:
        investor_pref = None
        try:
            pref_res = admin_sb.table("investor_preferences").select("*").eq("investor_id", current_user.id).single().execute()
            if pref_res.data:
                investor_pref = pref_res.data
        except Exception:
            pass

        if not investor_pref and current_user.id in DEMO_INVESTOR_PREFERENCES:
            investor_pref = DEMO_INVESTOR_PREFERENCES.get(current_user.id)

        if not investor_pref:
            if current_user.email.startswith("demo_"):
                investor_pref = list(DEMO_INVESTOR_PREFERENCES.values())[0]
            else:
                # Open discovery fallback so new investors immediately see SME pipeline deals
                investor_pref = {
                    "investor_id": current_user.id,
                    "sectors": [],
                    "max_amount_inr": 100000000.0,
                    "preferred_stages": [],
                    "preferred_locations": []
                }

        businesses_list = []
        try:
            biz_res = admin_sb.table("businesses").select("*").execute()
            if biz_res.data:
                businesses_list = biz_res.data
        except Exception:
            pass

        # Merge in any demo/local businesses not yet in DB table
        existing_ids = {b.get("id") for b in businesses_list if isinstance(b, dict)}
        for d_id, d_biz in DEMO_BUSINESSES.items():
            if d_id not in existing_ids:
                businesses_list.append(d_biz)

        for biz in businesses_list:
            try:
                match_res = calculate_match_score(
                    business=biz,
                    investor_pref=investor_pref,
                )
                match_res.business_id = biz.get("id")
                match_res.business_name = biz.get("name")
                match_res.business = BusinessBase(**biz)
                matches.append(match_res)
            except Exception:
                continue

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches

