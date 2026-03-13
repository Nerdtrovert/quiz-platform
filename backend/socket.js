const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const {
  createRoom,
  getRoom,
  removeRoom,
  findParticipant,
} = require("./liveRoomStore");
const { registerHandlers } = require("./liveRoomControl");

function normalizeOptions(options) {
  const raw = typeof options === "string" ? JSON.parse(options) : options || [];
  return raw
    .filter(Boolean)
    .sort((a, b) => a.option_number - b.option_number);
}

function publicQuestionPayload(question, room) {
  return {
    index: room.currentIndex,
    total: room.questions.length,
    question_id: question.question_id,
    question_text: question.question_text,
    genre: question.genre,
    difficulty: question.difficulty,
    base_points: question.base_points,
    options: normalizeOptions(question.options).map((option) => ({
      option_number: option.option_number,
      option_text: option.option_text,
    })),
    time_per_question: room.timePerQuestion,
  };
}

function leaderboardFromRoom(room) {
  return Object.values(room.participants)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((participant, index) => ({
      participant_id: participant.participant_id,
      name: participant.name,
      score: participant.score,
      rank: index + 1,
      streak: participant.streak,
    }));
}

function summaryParticipants(room) {
  return Object.values(room.participants)
    .filter(Boolean)
    .map((participant) => ({
      participant_id: participant.participant_id,
      name: participant.name,
    }));
}

