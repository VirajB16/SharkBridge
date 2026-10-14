# SharkBridge — AI-Assisted SME Funding Discovery Platform

> **Funding connections for businesses with ambition.**  
> Present your business clearly, discover relevant investors, and track funding conversations in one place.

---

## 1. Project Overview

SharkBridge is an AI-assisted small-business funding discovery platform. It helps small businesses present funding opportunities in a structured way and helps investors discover businesses that align with their stated investment thesis (sectors, stages, and ticket size in INR).

### Core Principles
- **AI assists; people decide:** AI organizes and synthesizes submitted business data into executive summaries; it does not approve funding or predict business success.
- **Explainable Matchmaking:** Investors and businesses are matched deterministically based on stated preferences (sector overlap, ticket size range, stage fit, location).
- **Documentation as Source of Truth:** Built strictly in alignment with the seven project specification documents in `SharkBridge_Docs/`.

---

## 2. Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router DOM
- **Backend:** Python 3.11, FastAPI, Pydantic v2, Uvicorn, HTTPX
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth (Row-Level Security)
- **AI Synthesis:** Server-side LLM integration (`gemini-3.5-flash` with graceful timeout and extractive fallback)
- **Testing:** Pytest & pytest-asyncio (Backend), TypeScript strict compiler check & Vite build (Frontend)

---

## 3. Project Structure

```text
SharkBridge/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # REST endpoints (health, auth, businesses, investors, matches, applications)
│   │   ├── core/                # App configuration, security, CORS
│   │   ├── db/                  # Database connections (Supabase)
│   │   ├── schemas/             # Pydantic v2 validation schemas
│   │   ├── services/            # AI summary synthesis, deterministic matching rubric, demo store
│   │   └── main.py              # FastAPI application entrypoint
│   ├── tests/                   # Pytest test suite (health, auth, matching rubric, fallback summary, status update)
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Backend configuration (Supabase & LLM keys)
├── frontend/
│   ├── src/
│   │   ├── components/common/   # Reusable UI (Button, Card, StatusChip, Input, AlertBanner)
│   │   ├── components/layout/   # Responsive Navbar, Footer, AppLayout
│   │   ├── pages/               # LandingPage, LoginPage, SignupPage, Entrepreneur & Investor Dashboards
│   │   ├── lib/                 # API client and Supabase client
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx              # Routing and role access controls
│   │   └── main.tsx             # React DOM entry
│   ├── package.json
│   ├── tailwind.config.js       # Design-token palette (Navy, Teal, Off-white, Status)
│   └── .env                     # Frontend configuration (VITE_API_BASE_URL, Supabase keys)
├── SharkBridge_Docs/            # Seven source-of-truth documents (01-07)
├── supabase_schema.sql          # SQL schema with RLS and updated_at triggers
└── README.md
```

---

## 4. How to Run Locally

### 1. Run Backend (FastAPI)
```bash
cd backend
# Activate virtual environment
.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On macOS/Linux

# Start FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/api/v1/docs`
- Health Endpoint: `http://localhost:8000/api/v1/health`

### 2. Run Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 5. Database Setup (Supabase)

The file [`supabase_schema.sql`](file:///c:/Users/LENOVO%20LOQ/Desktop/SharkBridge/supabase_schema.sql) contains the complete PostgreSQL table definitions, foreign keys, check constraints, and Row Level Security (RLS) policies.

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/dtbnuzuzxhgmvfzykwev).
2. Go to the **SQL Editor** tab.
3. Paste the contents of [`supabase_schema.sql`](file:///c:/Users/LENOVO%20LOQ/Desktop/SharkBridge/supabase_schema.sql) and click **Run**.
4. All four tables (`profiles`, `businesses`, `investor_preferences`, `funding_applications`) and their RLS policies are created idempotently.

---

## 6. End-to-End Demo Workflow

### Flow A: Entrepreneur Journey
1. Open `http://localhost:5173`.
2. Click **Get Started** or **Log In**.
3. Use the one-click **"Demo Entrepreneur"** button on the login page (or sign up with a new email as Entrepreneur).
4. View your Business Profile (**KisanFresh Logistics**) with reported monthly revenue/expenses in INR.
5. Review the **Investor Matches** list with transparent explainable scores (e.g. 70/100, 100/100) and rationale breakdowns.
6. Click **"Apply for Funding"** (or **"Apply to this Investor"**).
7. Enter requested capital (e.g., ₹3,000,000), use of funds, growth milestones, confirm accuracy, and click **Submit Application**.
8. View the synthesized **AI Executive Summary** with missing-data flags and initial status chip `Submitted`.

### Flow B: Investor Review Journey
1. Open the application in a new incognito window or log out and log in using **"Demo Investor"** (Apex Ventures).
2. See the new incoming application appear in your **Incoming SME Funding Applications** queue.
3. Review the applicant's business profile and the distinct **AI Executive Summary** panel.
4. Update the status using the live action controls:
   - Click **Under Review** → status updates to `under_review`
   - Click **Request Info** → status updates to `request_information`
   - Click **Mark Interested** → status updates to `interested`
   - Click **Decline** → status updates to `declined`
5. Switch back to the Entrepreneur dashboard; observe the updated status reflected live.
