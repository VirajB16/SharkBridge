# SharkBridge — AI-Assisted SME Funding Discovery & Deal Execution Platform

> **Funding connections for businesses with ambition.**  
> Present your business clearly, discover relevant investors via explainable matching, verify credentials with automated OCR, and execute term discussions in end-to-end encrypted deal rooms.

---

## 1. Project Overview

SharkBridge is an AI-powered small-and-medium enterprise (SME) funding platform built specifically for India's growing entrepreneurial ecosystem. It bridges the transparency gap between capital-seeking founders and thesis-driven investors by combining **deterministic, explainable matchmaking**, **automated OCR credential verification**, **AI-assisted executive summaries**, and **certified end-to-end encrypted deal rooms**.

### Core Platform Pillars

1. **AI Assists; People Decide**: AI synthesizes entrepreneur submissions into objective executive summaries and flags information gaps; it never makes automated lending decisions or hallucinates financials.
2. **Explainable Matchmaking (100-Point Rubric)**: Transparent, deterministic scoring based on sector fit, ticket size capacity, business stage, location, and financial health.
3. **Automated OCR Verification**: When investors upload their CV or track record, an automated OCR pipeline verifies credentials, sector experience, and ticket capability without manual friction.
4. **Certified Deal Planning Rooms**: Once an investor accepts a proposal, both parties unlock an end-to-end encrypted planning room (`Certified by SharkBridge, end-to-end encryption`) to discuss terms, valuation, and diligence.
5. **24/7 SharkBridge Assistant (SharkBot)**: An intelligent personal guide with complete site knowledge to onboard confused entrepreneurs and investors.

---

## 2. Key Features & Platform Capabilities

### 🏢 Entrepreneur Experience
- **Business Profile Management**:
  - Mandatory fields marked with `*` and strictly validated.
  - Optional **GSTIN** (Goods and Services Tax Identification Number) for verified SME credentials.
  - Optional official website link with automatic HTTPS protocol normalization.
  - **4 Development Stages**: `Idea`, `Prototype`, `Early Growth`, `Mature` (*Scaling was removed for precision*).
  - Self-reported financials in Indian Rupees (**₹ / INR**): Monthly Revenue, Expenses, and Growth Milestones.
- **Explainable Investor Matching**:
  - View compatibility percentages (e.g. 70%, 100%) calculated deterministically.
  - Inspect point-by-point rationale breakdowns before applying.
  - View verified investor track records and credentials on file.
- **Funding Applications**:
  - Specify requested capital in INR (*).
  - Optional **Equity Stake Offered (%)** field.
  - Detailed Use of Funds and Growth Milestones (*).
- **AI Executive Summary**: Automatic server-side executive briefing generated upon submission with missing information gap detection.
- **Deal Planning Chat**: Directly chat with the investor once your application is accepted.

### 💼 Investor Experience
- **Frictionless Registration**: Fast signup requiring only Full Name, Email, and Password. CV upload is **not** asked during registration.
- **Single CV Upload with OCR**:
  - Upload CV once from the Investor Dashboard.
  - Automated **OCR Engine (PyPDF + Semantic Verifier)** extracts:
    - Years of active investment experience (e.g. `8+ years`).
    - Target sectors detected in document (e.g. `AgriTech`, `Clean Energy`, `Logistics`).
    - Ticket size indicators (e.g. `Growth & Expansion (₹15L - ₹75L)`).
    - OCR Confidence Score (`98.4% Confidence`).
  - **Multi-Layer Permanent Storage**: Stored in Supabase Storage (`investor-cvs`), Supabase Auth `user_metadata`, in-memory cache, and `localStorage` so it is **never requested again on page reload**.
- **Investment Thesis Configuration**:
  - Target Sectors (*).
  - **Maximum Ticket Size in INR (*)** (*Minimum ticket size removed to maximize deal pipeline flexibility*).
  - Preferred Stages (*).
  - Geographic Focus (Pan-India or regional).
- **Live SME Deal Flow Pipeline**:
  - Live discovery pipeline displaying all registered SMEs matching the investor's criteria.
  - Displays match scores, revenue, EBITDA, location, GSTIN, and compatibility factors.
- **Proposal Review & Status Lifecycle**:
  - Pipeline stages: `Submitted` → `Under Review` → `Request Information` / `Interested` (Accepted) / `Declined`.
- **Direct Deal Room Chat**: Unlocks on marking a proposal `Interested`.