module.exports = function initSocket(io) {
  async function loadQuestions(quizId) {
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
      [quizId],
    );
    return questions;
  }

  async function hydrateRoom(room_code) {
    let room = getRoom(room_code);
    if (room) return room;

    const [rows] = await pool.query(
      `SELECT r.room_id, r.quiz_id, r.admin_id, r.room_code, r.status, r.current_question_index, r.started_at,
              q.time_per_question
       FROM Rooms r
       JOIN Quizzes q ON q.quiz_id = r.quiz_id
       WHERE r.room_code = ? AND r.status IN ('waiting', 'active', 'paused')
       LIMIT 1`,
      [room_code],
    );
    const dbRoom = rows[0];
    if (!dbRoom) return null;

    const [participantRows] = await pool.query(
      `SELECT p.participant_id, p.name, p.streak, p.multiplier,
              COALESCE(SUM(r.points_earned), 0) AS score
       FROM Participants p
       LEFT JOIN Responses r ON r.participant_id = p.participant_id AND r.room_id = p.room_id
       WHERE p.room_id = ? AND p.is_active = 1
       GROUP BY p.participant_id, p.name, p.streak, p.multiplier
       ORDER BY p.joined_at ASC`,
      [dbRoom.room_id],
    );

    const participants = {};
    participantRows.forEach((participant) => {
      participants[`db:${participant.participant_id}`] = {
        participant_id: participant.participant_id,
        name: participant.name,
        score: Number(participant.score || 0),
        streak: participant.streak || 0,
        multiplier: Number(participant.multiplier || 1),
      };
    });

    const questions =
      dbRoom.status === "waiting" ? [] : await loadQuestions(dbRoom.quiz_id);

    room = createRoom(room_code, {
      room_code,
      room_id: dbRoom.room_id,
      quiz_id: dbRoom.quiz_id,
      admin_id: dbRoom.admin_id,
      status: dbRoom.status === "paused" ? "active" : dbRoom.status,
      paused: dbRoom.status === "paused",
      currentIndex: Math.max(Number(dbRoom.current_question_index || 0), 0),
      timePerQuestion: Number(dbRoom.time_per_question || 30),
      participants,
      answers: {},
      questions,
      endQuiz: (forced = false) => endQuiz(room_code, forced),
      startedAt: dbRoom.started_at || null,
      hostSocketIds: new Set(),
    });

    if (questions[room.currentIndex]) {
      const [responseRows] = await pool.query(
        `SELECT participant_id, selected_option, is_correct, points_earned, response_time_ms
         FROM Responses
         WHERE room_id = ? AND question_id = ?`,
        [room.room_id, questions[room.currentIndex].question_id],
      );
      room.answers[room.currentIndex] = {};
      responseRows.forEach((response) => {
        room.answers[room.currentIndex][response.participant_id] = {
          selected_option: response.selected_option,
          is_correct: Boolean(response.is_correct),
          points: Number(response.points_earned || 0),
          response_time_ms: response.response_time_ms || 0,
        };
      });
    }

    return room;
  }

  async function persistRoomProgress(room) {
    await pool.query(
      `UPDATE Rooms
       SET status = ?, current_question_index = ?
       WHERE room_id = ?`,
      [room.paused ? "paused" : room.status, room.currentIndex, room.room_id],
    );
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

  function emitParticipantSnapshot(room_code) {
    const room = getRoom(room_code);
    if (!room) return;

    io.to(room_code).emit("participant-joined", {
      count: summaryParticipants(room).length,
      participants: summaryParticipants(room),
    });
  }

  function sendQuestion(room, room_code, targetSocket = null) {
    const question = room.questions[room.currentIndex];
    if (!question) return;

    const payload = publicQuestionPayload(question, room);
    if (targetSocket) {
      targetSocket.emit("question-start", payload);
      return;
    }

    io.to(room_code).emit("question-start", payload);

    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(() => {
      if (!room.paused) {
        advanceQuestion(room, room_code).catch((err) =>
          console.error("advanceQuestion timer error:", err),
        );
      }
    }, (room.timePerQuestion + 3) * 1000);
  }

  async function endQuiz(room_code, forced = false) {
    const room = await hydrateRoom(room_code);
    if (!room) return false;

    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.status = "ended";
    room.paused = false;

    await pool
      .query(
        `UPDATE Rooms
         SET status = 'ended', ended_at = NOW(), current_question_index = ?
         WHERE room_id = ?`,
        [room.currentIndex, room.room_id],
      )
      .catch((err) => console.error("Room update error:", err));

    const sorted = leaderboardFromRoom(room);

    for (const participant of sorted) {
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
             total_points = VALUES(total_points),
             correct_count = VALUES(correct_count),
             wrong_count = VALUES(wrong_count),
             highest_streak = VALUES(highest_streak),
             final_rank = VALUES(final_rank)`,
          [
            participant.participant_id,
            room.room_id,
            participant.streak,
            participant.rank,
            participant.participant_id,
            room.room_id,
          ],
        )
        .catch((err) => console.error("Score insert error:", err));
    }

    io.to(room_code).emit("quiz-end", {
      forced,
      leaderboard: sorted,
    });

    room.questions = [];
    room.answers = {};
    return true;
  }

  function kickParticipant(room_code, participant_id) {
    const found = findParticipant(room_code, participant_id);
    if (!found) return false;

    delete found.room.participants[found.socketId];
    io.to(found.socketId).emit("kicked");
    emitParticipantSnapshot(room_code);
    return true;
  }

  async function advanceQuestion(room, room_code) {
    if (room.questionTimer) clearTimeout(room.questionTimer);
    const question = room.questions[room.currentIndex];
    if (!question) return;

    const correctOption = normalizeOptions(question.options).find(
      (option) => option.is_correct,
    )?.option_number;

    io.to(room_code).emit("question-end", {
      correct_option: correctOption,
      index: room.currentIndex,
      leaderboard: leaderboardFromRoom(room).slice(0, 10).map((entry) => ({
        name: entry.name,
        score: entry.score,
        rank: entry.rank,
      })),
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    room.currentIndex += 1;
    if (room.currentIndex < room.questions.length) {
      room.answers[room.currentIndex] = {};
      await persistRoomProgress(room);
      sendQuestion(room, room_code);
    } else {
      await endQuiz(room_code, false);
    }
  }

  registerHandlers({
    endRoom: endQuiz,
    kickParticipant,
  });

  io.on("connection", (socket) => {
    socket.adminUser = getSocketAdmin(socket);

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

          createRoom(room_code, {
            room_code,
            room_id: result.insertId,
            quiz_id,
            admin_id,
            status: "waiting",
            paused: false,
            currentIndex: 0,
            timePerQuestion: time_per_question || 30,
            participants: {},
            answers: {},
            questions: [],
            endQuiz: (forced = false) => endQuiz(room_code, forced),
            hostSocketIds: new Set([socket.id]),
          });

          socket.join(room_code);
          socket.room_code = room_code;
          socket.is_admin = true;
          socket.emit("room-created", { room_id: result.insertId, room_code });
        } catch (err) {
          console.error("create-room error:", err);
          socket.emit("error", { message: "Failed to create room" });
        }
      },
    );

    socket.on("admin-room-sync", async ({ room_code }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) {
        return socket.emit("error", { message: "Room not available" });
      }

      socket.join(room_code);
      socket.room_code = room_code;
      socket.is_admin = true;
      if (!room.hostSocketIds) room.hostSocketIds = new Set();
      room.hostSocketIds.add(socket.id);

      const currentQuestion = room.questions[room.currentIndex]
        ? publicQuestionPayload(room.questions[room.currentIndex], room)
        : null;

      socket.emit("room-synced", {
        room_code,
        quiz_id: room.quiz_id,
        status: room.status === "active" && room.paused ? "paused" : room.status,
        paused: room.paused,
        current_question_index: room.currentIndex,
        total_questions: room.questions.length,
        participants: summaryParticipants(room),
        leaderboard: leaderboardFromRoom(room),
        current_question: currentQuestion,
      });

      emitParticipantSnapshot(room_code);
    });

    socket.on("join-room", async ({ room_code, name }) => {
      const room = await hydrateRoom(room_code);
      const safeName = (name || "Player").trim() || "Player";
      if (!room) return socket.emit("error", { message: "Room not found" });
      if (room.status !== "waiting") {
        return socket.emit("error", { message: "Quiz already started" });
      }

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
        socket.player_name = safeName;

        socket.emit("joined-room", {
          participant_id: result.insertId,
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
      const room = await hydrateRoom(room_code);
      if (!room) return;

      let resolvedName = (name || "").trim() || "Player";
      try {
        const [rows] = await pool.query(
          `SELECT name FROM Participants WHERE participant_id = ? LIMIT 1`,
          [participant_id],
        );
        if (rows[0]?.name?.trim()) {
          resolvedName = rows[0].name.trim();
        }
      } catch (err) {
        console.error("rejoin-room lookup error:", err);
      }

      const oldSocketId = Object.keys(room.participants).find(
        (sid) => room.participants[sid]?.participant_id === participant_id,
      );
      const existing =
        (oldSocketId && room.participants[oldSocketId]) || {
          participant_id,
          name: resolvedName,
          score: 0,
          streak: 0,
          multiplier: 1,
        };

      if (oldSocketId) delete room.participants[oldSocketId];
      existing.name = resolvedName;
      room.participants[socket.id] = existing;

      socket.join(room_code);
      socket.room_code = room_code;
      socket.participant_id = participant_id;
      emitParticipantSnapshot(room_code);

      if (room.status === "active" && room.questions[room.currentIndex]) {
        sendQuestion(room, room_code, socket);
      }
    });

    socket.on("kick-participant", async ({ room_code, participant_id }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      kickParticipant(room_code, participant_id);
    });

    socket.on("start-quiz", async ({ room_code }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;

      try {
        room.questions = await loadQuestions(room.quiz_id);
        room.status = "active";
        room.paused = false;
        room.currentIndex = 0;
        room.answers[0] = {};

        await pool.query(
          `UPDATE Rooms
           SET status = 'active', started_at = NOW(), ended_at = NULL, current_question_index = 0
           WHERE room_id = ?`,
          [room.room_id],
        );

        io.to(room_code).emit("quiz-started", {
          total_questions: room.questions.length,
        });
        sendQuestion(room, room_code);
      } catch (err) {
        console.error("start-quiz error:", err);
      }
    });

    socket.on(
      "submit-answer",
      async ({ room_code, question_id, selected_option, response_time_ms }) => {
        const room = await hydrateRoom(room_code);
        if (!room || room.status !== "active") return;

        const participant = room.participants[socket.id];
        if (!participant) return;

        const idx = room.currentIndex;
        if (!room.answers[idx]) room.answers[idx] = {};
        if (room.answers[idx][participant.participant_id]) return;

        const question = room.questions[idx];
        const correctOption = normalizeOptions(question.options).find(
          (option) => option.is_correct,
        )?.option_number;
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
            `UPDATE Participants
             SET streak = ?, multiplier = ?
             WHERE participant_id = ?`,
            [participant.streak, participant.multiplier, participant.participant_id],
          );
        } catch (err) {
          console.error("submit-answer persistence error:", err);
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
        const total = summaryParticipants(room).length;
        const correct = Object.values(room.answers[idx]).filter(
          (answer) => answer.is_correct,
        ).length;
        io.to(room_code).emit("answer-stats", { answered, total, correct });
      },
    );

    socket.on("next-question", async ({ room_code }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      await advanceQuestion(room, room_code);
    });

    socket.on("pause-quiz", async ({ room_code }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      room.paused = true;
      if (room.questionTimer) clearTimeout(room.questionTimer);
      await persistRoomProgress(room);
      io.to(room_code).emit("quiz-paused");
    });

    socket.on("resume-quiz", async ({ room_code }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      room.paused = false;
      await persistRoomProgress(room);
      io.to(room_code).emit("quiz-resumed");
      sendQuestion(room, room_code);
    });

    socket.on("end-quiz", async ({ room_code, forced }) => {
      const room = await hydrateRoom(room_code);
      if (!room || !canManageRoom(socket, room)) return;
      await endQuiz(room_code, Boolean(forced));
    });

    socket.on("disconnect", () => {
      const room_code = socket.room_code;
      const room = room_code ? getRoom(room_code) : null;
      if (!room) return;

      if (socket.is_admin && room.hostSocketIds) {
        room.hostSocketIds.delete(socket.id);
      } else if (room.participants[socket.id]) {
        delete room.participants[socket.id];
        emitParticipantSnapshot(room_code);
      }

      if (
        room.status === "ended" &&
        Object.keys(room.participants).length === 0 &&
        (!room.hostSocketIds || room.hostSocketIds.size === 0)
      ) {
        removeRoom(room_code);
      }
    });
  });
};
