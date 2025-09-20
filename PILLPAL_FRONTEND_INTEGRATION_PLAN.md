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

### 5) Auth0 wiring (App Router) — COMPLETED
1. Provider: Wrap root layout with `Auth0Provider` (client component). If keeping existing layout from `pillpal-mvp/app/layout.tsx`, add the provider around `children`.
2. Routes (App Router): Implement `src/app/api/auth/[auth0]/route.ts` with handlers for:
   - GET `/api/auth/login` → redirect to Auth0 authorize with `audience=https://pillpal-api`
   - GET `/api/auth/logout` → redirect to Auth0 logout
   - GET `/api/auth/callback` → complete login (SDK route handler if available; else manual exchange)
3. UI: Add login/logout controls in navigation; use `useUser()` to read session in client components.
4. Roles: Use ID token roles for conditional UI, but rely on backend for actual authorization.

Notes: We previously used a manual redirect handler due to export issues. If the SDK version supports App Router helpers, prefer those; otherwise keep the manual approach.

### 6) Secure API proxy (critical) — COMPLETED
Create `src/app/api/proxy/[...path]/route.ts`:
- Server-side handler that:
  - Obtains an access token string for the current user using `getAccessToken()` from `@auth0/nextjs-auth0` (App Router compatible). Ensure your Auth0 app/API grants audience `https://pillpal-api`.
  - Forwards the incoming request to `${process.env.NEXT_PUBLIC_API_URL}/<path>`.
  - Adds `Authorization: Bearer <token>` to the outbound request.
  - Preserves headers and status codes; for JSON requests use `Content-Type: application/json` and pass `await request.text()` as body; for multipart (e.g., label upload) pass through original headers/body and avoid forcing content-type.
  - Restrict methods to GET/POST/PATCH/DELETE for safety.
- All client fetches should target `/api/proxy/...` to avoid exposing tokens in the browser.

Enhancements to implement:
- If `getAccessToken()` returns empty (edge cases), optionally fall back to a secure HTTP-only cookie named e.g. `pp_access_token` set during callback.
- Detect multipart uploads (`content-type` includes `multipart/form-data`) and stream the body untouched to support `/api/v1/label-extract`.

### 7) API client wrapper and types — COMPLETED
- `src/lib/api.ts` (or adapt `pillpal-mvp/lib/api.ts`):
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` that hits `/api/proxy` and returns typed JSON.
  - Centralized error handling (HTTP → user-friendly toast messages).
- Define types mirroring backend responses in `src/lib/types.ts` (Pydantic models):
  - `User`, `Medication`, `MedTime`, `Dose`, `Alert`, `IntentRequest/Response`, `LabelExtractResponse`, etc.

### 8) Page wiring to backend endpoints (step-by-step)
- Dashboard (`/`) — PARTIAL (live `user/me`, `doses`; meds incoming):
  - GET `/api/v1/user/next-dose` → next dose card
  - GET `/api/v1/medications` (for quick summary) or GET `/api/v1/doses?for=today`
  - Actions: PATCH `/api/v1/doses/{id}` with `{ status: 'taken'|'skipped'|'snoozed', taken_at? }`

- Medications (`/meds`, `/meds/new`):
  - GET `/api/v1/medications` (list)
  - Create: POST `/api/v1/medications` then POST med times; or backend accepts combined payload
  - Label intake: POST `/api/v1/label-extract` (multipart image) → prefill form → save
  - After creating medication and times, backend triggers generate next 7 days of doses; surface toast on success.

- Alerts (`/alerts`):
  - GET `/api/v1/alerts/missed-doses` (overdue)
  - POST `/api/v1/alerts/missed-dose?dose_id=...` (manual trigger for demo)
  - POST `/api/v1/alerts/acknowledge/{alert_id}`

- Schedule (`/schedule`):
  - GET `/api/v1/doses?range=today|week` for timeline

- Voice (`voice-mic` component):
  - On transcript: POST `/api/v1/intent` with `{ query }`
  - Use response to navigate or perform actions (e.g., speak next dose, mark taken)
  - TTS: reuse existing browser `speechSynthesis`; SR via Web Speech or the existing `voice-mic`.

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

### 11) Local development workflow — UPDATED
1. Backend: `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080`
2. Frontend: `cd frontend && npm i --legacy-peer-deps && npm run dev`
3. Auth0: ensure callback/logout URLs include `http://localhost:3000`
4. Test flow:
   - Login, open Dashboard → next dose loads
   - Mark dose taken/snoozed → PATCH updates succeed
   - Upload label → extraction → create med → med_times → doses auto-generated by trigger → visible in Schedule
   - Trigger missed dose → caregiver receives SMS → acknowledge
   - Voice query “What do I take now?” → intent response → spoken + visual reply

