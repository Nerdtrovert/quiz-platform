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
cp .env.example .env   # fill in VITE_API_URL (optional for local dev)
npm install
npm run dev            # runs on port 5173
```

## Backend check

From `backend/`:

```bash
npm run check
```

Validates required env vars and a live MySQL connection. For a full check, start the server (`npm run dev` or `npm start`) and open `http://localhost:5000/health` (should return `{"status":"ok"}`).

## Dev tunnels (Cursor / port forwarding)

If **Cursor’s port forwarding** fails with an error like `spawn ... code-tunnel ENOENT`, Cursor is missing the tunnel binary.

**Option A – Use Cursor’s tunnel (if you use VS Code):**  
Copy the `bin` folder from VS Code into Cursor so `code-tunnel` exists:

- **Windows:** From `%LOCALAPPDATA%\Programs\Microsoft VS Code\` copy `bin` into your Cursor install (e.g. `%LOCALAPPDATA%\Programs\cursor\`). You may need to rename `cursor-tunnel` to `code-tunnel` if applicable.
- **macOS:** Copy `/Applications/Visual Studio Code.app/Contents/Resources/app/bin` to `/Applications/Cursor.app/Contents/Resources/app/bin`.

You may need to repeat this after Cursor updates.

**Option B – Use a CLI tunnel (no Cursor tunnel needed):**

1. Start backend and frontend as usual (ports 5000 and 5173).
2. In another terminal, expose both ports, for example:
   - **localtunnel:**  
     `npx localtunnel --port 5000` (backend) and `npx localtunnel --port 5173` (frontend). Use the reported URLs in `VITE_API_URL` and for the app.
   - **ngrok:**  
     `ngrok http 5000` and `ngrok http 5173` (or use one tunnel and a reverse proxy).

Then set the frontend’s `VITE_API_URL` (and Socket.io base) to the **backend** tunnel URL (e.g. `https://xxx.loca.lt/api` for localtunnel).

**Working setup on Windows with Dev Tunnel:** Run the frontend from **PowerShell** (not Git Bash), and use port **5174**:

1. In **PowerShell**, from `frontend/` run:
   ```powershell
   npm run dev:tunnel
   ```
   This starts the dev server on **port 5174** with `--host` (needed for the tunnel).

2. In Cursor, forward port **5174** (not 5173) and open the tunnel URL. The tunnel URL will look like `https://xxx-5174.inc1.devtunnels.ms`.

3. Optionally set `VITE_DEV_ORIGIN` in `frontend/.env` to that tunnel URL so HMR works over the tunnel.

**If you get HTTP 502 with a dev tunnel URL:**

- **Git Bash:** Dev Tunnel often fails when the dev server is started from Git Bash. Use **PowerShell** (or CMD) and `npm run dev:tunnel` (port 5174) as above.
- Set `VITE_DEV_ORIGIN` in `frontend/.env` to your exact tunnel URL so the server listens in tunnel-friendly mode.
- If it still fails, use a CLI tunnel: `npx localtunnel --port 5174` (use the port your dev server is actually on).

**Forward the backend too:** To use the app over the tunnel, also forward port **5000** and set `VITE_API_URL` in `frontend/.env` to the backend tunnel URL with `/api` (e.g. `https://your-backend-tunnel-url/api`).

## Production / Hosting

- **Backend**
  - Set `PORT` (e.g. `5000` or your host’s port).
  - Set `JWT_SECRET` to a long, random secret.
  - Set `DB_*` to your production MySQL instance.
  - Optional: `CORS_ORIGIN` to your frontend origin (e.g. `https://your-app.com`).
  - Optional: `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` (defaults are for dev only).
  - Run with `npm start`. Health check: `GET /health`.

- **Frontend**
  - Set `VITE_API_URL` to your backend API base URL including `/api` (e.g. `https://api.yourdomain.com/api`).
  - Build: `npm run build`. Serve the `dist/` folder with any static host or your backend.
  - If using a static host, configure SPA fallback so all routes serve `index.html` (e.g. Netlify/Vercel do this by default).

- **Database**
  - Use `database/schema.sql` to create the schema on your production MySQL server.

## Color Palette
| Role | Hex |
|---|---|
| Background | #0d1117 |
| Surface | #161b22 |
| Accent (Violet) | #7c3aed |
| Success | #10b981 |
| Error | #ef4444 |
| Warning | #f59e0b |
