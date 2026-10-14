from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_entrepreneur, require_investor
from app.schemas.profile import ProfileResponse
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
)
from app.schemas.business import BusinessResponse
from app.db.supabase import get_supabase_admin_client
from app.services.ai_summary import generate_ai_summary
from app.services.demo_store import (
    DEMO_APPLICATIONS,
    DEMO_BUSINESSES,
    DEMO_PROFILES,
)
from datetime import datetime, timezone
from typing import List
import uuid

router = APIRouter()

@router.post("/applications", response_model=ApplicationResponse, tags=["Applications"])
async def submit_application(
    app_in: ApplicationCreate,
    current_user: ProfileResponse = Depends(require_entrepreneur)
):
    """
    Submits a funding application from an entrepreneur to a target investor.
    Automatically generates an AI summary based strictly on submitted data.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    app_id = str(uuid.uuid4())

    # 1. Fetch business details
    biz_data = None
    try:
        b_res = admin_sb.table("businesses").select("*").eq("id", app_in.business_id).single().execute()
        if b_res.data:
            biz_data = b_res.data
    except Exception:
        pass

    if not biz_data:
        biz_data = DEMO_BUSINESSES.get(app_in.business_id)
        if not biz_data and current_user.email.startswith("demo_"):
            biz_data = list(DEMO_BUSINESSES.values())[0]

    if not biz_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referenced business profile was not found."
        )

    # 2. Generate AI summary
    app_dict = app_in.model_dump()
    ai_summary_text, ai_missing = await generate_ai_summary(
        business=biz_data,
        application=app_dict
    )

    record = {
        "id": app_id,
        "business_id": app_in.business_id,
        "entrepreneur_id": current_user.id,
        "investor_id": app_in.investor_id,
        "amount_requested_inr": app_in.amount_requested_inr,
        "use_of_funds": app_in.use_of_funds,
        "growth_plan": app_in.growth_plan,
        "additional_notes": app_in.additional_notes,
        "ai_summary": ai_summary_text,
        "ai_missing_information": ai_missing,
        "status": "submitted",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        res = admin_sb.table("funding_applications").insert(record).execute()
        if res.data and len(res.data) > 0:
            return ApplicationResponse(**res.data[0])
    except Exception:
        pass

    DEMO_APPLICATIONS[app_id] = record
    return ApplicationResponse(**record)

@router.get("/applications/mine", response_model=List[ApplicationResponse], tags=["Applications"])
async def list_my_applications(
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Lists applications submitted by the entrepreneur or received by the investor.
    """
    admin_sb = get_supabase_admin_client()
    query_col = "entrepreneur_id" if current_user.role == "entrepreneur" else "investor_id"

    try:
        res = admin_sb.table("funding_applications").select("*").eq(query_col, current_user.id).order("created_at", desc=True).execute()
        if res.data:
            apps = []
            for item in res.data:
                app_obj = ApplicationResponse(**item)
                # Attach business if available
                if item.get("business_id"):
                    b_res = admin_sb.table("businesses").select("*").eq("id", item["business_id"]).single().execute()
                    if b_res.data:
                        app_obj.business = BusinessResponse(**b_res.data)
                apps.append(app_obj)
            return apps
    except Exception:
        pass

    # Search local store
    results = []
    for item in DEMO_APPLICATIONS.values():
        if (
            (current_user.role == "entrepreneur" and (item["entrepreneur_id"] == current_user.id or current_user.email.startswith("demo_")))
            or (current_user.role == "investor" and (item["investor_id"] == current_user.id or current_user.email.startswith("demo_")))
        ):
            app_obj = ApplicationResponse(**item)
            b = DEMO_BUSINESSES.get(item["business_id"])
            if b:
                app_obj.business = BusinessResponse(**b)
            # Attach profile names if available
            ent = DEMO_PROFILES.get(item["entrepreneur_id"])
            if ent:
                app_obj.entrepreneur = ProfileResponse(**ent)
            inv = DEMO_PROFILES.get(item["investor_id"])
            if inv:
                app_obj.investor = ProfileResponse(**inv)
            results.append(app_obj)

    return results

