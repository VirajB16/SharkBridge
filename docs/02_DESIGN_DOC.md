# SharkBridge — Design Document

**Version:** 1.0  
**Design direction:** Professional, trustworthy, modern fintech/business platform  
**Primary goal:** Make funding discovery understandable and low-friction for small-business owners.

## 1. UX principles
- Keep forms approachable; use plain language rather than finance jargon.
- Break long forms into clear sections.
- Make application status visible at all times.
- Present AI output as an assistant-generated summary, not a verdict.
- Use clear explanations for investor-match reasons.
- Keep entrepreneur and investor dashboards visually related but role-specific.

## 2. Visual direction
- Style: clean, editorial business dashboard; restrained visual effects.
- Suggested palette:
  - Deep navy: `#101828`
  - Teal/cyan accent: `#22C7C9`
  - Off-white background: `#F7F9FC`
  - Primary text: `#172033`
  - Muted text: `#667085`
  - Success: `#168A62`
  - Warning: `#B7791F`
  - Error: `#C43232`
- Typography: use one widely available sans-serif family (e.g. Inter). Avoid multiple decorative fonts.
- Components: consistent buttons, form fields, cards, status chips, tables, empty states, and dialogs.
- Use responsive spacing and readable contrast. Do not sacrifice usability for decorative animations.

## 3. Information architecture
### Public
- Landing page
- Sign up
- Login

### Shared authenticated shell
- Sidebar/top navigation
- Dashboard
- Profile/settings
- Logout

### Entrepreneur pages
- Entrepreneur dashboard
- Business profile create/edit/view
- Funding application form
- My applications and status details
- Investor discovery/matches

### Investor pages
- Investor dashboard
- Investor profile/preferences
- Recommended businesses
- Incoming applications
- Application review/details

## 4. Key screen specifications
### Landing page
- Hero headline: **Funding connections for businesses with ambition.**
- Supporting text: **Present your business clearly, discover relevant investors, and track funding conversations in one place.**
- Primary CTA: `Get Started`
- Secondary CTA: `Explore How It Works`
- Explain three steps: Build a profile → Get AI-assisted insights → Connect with relevant investors.
- Include disclaimer: SharkBridge does not guarantee funding or verify all submitted claims.

### Authentication and role selection
- Ask user to choose `Entrepreneur` or `Investor` during signup.
- Show a short explanation under each role.
- Validate email and password.
- Do not let users access role-restricted pages by manually changing the URL.

### Entrepreneur dashboard
- Summary cards: business profile completion, active applications, responses received.
- Primary action: `Complete Business Profile` or `Apply for Funding`.
- Recent applications table/list with investor, requested amount, date, and status.
- Match cards with investor preferences and a short reason for the match.
- AI summary card with `Generated from your submitted information` label.

### Business profile form
Fields:
- Business name
- Sector/category
- Short description
- Business stage
- Location (city/region; optional for demo)
- Product/service and target customers
- Revenue and expenses (optional numeric fields; state currency as INR)
- Growth plan
- Website/social link (optional)

### Funding application form
Fields:
- Funding amount requested (INR)
- Intended use of funds
- Business stage
- Current monthly revenue (optional)
- Current monthly expenses (optional)
- Growth/expansion plan
- Additional notes
- Confirmation that submitted information is accurate to the user's knowledge

### Investor dashboard
- Summary cards: new applications, under review, interested.
- Filters: sector, funding amount range, business stage, application status.
- Application cards show business name, sector, amount requested, date, AI summary preview, and status.
- Investor actions: `Review`, `Request Information`, `Mark Interested`, `Decline`.

### Application review
- Business profile and funding request details.
- AI summary in a visually distinct panel.
- Missing-information list.
- Match explanation, if applicable.
- Status update control.
- Warning: AI output is not independently verified and is not investment advice.

### Status design
Use consistent labels:
- Submitted
- Under Review
- Request Information
- Interested
- Declined
- Closed

Do not show `Funded` unless the parties explicitly record it; even then label it as user-reported, not platform-verified.

## 5. Interaction states
Every data-driven screen must include:
- Loading state
- Empty state with next action
- Validation errors near fields
- Success confirmation
- Recoverable error message and retry
- Disabled state while submitting
- Mobile layout without horizontal overflow

## 6. Responsive behavior
- Desktop: sidebar + main content area.
- Tablet: collapsible sidebar.
- Mobile: compact top navigation or drawer; cards stack vertically; tables convert to cards.
- Forms use full-width controls on small screens.

## 7. Accessibility
- Visible keyboard focus.
- Labels associated with form controls.
- Good text/background contrast.
- Do not rely on color alone to communicate status.
- Buttons have clear action labels.

## 8. Content tone
Professional, encouraging, clear, and realistic. Avoid claims such as “guaranteed funding,” “AI predicts success,” or “verified investor” unless verification actually exists.