### 🔒 Deal Planning Chat Rooms
- Unlocked automatically for both parties when an application is marked **Interested**.
- **Real-Time Engine Powered by Socket.IO (`python-socketio` & `socket.io-client`)**:
  - Instant bidirectional message delivery via dedicated rooms (`deal_{application_id}`).
  - Live connection status badge in header: `● Socket.IO Live`.
  - Automatic fallback to HTTP persistence ensures 100% reliability and history preservation.
- Prominently displays the WhatsApp-style certified encryption header:  
  **`🔒 Certified by SharkBridge, end-to-end encryption`**
- Context bar displays requested capital (₹), equity stake offered (%), SME name, and counterpart identity.
- Full message history with participant role badges (`Entrepreneur` / `Investor`) and timestamps.

### 🤖 SharkBridge Personal Assistant (SharkBot)
- Persistent floating assistant button mounted globally on all pages.
- Grounded with complete platform knowledge (onboarding, business creation, GSTIN, stages, matching algorithm, funding proposals, CV OCR verification, deal rooms).
- Provides prompt chips and step-by-step guidance for new or confused users.
- Powered by `gemini-3.5-flash` with robust deterministic knowledge fallback.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router DOM v6 |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, Uvicorn, HTTPX, PyPDF |
| **Database & Auth** | Supabase PostgreSQL, Supabase Auth (Row-Level Security) |
| **Storage** | Supabase Storage (`investor-cvs` bucket) |
| **AI / Synthesis** | Google Gemini API (`gemini-3.5-flash`) with deterministic extractive fallback |
| **Testing** | Pytest, Pytest-Asyncio (18 backend test cases), TypeScript strict compiler |

---

## 4. Directory Structure

```text
SharkBridge/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── applications.py   # Funding proposals & Deal Chat endpoints
│   │   │   │   ├── assistant.py      # SharkBot platform assistant chatbot
│   │   │   │   ├── auth.py           # Registration, login, profile sync, investors list
│   │   │   │   ├── businesses.py     # SME profile CRUD, GSTIN support, ownership checks
│   │   │   │   ├── health.py         # System health check & config status
│   │   │   │   ├── investors.py      # Preferences, CV upload, OCR analysis & download
│   │   │   │   └── matches.py        # 100-point deterministic matching engine
│   │   │   └── api.py                # Main v1 API router aggregation
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings (.env loading)
│   │   │   ├── security.py           # JWT validation & role enforcement (entrepreneur / investor)
│   │   │   └── socket_server.py      # Socket.IO ASGI server & deal room real-time event engine
│   │   ├── db/
│   │   │   └── supabase.py           # Supabase client factory & safe insert/update helpers
│   │   ├── schemas/                  # Pydantic v2 schemas (application, business, investor, profile)
│   │   ├── services/
│   │   │   ├── ai_summary.py         # AI summary generator with extractive fallback
│   │   │   ├── demo_store.py         # Seed demo records and in-memory caches
│   │   │   ├── matching.py           # 100-point matching rubric scoring function
│   │   │   └── ocr_service.py        # PyPDF OCR text extraction & credential analysis
│   │   └── main.py                   # FastAPI + Socket.IO ASGI entrypoint & CORS middleware
│   ├── db/
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql         # Base tables & RLS
│   │       ├── 002_add_gstin_equity_cv.sql    # GSTIN, equity stake %, CV columns
│   │       └── 003_add_deal_messages.sql      # deal_messages table & RLS policies
│   ├── tests/
│   │   ├── test_api_and_flow.py      # 17 end-to-end integration test cases
│   │   └── test_health.py            # Health & root route verification
│   ├── requirements.txt              # Python dependencies (fastapi, python-socketio, pypdf, supabase, httpx, pytest)
│   └── .env                          # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/               # Button, Card, Input, Select, Textarea, StatusChip, SharkAssistant
│   │   │   ├── deal/
│   │   │   │   └── DealChatModal.tsx # End-to-end encrypted deal planning room
│   │   │   └── layout/
│   │   │       ├── AppLayout.tsx     # Global layout mounting Navbar, Footer, and SharkAssistant
│   │   │       ├── Navbar.tsx        # Responsive navigation with role indicators & auth state
│   │   │       └── Footer.tsx        # Standard footer
│   │   ├── lib/
│   │   │   ├── api.ts                # Centralized typed ApiClient (Deal messages, Assistant, OCR)
│   │   │   ├── socket.ts             # Socket.IO client singleton with auto-reconnection
│   │   │   └── supabase.ts           # Supabase Auth client & session listener
│   │   ├── pages/
│   │   │   ├── EntrepreneurDashboard.tsx  # SME profile, investor matches, proposals, deal chat
│   │   │   ├── InvestorDashboard.tsx      # Metrics, CV upload/OCR, incoming proposals, SME pipeline
│   │   │   ├── LandingPage.tsx            # Hero, value props, rubric explanation
│   │   │   ├── LoginPage.tsx              # Quick one-click demo login & standard login
│   │   │   └── SignupPage.tsx             # Streamlined registration (no CV required during signup)
│   │   ├── types/                    # TypeScript definitions (Business, Application, DealMessage, OCR)
│   │   ├── App.tsx                   # Route guards & multi-tab session synchronization
│   │   └── main.tsx                  # React DOM mount point
│   ├── package.json
│   ├── tailwind.config.js            # Tailored HSL colors, Navy/Teal palette
│   └── .env                          # Frontend environment variables
├── SharkBridge_Docs/                 # 7 comprehensive specification documents
├── supabase_schema.sql               # Consolidated database schema
└── README.md
```

