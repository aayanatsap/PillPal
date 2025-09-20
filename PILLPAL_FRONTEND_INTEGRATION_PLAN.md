## PillPal Frontend ↔ Backend Integration Plan

This document describes how to integrate the new Next.js frontend located in `pillpal-mvp/` with the existing FastAPI backend in `backend/` using the agreed tech stack (Auth0, Supabase Postgres, Google Gemini, Twilio, Vercel/Cloud Run).

### 1) Frontend overview (pillpal-mvp)
- App Router pages in `pillpal-mvp/app/`:
  - `page.tsx` (Dashboard)
  - `alerts/`, `caregiver/`, `clinician/`, `meds/`, `meds/new/`, `schedule/`, `settings/` (each has `page.tsx` and some `loading.tsx`)
- Components in `pillpal-mvp/components/`:
  - UI primitives under `components/ui/*` (badge, button, card, skeleton, toast, toaster)
  - App components: `dose-card`, `voice-mic`, `risk-badge`, `encouragement-card`, `nav-bar`, `tab-bar`, `schedule-view`, etc.
  - Providers: `motion-provider`, `theme-provider`
- Hooks in `pillpal-mvp/hooks/`: `use-theme`, `use-toast`
- Lib in `pillpal-mvp/lib/`: `api.ts`, `alerts-api.ts`, `caregiver-api.ts`, `clinician-api.ts`, `utils.ts`
- PWA assets: `public/manifest.json`, `public/sw.js`, icons/images
- Config:
  - `package.json` (Next 15.2.4, React 19, Tailwind v4, Radix UI, framer-motion, lucide-react, zod, etc.)
  - `next.config.mjs` (PWA headers, ignore build errors for hackathon speed)
  - `tsconfig.json` with paths alias `@/* -> ./*`

Key notes:
- The new UI is componentized and ready for wiring to real APIs. Most data is mocked in `app/page.tsx` and friends.
- Keep all data access server-side through FastAPI (no client Supabase usage for MVP).

### 2) Integration principles
- Auth: Auth0 for login; backend enforces auth via JWT (audience `https://pillpal-api`).
- API calls: Frontend routes through a Next.js server-side proxy that adds the Auth0 access token and forwards to FastAPI.
- Data source: All reads/writes go to FastAPI; FastAPI uses Supabase (service role), Gemini, Twilio.
- Security: No direct Supabase calls from the browser; tokens not exposed client-side.

### 3) Env variables
Create/update `frontend/.env.local` once the new frontend is moved under `frontend/` (or use `pillpal-mvp/.env.local` if running in-place):

```
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=YOUR_TENANT
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=https://pillpal-api
AUTH0_SECRET=generated-long-random

NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=PillPal
NEXT_PUBLIC_GOOGLE_API_KEY=...

# Optional demo values already set in backend/.env for Supabase/Twilio
```

Backend `backend/.env` (already configured): Auth0 issuer/audience, Supabase, Gemini, Twilio, CORS for `http://localhost:3000`.

### 4) Code moves and structure
Option A (recommended): Replace existing `frontend/` with `pillpal-mvp/` content (rename/move), then:
- Ensure `package.json` includes `@auth0/nextjs-auth0` and `jose`
- Ensure Tailwind v4 and PostCSS config are aligned (already in `pillpal-mvp`)
- Ensure `tsconfig.json` uses alias `@/* -> src/*` (or update imports to match final layout)

Option B: Keep `pillpal-mvp/` as-is temporarily and run it directly for UI work, then migrate into `frontend/` when wiring is complete.

### 5) Auth0 wiring (App Router)
1. Provider: Wrap root layout with `Auth0Provider` (client component). If keeping existing layout from `pillpal-mvp/app/layout.tsx`, add the provider around `children`.
2. Routes (App Router): Implement `src/app/api/auth/[auth0]/route.ts` with handlers for:
   - GET `/api/auth/login` → redirect to Auth0 authorize with `audience=https://pillpal-api`
   - GET `/api/auth/logout` → redirect to Auth0 logout
   - GET `/api/auth/callback` → complete login (SDK route handler if available; else manual exchange)
3. UI: Add login/logout controls in navigation; use `useUser()` to read session in client components.
4. Roles: Use ID token roles for conditional UI, but rely on backend for actual authorization.

Notes: We previously used a manual redirect handler due to export issues. If the SDK version supports App Router helpers, prefer those; otherwise keep the manual approach.

