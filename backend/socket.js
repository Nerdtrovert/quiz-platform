const pool = require("./config/db");

module.exports = function initSocket(io) {
  const rooms = {};
  const configuredRoomLimit = Number.parseInt(
    process.env.ROOM_MAX_PARTICIPANTS || "60",
    10,
  );
  const maxParticipants =
    Number.isInteger(configuredRoomLimit) &&
    configuredRoomLimit >= 55 &&
    configuredRoomLimit <= 60
      ? configuredRoomLimit
      : 60;
  let restorePromise;

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

  async function restoreRooms() {
    const [dbRooms] = await pool.query(
       `SELECT r.room_id, r.quiz_id, r.admin_id, r.room_code, r.status,
               r.current_question_index, r.started_at, q.time_per_question
        FROM Rooms r
        JOIN Quizzes q ON q.quiz_id = r.quiz_id
        WHERE r.status IN ('waiting', 'active', 'paused')`,
    );

    for (const dbRoom of dbRooms) {
      const [participants] = await pool.query(
        `SELECT participant_id, name, streak, multiplier
         FROM Participants
         WHERE room_id = ? AND is_active = TRUE`,
        [dbRoom.room_id],
      );
      const [responses] = await pool.query(
        `SELECT participant_id, question_id, selected_option, is_correct,
                response_time_ms, points_earned
         FROM Responses
         WHERE room_id = ?`,
        [dbRoom.room_id],
      );
      const questions = await loadQuestions(dbRoom.quiz_id);
      const answers = {};
      const questionById = new Map(
        questions.map((question, index) => [question.question_id, index]),
      );
      for (const response of responses) {
        const index = questionById.get(response.question_id);
        if (index == null) continue;
        if (!answers[index]) answers[index] = {};
        answers[index][response.participant_id] = {
          selected_option: response.selected_option,
          is_correct: Boolean(response.is_correct),
          points: Number(response.points_earned),
          response_time_ms: response.response_time_ms,
        };
      }

      const participantMap = {};
      for (const participant of participants) {
        const score = responses
          .filter((response) => response.participant_id === participant.participant_id)
          .reduce((total, response) => total + Number(response.points_earned), 0);
        participantMap[`restored-${participant.participant_id}`] = {
          participant_id: participant.participant_id,
          name: participant.name,
          score,
          streak: participant.streak,
          multiplier: Number(participant.multiplier),
        };
      }

      rooms[dbRoom.room_code] = {
        quiz_id: dbRoom.quiz_id,
        admin_id: dbRoom.admin_id,
        room_id: dbRoom.room_id,
        status: dbRoom.status,
        currentIndex: dbRoom.current_question_index,
        timePerQuestion: dbRoom.time_per_question || 20,
        participants: participantMap,
        answers,
        questions,
        paused: dbRoom.status === "paused",
        questionTimer: null,
        autoTerminateTimer: null,
        adminSocketId: null,
      };

      if (dbRoom.status === "active" && questions[dbRoom.current_question_index]) {
        rooms[dbRoom.room_code].questionTimer = setTimeout(
          () =>
            advanceQuestion(rooms[dbRoom.room_code], dbRoom.room_code).catch(
              (err) => console.error("Restored room timer error:", err.message),
            ),
          (rooms[dbRoom.room_code].timePerQuestion + 3) * 1000,
        );
      }
    }
  }

  restorePromise = restoreRooms().catch((err) => {
    console.error("Live room restoration failed:", err.message);
  });

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
    if (!room || room.status === "ended" || room.ending) return;
    room.ending = true;

    if (room.questionTimer) clearTimeout(room.questionTimer);
    if (room.autoTerminateTimer) clearTimeout(room.autoTerminateTimer);
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
    room.ending = false;
    console.log(`Quiz ended: ${room_code}`);
  }

  // ── Socket events ─────────────────────────────────────────

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ── ADMIN: Create room ──────────────────────────────────
    socket.on(
      "create-room",
      async ({ quiz_id, admin_id, time_per_question }) => {
        await restorePromise;
        // Generate a unique room code with retry
        let room_code;
        let result;
        let attempts = 0;
        while (attempts < 5) {
          room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
          try {
            [result] = await pool.query(
              `INSERT INTO Rooms (quiz_id, admin_id, room_code, status, current_question_index)
             VALUES (?, ?, ?, 'waiting', 0)`,
              [quiz_id, admin_id, room_code],
            );
            break; // success
          } catch (err) {
            if (err.code === "ER_DUP_ENTRY") {
              attempts++;
              continue;
            }
            throw err; // other error
          }
        }
        if (!result) {
          return socket.emit("error", {
            message: "Failed to generate unique room code",
          });
        }
        console.log("create-room received:", { quiz_id, admin_id, room_code });

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
          autoTerminateTimer: null,
          adminSocketId: socket.id,
        };

        // Auto-terminate after 20 minutes no matter what
        rooms[room_code].autoTerminateTimer = setTimeout(
          async () => {
            const r = rooms[room_code];
            if (!r || r.status === "ended") return;
            console.log(`Auto-terminating room ${room_code} after 20 minutes`);
            await endQuiz(room_code);
          },
          20 * 60 * 1000,
        );

        socket.join(room_code);
        socket.room_code = room_code;
        socket.is_admin = true;

        socket.emit("room-created", { room_id: result.insertId, room_code });
        console.log(`Room created: ${room_code}`);
      },
    );

    // ── STUDENT: Join room ──────────────────────────────────
    socket.on("join-room", async ({ room_code, name }) => {
      await restorePromise;
      const room = rooms[room_code];
      const safeName = (name || "Player").trim() || "Player";
      if (!room) return socket.emit("error", { message: "Room not found" });
      if (room.status !== "waiting")
        return socket.emit("error", { message: "Quiz already started" });

      try {
        if (getParticipantList(room).length >= maxParticipants) {
          return socket.emit("error", {
            message: `This room has reached its ${maxParticipants}-player limit`,
          });
        }
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
      await restorePromise;
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

      socket.emit("rejoined-room", {
        participant_id,
        room_code,
        status: room.status,
      });
      emitParticipantSnapshot(room_code);

      if (room.status === "active" && room.questions[room.currentIndex]) {
        sendQuestion(room, room_code, socket);
      }
    });

    socket.on("rejoin-admin", async ({ room_code, admin_id }) => {
      await restorePromise;
      const room = rooms[room_code];
      if (!room || Number(room.admin_id) !== Number(admin_id)) {
        return socket.emit("error", { message: "Live room could not be restored" });
      }
      room.adminSocketId = socket.id;
      socket.join(room_code);
      socket.room_code = room_code;
      socket.is_admin = true;
      socket.emit("room-restored", {
        room_code,
        status: room.status,
        currentIndex: room.currentIndex,
        total_questions: room.questions.length,
      });
      emitParticipantSnapshot(room_code);
      if (room.status === "active" && room.questions[room.currentIndex]) {
        sendQuestion(room, room_code, socket);
      }
    });

    // ── ADMIN: Start quiz ───────────────────────────────────
    socket.on("start-quiz", async ({ room_code }) => {
      await restorePromise;
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
        await restorePromise;
        const room = rooms[room_code];
        if (!room || room.status !== "active") return;

        const participant = room.participants[socket.id] ||
          Object.values(room.participants).find(
            (entry) => entry.participant_id === socket.participant_id,
          );
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

    // ── STUDENT: Submit answer batch ──────────────────────────────
    socket.on(
      "submit-answer-batch",
      async ({ room_code, answers }) => {
        await restorePromise;
        const room = rooms[room_code];
        if (!room || room.status !== "active") return;

        // Validate we have answers to process
        if (!answers || !Array.isArray(answers) || answers.length === 0) return;

        // Process all answers in a single database transaction for efficiency
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          // Prepare batch data
          const answerResults = [];
          const participantUpdates = new Map(); // participant_id => {score, streak, multiplier}
          const responseInserts = [];

          // First pass: validate and prepare all answers
          for (const answer of answers) {
            const { question_id, selected_option, response_time_ms, participant_id } = answer;

            // Find participant in room
            const participantEntry = Object.values(room.participants).find(
              (entry) => entry.participant_id === participant_id
            );

            if (!participantEntry) {
              // Skip invalid participant
              answerResults.push({
                success: false,
                error: "Participant not found in room",
                answer_id: `${question_id}-${participant_id}`
              });
              continue;
            }

            // Check if already answered this question (prevent duplicates)
            if (room.answers[question_id] && room.answers[question_id][participant_id]) {
              answerResults.push({
                success: false,
                error: "Already answered this question",
                answer_id: `${question_id}-${participant_id}`
              });
              continue;
            }

            // Get question data
            const question = room.questions.find(q => q.question_id === question_id);
            if (!question) {
              answerResults.push({
                success: false,
                error: "Question not found",
                answer_id: `${question_id}-${participant_id}`
              });
              continue;
            }

            // Determine correctness
            const correctOption = normalizeOptions(question.options).find(
              (o) => o.is_correct,
            )?.option_number;
            const is_correct =
              parseInt(selected_option, 10) === parseInt(correctOption, 10);

            // Calculate points and update participant state
            const timeLimit = room.timePerQuestion * 1000;
            const speedBonus = is_correct
              ? Math.round(
                  ((timeLimit - Math.min(response_time_ms, timeLimit)) /
                    timeLimit) *
                  200,
                )
              : 0;
            const points = is_correct
              ? Math.round((question.base_points + speedBonus) * participantEntry.multiplier)
              : 0;

            // Update participant state (in memory)
            let newStreak = participantEntry.streak;
            let newMultiplier = participantEntry.multiplier;

            if (is_correct) {
              newStreak += 1;
              if (newStreak >= 4) newMultiplier = 2;
              else if (newStreak === 3) newMultiplier = 1.5;
              else if (newStreak === 2) newMultiplier = 1.25;
              else newMultiplier = 1;
            } else {
              newStreak = 0;
              newMultiplier = 1;
            }

            const newScore = participantEntry.score + points;

            // Store update for later
            participantUpdates.set(participant_id, {
              score: newScore,
              streak: newStreak,
              multiplier: newMultiplier
            });

            // Prepare response insert
            responseInserts.push([
              participant_id,
              question_id,
              room.room_id,
              selected_option,
              is_correct ? 1 : 0,
              response_time_ms,
              points
            ]);

            // Store answer in room state
            if (!room.answers[question_id]) room.answers[question_id] = {};
            room.answers[question_id][participant_id] = {
              selected_option,
              is_correct,
              points,
              response_time_ms,
            };

            // Prepare success result
            answerResults.push({
              success: true,
              is_correct,
              points,
              correct_option: correctOption,
              streak: newStreak,
              multiplier: newMultiplier,
              total_score: newScore,
              answer_id: `${question_id}-${participant_id}`
            });
          }

          // Execute batch insert for responses
          if (responseInserts.length > 0) {
            await connection.query(
              `INSERT INTO Responses (participant_id, question_id, room_id, selected_option, is_correct, response_time_ms, points_earned) VALUES ?`,
              [responseInserts]
            );
          }

          // Update participant records in database
          for (const [participant_id, update] of participantUpdates.entries()) {
            await connection.query(
              `UPDATE Participants SET score = ?, streak = ?, multiplier = ? WHERE participant_id = ?`,
              [update.score, update.streak, update.multiplier, participant_id]
            );
          }

          await connection.commit();

          // Emit individual answer results
          for (const result of answerResults) {
            if (result.success) {
              // Find the socket for this participant to emit to them specifically
              const participantSocketId = Object.keys(room.participants).find(
                sid => room.participants[sid]?.participant_id === result.answer_id.split('-')[1]
              );

              if (participantSocketId) {
                // Emit to specific participant
                io.to(participantSocketId).emit("answer-result", {
                  is_correct: result.is_correct,
                  points: result.points,
                  correct_option: result.correct_option,
                  streak: result.streak,
                  multiplier: result.multiplier,
                  total_score: result.total_score
                });
              }
            } else {
              // Emit error for failed answers - find the participant socket
              const participantSocketId = Object.keys(room.participants).find(
                sid => room.participants[sid]?.participant_id === result.answer_id.split('-')[1]
              );

              if (participantSocketId) {
                // Emit error to specific participant
                io.to(participantSocketId).emit("answer-error", {
                  error: result.error,
                  answer_id: result.answer_id
                });
              }
            }
          }

          // Update answer stats for the room
          const totalAnswers = answers.length;
          const successfulAnswers = answerResults.filter(r => r.success).length;
          const correctAnswers = answerResults.filter(r => r.success && r.is_correct).length;

          io.to(room_code).emit("answer-stats-batch", {
            processed: successfulAnswers,
            total: totalAnswers,
            correct: correctAnswers
          });

        } catch (err) {
          await connection.rollback();
          console.error("submit-answer-batch error:", err.message);
          // Emit batch error to all participants in room
          io.to(room_code).emit("answer-batch-error", {
            error: "Failed to process answer batch",
            details: err.message
          });
        } finally {
          connection.release();
        }
      }
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

      if (socket.is_admin && room.adminSocketId === socket.id) {
        room.adminSocketId = null;
      }

      if (!socket.is_admin && room.participants[socket.id]) {
        // Keep the participant in memory so a transient disconnect can rejoin
        // without changing the leaderboard or participant count.
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