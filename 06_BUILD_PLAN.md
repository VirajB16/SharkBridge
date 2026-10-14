# SharkBridge — Build Plan for AI Coding Agent

## Working rules
1. Read all files in `docs/` before coding.
2. Build in small, runnable increments; do not generate the entire app in one pass.
3. Do not add features outside the MVP without asking.
4. Use TypeScript types and Pydantic schemas.
5. Keep all secrets server-side.
6. Add clear loading, empty, error, and success states.
7. Do not fake a successful API response. If using demo/mock mode, label it visibly.
8. Prefer understandable code a student can explain during judging over complex abstractions.
9. After each phase, run available checks and report files changed, commands run, and remaining issues.
10. Do not claim an integration works until it has been configured and tested.

## Phase 1 — Project foundation
- Create frontend and backend structure.
- Add environment examples and setup README.
- Add responsive design system and shared components.
- Add health-check endpoint.
- Confirm both frontend and backend run.

## Phase 2 — Authentication and roles
- Integrate Supabase Auth.
- Create profile on signup with selected role.
- Protect role-specific pages and APIs.
- Add authorization tests.

## Phase 3 — Profiles and applications
- Create database schema/migrations.
- Build entrepreneur business profile form.
- Build investor preferences form.
- Build funding application submission and status management.
- Seed clearly labeled demo data.

## Phase 4 — AI summary and matching
- Implement server-side LLM summary endpoint.
- Prompt AI to use only supplied facts, flag unknowns, and avoid fabricated metrics.
- Add timeout/error handling and clearly labeled fallback.
- Implement deterministic matching score and explanations.
- Test missing or malformed data.

## Phase 5 — Polish and demo
- Add dashboard cards, filters, status chips, responsive states.
- Test the complete entrepreneur-to-investor flow.
- Fix bugs and update README with demo steps.
- Optional only after core flow works: email alerts, chat, entrepreneur connections.

## Required final report from agent
- What is implemented
- How to run locally
- Environment variables required
- Database setup steps
- Demo flow and sample accounts/data
- Tests/checks run and results
- Known limitations and incomplete features
