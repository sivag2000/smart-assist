# 🧠 SmartAssist — Personal AI Assistant

A full-stack personal AI assistant app that helps you manage your tasks, notes, reminders, calendar and more — all powered by AI chat.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Email/password login + **Sign in with Google** |
| 💬 AI Chat | Chat with your AI assistant, powered by Gemini |
| 🎙️ Voice Chat | Speak to the AI and hear responses read back |
| 📊 Dashboard | Overview of tasks, reminders and recent notes |
| ✅ Tasks | Create tasks with priority, status and due dates |
| 📝 Notes | Rich notes with **voice-to-text** input and tags |
| 🔔 Reminders | Set reminders with daily/weekly/monthly repeat |
| 📅 Google Calendar | Sync your Google Calendar events |
| 🔍 Global Search | Search notes, tasks and reminders with **Ctrl+K** |
| ⏱️ Focus Timer | Pomodoro timer (25/5/15 min) built into the sidebar |
| 👤 Profile | Edit name, change password and manage settings |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **React Router v7** — routing
- **@react-oauth/google** — Google OAuth
- **Lucide React** — icons
- **Web Speech API** — voice input & output (built into browser)

### Backend
- **Node.js** + **Express 5** + **TypeScript**
- **Prisma ORM** + **SQLite** — database
- **JWT** — authentication
- **bcrypt** — password hashing
- **Google Auth Library** — Google OAuth verification
- **node-cron** — reminder scheduler

### AI Service
- **Python** + **FastAPI**
- **OpenAI SDK** (configured for Google Gemini)
- **uvicorn** — ASGI server

---

## 📁 Project Structure

```
smart-assist/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/    # Layout, Login, GlobalSearch, FocusTimer, etc.
│   │   ├── pages/         # Chat, Dashboard, Tasks, Notes, Reminders, Profile
│   │   ├── hooks/         # Custom React hooks
│   │   └── api.ts         # Axios API client
│   └── .env               # VITE_GOOGLE_CLIENT_ID
│
├── backend/           # Express REST API
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middleware/     # JWT auth middleware
│   │   └── jobs/          # Cron jobs (reminders)
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── .env               # JWT_SECRET, GOOGLE credentials, DATABASE_URL
│
└── ai-service/        # Python FastAPI AI service
    ├── main.py
    └── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **Python** 3.10+
- A **Google Cloud** project with OAuth credentials
- A **Gemini API key** (or OpenAI API key)

---

### 1. Clone the repository

```bash
git clone https://github.com/sivag2000/smart-assist.git
cd smart-assist
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your_jwt_secret_here"
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
AI_SERVICE_URL=http://127.0.0.1:8000
```

Run database migrations:

```bash
npx prisma db push
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

Backend runs on **http://localhost:3000**

---

### 3. AI Service setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

Create a `.env` file in the `ai-service/` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the AI service:

```bash
python -m uvicorn main:app --reload
```

AI service runs on **http://localhost:8000**

---

### 4. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable **Google Calendar API**
3. Go to **APIs & Services → Credentials → Create OAuth Client ID**
4. Choose **Web Application**
5. Add `http://localhost:5173` to **Authorised JavaScript origins**
6. Copy the **Client ID** and **Client Secret** into your `.env` files
7. Go to **OAuth consent screen → Test users** and add your Gmail

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register with email/password |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/google` | Login with Google |
| GET | `/dashboard` | Dashboard stats |
| GET/POST | `/tasks` | List / create tasks |
| GET/POST | `/notes` | List / create notes |
| GET/POST | `/reminders` | List / create reminders |
| GET | `/chat/history` | Load chat history |
| POST | `/chat/message` | Send message to AI |
| GET | `/search?q=...` | Global search |
| GET | `/calendar/status` | Google connection status |
| POST | `/calendar/sync` | Sync Google Calendar |
| GET | `/profile` | Get user profile |

---

## 📸 Pages

- **`/login`** — Login & Register with email or Google
- **`/dashboard`** — Overview stats, overdue tasks, reminders
- **`/chat`** — AI chat with voice input/output
- **`/tasks`** — Task manager with filters
- **`/notes`** — Notes grid with voice input and search
- **`/reminders`** — Reminder list with repeat support
- **`/profile`** — Edit profile and settings

---

## 📝 License

MIT — free to use and modify.

---

> Built with ❤️ using React, Express, Prisma and Gemini AI