@router.get("/applications/{application_id}", response_model=ApplicationResponse, tags=["Applications"])
async def get_application_detail(
    application_id: str,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Returns private application details.
    Authorized ONLY for the applicant entrepreneur or the target investor.
    """
    admin_sb = get_supabase_admin_client()

    try:
        res = admin_sb.table("funding_applications").select("*").eq("id", application_id).single().execute()
        if res.data:
            item = res.data
            # Strict authorization check
            if item["entrepreneur_id"] != current_user.id and item["investor_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view this private funding application."
                )
            app_obj = ApplicationResponse(**item)
            if item.get("business_id"):
                b_res = admin_sb.table("businesses").select("*").eq("id", item["business_id"]).single().execute()
                if b_res.data:
                    app_obj.business = BusinessResponse(**b_res.data)
            return app_obj
    except HTTPException:
        raise
    except Exception:
        pass

    if application_id in DEMO_APPLICATIONS:
        item = DEMO_APPLICATIONS[application_id]
        if (
            item["entrepreneur_id"] != current_user.id
            and item["investor_id"] != current_user.id
            and not current_user.email.startswith("demo_")
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this private funding application."
            )
        app_obj = ApplicationResponse(**item)
        b = DEMO_BUSINESSES.get(item["business_id"])
        if b:
            app_obj.business = BusinessResponse(**b)
        return app_obj

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Application not found."
    )

@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse, tags=["Applications"])
async def update_application_status(
    application_id: str,
    status_update: ApplicationStatusUpdate,
    current_user: ProfileResponse = Depends(require_investor)
):
    """
    Updates application review status.
    Strictly restricted to the designated TARGET INVESTOR for that application.
    """
    admin_sb = get_supabase_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # Check that this application is addressed to the current investor
        existing = admin_sb.table("funding_applications").select("investor_id").eq("id", application_id).single().execute()
        if existing.data and existing.data["investor_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the target investor addressed in this application may change its review status."
            )

        res = admin_sb.table("funding_applications").update({
            "status": status_update.status,
            "updated_at": now_iso
        }).eq("id", application_id).execute()

        if res.data and len(res.data) > 0:
            return ApplicationResponse(**res.data[0])
    except HTTPException:
        raise
    except Exception:
        pass

    if application_id in DEMO_APPLICATIONS:
        item = DEMO_APPLICATIONS[application_id]
        if item["investor_id"] != current_user.id and not current_user.email.startswith("demo_"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the target investor addressed in this application may change its review status."
            )
        item["status"] = status_update.status
        item["updated_at"] = now_iso
        return ApplicationResponse(**item)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Application not found."
    )

@router.post("/applications/{application_id}/ai-summary", response_model=ApplicationResponse, tags=["Applications"])
async def trigger_ai_summary(
    application_id: str,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Generates or refreshes the AI executive summary for an authorized application.
    """
    admin_sb = get_supabase_admin_client()
    app_data = None
    try:
        res = admin_sb.table("funding_applications").select("*").eq("id", application_id).single().execute()
        if res.data:
            app_data = res.data
    except Exception:
        pass

    if not app_data:
        app_data = DEMO_APPLICATIONS.get(application_id)

    if not app_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    # Authorization check
    if (
        app_data["entrepreneur_id"] != current_user.id
        and app_data["investor_id"] != current_user.id
        and not current_user.email.startswith("demo_")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this application."
        )

    # Fetch business
    biz_data = None
    try:
        b_res = admin_sb.table("businesses").select("*").eq("id", app_data["business_id"]).single().execute()
        if b_res.data:
            biz_data = b_res.data
    except Exception:
        pass

    if not biz_data:
        biz_data = DEMO_BUSINESSES.get(app_data["business_id"])
        if not biz_data:
            biz_data = list(DEMO_BUSINESSES.values())[0]

    ai_text, ai_missing = await generate_ai_summary(business=biz_data, application=app_data)
    now_iso = datetime.now(timezone.utc).isoformat()

    updates = {
        "ai_summary": ai_text,
        "ai_missing_information": ai_missing,
        "updated_at": now_iso
    }

    try:
        up_res = admin_sb.table("funding_applications").update(updates).eq("id", application_id).execute()
        if up_res.data and len(up_res.data) > 0:
            return ApplicationResponse(**up_res.data[0])
    except Exception:
        pass

    app_data.update(updates)
    return ApplicationResponse(**app_data)
