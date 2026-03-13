const pool = require("./config/db");

module.exports = function initSocket(io) {
  const rooms = {};

  // ── Helpers ───────────────────────────────────────────────

  function normalizeOptions(options) {
    const raw =
      typeof options === "string" ? JSON.parse(options) : options || [];
    return raw
      .filter(Boolean)
      .sort((a, b) => a.option_number - b.option_number);
  }

  function getLeaderboard(room) {
    return Object.values(room.participants)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        participant_id: p.participant_id,
        name: p.name,
        score: p.score,
        rank: i + 1,
        streak: p.streak,
      }));
  }

  function getParticipantList(room) {
    return Object.values(room.participants)
      .filter(Boolean)
      .map((p) => ({ participant_id: p.participant_id, name: p.name }));
  }

  function emitParticipantSnapshot(room_code) {
    const room = rooms[room_code];
    if (!room) return;
    const list = getParticipantList(room);
    io.to(room_code).emit("participant-joined", {
      count: list.length,
      participants: list,
    });
  }

  async function loadQuestions(quiz_id) {
    const [questions] = await pool.query(
      `SELECT qb.question_id, qb.question_text, qb.genre,
              qb.difficulty, qb.base_points, qq.order_index,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'option_id',     o.option_id,
                  'option_number', o.option_number,
                  'option_text',   o.option_text,
                  'is_correct',    o.is_correct
                )
              ) AS options
       FROM QuizQuestions qq
       JOIN QuestionBank qb ON qq.question_id = qb.question_id
       LEFT JOIN Options o   ON qb.question_id = o.question_id
       WHERE qq.quiz_id = ?
       GROUP BY qb.question_id, qq.order_index
       ORDER BY qq.order_index ASC`,
      [quiz_id],
    );
    return questions;
  }

  function sendQuestion(room, room_code, targetSocket = null) {
    const q = room.questions[room.currentIndex];
    if (!q) return;

    const options = normalizeOptions(q.options).map((o) => ({
      option_number: o.option_number,
      option_text: o.option_text,
    }));

    const payload = {
      index: room.currentIndex,
      total: room.questions.length,
      question_id: q.question_id,
      question_text: q.question_text,
      genre: q.genre,
      difficulty: q.difficulty,
      base_points: q.base_points,
      options,
      time_per_question: room.timePerQuestion,
    };

    if (targetSocket) {
      targetSocket.emit("question-start", payload);
      return;
    }

    io.to(room_code).emit("question-start", payload);

    // Auto-advance timer
    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(
      () => {
        if (!room.paused) {
          advanceQuestion(room, room_code).catch((err) =>
            console.error("advanceQuestion timer error:", err),
          );
        }
      },
      (room.timePerQuestion + 3) * 1000,
    );
  }

  async function advanceQuestion(room, room_code) {
    if (room.questionTimer) clearTimeout(room.questionTimer);

    const q = room.questions[room.currentIndex];
    if (!q) return;

    const correctOption = normalizeOptions(q.options).find(
      (o) => o.is_correct,
    )?.option_number;

    io.to(room_code).emit("question-end", {
      correct_option: correctOption,
      index: room.currentIndex,
      leaderboard: getLeaderboard(room)
        .slice(0, 10)
        .map((e) => ({
          name: e.name,
          score: e.score,
          rank: e.rank,
        })),
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    room.currentIndex += 1;
    if (room.currentIndex < room.questions.length) {
      room.answers[room.currentIndex] = {};
      await pool
        .query(
          `UPDATE Rooms SET current_question_index = ? WHERE room_id = ?`,
          [room.currentIndex, room.room_id],
        )
        .catch((err) => console.error("Room progress update error:", err));
      sendQuestion(room, room_code);
    } else {
      await endQuiz(room_code);
    }
  }

  async function endQuiz(room_code) {
    const room = rooms[room_code];
    if (!room) return;

    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.status = "ended";

    await pool
      .query(
        `UPDATE Rooms SET status = 'ended', ended_at = NOW(), current_question_index = ? WHERE room_id = ?`,
        [room.currentIndex, room.room_id],
      )
      .catch((err) => console.error("Room update error:", err));

    const sorted = getLeaderboard(room);

    for (const p of sorted) {
      await pool
        .query(
          `INSERT INTO Scores (participant_id, room_id, total_points, correct_count, wrong_count, highest_streak, final_rank)
         SELECT ?, ?,
           COALESCE(SUM(points_earned), 0),
           COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0),
           ?, ?
         FROM Responses
         WHERE participant_id = ? AND room_id = ?
         ON DUPLICATE KEY UPDATE
           total_points  = VALUES(total_points),
           correct_count = VALUES(correct_count),
           wrong_count   = VALUES(wrong_count),
           highest_streak = VALUES(highest_streak),
           final_rank    = VALUES(final_rank)`,
          [
            p.participant_id,
            room.room_id,
            p.streak,
            p.rank,
            p.participant_id,
            room.room_id,
          ],
        )
        .catch((err) => console.error("Score insert error:", err));
    }

    io.to(room_code).emit("quiz-end", { leaderboard: sorted });
    console.log(`Quiz ended: ${room_code}`);
  }

  // ── Socket events ─────────────────────────────────────────

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ── ADMIN: Create room ──────────────────────────────────
    socket.on(
      "create-room",
      async ({ quiz_id, admin_id, room_code, time_per_question }) => {
        console.log("create-room received:", { quiz_id, admin_id, room_code });
        try {
          const [result] = await pool.query(
            `INSERT INTO Rooms (quiz_id, admin_id, room_code, status, current_question_index)
           VALUES (?, ?, ?, 'waiting', 0)`,
            [quiz_id, admin_id, room_code],
          );

          rooms[room_code] = {
            quiz_id,
            admin_id,
            room_id: result.insertId,
            status: "waiting",
            currentIndex: 0,
            timePerQuestion: time_per_question || 20,
            participants: {},
            answers: {},
            questions: [],
            paused: false,
            questionTimer: null,
          };

          socket.join(room_code);
          socket.room_code = room_code;
          socket.is_admin = true;

          socket.emit("room-created", { room_id: result.insertId, room_code });
          console.log(`Room created: ${room_code}`);
        } catch (err) {
          console.error("create-room error:", err.message);
          socket.emit("error", { message: "Failed to create room" });
        }
      },
    );

    // ── STUDENT: Join room ──────────────────────────────────
    socket.on("join-room", async ({ room_code, name }) => {
      const room = rooms[room_code];
      const safeName = (name || "Player").trim() || "Player";
      if (!room) return socket.emit("error", { message: "Room not found" });
      if (room.status !== "waiting")
        return socket.emit("error", { message: "Quiz already started" });

      try {
        const [result] = await pool.query(
          `INSERT INTO Participants (room_id, name) VALUES (?, ?)`,
          [room.room_id, safeName],
        );

        room.participants[socket.id] = {
          participant_id: result.insertId,
          name: safeName,
          score: 0,
          streak: 0,
          multiplier: 1,
        };

        socket.join(room_code);
        socket.room_code = room_code;
        socket.participant_id = result.insertId;

        socket.emit("joined-room", {
          participant_id: result.insertId,
          room_code,
          name: safeName,
        });

        emitParticipantSnapshot(room_code);
      } catch (err) {
        console.error("join-room error:", err.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── STUDENT: Rejoin room ────────────────────────────────
    socket.on("rejoin-room", async ({ room_code, participant_id, name }) => {
      const room = rooms[room_code];
      if (!room) return;

      const oldSocketId = Object.keys(room.participants).find(
        (sid) => room.participants[sid]?.participant_id === participant_id,
      );
      const existing = (oldSocketId && room.participants[oldSocketId]) || {
        participant_id,
        name: (name || "Player").trim(),
        score: 0,
        streak: 0,
        multiplier: 1,
      };

      if (oldSocketId) delete room.participants[oldSocketId];
      room.participants[socket.id] = existing;

      socket.join(room_code);
      socket.room_code = room_code;
      socket.participant_id = participant_id;

      emitParticipantSnapshot(room_code);

      if (room.status === "active" && room.questions[room.currentIndex]) {
        sendQuestion(room, room_code, socket);
      }
    });

    // ── ADMIN: Start quiz ───────────────────────────────────
    socket.on("start-quiz", async ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;

      try {
        room.questions = await loadQuestions(room.quiz_id);
        room.status = "active";
        room.paused = false;
        room.currentIndex = 0;
        room.answers[0] = {};

        await pool.query(
          `UPDATE Rooms SET status = 'active', started_at = NOW(), current_question_index = 0 WHERE room_id = ?`,
          [room.room_id],
        );

        io.to(room_code).emit("quiz-started", {
          total_questions: room.questions.length,
        });
        sendQuestion(room, room_code);
      } catch (err) {
        console.error("start-quiz error:", err.message);
      }
    });

    // ── STUDENT: Submit answer ──────────────────────────────
    socket.on(
      "submit-answer",
      async ({ room_code, question_id, selected_option, response_time_ms }) => {
        const room = rooms[room_code];
        if (!room || room.status !== "active") return;

        const participant = room.participants[socket.id];
        if (!participant) return;

        const idx = room.currentIndex;
        if (!room.answers[idx]) room.answers[idx] = {};
        if (room.answers[idx][participant.participant_id]) return; // already answered

        const q = room.questions[idx];
        const correctOption = normalizeOptions(q.options).find(
          (o) => o.is_correct,
        )?.option_number;
        const is_correct =
          parseInt(selected_option, 10) === parseInt(correctOption, 10);

        // Streak & multiplier
        if (is_correct) {
          participant.streak += 1;
          if (participant.streak >= 4) participant.multiplier = 2;
          else if (participant.streak === 3) participant.multiplier = 1.5;
          else if (participant.streak === 2) participant.multiplier = 1.25;
          else participant.multiplier = 1;
        } else {
          participant.streak = 0;
          participant.multiplier = 1;
        }

        // Points
        const timeLimit = room.timePerQuestion * 1000;
        const speedBonus = is_correct
          ? Math.round(
              ((timeLimit - Math.min(response_time_ms, timeLimit)) /
                timeLimit) *
                200,
            )
          : 0;
        const points = is_correct
          ? Math.round((q.base_points + speedBonus) * participant.multiplier)
          : 0;

        participant.score += points;
        room.answers[idx][participant.participant_id] = {
          selected_option,
          is_correct,
          points,
          response_time_ms,
        };

        try {
          await pool.query(
            `INSERT INTO Responses (participant_id, question_id, room_id, selected_option, is_correct, response_time_ms, points_earned)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              participant.participant_id,
              question_id,
              room.room_id,
              selected_option,
              is_correct ? 1 : 0,
              response_time_ms,
              points,
            ],
          );
          await pool.query(
            `UPDATE Participants SET streak = ?, multiplier = ? WHERE participant_id = ?`,
            [
              participant.streak,
              participant.multiplier,
              participant.participant_id,
            ],
          );
        } catch (err) {
          console.error("submit-answer error:", err.message);
        }

        socket.emit("answer-result", {
          is_correct,
          points,
          correct_option: correctOption,
          streak: participant.streak,
          multiplier: participant.multiplier,
          total_score: participant.score,
        });

        const answered = Object.keys(room.answers[idx]).length;
        const total = getParticipantList(room).length;
        const correct = Object.values(room.answers[idx]).filter(
          (a) => a.is_correct,
        ).length;
        io.to(room_code).emit("answer-stats", { answered, total, correct });
      },
    );

    // ── ADMIN: Next question ────────────────────────────────
    socket.on("next-question", async ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;
      await advanceQuestion(room, room_code);
    });

    // ── ADMIN: Pause / Resume ───────────────────────────────
    socket.on("pause-quiz", ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;
      room.paused = true;
      if (room.questionTimer) clearTimeout(room.questionTimer);
      io.to(room_code).emit("quiz-paused");
    });

    socket.on("resume-quiz", ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;
      room.paused = false;
      io.to(room_code).emit("quiz-resumed");
      sendQuestion(room, room_code);
    });

    // ── ADMIN: End quiz ─────────────────────────────────────
    socket.on("end-quiz", async ({ room_code }) => {
      await endQuiz(room_code);
    });

    // ── ADMIN: Kick participant ─────────────────────────────
    socket.on("kick-participant", ({ room_code, participant_id }) => {
      const room = rooms[room_code];
      if (!room) return;
      const socketId = Object.keys(room.participants).find(
        (sid) => room.participants[sid]?.participant_id === participant_id,
      );
      if (!socketId) return;
      delete room.participants[socketId];
      io.to(socketId).emit("kicked");
      emitParticipantSnapshot(room_code);
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      const room_code = socket.room_code;
      const room = rooms[room_code];
      if (!room) return;

      if (!socket.is_admin && room.participants[socket.id]) {
        delete room.participants[socket.id];
        emitParticipantSnapshot(room_code);
      }

      if (
        room.status === "ended" &&
        Object.keys(room.participants).length === 0
      ) {
        delete rooms[room_code];
      }
    });
  });
};