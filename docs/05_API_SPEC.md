# SharkBridge — API Specification (MVP)

Base path: `/api/v1`

All protected routes require a valid authenticated user token. The backend must derive the acting user ID from the validated token, not trust a client-supplied user ID.

## Authentication/profile
- `GET /me` — return current user's profile
- `POST /profile` — create profile after signup
- `PATCH /profile` — update own profile

## Businesses
- `POST /businesses` — entrepreneur creates a business
- `GET /businesses/mine` — list own businesses
- `GET /businesses/{business_id}` — get business if authorized
- `PATCH /businesses/{business_id}` — update own business

## Investor preferences
- `GET /investor/preferences` — get own preferences; investor only
- `PUT /investor/preferences` — create/update own preferences; investor only

## Matching
- `GET /matches` — return investor matches for entrepreneur or business matches for investor, depending on role
- Response should include `score`, `reasons`, and fields the viewer is authorized to see.

## Funding applications
- `POST /applications` — entrepreneur submits an application to a target investor
- `GET /applications/mine` — list applications the current user submitted or received
- `GET /applications/{application_id}` — detail if user is applicant entrepreneur or target investor
- `PATCH /applications/{application_id}/status` — target investor updates status
- `POST /applications/{application_id}/ai-summary` — generate/update AI summary for authorized application

## Suggested response shape
```json
{
  "id": "uuid",
  "status": "submitted",
  "created_at": "ISO-8601 timestamp"
}
```

## Error handling
- `400` invalid input
- `401` unauthenticated
- `403` authenticated but unauthorized
- `404` resource not found or not visible to this user
- `409` conflicting duplicate operation
- `422` validation error
- `429` rate limit exceeded
- `500` unexpected server error

Do not return stack traces, API keys, or private records in errors. Add pagination for list endpoints if time allows.
