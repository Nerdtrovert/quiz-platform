# Quiz Platform

Full-stack online quiz/exam platform — React + Node.js + Express + MySQL.

## Stack
- Frontend: React + Vite + React Router
- Backend: Node.js + Express + Socket.io
- Database: MySQL 8.0+
- Auth: JWT + bcrypt

## Quick Start

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # runs on port 5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # fill in VITE_API_URL
npm install
npm run dev            # runs on port 5173
```

## Color Palette
| Role | Hex |
|---|---|
| Background | #0d1117 |
| Surface | #161b22 |
| Accent (Violet) | #7c3aed |
| Success | #10b981 |
| Error | #ef4444 |
| Warning | #f59e0b |
