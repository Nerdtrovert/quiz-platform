const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const required = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env:", missing.join(", "));
  process.exit(1);
}

const corsOrigin = process.env.CORS_ORIGIN || "*";
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-tunnel-authorization"],
  }),
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/quizzes", require("./routes/exam.routes"));
app.use("/api/questions", require("./routes/question.routes"));
app.use("/api/attempts", require("./routes/attempt.routes"));
app.use("/api/scores", require("./routes/score.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.get("/", (req, res) => res.send("Quiz Platform API running"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// ── Socket.io ─────────────────────────────────────────────
const initSocket = require("./socket");
initSocket(io);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process, or set PORT to a different number in .env`);
    console.error(`Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

