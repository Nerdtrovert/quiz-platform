# 🧩 Quiz Platform

A full-stack web application for conducting online quizzes and exams. Built with React, Node.js/Express, Socket.io, and MySQL.

---

## 📁 Project Structure

quiz-platform/
├── backend/
│ ├── config/
│ │ └── db.js # MySQL connection pool
│ ├── controllers/
│ │ ├── authController.js # Login, register, profile
│ │ ├── quizController.js # CRUD for quizzes
│ │ ├── questionController.js # CRUD for questions
│ │ └── attemptController.js # Track responses, scores
│ ├── middleware/
│ │ └── auth.js # JWT verify, role guards
│ ├── models/ # (extend here for ORM later)
│ ├── routes/
│ │ ├── auth.js
│ │ ├── quizzes.js
│ │ ├── questions.js
│ │ └── attempts.js
│ ├── utils/
│ │ └── socket.js # Real-time quiz sessions
│ ├── schema.sql # DB schema (run once)
│ ├── server.js # Express entry point
│ ├── .env.example # Env variable template
│ └── package.json
│
├── frontend/
│ ├── public/
│ │ └── index.html
│ └── src/
│ ├── components/
│ │ ├── Navbar.jsx
│ │ ├── ProtectedRoute.jsx
│ │ └── QuizCard.jsx
│ ├── context/
│ │ └── AuthContext.jsx # Global auth state
│ ├── pages/
│ │ ├── Login.jsx
│ │ ├── Register.jsx
│ │ ├── Dashboard.jsx
│ │ ├── QuizPlay.jsx # Live quiz session
│ │ └── Results.jsx # Show scores
│ ├── utils/
│ │ └── api.js # Axios API calls
│ ├── App.jsx # Routes + providers
│ └── main.jsx
│
├── database/
│ └── schema.sql # MySQL schema
│ └── seed.sql  
│
├── package.json # Root scripts (concurrently)
└── README.md

## ⚡ Quick Start

### Prerequisites

- Node.js (v16+)
- MySQL (v8+)
- npm

### 1. Clone & Install

```bash
git clone <your-repo>
cd quiz-platform

### Install all dependencies
cd backend && npm install
cd ../frontend && npm install

2. Set Up MySQL Database

mysql -u root -p
source database/schema.sql
3. Configure Environment

cd backend
cp .env.example .env


4. Run Development Servers
# Backend
npm run dev

# Frontend
npm run dev
Backend → http://localhost:5000

Frontend → http://localhost:5174

🚀 Production / Hosting
Backend

Set PORT, JWT_SECRET, and DB_* for production.

Optional: CORS_ORIGIN for frontend origin.

Run with npm start. Health check: GET /health.

Frontend

Set VITE_API_URL to backend API base URL including /api.

Build: npm run build. Serve dist/ with static host or backend.

Configure SPA fallback (Netlify/Vercel handle automatically).

Database

Use database/schema.sql to create schema on production MySQL.
```

## One-off live event checklist

This application supports a single live room of 55–60 players on a
single backend instance. The live room is designed to recover from a brief
process restart, but it is not zero-downtime or multi-instance infrastructure.
Set `ROOM_MAX_PARTICIPANTS` on Render to a value from `55` through `60` (the
default is `60`); invalid values fall back to `60`.

1. **Use MySQL-compatible storage.** The backend uses `mysql2`, MySQL-specific
   SQL, and `database/schema.sql`. A PostgreSQL service (including Aiven
   PostgreSQL free) cannot be connected by changing only `DATABASE_URL`.
2. **Before the event**, run `npm run check` from `backend` against the
   production database, then verify `GET /health` from the deployed URL.
3. **Warm the Render service** by opening `/health` and the frontend shortly
   before participants join. Keep the host dashboard and the deployed health
   endpoint open during the event.
4. **Rehearse with 55–60 clients**: join the same room, start the quiz, submit
   answers, disconnect several clients, reconnect them, and confirm the final
   leaderboard and response counts in the database.
5. **Export or snapshot the database** before creating the event room. Do not
   rely on Render's local filesystem for event data.
6. **If the service restarts**, wait for `/health` to return `200`, reload the
   host page, and have participants reload the room page. The room and answer
   records are restored from MySQL; an answer submitted during the outage may
   need to be submitted again.

Free Render services may sleep, restart, or exhaust monthly usage, and free
database services have no production availability guarantee. Check provider
usage and service logs immediately before the event; do not schedule the event
if the database is near its storage or connection limit.
