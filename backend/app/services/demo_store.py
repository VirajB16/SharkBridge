import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# In-memory store used when Supabase tables are being initialized or for demo testing
DEMO_ENTREPRENEUR_ID = "00000000-0000-0000-0000-000000000001"
DEMO_INVESTOR_ID = "00000000-0000-0000-0000-000000000002"
DEMO_INVESTOR_2_ID = "00000000-0000-0000-0000-000000000003"

DEMO_PROFILES: Dict[str, Dict[str, Any]] = {
    DEMO_ENTREPRENEUR_ID: {
        "id": DEMO_ENTREPRENEUR_ID,
        "role": "entrepreneur",
        "full_name": "Aarav Patel (Demo Entrepreneur)",
        "email": "demo_entrepreneur@sharkbridge.io",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    DEMO_INVESTOR_ID: {
        "id": DEMO_INVESTOR_ID,
        "role": "investor",
        "full_name": "Priya Sharma (Apex Ventures)",
        "email": "demo_investor@sharkbridge.io",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    DEMO_INVESTOR_2_ID: {
        "id": DEMO_INVESTOR_2_ID,
        "role": "investor",
        "full_name": "Vikram Mehta (Catalyst Angel Fund)",
        "email": "vikram_investor@sharkbridge.io",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
}

DEMO_BUSINESSES: Dict[str, Dict[str, Any]] = {
    "10000000-0000-0000-0000-000000000001": {
        "id": "10000000-0000-0000-0000-000000000001",
        "owner_id": DEMO_ENTREPRENEUR_ID,
        "name": "KisanFresh Logistics",
        "sector": "AgriTech & Cold Chain",
        "description": "Temperature-controlled farm-to-retail supply chain helping organic farmers reduce perishable crop losses in Western India.",
        "stage": "Early Growth",
        "location": "Pune, Maharashtra",
        "target_customers": "Organic produce farmers and urban supermarket chains",
        "monthly_revenue_inr": 450000.0,
        "monthly_expenses_inr": 380000.0,
        "growth_plan": "Expand solar refrigerated hubs to 4 additional district clusters and onboard 120 more verified grower cooperatives.",
        "website_url": "https://kisanfresh-demo.example.com",
        "gstin": "27AABCK1234F1Z5",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
}

DEMO_INVESTOR_PREFERENCES: Dict[str, Dict[str, Any]] = {
    DEMO_INVESTOR_ID: {
        "id": "20000000-0000-0000-0000-000000000001",
        "investor_id": DEMO_INVESTOR_ID,
        "sectors": ["AgriTech & Cold Chain", "Clean Energy", "Logistics"],
        "min_amount_inr": 1500000.0,
        "max_amount_inr": 7500000.0,
        "preferred_stages": ["Early Growth", "Seed", "Revenue Generating"],
        "preferred_locations": ["Maharashtra", "Gujarat", "Karnataka"],
        "cv_file_url": "https://dtbnuzuzxhgmvfzykwev.supabase.co/storage/v1/object/public/investor-cvs/demo/Apex_Ventures_Priya_Sharma_CV.pdf",
        "cv_file_name": "Apex_Ventures_Priya_Sharma_CV.pdf",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    DEMO_INVESTOR_2_ID: {
        "id": "20000000-0000-0000-0000-000000000002",
        "investor_id": DEMO_INVESTOR_2_ID,
        "sectors": ["FinTech", "HealthTech", "Consumer Brands"],
        "min_amount_inr": 500000.0,
        "max_amount_inr": 3000000.0,
        "preferred_stages": ["Idea", "Prototype", "Seed"],
        "preferred_locations": ["Delhi NCR", "Bangalore"],
        "cv_file_url": "https://dtbnuzuzxhgmvfzykwev.supabase.co/storage/v1/object/public/investor-cvs/demo/Catalyst_Angel_Vikram_Mehta_CV.pdf",
        "cv_file_name": "Catalyst_Angel_Vikram_Mehta_CV.pdf",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
}

DEMO_APPLICATIONS: Dict[str, Dict[str, Any]] = {
    "30000000-0000-0000-0000-000000000001": {
        "id": "30000000-0000-0000-0000-000000000001",
        "business_id": "10000000-0000-0000-0000-000000000001",
        "entrepreneur_id": DEMO_ENTREPRENEUR_ID,
        "investor_id": DEMO_INVESTOR_ID,
        "amount_requested_inr": 3500000.0,
        "equity_stake_pct": 12.5,
        "use_of_funds": "Acquisition of 2 solar-assisted refrigeration trucks and working capital for farm depot leasing.",
        "growth_plan": "Increase monthly throughput from 25 tons to 80 tons over the next 12 months.",
        "additional_notes": "Existing contracts in place with 3 supermarket networks in Mumbai and Pune.",
        "ai_summary": (
            "**Executive Overview:** KisanFresh Logistics operates a cold-chain network connecting agricultural growers to urban retailers in Pune, Maharashtra at the Early Growth stage.\n\n"
            "**Funding Request:** The business is requesting ₹3,500,000 for 12.5% equity to purchase 2 solar-assisted refrigeration vehicles and fund depot leases.\n\n"
            "**Financials:** The entrepreneur reports monthly revenue of ₹450,000 against monthly operating expenses of ₹380,000.\n\n"
            "**Growth Goals:** Expanding distribution capacity from 25 to 80 tons per month."
        ),
        "ai_missing_information": {
            "missing_fields": [
                "Vehicle vendor quotations and lease terms were not attached.",
                "Farmer payout cycle terms are not detailed."
            ],
            "questions": [
                "What is the expected ROI per vehicle across the peak harvesting seasons?",
                "How are fuel price fluctuations factored into the freight cost model?"
            ],
            "is_fallback": True,
            "model_used": "demo-seed"
        },
        "status": "under_review",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
}

