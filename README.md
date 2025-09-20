# PillPal

SmartMed Voice: a voice-first medication adherence app.

## Stack
- Frontend: Next.js (TS), TailwindCSS, Auth0 SDK
- Backend: FastAPI, Supabase Postgres, Twilio, Gemini API

## Getting Started

### Frontend
1. cd frontend
2. cp .env.example .env.local and fill values
3. npm run dev

### Backend
1. cd backend
2. cp .env.example .env
3. python -m venv .venv && source .venv/bin/activate
4. pip install -r requirements.txt
5. uvicorn app.main:app --reload --port 8080

### Supabase
- Apply schema: run the SQL in `supabase/schema.sql`

## Deployment
- Frontend: Vercel
- Backend: Cloud Run using `backend/Dockerfile`

## Notes
- Configure Auth0 app and set callback/logout URLs to `http://localhost:3000/api/auth/callback` and `http://localhost:3000/`.
