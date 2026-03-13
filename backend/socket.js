const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const {
  createRoom,
  getRoom,
  removeRoom,
  findParticipant,
} = require("./liveRoomStore");
const { registerHandlers } = require("./liveRoomControl");

module.exports = function initSocket(io) {
  async function endQuiz(room_code, forced = false) {
    const room = getRoom(room_code);
    if (!room) return false;

    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.status = "ended";
    room.paused = false;

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
      const participant = sorted[i];
      await pool
        .query(
          `INSERT INTO Scores (participant_id, room_id, total_points, correct_count, wrong_count, highest_streak, final_rank)
           SELECT ?, ?,
             COALESCE(SUM(points_earned), 0),
             COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0),
             COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0),
             ?, ?
           FROM Responses WHERE participant_id = ? AND room_id = ?
           ON DUPLICATE KEY UPDATE
             total_points = VALUES(total_points),
             correct_count = VALUES(correct_count),
             wrong_count = VALUES(wrong_count),
             highest_streak = VALUES(highest_streak),
             final_rank = VALUES(final_rank)`,
          [
            participant.participant_id,
            room.room_id,
            participant.streak,
            i + 1,
            participant.participant_id,
            room.room_id,
          ],
        )
        .catch((err) => console.error("Score insert error:", err));
    }

    io.to(room_code).emit("quiz-end", {
      forced,
      leaderboard: sorted.map((participant, index) => ({
        participant_id: participant.participant_id,
        name: participant.name,
        score: participant.score,
        rank: index + 1,
        streak: participant.streak,
      })),
    });

    return true;
  }

  function emitParticipantSnapshot(room_code) {
    const room = getRoom(room_code);
    if (!room) return;

    io.to(room_code).emit("participant-joined", {
      count: Object.keys(room.participants).length,
      participants: Object.values(room.participants).map((p) => ({
        participant_id: p.participant_id,
        name: p.name,
      })),
    });
  }

  function kickParticipant(room_code, participant_id) {
    const found = findParticipant(room_code, participant_id);
    if (!found) return false;

    delete found.room.participants[found.socketId];
    io.to(found.socketId).emit("kicked");
    emitParticipantSnapshot(room_code);
    return true;
  }

  function getSocketAdmin(socket) {
    const token = socket.handshake.auth?.token;
    if (!token) return null;

    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return null;
    }
  }

  function canManageRoom(socket, room) {
    const admin = socket.adminUser;
    if (!admin || !room) return false;
    return admin.is_master || admin.admin_id === room.admin_id;
  }

  registerHandlers({
    endRoom: endQuiz,
    kickParticipant,
  });

  io.on("connection", (socket) => {
    socket.adminUser = getSocketAdmin(socket);
    console.log("Socket connected:", socket.id);

    socket.on(
      "create-room",
      async ({ quiz_id, admin_id, room_code, time_per_question }) => {
        if (
          !socket.adminUser ||
          (!socket.adminUser.is_master &&
            socket.adminUser.admin_id !== admin_id)
        ) {
          return socket.emit("error", { message: "Unauthorized room creation" });
        }

        try {
          const [result] = await pool.query(
            `INSERT INTO Rooms (quiz_id, admin_id, room_code, status, current_question_index)
             VALUES (?, ?, ?, 'waiting', 0)`,
            [quiz_id, admin_id, room_code],
          );
          const room_id = result.insertId;

          createRoom(room_code, {
            room_code,
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
            endQuiz: (forced = false) => endQuiz(room_code, forced),
          });

          socket.join(room_code);
          socket.room_code = room_code;
          socket.is_admin = true;

          socket.emit("room-created", { room_id, room_code });
        } catch (err) {
          console.error("create-room error:", err);
          socket.emit("error", { message: "Failed to create room" });
        }
      },
    );

    socket.on("join-room", async ({ room_code, name }) => {
      const room = getRoom(room_code);
      const safeName = (name || "Player").trim() || "Player";
      if (!room) return socket.emit("error", { message: "Room not found" });
      if (room.status !== "waiting")
        return socket.emit("error", { message: "Quiz already started" });

      try {
        const [result] = await pool.query(
          `INSERT INTO Participants (room_id, name) VALUES (?, ?)`,
          [room.room_id, safeName],
        );
        const participant_id = result.insertId;

        room.participants[socket.id] = {
          participant_id,
          name: safeName,
          score: 0,
          streak: 0,
          multiplier: 1,
        };

        socket.join(room_code);
        socket.room_code = room_code;
        socket.participant_id = participant_id;
        socket.player_name = safeName;

        socket.emit("joined-room", {
          participant_id,
          room_code,
          quiz_id: room.quiz_id,
          name: safeName,
        });

        emitParticipantSnapshot(room_code);
      } catch (err) {
        console.error("join-room error:", err);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("rejoin-room", async ({ room_code, participant_id, name }) => {
      const room = getRoom(room_code);
      if (!room) return;

      const existing = Object.values(room.participants).find(
        (participant) => participant.participant_id === participant_id,
      );

      let resolvedName = (name || "").trim();
      try {
        const [rows] = await pool.query(
          `SELECT name FROM Participants WHERE participant_id = ? LIMIT 1`,
          [participant_id],
        );
        const dbName = rows?.[0]?.name;

        if (dbName && dbName.trim()) {
          resolvedName = dbName.trim();
        } else if (resolvedName) {
          await pool.query(
            `UPDATE Participants SET name = ? WHERE participant_id = ?`,
            [resolvedName, participant_id],
          );
        }
      } catch (err) {
        console.error("rejoin-room name lookup error:", err);
      }

      if (!resolvedName) resolvedName = "Player";

      if (existing) {
        existing.name = resolvedName;
        const oldSocketId = Object.keys(room.participants).find(
          (sid) => room.participants[sid].participant_id === participant_id,
        );
        if (oldSocketId) delete room.participants[oldSocketId];
        room.participants[socket.id] = existing;
      } else {
        room.participants[socket.id] = {
          participant_id,
          name: resolvedName,
          score: 0,
          streak: 0,
          multiplier: 1,
        };
      }

      socket.join(room_code);
      socket.room_code = room_code;
      socket.participant_id = participant_id;
      emitParticipantSnapshot(room_code);

      if (room.status === "active" && room.questions.length > 0) {
        sendQuestion(io, room, room_code, socket);
      }
    });

    socket.on("kick-participant", ({ room_code, participant_id }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      kickParticipant(room_code, participant_id);
    });

    socket.on("start-quiz", async ({ room_code }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;

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

    socket.on(
      "submit-answer",
      ({ room_code, question_id, selected_option, response_time_ms }) => {
        const room = getRoom(room_code);
        if (!room || room.status !== "active") return;

        const participant = room.participants[socket.id];
        if (!participant) return;

        const idx = room.currentIndex;
        if (!room.answers[idx]) room.answers[idx] = {};
        if (room.answers[idx][participant.participant_id]) return;

        const question = room.questions[idx];
        const options =
          typeof question.options === "string"
            ? JSON.parse(question.options)
            : question.options;
        const correctOption = options.find((o) => o.is_correct)?.option_number;
        const is_correct =
          parseInt(selected_option, 10) === parseInt(correctOption, 10);

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
              ((timeLimit - Math.min(response_time_ms, timeLimit)) / timeLimit) *
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
          (answer) => answer.is_correct,
        ).length;
        io.to(room_code).emit("answer-stats", { answered, total, correct });
      },
    );

    socket.on("next-question", ({ room_code }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      advanceQuestion(io, room, room_code, endQuiz);
    });

    socket.on("pause-quiz", ({ room_code }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      room.paused = true;
      if (room.questionTimer) clearTimeout(room.questionTimer);
      io.to(room_code).emit("quiz-paused");
    });

    socket.on("resume-quiz", ({ room_code }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      room.paused = false;
      io.to(room_code).emit("quiz-resumed");
      sendQuestion(io, room, room_code);
    });

    socket.on("end-quiz", async ({ room_code, forced }) => {
      const room = getRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      await endQuiz(room_code, Boolean(forced));
    });

    socket.on("disconnect", () => {
      const room_code = socket.room_code;
      const room = room_code ? getRoom(room_code) : null;
      if (!room) return;

      if (!socket.is_admin && room.participants[socket.id]) {
        delete room.participants[socket.id];
        emitParticipantSnapshot(room_code);
      }

      if (
        room.status === "ended" &&
        Object.keys(room.participants).length === 0 &&
        !room.questions.length
      ) {
        removeRoom(room_code);
      }
    });
  });
};

function sendQuestion(io, room, room_code, targetSocket = null) {
  const question = room.questions[room.currentIndex];
  if (!question) return;

  const options = (
    typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options
  )
    .sort((a, b) => a.option_number - b.option_number)
    .map((option) => ({
      option_number: option.option_number,
      option_text: option.option_text,
    }));

  room.questionStartTime = Date.now();

  const payload = {
    index: room.currentIndex,
    total: room.questions.length,
    question_id: question.question_id,
    question_text: question.question_text,
    genre: question.genre,
    difficulty: question.difficulty,
    base_points: question.base_points,
    options,
    time_per_question: room.timePerQuestion,
  };

  if (targetSocket) {
    targetSocket.emit("question-start", payload);
    return;
  }

  io.to(room_code).emit("question-start", payload);

  room.questionTimer = setTimeout(() => {
    if (!room.paused) {
      advanceQuestion(io, room, room_code, (code, forced) =>
        room.endQuiz ? room.endQuiz(forced) : false,
      );
    }
  }, (room.timePerQuestion + 3) * 1000);
}

async function advanceQuestion(io, room, room_code, endQuiz) {
  if (room.questionTimer) clearTimeout(room.questionTimer);

  const question = room.questions[room.currentIndex];
  if (!question) return;

  const options =
    typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options;
  const correctOption = options.find((option) => option.is_correct)?.option_number;

  io.to(room_code).emit("question-end", {
    correct_option: correctOption,
    index: room.currentIndex,
    leaderboard: getLeaderboard(room),
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  room.currentIndex += 1;

  if (room.currentIndex < room.questions.length) {
    room.answers[room.currentIndex] = {};
    sendQuestion(io, room, room_code);
  } else {
    await endQuiz(room_code, false);
  }
}

function getLeaderboard(room) {
  return Object.values(room.participants)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((participant, index) => ({
      name: participant.name,
      score: participant.score,
      rank: index + 1,
    }));
}
