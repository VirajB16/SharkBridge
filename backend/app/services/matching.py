from typing import List, Dict, Any, Optional
from app.schemas.match import MatchBreakdown, MatchResultResponse

def calculate_match_score(
    business: Dict[str, Any],
    investor_pref: Dict[str, Any],
    amount_requested: Optional[float] = None
) -> MatchResultResponse:
    """
    Computes a deterministic, explainable match score out of 100
    between a business (and requested funding) and an investor's stated preferences.
    Strictly follows 04_DATA_MODEL.md section 'Matching score'.
    """
    reasons: List[str] = []
    breakdown = MatchBreakdown()
    total_score = 0

    biz_sector = (business.get("sector") or "").strip().lower()
    inv_sectors = [s.strip().lower() for s in (investor_pref.get("sectors") or [])]
    
    # 1. Sector match: 40 points
    if biz_sector and any(biz_sector == s or biz_sector in s or s in biz_sector for s in inv_sectors):
        breakdown.sector_points = 40
        reasons.append(f"Sector fit (+40 pts): Business sector '{business.get('sector')}' aligns with investor's target sectors.")
    elif not inv_sectors:
        reasons.append("Sector criteria (+0 pts): Investor has not specified target sectors yet.")
    else:
        reasons.append(f"Sector mismatch (+0 pts): Business operates in '{business.get('sector')}', investor targets: {', '.join(investor_pref.get('sectors') or [])}.")

    # 2. Funding amount capacity: 30 points (based on Maximum Ticket Size)
    req_amount = amount_requested
    max_amt = investor_pref.get("max_amount_inr")

    if req_amount is not None and req_amount > 0:
        if max_amt is not None and max_amt > 0:
            if req_amount <= max_amt:
                breakdown.amount_points = 30
                reasons.append(f"Ticket size fit (+30 pts): Requested ₹{req_amount:,.0f} is within investor maximum ticket of ₹{max_amt:,.0f}.")
            else:
                reasons.append(f"Ticket size exceeded (+0 pts): Requested ₹{req_amount:,.0f} exceeds investor maximum ticket of ₹{max_amt:,.0f}.")
        else:
            breakdown.amount_points = 30
            reasons.append("Ticket size flexible (+30 pts): Investor has set flexible ticket size limits.")
    else:
        if max_amt is not None and max_amt > 0:
            breakdown.amount_points = 30
            reasons.append(f"Ticket capacity (+30 pts): Investor backs SME investments up to ₹{max_amt:,.0f}.")
        else:
            reasons.append("Funding amount (+0 pts): No active application amount requested yet.")

    # 3. Business stage match: 20 points
    biz_stage = (business.get("stage") or "").strip().lower()
    inv_stages = [st.strip().lower() for st in (investor_pref.get("preferred_stages") or [])]

    if biz_stage and any(biz_stage == st or biz_stage in st or st in biz_stage for st in inv_stages):
        breakdown.stage_points = 20
        reasons.append(f"Business stage fit (+20 pts): Stage '{business.get('stage')}' matches investor preferred stages.")
    elif not inv_stages:
        reasons.append("Business stage (+0 pts): Investor is open to all development stages.")
    else:
        reasons.append(f"Business stage mismatch (+0 pts): Business is at '{business.get('stage')}', investor targets: {', '.join(investor_pref.get('preferred_stages') or [])}.")

    # 4. Location match: up to 10 points
    biz_loc = (business.get("location") or "").strip().lower()
    inv_locs = [l.strip().lower() for l in (investor_pref.get("preferred_locations") or [])]

    if biz_loc and inv_locs:
        if any(biz_loc == l or biz_loc in l or l in biz_loc for l in inv_locs):
            breakdown.location_points = 10
            reasons.append(f"Location preference fit (+10 pts): Business in '{business.get('location')}' matches investor geographic focus.")
        else:
            reasons.append(f"Location mismatch (+0 pts): Business is in '{business.get('location')}', investor prefers: {', '.join(investor_pref.get('preferred_locations') or [])}.")
    elif not biz_loc and not inv_locs:
        reasons.append("Location preference (+0 pts): Neither party specified geographic restrictions.")
    elif not biz_loc:
        reasons.append("Location (+0 pts): Business profile did not provide a location.")
    else:
        reasons.append("Location (+0 pts): Investor did not specify location constraints.")

    total_score = (
        breakdown.sector_points
        + breakdown.amount_points
        + breakdown.stage_points
        + breakdown.location_points
    )
    breakdown.total_score = total_score

    return MatchResultResponse(
        score=total_score,
        reasons=reasons,
        breakdown=breakdown,
    )

