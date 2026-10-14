# SharkBridge — Test Plan

## Critical end-to-end tests
1. Entrepreneur can sign up, log in, create a business profile, and submit a funding application.
2. Investor can sign up, set preferences, and view applications addressed to them.
3. Investor can update an application status.
4. Entrepreneur sees the updated status after refresh/re-login.
5. AI summary uses only submitted data and does not invent revenue, customers, or traction.
6. Match result contains a score and human-readable reasons.
7. Unauthenticated users cannot access protected data.
8. An entrepreneur cannot view another entrepreneur's private application.
9. An investor cannot change another investor's application status.
10. Invalid funding amount and malformed fields are rejected with understandable errors.

## UI tests
- Forms show required-field errors.
- Submit buttons show loading and prevent accidental double submission.
- Empty dashboards explain the next step.
- API failures show retry guidance.
- Layout works on mobile and desktop.
- Keyboard focus and labels are usable.

## AI behavior tests
- Missing revenue remains “not provided,” not an invented number.
- The summary distinguishes reported facts from possible risks.
- The system never says a business is guaranteed to succeed.
- AI failure does not crash application submission.
- UI displays that AI output is not independently verified or investment advice.

## Demo checklist
- Have synthetic entrepreneur and investor demo accounts/data ready.
- Confirm the investor has preferences that produce at least one match.
- Confirm an application can be submitted and status updated live.
- Confirm no secrets are included in the repository.
