import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.matching import calculate_match_score
from app.services.ai_summary import generate_extractive_fallback

client = TestClient(app)

ENTREPRENEUR_AUTH = {"Authorization": "Bearer demo-token-entrepreneur"}
INVESTOR_AUTH = {"Authorization": "Bearer demo-token-investor"}

def test_unauthenticated_access_rejected():
    """Verify unauthenticated requests return 401 Unauthorized"""
    res = client.get("/api/v1/me")
    assert res.status_code == 401

    res = client.get("/api/v1/businesses/mine")
    assert res.status_code == 401

    res = client.get("/api/v1/investor/preferences")
    assert res.status_code == 401

def test_role_enforcement():
    """Verify role mismatch returns 403 Forbidden"""
    # Investor cannot create a business
    biz_payload = {
        "name": "Test Co",
        "sector": "FinTech",
        "description": "Financial software",
        "stage": "Seed",
    }
    res = client.post("/api/v1/businesses", json=biz_payload, headers=INVESTOR_AUTH)
    assert res.status_code == 403

    # Entrepreneur cannot update investor preferences
    pref_payload = {
        "sectors": ["FinTech"],
        "min_amount_inr": 100000.0,
        "max_amount_inr": 500000.0,
        "preferred_stages": ["Seed"],
    }
    res = client.put("/api/v1/investor/preferences", json=pref_payload, headers=ENTREPRENEUR_AUTH)
    assert res.status_code == 403

def test_business_validation_negative_numbers():
    """Verify negative financials are rejected with 422 Unprocessable Entity"""
    bad_payload = {
        "name": "Invalid Co",
        "sector": "Tech",
        "description": "Tech description",
        "stage": "Early",
        "monthly_revenue_inr": -5000.0,
    }
    res = client.post("/api/v1/businesses", json=bad_payload, headers=ENTREPRENEUR_AUTH)
    assert res.status_code == 422

def test_deterministic_matching_rubric():
    """Verify deterministic 100-point rubric from 04_DATA_MODEL.md"""
    business = {
        "sector": "AgriTech",
        "stage": "Seed",
        "location": "Pune",
    }
    investor_pref = {
        "sectors": ["AgriTech", "CleanTech"], # 40 pts
        "min_amount_inr": 1000000.0,
        "max_amount_inr": 5000000.0,         # 30 pts (matches requested ₹2,000,000)
        "preferred_stages": ["Seed"],         # 20 pts
        "preferred_locations": ["Pune", "Mumbai"], # 10 pts
    }

    match_result = calculate_match_score(
        business=business,
        investor_pref=investor_pref,
        amount_requested=2000000.0
    )

    assert match_result.score == 100
    assert match_result.breakdown.sector_points == 40
    assert match_result.breakdown.amount_points == 30
    assert match_result.breakdown.stage_points == 20
    assert match_result.breakdown.location_points == 10
    assert len(match_result.reasons) == 4

def test_matching_partial_fit():
    """Verify partial match calculations and explainability"""
    business = {
        "sector": "Healthcare",
        "stage": "Growth",
        "location": "Delhi",
    }
    investor_pref = {
        "sectors": ["AgriTech"],
        "min_amount_inr": 1000000.0,
        "max_amount_inr": 5000000.0,
        "preferred_stages": ["Seed"],
        "preferred_locations": ["Mumbai"],
    }
    match_result = calculate_match_score(
        business=business,
        investor_pref=investor_pref,
        amount_requested=2000000.0
    )
    # Only amount matches (30 pts)
    assert match_result.score == 30
    assert match_result.breakdown.amount_points == 30
    assert match_result.breakdown.sector_points == 0
    assert match_result.breakdown.stage_points == 0

def test_extractive_fallback_summary():
    """Verify AI summary extractive fallback never invents numbers"""
    biz = {
        "name": "Pure Mills",
        "sector": "Manufacturing",
        "stage": "Early",
        "description": "Grain processing",
        "monthly_revenue_inr": None, # Unreported
        "monthly_expenses_inr": None,
    }
    app_data = {
        "amount_requested_inr": 1500000.0,
        "use_of_funds": "Machinery purchase",
        "growth_plan": "Double milling capacity",
    }
    summary, meta = generate_extractive_fallback(biz, app_data)
    assert "Not provided" in summary
    assert "Pure Mills" in summary
    assert "₹1,500,000" in summary
    assert any("revenue" in m.lower() for m in meta["missing_fields"])

