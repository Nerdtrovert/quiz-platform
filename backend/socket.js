const pool = require("./config/db");

module.exports = function initSocket(io) {
  const rooms = {};

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ── ADMIN: Create room ────────────────────────────────
    socket.on(
      "create-room",
      async ({ quiz_id, admin_id, room_code, time_per_question }) => {
        try {
          const [result] = await pool.query(
            `INSERT INTO Rooms (quiz_id, admin_id, room_code, status, current_question_index)
           VALUES (?, ?, ?, 'waiting', 0)`,
            [quiz_id, admin_id, room_code],
          );
          const room_id = result.insertId;

          rooms[room_code] = {
            quiz_id,
            admin_id,
            room_id,
            status: "waiting",
            currentIndex: 0,
            timePerQuestion: time_per_question || 30,
            participants: {},
            answers: {},
            questions: [],
            paused: false,
          };

          socket.join(room_code);
          socket.room_code = room_code;
          socket.is_admin = true;

          socket.emit("room-created", { room_id, room_code });
          console.log(`Room created: ${room_code}`);
        } catch (err) {
          console.error("create-room error:", err);
          socket.emit("error", { message: "Failed to create room" });
        }
      },
    );

    // ── STUDENT: Join room ────────────────────────────────
    socket.on("join-room", async ({ room_code, name }) => {
      const room = rooms[room_code];
      if (!room) return socket.emit("error", { message: "Room not found" });
      if (room.status !== "waiting")
        return socket.emit("error", { message: "Quiz already started" });

      try {
        const [result] = await pool.query(
          `INSERT INTO Participants (room_id, name) VALUES (?, ?)`,
          [room.room_id, name],
        );
        const participant_id = result.insertId;

        room.participants[socket.id] = {
          participant_id,
          name,
          score: 0,
          streak: 0,
          multiplier: 1,
        };

        socket.join(room_code);
        socket.room_code = room_code;
        socket.participant_id = participant_id;
        socket.player_name = name;

        socket.emit("joined-room", {
          participant_id,
          room_code,
          quiz_id: room.quiz_id,
        });

        io.to(room_code).emit("participant-joined", {
          participant_id,
          name,
          count: Object.keys(room.participants).length,
          participants: Object.values(room.participants).map((p) => ({
            participant_id: p.participant_id,
            name: p.name,
          })),
        });

        console.log(`${name} joined room ${room_code}`);
      } catch (err) {
        console.error("join-room error:", err);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── STUDENT: Rejoin after page navigation ─────────────
    socket.on("rejoin-room",async ({ room_code, participant_id, name }) => {
      const room = rooms[room_code];
      if (!room) return;

      // Re-register socket in room with existing participant data
      const existing = Object.values(room.participants).find(
        (p) => p.participant_id === participant_id,
      );

      let resolvedName = name;
      if (!resolvedName) {
        try {
          const [rows] = await pool.query(
            `SELECT name FROM Participants WHERE participant_id = ? LIMIT 1`,
            [participant_id],
          );
          resolvedName = rows?.[0]?.name;
        } catch (err) {
          console.error("rejoin-room name lookup error:", err);
        }
      }

      if (existing) {
        if (resolvedName) existing.name = resolvedName;

        // Remove old socket entry
        const oldSocketId = Object.keys(room.participants).find(
          (sid) => room.participants[sid].participant_id === participant_id,
        );
        if (oldSocketId) delete room.participants[oldSocketId];

        room.participants[socket.id] = existing;
      } else {
        // New entry if not found
        room.participants[socket.id] = {
          participant_id,
          name: name || "Player",
          score: 0,
          streak: 0,
          multiplier: 1,
        };
      }

      socket.join(room_code);
      socket.room_code = room_code;
      socket.participant_id = participant_id;

      io.to(room_code).emit("participant-joined", {
        count: Object.keys(room.participants).length,
        participants: Object.values(room.participants).map((p) => ({
          participant_id: p.participant_id,
          name: p.name,
        })),
      });

      // If quiz already in progress, send current question
      if (room.status === "active" && room.questions.length > 0) {
        const q = room.questions[room.currentIndex];
        const options = (
          typeof q.options === "string" ? JSON.parse(q.options) : q.options
        )
          .sort((a, b) => a.option_number - b.option_number)
          .map((o) => ({
            option_number: o.option_number,
            option_text: o.option_text,
          }));

        socket.emit("question-start", {
          index: room.currentIndex,
          total: room.questions.length,
          question_id: q.question_id,
          question_text: q.question_text,
          genre: q.genre,
          difficulty: q.difficulty,
          base_points: q.base_points,
          options,
          time_per_question: room.timePerQuestion,
        });
      }
    });

    // ── ADMIN: Kick participant ────────────────────────────
    socket.on("kick-participant", ({ room_code, participant_id }) => {
      const room = rooms[room_code];
      if (!room) return;

      const entry = Object.entries(room.participants).find(
        ([, p]) => p.participant_id === participant_id,
      );
      if (!entry) return;

      const [kickedSocketId] = entry;
      delete room.participants[kickedSocketId];

      io.to(kickedSocketId).emit("kicked");
      io.to(room_code).emit("participant-joined", {
        count: Object.keys(room.participants).length,
        participants: Object.values(room.participants).map((p) => ({
          participant_id: p.participant_id,
          name: p.name,
        })),
      });
    });

    // ── ADMIN: Start quiz ─────────────────────────────────
    socket.on("start-quiz", async ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;

      try {
        const [questions] = await pool.query(
          `SELECT qb.question_id, qb.question_text, qb.genre,
                  qb.difficulty, qb.base_points, qq.order_index,
                  JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'option_id', o.option_id,
                      'option_number', o.option_number,
                      'option_text', o.option_text,
                      'is_correct', o.is_correct
                    )
                  ) AS options
           FROM QuizQuestions qq
           JOIN QuestionBank qb ON qq.question_id = qb.question_id
           LEFT JOIN Options o ON qb.question_id = o.question_id
           WHERE qq.quiz_id = ?
           GROUP BY qb.question_id, qq.order_index
           ORDER BY qq.order_index ASC`,
          [room.quiz_id],
        );

        room.questions = questions;
        room.status = "active";
        room.currentIndex = 0;
        room.answers[0] = {};

        await pool.query(
          `UPDATE Rooms SET status = 'active', started_at = NOW() WHERE room_id = ?`,
          [room.room_id],
        );

        io.to(room_code).emit("quiz-started", {
          total_questions: questions.length,
        });
        sendQuestion(io, room, room_code);
      } catch (err) {
        console.error("start-quiz error:", err);
      }
    });

    // ── STUDENT: Submit answer ────────────────────────────
    socket.on(
      "submit-answer",
      ({ room_code, question_id, selected_option, response_time_ms }) => {
        const room = rooms[room_code];
        if (!room || room.status !== "active") return;

        const participant = room.participants[socket.id];
        if (!participant) return;

        const idx = room.currentIndex;
        if (!room.answers[idx]) room.answers[idx] = {};
        if (room.answers[idx][participant.participant_id]) return; // no double answer

        const question = room.questions[idx];
        const options =
          typeof question.options === "string"
            ? JSON.parse(question.options)
            : question.options;
        const correctOption = options.find((o) => o.is_correct)?.option_number;
        const is_correct =
          parseInt(selected_option) === parseInt(correctOption);

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

        const timeLimit = room.timePerQuestion * 1000;
        const speedBonus = is_correct
          ? Math.round(
              ((timeLimit - Math.min(response_time_ms, timeLimit)) /
                timeLimit) *
                200,
            )
          : 0;
        const points = is_correct
          ? Math.round(
              (question.base_points + speedBonus) * participant.multiplier,
            )
          : 0;

        participant.score += points;

        room.answers[idx][participant.participant_id] = {
          selected_option,
          is_correct,
          points,
          response_time_ms,
        };

        pool
          .query(
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
          )
          .catch((err) => console.error("Response insert error:", err));

        socket.emit("answer-result", {
          is_correct,
          points,
          correct_option: correctOption,
          streak: participant.streak,
          multiplier: participant.multiplier,
          total_score: participant.score,
        });

        const answered = Object.keys(room.answers[idx]).length;
        const total = Object.keys(room.participants).length;
        const correct = Object.values(room.answers[idx]).filter(
          (a) => a.is_correct,
        ).length;
        io.to(room_code).emit("answer-stats", { answered, total, correct });
      },
    );

    // ── ADMIN: Next question ──────────────────────────────
    socket.on("next-question", ({ room_code }) => {
      const room = rooms[room_code];
      if (!room) return;
      advanceQuestion(io, room, room_code);
    });

    // ── ADMIN: Pause / Resume ─────────────────────────────
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
      sendQuestion(io, room, room_code);
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on("disconnect", () => {
      const room_code = socket.room_code;
      if (!room_code || !rooms[room_code]) return;
      const room = rooms[room_code];

      if (!socket.is_admin && room.participants[socket.id]) {
        delete room.participants[socket.id];
        io.to(room_code).emit("participant-joined", {
          count: Object.keys(room.participants).length,
          participants: Object.values(room.participants).map((p) => ({
            participant_id: p.participant_id,
            name: p.name,
          })),
        });
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  // ── Send current question ─────────────────────────────────
  function sendQuestion(io, room, room_code) {
    const q = room.questions[room.currentIndex];
    const options = (
      typeof q.options === "string" ? JSON.parse(q.options) : q.options
    )
      .sort((a, b) => a.option_number - b.option_number)
      .map((o) => ({
        option_number: o.option_number,
        option_text: o.option_text,
      }));

    room.questionStartTime = Date.now();

    io.to(room_code).emit("question-start", {
      index: room.currentIndex,
      total: room.questions.length,
      question_id: q.question_id,
      question_text: q.question_text,
      genre: q.genre,
      difficulty: q.difficulty,
      base_points: q.base_points,
      options,
      time_per_question: room.timePerQuestion,
    });

    room.questionTimer = setTimeout(
      () => {
        if (!room.paused) advanceQuestion(io, room, room_code);
      },
      (room.timePerQuestion + 3) * 1000,
    );
  }

  // ── Advance to next question or end ──────────────────────
  async function advanceQuestion(io, room, room_code) {
    if (room.questionTimer) clearTimeout(room.questionTimer);

    const q = room.questions[room.currentIndex];
    const options =
      typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    const correctOption = options.find((o) => o.is_correct)?.option_number;

    io.to(room_code).emit("question-end", {
      correct_option: correctOption,
      index: room.currentIndex,
      leaderboard: getLeaderboard(room),
    });

    await new Promise((r) => setTimeout(r, 3000));

    room.currentIndex += 1;

    if (room.currentIndex < room.questions.length) {
      room.answers[room.currentIndex] = {};
      sendQuestion(io, room, room_code);
    } else {
      await endQuiz(io, room, room_code);
    }
  }

  // ── End quiz & save scores ────────────────────────────────
  async function endQuiz(io, room, room_code) {
    room.status = "ended";

    await pool
      .query(
        `UPDATE Rooms SET status = 'ended', ended_at = NOW() WHERE room_id = ?`,
        [room.room_id],
      )
      .catch((err) => console.error("Room update error:", err));

    const sorted = Object.values(room.participants).sort(
      (a, b) => b.score - a.score,
    );

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      await pool
        .query(
          `INSERT INTO Scores (participant_id, room_id, total_points, correct_count, wrong_count, highest_streak, final_rank)
         SELECT ?, ?,
           COALESCE(SUM(points_earned), 0),
           COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0),
           ?, ?
         FROM Responses WHERE participant_id = ? AND room_id = ?`,
          [
            p.participant_id,
            room.room_id,
            p.streak,
            i + 1,
            p.participant_id,
            room.room_id,
          ],
        )
        .catch((err) => console.error("Score insert error:", err));
    }

    io.to(room_code).emit("quiz-end", {
      leaderboard: sorted.map((p, i) => ({
        participant_id: p.participant_id,
        name: p.name,
        score: p.score,
        rank: i + 1,
        streak: p.streak,
      })),
    });
  }

  // ── Get leaderboard snapshot ──────────────────────────────
  function getLeaderboard(room) {
    return Object.values(room.participants)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }));
  }
};
