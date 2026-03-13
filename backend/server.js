const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/quizzes", require("./routes/exam.routes"));
app.use("/api/questions", require("./routes/question.routes"));
app.use("/api/attempts", require("./routes/attempt.routes"));
app.use("/api/scores", require("./routes/score.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.get("/", (req, res) => res.send("Quiz Platform API running"));

// ── Socket.io ─────────────────────────────────────────────
const initSocket = require("./socket");
initSocket(io);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