### 6) Secure API proxy (critical)
Create `src/app/api/proxy/[...path]/route.ts`:
- Server-side handler that:
  - Obtains an access token for the current user (via `@auth0/nextjs-auth0` `getAccessToken()`), ensuring the `audience` is `https://pillpal-api`.
  - Forwards the incoming request to `${process.env.NEXT_PUBLIC_API_URL}/<path>`
  - Adds `Authorization: Bearer <access_token>` to the outbound request
  - Streams the response back, preserving status codes and JSON
  - Restricts methods to GET/POST/PATCH/DELETE for safety
- All client fetches should target `/api/proxy/...` to avoid exposing tokens.

### 7) API client wrapper and types
- `src/lib/api.ts` (or adapt `pillpal-mvp/lib/api.ts`):
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` that hits `/api/proxy` and returns typed JSON.
  - Centralized error handling (HTTP → user-friendly toast messages).
- Define types mirroring backend responses in `src/lib/types.ts` (Pydantic models):
  - `User`, `Medication`, `MedTime`, `Dose`, `Alert`, `IntentRequest/Response`, `LabelExtractResponse`, etc.

### 8) Page wiring to backend endpoints
- Dashboard (`/`):
  - GET `/api/v1/user/next-dose` → next dose card
  - GET `/api/v1/medications` (for quick summary) or GET `/api/v1/doses?for=today`
  - Actions: PATCH `/api/v1/doses/{id}` with `{ status: 'taken'|'skipped'|'snoozed', taken_at? }`

- Medications (`/meds`, `/meds/new`):
  - GET `/api/v1/medications` (list)
  - Create: POST `/api/v1/medications` then POST med times; or backend accepts combined payload
  - Label intake: POST `/api/v1/label-extract` (multipart image) → prefill form → save

- Alerts (`/alerts`):
  - GET `/api/v1/alerts/missed-doses` (overdue)
  - POST `/api/v1/alerts/missed-dose?dose_id=...` (manual trigger for demo)
  - POST `/api/v1/alerts/acknowledge/{alert_id}`

- Schedule (`/schedule`):
  - GET `/api/v1/doses?range=today|week` for timeline

- Voice (`voice-mic` component):
  - On transcript: POST `/api/v1/intent` with `{ query }`
  - Use response to navigate or perform actions (e.g., speak next dose, mark taken)

- Caregiver (`/caregiver`):
  - If backend exposes caregiver-scoped endpoints, list linked patients and their adherence today/this week
  - Otherwise, add backend endpoints to query via `caregiver_links`

- Clinician (`/clinician`):
  - Weekly report: GET `/api/v1/risk/daily?range=last_7_days`
  - Aggregate adherence (% taken vs scheduled) per patient

### 9) PWA & performance
- Keep `next.config.mjs` headers for `sw.js` and `manifest.json`.
- Ensure `public/manifest.json` and `public/sw.js` are in the final frontend.
- Large images optimized or unoptimized per config (already `images.unoptimized: true`).

### 10) Error handling, a11y, and UX
- Use the included `toast`/`Toaster` for success/error messaging.
- Maintain loading skeletons (`skeleton.tsx`) and `loading.tsx` routes.
- Large-touch targets and keyboard navigation preserved (shadcn + Radix UI).

### 11) Local development workflow
1. Backend: `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080`
2. Frontend: `cd frontend && npm i && npm run dev` (or run inside `pillpal-mvp` before moving)
3. Auth0: ensure callback/logout URLs include `http://localhost:3000`
4. Test flow:
   - Login, open Dashboard → next dose loads
   - Mark dose taken/snoozed → PATCH updates succeed
   - Upload label → extraction → create med → med_times → doses auto-generated by trigger → visible in Schedule
   - Trigger missed dose → caregiver receives SMS → acknowledge
   - Voice query “What do I take now?” → intent response → spoken + visual reply

### 12) Deployment
- Frontend → Vercel
  - Set env: Auth0 vars, `NEXT_PUBLIC_API_URL` to Cloud Run URL, Gemini key
  - Auth0 Allowed Callback/Logout/Web Origins include Vercel domain
- Backend → Cloud Run
  - CORS: Vercel domain
  - Env: Supabase service role, Twilio, Gemini, Auth0 issuer/audience
- Auth0
  - API audience `https://pillpal-api`, RBAC enabled
  - Roles and permissions as needed (patient, caregiver, clinician)

### 13) Gaps and follow-ups
- Confirm/implement backend endpoints for:
  - Dose status updates (PATCH)
  - Caregiver summaries for linked patients
  - Clinician weekly aggregates
- Ensure `intent` and `label-extract` endpoints return the shapes expected by the UI.
- Add basic e2e happy-path test (Cypress or Playwright) if time allows.

---

This plan keeps tokens server-side via a proxy, aligns each screen to specific backend endpoints, and preserves the new UI/UX with minimal refactors while meeting security and hackathon time constraints.