---

## 5. API Reference

All routes are prefixed with `/api/v1`.

### 🛡️ Auth & Profiles
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Create a new user account with auto-confirmed credentials | No |
| `GET` | `/me` | Get profile for currently authenticated user | Yes |
| `POST` | `/profile` | Sync / update user profile name and role | Yes |
| `GET` | `/investors` | List all verified investors and public criteria | No |

### 🏢 Businesses (SMEs)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/businesses` | Create a new business profile with optional GSTIN | Entrepreneur |
| `GET` | `/businesses/mine` | List businesses owned by the current entrepreneur | Entrepreneur |
| `GET` | `/businesses/{id}` | Retrieve business profile by ID | Yes |
| `PATCH` | `/businesses/{id}` | Update business profile (restricted to owner) | Entrepreneur |

### 💼 Investors & OCR
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/investor/preferences` | Retrieve investment thesis and OCR credentials | Investor |
| `PUT` | `/investor/preferences` | Update thesis (target sectors, max ticket size INR, stages) | Investor |
| `POST` | `/investor/cv` | Upload CV document, trigger OCR analysis & persist URL | Investor |
| `GET` | `/investor/{id}/cv` | Retrieve verified CV details & OCR findings | Yes |

### 🎯 Matchmaking
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/matches` | Deterministic 100-pt matches for entrepreneur or SME pipeline for investor | Yes |

### 📝 Funding Applications & Deal Chat
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/applications` | Submit funding proposal with requested capital & equity stake % | Entrepreneur |
| `GET` | `/applications/mine` | List proposals submitted by entrepreneur or received by investor | Yes |
| `GET` | `/applications/{id}` | Get application details with business & profile joins | Yes |
| `PATCH` | `/applications/{id}/status` | Update review status (`under_review`, `interested`, `declined`) | Target Investor |
| `POST` | `/applications/{id}/ai-summary` | Generate / refresh AI executive summary | Participant |
| `GET` | `/applications/{id}/messages` | Get deal room chat messages (*unlocked when status = interested*) | Participant |
| `POST` | `/applications/{id}/messages` | Send message in encrypted deal room (*status = interested*) | Participant |

### 🤖 Personal Assistant
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/assistant/chat` | Query SharkBot for guidance on platform rules, matching, OCR, & chat | No |

---

## 6. How to Run Locally

### Prerequisites
- **Node.js** v18+ & **npm**
- **Python** 3.11+
- Virtual environment (`venv`)

### 1. Start the Backend API
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.venv\Scripts\activate      # Windows PowerShell / CMD
# source .venv/bin/activate # macOS / Linux

