# SharkBridge — Product Requirements Document (PRD)

**Version:** 1.0  
**Purpose:** Hackathon MVP  
**Product type:** AI-assisted small-business funding discovery platform

## 1. Product summary
SharkBridge helps small businesses present funding opportunities in a structured way and helps investors discover businesses that align with their stated interests. AI organizes submitted information and supports discovery; it does not approve funding or guarantee business success.

## 2. Problem
Small businesses can struggle to reach relevant investors and present their business potential clearly. Investors, meanwhile, may receive inconsistent information and have difficulty screening opportunities efficiently. SharkBridge creates a structured process for business profiles, funding applications, AI-generated summaries, and preference-based investor matching.

## 3. Target users
### Entrepreneur
- Creates and manages a business profile.
- Enters business and funding information.
- Requests funding from a selected investor.
- Tracks application status.

### Investor
- Creates an investor profile with preferred sectors and funding range.
- Views recommended businesses and submitted applications.
- Reviews application details and AI summaries.
- Updates application status.

## 4. MVP goals
1. Support registration and login for both user roles.
2. Allow entrepreneurs to create and edit business profiles.
3. Allow entrepreneurs to submit funding applications.
4. Generate an AI summary from submitted business information.
5. Recommend investors using transparent profile-based matching.
6. Allow investors to review applications and update status.
7. Enforce role-based access to private data.

## 5. Out of scope for MVP
- Processing payments or transferring investments.
- Legally binding investment agreements.
- Credit scoring or predictions of business success.
- Automated approval/rejection by AI.
- Live WhatsApp integration.
- Full real-time chat, meetings, social feed, and entrepreneur connections. Keep these as future enhancements unless the core MVP is complete.
- Verification of financial statements or identity documents.

## 6. Core user journeys
### Entrepreneur
1. Sign up and choose Entrepreneur.
2. Complete personal and business profile.
3. Enter funding amount, use of funds, business stage, sector, revenue/expense figures if available, and growth plan.
4. Submit the funding application.
5. View AI summary, missing-information flags, and application status.
6. See suitable investors based on their published preferences and submit an application.

### Investor
1. Sign up and choose Investor.
2. Complete investor profile: sectors, investment range, preferred business stage, and location preferences if applicable.
3. View recommended businesses/applications.
4. Open a business profile and read submitted details plus the AI-generated summary.
5. Set status to `Under Review`, `Request Information`, `Interested`, or `Declined`.

## 7. Functional requirements
- **FR-01 Authentication:** Email/password signup and login; user role is saved and cannot be changed casually after onboarding.
- **FR-02 Profiles:** Users can view and edit their own profile. Entrepreneurs can maintain one or more business profiles only if the implementation supports it; for MVP, one business per entrepreneur is sufficient.
- **FR-03 Funding form:** Validate required fields and numeric amounts. Clearly label optional financial fields.
- **FR-04 AI summary:** Produce a concise summary based only on submitted data. Identify missing fields and possible questions; do not fabricate figures.
- **FR-05 Matching:** Rank investors by simple explainable criteria: sector overlap, funding range fit, business-stage fit, and location preference where supplied. Show why each match was suggested.
- **FR-06 Applications:** Save the application, selected investor, timestamps, and status.
- **FR-07 Investor review:** Only the target investor and the entrepreneur who submitted the application may see private application details.
- **FR-08 Status tracking:** Entrepreneurs see status updates; investors can change status.
- **FR-09 Error states:** Provide loading, empty, validation, and API-error states.
- **FR-10 Demo data:** Include clearly labeled seed/demo data so judges can test both roles without real financial information.

## 8. Non-functional requirements
- Responsive layout for laptop and mobile.
- Never expose service-role keys or LLM API keys in client-side code.
- Use server-side authorization checks, not just hidden UI buttons.
- Minimize collection of sensitive data.
- Display a notice that AI output is informational and not financial advice.
- Use synthetic demo data in the hackathon presentation.
- Provide clear empty states and accessible labels.

## 9. Success criteria for demo
A judge can:
1. Log in as an entrepreneur.
2. Create a business profile and submit a funding request.
3. See an AI-generated summary or a safe fallback summary.
4. Log in as an investor and see the application.
5. Review it and update its status.
6. Log back in as the entrepreneur and see the updated status.
7. See at least one investor match with a reason.

## 10. Product principles
- AI assists; people decide.
- Do not imply that a match equals an endorsement or verified investment offer.
- Clearly distinguish entrepreneur-provided claims from verified information.
- Prefer a complete, working core journey over many unfinished features.
