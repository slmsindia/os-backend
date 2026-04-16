# CSP Onboarding System (Prabhu)

This workspace now includes a complete CSP Onboarding flow implementation across:

- Backend: `os-backend` (Express proxy APIs)
- Frontend: `os-frontend` (multi-step wizard UI)

## Implemented API Flow

1. Token Generation (`/api/csp/token`)
2. Search CSP (`/api/csp/search`)
3. Send OTP via SOAP (`/api/csp/send-otp`)
4. Create CSP (`/api/csp/create`)
5. CSP Mapping (`/api/csp/mapping`)
6. E-KYA Initiate (`/api/csp/initiate`)
7. E-KYA Unique Ref Status (`/api/csp/uniquerefstatus`)
8. Enrollment (optional) (`/api/csp/enrollment`)
9. BioKYC Requery (`/api/csp/biokyc-requery`)
10. CSP Onboarding (`/api/csp/onboarding`)
11. Agent Consent (`/api/csp/agent-consent`)

Also added:

- `GET /api/states?country=India|Nepal` for state/district dropdowns.
- Token auto-refresh logic (midnight expiry + 25 min idle handling).

## Backend Setup (`os-backend`)

1. Copy env:
   - `cp .env.example .env` (or create manually on Windows)
2. Fill CSP and Prabhu credentials in `.env`.
3. Install dependencies:
   - `npm install`
4. Start backend:
   - `npm run dev`

### New Backend Endpoints

- `POST /api/csp/token`
- `POST /api/csp/search`
- `POST /api/csp/send-otp`
- `POST /api/csp/create`
- `POST /api/csp/mapping`
- `POST /api/csp/initiate`
- `POST /api/csp/uniquerefstatus`
- `POST /api/csp/enrollment`
- `POST /api/csp/biokyc-requery`
- `POST /api/csp/onboarding`
- `POST /api/csp/agent-consent`
- `GET /api/states`

## Frontend Setup (`os-frontend`)

1. Install dependencies:
   - `npm install`
2. Start frontend:
   - `npm run dev`
3. Open dashboard page:
   - `Services -> Prabhu CSP Onboarding`
   - Route: `/dashboard/services/prabhu-csp`

## Frontend Features

- Multi-step form wizard (8 sections)
- Search CSP modal with prefill when found
- React Hook Form + Zod validation
- Dynamic state/district dropdown from API
- OTP send + OTP process ID storage
- Pipeline action buttons for Mapping, Initiate, Polling, Onboarding
- UniqueRef polling (5s interval, 2-minute timeout)
- AgentConsent polling (30s interval)
- PAN status handling messages
- Consent URL iframe modal
- Tracker bar for full pipeline progress

## Important Notes

- Keep API keys and credentials only in backend `.env`.
- `CSP_SEND_*` is used for SOAP `SendOTP` call.
- `branchCode` from CreateCSP is reused in downstream calls.
- `partnerUniqueRefNo` is generated as `PMT + timestamp`.

## Quick Test Sequence

1. Search CSP by mobile.
2. If not found, fill form and Send OTP.
3. Enter OTP and Create CSP.
4. Run Mapping.
5. Run Initiate and complete Aadhaar flow on RBL page.
6. Start UniqueRef polling until success.
7. Run Onboarding.
8. Start AgentConsent polling until approved/final.