### 14) Detailed implementation steps (chronological)
1. Frontend env: create `frontend/.env.local` with Auth0 (BASE_URL, ISSUER, CLIENT_ID/SECRET, AUDIENCE, SECRET), `NEXT_PUBLIC_API_URL`, Supabase anon, Gemini public key.
2. Layout: ensure `Auth0Provider` wraps `app/layout.tsx` body.
3. Auth routes: implement `app/api/auth/[auth0]/route.ts` for login/logout/callback (manual redirects acceptable for MVP). Added cookie-based session and NextResponse handling on Edge. Callback now redirects to `/onboarding`.
4. Proxy: implement `app/api/proxy/[...path]/route.ts` using `getAccessToken()` (string) from `@auth0/nextjs-auth0`.
5. API client: add `lib/api.ts` with `apiFetch` calling `/api/proxy`.
6. Types: add `lib/types.ts` mirroring backend.
7. Dashboard wiring: call `/api/v1/user/me`, `/api/v1/user/next-dose`, dose actions. Guard redirects to `/onboarding` if profile incomplete.
8. Medications wiring: list `/api/v1/medications`, create med, upload label to `/api/v1/label-extract`, add med times, confirm doses generated.
9. Alerts wiring: list missed doses, trigger alert, acknowledge flow.
10. Voice intent: POST `/api/v1/intent` and handle suggestions (navigate/announce/act).
11. Caregiver/Clinician: wire reports to risk/adherence endpoints; add missing backend endpoints if required.
12. PWA: confirm SW/manifest headers active; icons present.
13. QA pass: test all flows, toasts, error states; ensure CORS ok; rotate secrets if shared.

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

### 13) Gaps and follow-ups — UPDATED
- Confirm/implement backend endpoints for:
  - Dose status updates (PATCH)
  - Caregiver summaries for linked patients
  - Clinician weekly aggregates
- Ensure `intent` and `label-extract` endpoints return the shapes expected by the UI. (Done)

### 16) Voice Input → Intent Parsing → UX actions — COMPLETED
- Frontend
  - `components/voice-mic.tsx` now captures speech via Web Speech API, sends transcript to the backend using `parseIntent(query)` from `lib/api.ts`, speaks Gemini’s `suggested_response`, and shows a toast.
  - `lib/api.ts` exposes `parseIntent()` with typed `ApiIntentResponse`.
- Backend
  - `/api/v1/intent` already implemented; uses Gemini text model and returns `{ intent, data: { confidence, entities, suggested_response, original_query } }`.
- Next steps (optional): map `intent` to concrete UI actions (navigate to meds, mark dose taken, etc.) based on `entities`.

### 15) Onboarding (NEW) — COMPLETED
- Frontend: `/onboarding` page collects Name, Role, Phone (for SMS). Submits to PATCH `/api/v1/user/me`.
- Backend: `UserUpdate` now accepts `phone_enc` in addition to `name`, `role`.
- Auth callback redirects first-time users to `/onboarding`; Dashboard also guards and redirects if name is missing or `Unknown User`.
- Add basic e2e happy-path test (Cypress or Playwright) if time allows.

---

This plan keeps tokens server-side via a proxy, aligns each screen to specific backend endpoints, and preserves the new UI/UX with minimal refactors while meeting security and hackathon time constraints.


