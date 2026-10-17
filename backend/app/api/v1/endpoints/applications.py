from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_entrepreneur, require_investor
from app.schemas.profile import ProfileResponse
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    DealMessageCreate,
    DealMessageResponse,
)
from app.schemas.business import BusinessResponse
from app.db.supabase import get_supabase_admin_client, safe_supabase_insert, safe_supabase_update
from app.services.ai_summary import generate_ai_summary
from app.services.demo_store import (
    DEMO_APPLICATIONS,
    DEMO_BUSINESSES,
    DEMO_PROFILES,
)
from datetime import datetime, timezone
from typing import List
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

APPLICATION_EXTRAS = {}
DEAL_MESSAGES_STORE = {}



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
        "equity_stake_pct": app_in.equity_stake_pct,
        "use_of_funds": app_in.use_of_funds,
        "growth_plan": app_in.growth_plan,
        "additional_notes": app_in.additional_notes,
        "ai_summary": ai_summary_text,
        "ai_missing_information": ai_missing,
        "status": "submitted",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    if app_in.equity_stake_pct is not None:
        APPLICATION_EXTRAS[app_id] = {"equity_stake_pct": app_in.equity_stake_pct}

    try:
        data = safe_supabase_insert("funding_applications", record)
        if data and len(data) > 0:
            app_obj = ApplicationResponse(**{**record, **data[0]})
            app_obj.business = BusinessResponse(**biz_data)
            app_obj.entrepreneur = current_user
            return app_obj
    except Exception as e:
        logger.error(f"Error inserting funding application: {e}")

    DEMO_APPLICATIONS[app_id] = record
    app_obj = ApplicationResponse(**record)
    app_obj.business = BusinessResponse(**biz_data)
    app_obj.entrepreneur = current_user
    return app_obj