def test_application_lifecycle_and_investor_status_update():
    """Verify application submission and status change by investor"""
    # 1. Entrepreneur submits application
    submit_payload = {
        "business_id": "10000000-0000-0000-0000-000000000001",
        "investor_id": "00000000-0000-0000-0000-000000000002",
        "amount_requested_inr": 2500000.0,
        "use_of_funds": "Inventory and factory expansion",
        "growth_plan": "Expand distribution to 3 new cities",
        "confirmation": True
    }
    res = client.post("/api/v1/applications", json=submit_payload, headers=ENTREPRENEUR_AUTH)
    assert res.status_code == 200
    created_app = res.json()
    app_id = created_app["id"]
    assert created_app["status"] == "submitted"
    assert created_app["ai_summary"] is not None

    # 2. Investor updates status to 'interested'
    update_res = client.patch(
        f"/api/v1/applications/{app_id}/status",
        json={"status": "interested"},
        headers=INVESTOR_AUTH
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "interested"

    # 3. Entrepreneur cannot update status (restricted to investor)
    bad_update = client.patch(
        f"/api/v1/applications/{app_id}/status",
        json={"status": "declined"},
        headers=ENTREPRENEUR_AUTH
    )
    assert bad_update.status_code == 403

def test_business_creation_with_optional_gstin():
    """Verify business creation accepts optional GSTIN"""
    biz_payload = {
        "name": "AgroTech Hub",
        "sector": "AgriTech",
        "description": "Smart irrigation systems",
        "stage": "Early Growth",
        "gstin": "27AABCU9603R1ZM",
    }
    res = client.post("/api/v1/businesses", json=biz_payload, headers=ENTREPRENEUR_AUTH)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "AgroTech Hub"
    assert data["gstin"] == "27AABCU9603R1ZM"

def test_funding_application_with_equity_stake_pct():
    """Verify application accepts equity stake (%) and does not fail with 422"""
    submit_payload = {
        "business_id": "10000000-0000-0000-0000-000000000001",
        "investor_id": "00000000-0000-0000-0000-000000000002",
        "amount_requested_inr": 1800000.0,
        "equity_stake_pct": 8.5,
        "use_of_funds": "Procure testing rigs and deploy solar panels",
        "growth_plan": "Scale to 50 local pilot installations",
        "confirmation": True
    }
    res = client.post("/api/v1/applications", json=submit_payload, headers=ENTREPRENEUR_AUTH)
    assert res.status_code == 200
    created_app = res.json()
    assert created_app["equity_stake_pct"] == 8.5
    assert created_app["amount_requested_inr"] == 1800000.0

def test_matching_with_maximum_ticket_size_only():
    """Verify matching rubric functions based on Maximum Ticket Size without minimum ticket size"""
    business = {
        "sector": "FinTech",
        "stage": "Seed",
        "location": "Bangalore",
    }
    investor_pref = {
        "sectors": ["FinTech"],
        "max_amount_inr": 5000000.0, # max ticket
        "preferred_stages": ["Seed"],
        "preferred_locations": ["Bangalore"],
    }
    # Within max ticket (<= 5,000,000)
    match_result = calculate_match_score(
        business=business,
        investor_pref=investor_pref,
        amount_requested=3000000.0
    )
    assert match_result.score == 100
    assert match_result.breakdown.amount_points == 30

    # Exceeding max ticket (> 5,000,000)
    match_result_exceeded = calculate_match_score(
        business=business,
        investor_pref=investor_pref,
        amount_requested=6000000.0
    )
    assert match_result_exceeded.breakdown.amount_points == 0
    assert any("exceeds" in r.lower() for r in match_result_exceeded.reasons)

def test_investor_cv_upload_and_download():
    """Verify investor CV upload and authenticated access"""
    # Test invalid file format
    bad_file = {"file": ("test.exe", b"binarycontent", "application/octet-stream")}
    res_bad = client.post("/api/v1/investor/cv", files=bad_file, headers=INVESTOR_AUTH)
    assert res_bad.status_code == 400

    # Test valid PDF upload
    pdf_file = {"file": ("investor_resume.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    res = client.post("/api/v1/investor/cv", files=pdf_file, headers=INVESTOR_AUTH)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "cv_file_url" in data
    assert "investor_resume" in data["cv_file_name"]

    # Test entrepreneur fetching investor CV
    get_res = client.get("/api/v1/investor/00000000-0000-0000-0000-000000000002/cv", headers=ENTREPRENEUR_AUTH)
    assert get_res.status_code == 200
    cv_data = get_res.json()
    assert cv_data["cv_file_url"] is not None

def test_user_registration_endpoint():
    """Verify backend registration endpoint creates user with email_confirm=True without rate limit"""
    import time
    unique_email = f"pytest_reg_{int(time.time())}@sharkbridge.io"
    res = client.post("/api/v1/register", json={
        "email": unique_email,
        "password": "Password123!",
        "role": "entrepreneur",
        "full_name": "Pytest Entrepreneur"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == unique_email
    assert data["role"] == "entrepreneur"
    assert data["full_name"] == "Pytest Entrepreneur"

def test_investor_cv_ocr_extraction():
    """Verify investor CV upload triggers OCR extraction and credentials analysis"""
    pdf_content = (
        b"%PDF-1.4\n"
        b"Investor Track Record and Portfolio.\n"
        b"10+ years experience investing in AgriTech, Clean Energy, and Logistics.\n"
        b"Deployment target: 1 Crore to 5 Crore per ticket.\n"
    )
    pdf_file = {"file": ("priya_investor_cv.pdf", pdf_content, "application/pdf")}
    res = client.post("/api/v1/investor/cv", files=pdf_file, headers=INVESTOR_AUTH)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "ocr_result" in data
    ocr = data["ocr_result"]
    assert ocr["status"] == "verified"
    assert "AgriTech" in str(ocr["sectors"]) or "Clean Energy" in str(ocr["sectors"])
    assert "confidence_score" in ocr

    # Verify that get_my_preferences returns the OCR data
    pref_res = client.get("/api/v1/investor/preferences", headers=INVESTOR_AUTH)
    assert pref_res.status_code == 200
    pref_data = pref_res.json()
    assert pref_data["cv_file_url"] is not None
    assert pref_data["ocr_result"] is not None

def test_investor_deal_flow_matching():
    """Verify investor calling /matches gets SME deal pipeline"""
    res = client.get("/api/v1/matches", headers=INVESTOR_AUTH)
    assert res.status_code == 200
    matches = res.json()
    assert isinstance(matches, list)
    assert len(matches) > 0
    first_match = matches[0]
    assert "business_name" in first_match or "business" in first_match
    assert "score" in first_match

def test_platform_assistant_chat():
    """Verify SharkBridge Assistant chatbot returns accurate site guidance"""
    # Ask about business stages and GSTIN
    res = client.post("/api/v1/assistant/chat", json={
        "message": "What business stages are available and is GSTIN mandatory?",
        "role": "entrepreneur"
    })
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"]
    assert "Idea" in reply and "Mature" in reply
    assert "GSTIN" in reply
    assert len(data.get("suggested_actions", [])) > 0

    # Ask about investor CV OCR
    res_ocr = client.post("/api/v1/assistant/chat", json={
        "message": "How does investor CV OCR verification work?",
        "role": "investor"
    })
    assert res_ocr.status_code == 200
    ocr_reply = res_ocr.json()["reply"]
    assert "OCR" in ocr_reply
    assert "Dashboard" in ocr_reply or "once" in ocr_reply

def test_deal_room_chat_access_control():
    """Verify deal chat unlocks strictly on 'interested' status and rejects unauthorized users"""
    # 1. Create a funding application in submitted state
    app_res = client.post("/api/v1/applications", json={
        "business_id": "00000000-0000-0000-0000-000000000001",
        "investor_id": "00000000-0000-0000-0000-000000000002",
        "amount_requested_inr": 2500000.0,
        "equity_stake_pct": 10.0,
        "use_of_funds": "Machinery purchase",
        "growth_plan": "Double processing capacity",
        "confirmation": True
    }, headers=ENTREPRENEUR_AUTH)
    assert app_res.status_code == 200
    app_id = app_res.json()["id"]

    # 2. In 'submitted' state, chat should be forbidden (403)
    chat_get = client.get(f"/api/v1/applications/{app_id}/messages", headers=ENTREPRENEUR_AUTH)
    assert chat_get.status_code == 403
    assert "Interested" in chat_get.json()["detail"]

    # 3. Investor updates status to 'interested'
    patch_res = client.patch(f"/api/v1/applications/{app_id}/status", json={
        "status": "interested"
    }, headers=INVESTOR_AUTH)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "interested"

    # 4. Now deal chat is UNLOCKED
    post_msg = client.post(f"/api/v1/applications/{app_id}/messages", json={
        "content": "Hello! Glad to connect on SharkBridge deal room."
    }, headers=INVESTOR_AUTH)
    assert post_msg.status_code == 200
    msg_data = post_msg.json()
    assert msg_data["content"] == "Hello! Glad to connect on SharkBridge deal room."
    assert msg_data["application_id"] == app_id

    # 5. Entrepreneur retrieves messages
    get_msgs = client.get(f"/api/v1/applications/{app_id}/messages", headers=ENTREPRENEUR_AUTH)
    assert get_msgs.status_code == 200
    msgs_list = get_msgs.json()
    assert len(msgs_list) >= 1
    assert any(m["content"] == "Hello! Glad to connect on SharkBridge deal room." for m in msgs_list)

@pytest.mark.asyncio
async def test_socket_io_deal_room_events():
    """Verify Socket.IO deal room handlers and broadcast engine"""
    from app.core.socket_server import handle_join_deal_room, handle_leave_deal_room, broadcast_deal_message, sio

    test_app_id = "test-socket-app-123"
    fake_sid = "test-sid-999"

    # Test joining deal room
    join_res = await handle_join_deal_room(fake_sid, {"application_id": test_app_id})
    assert join_res["status"] == "ok"
    assert join_res["room"] == f"deal_{test_app_id}"

    # Test broadcasting a deal message
    test_msg = {
        "id": "msg-sock-1",
        "application_id": test_app_id,
        "content": "Real-time deal message via Socket.IO",
        "sender_name": "Priya Sharma (Apex Ventures)",
        "sender_role": "investor"
    }
    # Should execute without throwing any exception
    await broadcast_deal_message(test_app_id, test_msg)

    # Test leaving deal room
    leave_res = await handle_leave_deal_room(fake_sid, {"application_id": test_app_id})
    assert leave_res["status"] == "ok"