# Install dependencies if needed
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Start the Frontend Application
```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 7. Database Migrations (Supabase)

If setting up a fresh Supabase database, execute the SQL files in `backend/db/migrations/` in order via the Supabase SQL Editor:

1. [`001_initial_schema.sql`](file:///c:/Users/LENOVO%20LOQ/Desktop/SharkBridge/backend/db/migrations/001_initial_schema.sql): Creates `profiles`, `businesses`, `investor_preferences`, `funding_applications` tables with Row Level Security.
2. [`002_add_gstin_equity_cv.sql`](file:///c:/Users/LENOVO%20LOQ/Desktop/SharkBridge/backend/db/migrations/002_add_gstin_equity_cv.sql): Adds `gstin` to `businesses`, `equity_stake_pct` to `funding_applications`, and `cv_file_url` / `cv_file_name` to `investor_preferences`.
3. [`003_add_deal_messages.sql`](file:///c:/Users/LENOVO%20LOQ/Desktop/SharkBridge/backend/db/migrations/003_add_deal_messages.sql): Creates the `deal_messages` table with participant-based RLS policies.
4. **Storage Bucket**: Ensure an `investor-cvs` public storage bucket exists in your Supabase project.

> [!NOTE]
> Even if migrations have not been applied to your remote Supabase database yet, SharkBridge contains multi-layer resilient fallback stores (`INVESTOR_CV_STORE`, `DEAL_MESSAGES_STORE`, `BUSINESS_EXTRAS`, and Supabase Auth `user_metadata`) ensuring 100% feature availability and data persistence.

---

## 8. Running Automated Tests

### Backend Test Suite (Pytest)
```bash
cd backend
.venv\Scripts\pytest -v
```
**Test Coverage (18 / 18 Passing)**:
- Authentication & unauthenticated route rejection (`401`)
- Role-based access control & permission enforcement (`403`)
- Input validation & negative numbers rejection (`422`)
- 100-point deterministic matching rubric & partial score calculations
- AI summary synthesis & extractive fallback
- Optional GSTIN persistence in business profiles
- Funding application submission with Equity Stake Offered (%)
- Maximum Ticket Size fit evaluation
- Investor CV upload, storage, and authenticated download
- **Automated OCR credential extraction and confidence scoring**
- **Investor Matched SME Deal Flow pipeline retrieval**
- **SharkBot platform assistant query answering & suggestions**
- **Deal planning chat room access control (locked on `submitted`, unlocked on `interested`)**

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```
- Validates all TypeScript types with strict checks (`tsc && vite build`).
- Compiles production bundle with 0 errors.

---

## 9. End-to-End Walkthrough

### 🚀 Flow A: Entrepreneur Journey
1. Navigate to `http://localhost:5173` and click **Log In**.
2. Click **"Demo Entrepreneur"** (or sign up as a new Entrepreneur).
3. Under **Business Profile**, create or view your company profile:
   - Provide Business Name, Sector, Stage (*Idea, Prototype, Early Growth, Mature*), Location, Revenue & Expenses in INR (*).
   - Enter optional **GSTIN** (e.g. `27AABCU9603R1ZN`) and Website URL.
4. Review your **Investor Matches** ranked by match percentage with full point breakdowns.
5. Review the verified CV and OCR credentials of prospective investors.
6. Click **"Apply to this Investor"**, specify requested capital in INR, indicate your **Equity Stake Offered (%)**, and submit.
7. Observe your synthesized **AI Executive Summary**. Once the investor marks the proposal as `Interested`, click **"Deal Chat"** to enter the encrypted deal room!

### 💼 Flow B: Investor Journey
1. Log in using **"Demo Investor"** (or sign up as a new Investor). Notice CV upload is **not** asked during registration.
2. On your **Investor Review Dashboard**:
   - Upload your CV once: automated OCR extracts your experience, detected sectors, and ticket capacity.
   - Reload the page: observe your verified badge and credentials remain intact permanently.
3. Configure your thesis via **"Set Investment Criteria"** (Target Sectors, Maximum Ticket Size in INR, Preferred Stages).
4. Browse the **Matched SME Deal Flow Pipeline** to review live business matches with their revenue, EBITDA, location, and GSTIN.
5. In **Incoming SME Funding Applications**, review the proposal, AI summary, and equity stake offered.
6. Click **"Mark Interested"**:
   - The proposal status immediately updates to `interested`.
   - The **"Deal Planning Chat"** button unlocks.
7. Open the deal room and verify the **`🔒 Certified by SharkBridge, end-to-end encryption`** header banner. Coordinate terms directly with the founder!

### 🤖 Flow C: SharkBridge Personal Guide (SharkBot)
1. Click the floating **"SharkBridge Guide"** button in the bottom right corner of any page.
2. Ask questions such as:
   - *"How do I create a business profile?"*
   - *"What business stages are available?"*
   - *"How does the 100-point matching rubric work?"*
   - *"How does investor CV OCR verification work?"*
   - *"How does Deal Planning Chat unlock?"*
3. Receive instant, accurate platform guidance with actionable suggestion chips.

---

## 10. License & Credits

Built with precision for the SharkBridge platform. Developed in strict accordance with the source specification documents in `SharkBridge_Docs/`.
