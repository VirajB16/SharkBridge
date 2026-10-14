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