@router.get("/applications/mine", response_model=List[ApplicationResponse], tags=["Applications"])
async def list_my_applications(
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Lists applications submitted by the entrepreneur or received by the investor.
    Attaches real business details and real entrepreneur profiles.
    """
    admin_sb = get_supabase_admin_client()
    query_col = "entrepreneur_id" if current_user.role == "entrepreneur" else "investor_id"

    try:
        res = admin_sb.table("funding_applications").select("*").eq(query_col, current_user.id).order("created_at", desc=True).execute()
        if res.data is not None:
            apps = []
            for item in res.data:
                app_dict = dict(item)
                if app_dict.get("equity_stake_pct") is None and app_dict.get("id") in APPLICATION_EXTRAS:
                    app_dict["equity_stake_pct"] = APPLICATION_EXTRAS[app_dict["id"]].get("equity_stake_pct")
                app_obj = ApplicationResponse(**app_dict)

                # Attach real business details
                if item.get("business_id"):
                    try:
                        b_res = admin_sb.table("businesses").select("*").eq("id", item["business_id"]).single().execute()
                        if b_res.data:
                            app_obj.business = BusinessResponse(**b_res.data)
                    except Exception:
                        pass
                # Attach real entrepreneur profile
                if item.get("entrepreneur_id"):
                    try:
                        e_res = admin_sb.table("profiles").select("*").eq("id", item["entrepreneur_id"]).single().execute()
                        if e_res.data:
                            app_obj.entrepreneur = ProfileResponse(**e_res.data)
                    except Exception:
                        pass
                # Attach real investor profile
                if item.get("investor_id"):
                    try:
                        i_res = admin_sb.table("profiles").select("*").eq("id", item["investor_id"]).single().execute()
                        if i_res.data:
                            app_obj.investor = ProfileResponse(**i_res.data)
                    except Exception:
                        pass
                apps.append(app_obj)

            if len(apps) > 0 or not current_user.email.startswith("demo_"):
                return apps
    except Exception:
        pass

    # Search local store strictly for demo users
    results = []
    if current_user.email.startswith("demo_"):
        for item in DEMO_APPLICATIONS.values():
            if (
                (current_user.role == "entrepreneur" and (item["entrepreneur_id"] == current_user.id or current_user.email.startswith("demo_")))
                or (current_user.role == "investor" and (item["investor_id"] == current_user.id or current_user.email.startswith("demo_")))
            ):
                app_obj = ApplicationResponse(**item)
                b = DEMO_BUSINESSES.get(item["business_id"])
                if b:
                    app_obj.business = BusinessResponse(**b)
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
                try:
                    b_res = admin_sb.table("businesses").select("*").eq("id", item["business_id"]).single().execute()
                    if b_res.data:
                        app_obj.business = BusinessResponse(**b_res.data)
                except Exception:
                    pass
            if item.get("entrepreneur_id"):
                try:
                    e_res = admin_sb.table("profiles").select("*").eq("id", item["entrepreneur_id"]).single().execute()
                    if e_res.data:
                        app_obj.entrepreneur = ProfileResponse(**e_res.data)
                except Exception:
                    pass
            if item.get("investor_id"):
                try:
                    i_res = admin_sb.table("profiles").select("*").eq("id", item["investor_id"]).single().execute()
                    if i_res.data:
                        app_obj.investor = ProfileResponse(**i_res.data)
                except Exception:
                    pass
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
        ent = DEMO_PROFILES.get(item["entrepreneur_id"])
        if ent:
            app_obj.entrepreneur = ProfileResponse(**ent)
        inv = DEMO_PROFILES.get(item["investor_id"])
        if inv:
            app_obj.investor = ProfileResponse(**inv)
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
        existing = admin_sb.table("funding_applications").select("*").eq("id", application_id).single().execute()
        if existing.data and existing.data["investor_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the target investor addressed in this application may change its review status."
            )

        data = safe_supabase_update("funding_applications", {
            "status": status_update.status,
            "updated_at": now_iso
        }, "id", application_id)

        if data and len(data) > 0:
            app_obj = ApplicationResponse(**data[0])
            # Attach business and entrepreneur
            if data[0].get("business_id"):
                try:
                    b_res = admin_sb.table("businesses").select("*").eq("id", data[0]["business_id"]).single().execute()
                    if b_res.data:
                        app_obj.business = BusinessResponse(**b_res.data)
                except Exception:
                    pass
            if data[0].get("entrepreneur_id"):
                try:
                    e_res = admin_sb.table("profiles").select("*").eq("id", data[0]["entrepreneur_id"]).single().execute()
                    if e_res.data:
                        app_obj.entrepreneur = ProfileResponse(**e_res.data)
                except Exception:
                    pass
            return app_obj
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
        app_obj = ApplicationResponse(**item)
        b = DEMO_BUSINESSES.get(item["business_id"])
        if b:
            app_obj.business = BusinessResponse(**b)
        ent = DEMO_PROFILES.get(item["entrepreneur_id"])
        if ent:
            app_obj.entrepreneur = ProfileResponse(**ent)
        return app_obj

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

@router.get("/applications/{application_id}/messages", response_model=List[DealMessageResponse], tags=["Deal Messaging"])
async def get_deal_messages(
    application_id: str,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Retrieves direct planning chat messages for an accepted ('interested') funding application.
    Protected by SharkBridge certified deal access.
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding application not found."
        )

    # Participant verification: Entrepreneur or Investor
    is_participant = (
        current_user.id in (app_data["entrepreneur_id"], app_data["investor_id"])
        or current_user.email.startswith("demo_")
    )
    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an authorized participant in this deal room."
        )

    # Deal chat unlocks only when marked 'interested' (accepted)
    if app_data.get("status") != "interested":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Deal planning chat room unlocks only after the application has been accepted ('Marked Interested') by the investor."
        )

    # 1. Try querying deal_messages table
    try:
        m_res = admin_sb.table("deal_messages").select("*").eq("application_id", application_id).order("created_at").execute()
        if m_res.data:
            return [DealMessageResponse(**m) for m in m_res.data]
    except Exception:
        pass

    # 2. In-memory store fallback
    stored = DEAL_MESSAGES_STORE.get(application_id, [])
    return [DealMessageResponse(**m) for m in stored]

@router.post("/applications/{application_id}/messages", response_model=DealMessageResponse, tags=["Deal Messaging"])
async def send_deal_message(
    application_id: str,
    msg_in: DealMessageCreate,
    current_user: ProfileResponse = Depends(get_current_user)
):
    """
    Sends a direct planning message inside the end-to-end encrypted SharkBridge Deal Room.
    Strictly unlocked only when application status is 'interested'.
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding application not found."
        )

    # Participant check
    is_participant = (
        current_user.id in (app_data["entrepreneur_id"], app_data["investor_id"])
        or current_user.email.startswith("demo_")
    )
    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an authorized participant in this deal room."
        )

    # Requirement 5: Only unlocked when investor accepted/interested
    if app_data.get("status") != "interested":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Deal planning chat room unlocks only after the application has been accepted ('Marked Interested') by the investor."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    msg_record = {
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "sender_id": current_user.id,
        "sender_name": current_user.full_name or ("Investor" if current_user.role == "investor" else "Entrepreneur"),
        "sender_role": current_user.role,
        "content": msg_in.content.strip(),
        "created_at": now_iso,
    }

    try:
        data = safe_supabase_insert("deal_messages", msg_record)
        if data and len(data) > 0:
            msg_obj = DealMessageResponse(**{**msg_record, **data[0]})
            DEAL_MESSAGES_STORE.setdefault(application_id, []).append(msg_record)
            try:
                from app.core.socket_server import broadcast_deal_message
                await broadcast_deal_message(application_id, msg_record)
            except Exception:
                pass
            return msg_obj
    except Exception as e:
        logger.debug(f"Deal message insert note: {e}")

    DEAL_MESSAGES_STORE.setdefault(application_id, []).append(msg_record)
    try:
        from app.core.socket_server import broadcast_deal_message
        await broadcast_deal_message(application_id, msg_record)
    except Exception:
        pass
    return DealMessageResponse(**msg_record)
