# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SmartAssist is a full-stack personal AI assistant: chat (voice in/out), tasks, notes, reminders, Google Calendar sync, dashboard, global search. It is three independently-run services that must all be up for the app to work end-to-end:

- `frontend/` — React 19 + TypeScript + Vite + Tailwind, talks to the backend over HTTP.
- `backend/` — Express 5 + TypeScript + Prisma/SQLite, talks to the AI service over HTTP and to Google APIs directly.
- `ai-service/` — Python FastAPI service that wraps an LLM (Gemini by default, OpenAI as fallback) behind a single `/chat` endpoint.

## Commands

### Backend (`backend/`)
```
npm install
npx prisma db push && npx prisma generate   # sync SQLite schema / regen client after editing schema.prisma
npm run dev                                  # nodemon src/index.ts, http://localhost:3000
```
No backend test suite exists (`npm test` is a stub that exits 1).

### AI service (`ai-service/`)
```
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload          # http://localhost:8000
```

### Frontend (`frontend/`)
```
npm install
npm run dev        # vite --host, http://localhost:5173
npm run build       # tsc -b && vite build
npm run lint        # eslint .
```

### Required `.env` files
Each service needs its own `.env` (none are committed):
- `backend/.env`: `PORT`, `DATABASE_URL` (e.g. `file:./prisma/dev.db`), `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AI_SERVICE_URL`
- `ai-service/.env`: `GEMINI_API_KEY` (falls back to `OPENAI_API_KEY`/gpt-4o-mini if unset; falls back to a canned echo response if neither is set)
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID`

All three services fall back to dummy dev values if env vars are missing (`fallback_secret` JWT secret, `fake_client_id_for_dev`, etc.), so the app boots without any `.env` but auth/AI/calendar features degrade or no-op.

## Architecture

### Request flow for chat
`ChatPage.tsx` → `POST /chat/message` (backend, JWT-protected) → `chat.controller.ts` loads last 10 `ChatMessage` rows for context, builds a calendar-context string from the user's `Event` rows in the next 7 days, and proxies to the ai-service's `POST /chat` (`AI_SERVICE_URL`, default `http://127.0.0.1:8000`) → ai-service injects a system prompt + the calendar context and calls Gemini/OpenAI → response is persisted back as a `ChatMessage` and returned. The legacy `POST /ai/chat` route (`backend/src/ai.ts`) does the same calendar-context-building independently for a different endpoint — the two are not shared, so calendar-context logic changes typically need to be made in both places if both are still in use.

### Two backend code styles coexist
- **Legacy inline routers**: `auth.ts`, `ai.ts`, `calendar.ts` define the `Router` and handlers in one file and are mounted directly in `index.ts` (`app.use('/auth', authRoutes)`, etc.).
- **Controller/route split**: everything else (`tasks`, `notes`, `reminders`, `chat`, `profile`, `dashboard`, `search`) has `routes/<x>.routes.ts` (route table, wraps handlers with `authenticate` middleware) paired with `controllers/<x>.controller.ts` (Prisma logic). Prefer this split style for new backend endpoints.

Auth middleware (`middleware/authenticate.ts`) verifies the JWT and sets `req.user = decoded` (`{ userId }`); every protected handler reads `req.user.userId` and is typed `(req: any, res: Response)` since Express's `Request` isn't augmented with a `user` field.

### Two distinct Google OAuth flows — don't conflate them
- **Login**: `POST /auth/google` (`auth.ts`) — one-shot ID token verification (`@react-oauth/google` implicit flow) used only to authenticate/create a `User` and issue an app JWT.
- **Calendar/Drive/Gmail connect**: `GET /calendar/status`, `POST /calendar/auth`, `POST /calendar/sync` (`calendar.ts`) — auth-code flow (`useGoogleLogin({ flow: 'auth-code' })` in `Layout.tsx`), stores tokens in `GoogleCredential`, refreshes on expiry, and pulls events into the local `Event` table. This is a separate consent step from login, gated by `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` actually being configured (checked via the `serverConfigured` flag, not just presence of the OAuth client).

### Data model (`backend/prisma/schema.prisma`)
SQLite via Prisma. All user-owned models (`Task`, `Note`, `Reminder`, `ChatMessage`, `Event`, `Conversation`, `Preference`, `UserSettings`, `GoogleCredential`) cascade-delete off `User`. Notable fields: `Note.tags` and `Preference.settings`/`Conversation.messageHistory` are JSON stringified into a `String` column (no native JSON type in SQLite/Prisma here — parse/stringify manually). `Reminder` repeat logic (`isRepeat`/`repeatInterval`) is advanced by `jobs/reminder.job.ts`, a `node-cron` job started once from `index.ts` that runs every minute and mutates `remindAt` in place for repeating reminders.

### docker-compose.yml is not wired into the app
It defines Postgres and Weaviate containers, but the Prisma datasource is `sqlite` and nothing in `backend/src` references `pg` or Weaviate. Treat `docker-compose.yml` as aspirational/unused infrastructure, not the actual dev database — the real DB is the SQLite file at `DATABASE_URL`.

### Frontend structure
`App.tsx` defines all routing: `/login` is public, everything else sits behind `RequireAuth` (checks `localStorage.getItem('token')`) and the shared `Layout` (sidebar nav, Google-connect button, global search, focus timer). Pages live in `frontend/src/pages/` one-per-feature; `api.ts` is a single axios instance (hardcoded `baseURL: 'http://localhost:3000'`, not env-driven) that injects the JWT bearer token from `localStorage` on every request. Voice input/output on the chat page use the browser's native Web Speech API (`SpeechRecognition`/`speechSynthesis`) directly — no external speech service.
