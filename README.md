# 🧩 Quiz Platform

A full-stack web application for conducting online quizzes and exams. Built with React, Node.js/Express, Socket.io, and MySQL.

---

## 📁 Project Structure

quiz-platform/
├── backend/
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js      # Login, register, profile
│   │   ├── quizController.js      # CRUD for quizzes
│   │   ├── questionController.js  # CRUD for questions
│   │   └── attemptController.js   # Track responses, scores
│   ├── middleware/
│   │   └── auth.js                # JWT verify, role guards
│   ├── models/                    # (extend here for ORM later)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── quizzes.js
│   │   ├── questions.js
│   │   └── attempts.js
│   ├── utils/
│   │   └── socket.js              # Real-time quiz sessions
│   ├── schema.sql                 # DB schema (run once)
│   ├── server.js                  # Express entry point
│   ├── .env.example               # Env variable template
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── QuizCard.jsx
│       ├── context/
│       │   └── AuthContext.jsx      # Global auth state
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── QuizPlay.jsx         # Live quiz session
│       │   └── Results.jsx          # Show scores
│       ├── utils/
│       │   └── api.js               # Axios API calls
│       ├── App.jsx                  # Routes + providers
│       └── main.jsx
│
├── database/
│   └── schema.sql                   # MySQL schema
│   └── seed.sql               
│
├── package.json                     # Root scripts (concurrently)
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

🎨 Color Palette
Role	Hex
Background	#0d1117
Surface	#161b22
Accent	#7c3aed
Success	#10b981
Error	#ef4444
Warning	#f59e0b