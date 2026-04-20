const pool = require("../config/db");

exports.getStats = async (req, res) => {
  const admin_id = req.user.admin_id;
  try {
    const [[quizRow]] = await pool.query(
      "SELECT COUNT(*) as quizzes FROM Quizzes WHERE admin_id = ? AND is_static = 0",
      [admin_id],
    );
    const [[questionRow]] = await pool.query(
      "SELECT COUNT(*) as questions FROM QuestionBank WHERE admin_id = ? OR admin_id = 1",
      [admin_id],
    );
    const [[roomRow]] = await pool.query(
      "SELECT COUNT(*) as rooms FROM Rooms WHERE admin_id = ?",
      [admin_id],
    );
    const [[participantRow]] = await pool.query(
      `SELECT COUNT(*) as participants FROM Participants p
       JOIN Rooms r ON p.room_id = r.room_id
       WHERE r.admin_id = ?`,
      [admin_id],
    );

    res.json({
      quizzes: quizRow.quizzes,
      questions: questionRow.questions,
      rooms: roomRow.rooms,
      participants: participantRow.participants,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRooms = async (req, res) => {
  const admin_id = req.user.admin_id;
  try {
    const [rooms] = await pool.query(
      `SELECT
        r.room_id, r.room_code, r.status,
        r.started_at, r.ended_at,
        q.title AS quiz_title, q.genre, q.difficulty, q.num_questions,
        COUNT(DISTINCT p.participant_id) AS participant_count,
        COALESCE(AVG(s.total_points), 0) AS avg_score,
        MAX(s.total_points) AS top_score
       FROM Rooms r
       JOIN Quizzes q ON r.quiz_id = q.quiz_id
       LEFT JOIN Participants p ON p.room_id = r.room_id
       LEFT JOIN Scores s ON s.room_id = r.room_id
       WHERE r.admin_id = ?
       GROUP BY r.room_id
       ORDER BY COALESCE(r.started_at, r.ended_at) DESC, r.room_id DESC`,
      [admin_id],
    );
    res.json({ rooms });
  } catch (err) {
    console.error("Rooms history error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRoomDetail = async (req, res) => {
  const admin_id = req.user.admin_id;
  const { room_id } = req.params;
  try {
    const [[room]] = await pool.query(
      `SELECT r.*, q.title AS quiz_title, q.genre, q.num_questions
       FROM Rooms r
       JOIN Quizzes q ON r.quiz_id = q.quiz_id
       WHERE r.room_id = ? AND r.admin_id = ?`,
      [room_id, admin_id],
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    const [scores] = await pool.query(
      `SELECT p.name, s.total_points, s.correct_count, s.wrong_count,
              s.highest_streak, s.final_rank
       FROM Scores s
       JOIN Participants p ON s.participant_id = p.participant_id
       WHERE s.room_id = ?
       ORDER BY s.final_rank ASC`,
      [room_id],
    );

    res.json({ room, scores });
  } catch (err) {
    console.error("Room detail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSystemOverview = async (_req, res) => {
  try {
    const [[adminsRow]] = await pool.query(
      "SELECT COUNT(*) AS admins FROM Admins",
    );
    const [[quizzesRow]] = await pool.query(
      "SELECT COUNT(*) AS quizzes FROM Quizzes",
    );
    const [[staticAttemptsRow]] = await pool.query(
      "SELECT COUNT(*) AS static_attempts FROM StaticAttempts",
    );
    const [[liveParticipantsRow]] = await pool.query(
      `SELECT COUNT(*) AS live_participants
       FROM Participants p
       JOIN Rooms r ON p.room_id = r.room_id
       WHERE r.status IN ('waiting', 'active', 'paused')`,
    );
    const [[livePointsRow]] = await pool.query(
      `SELECT COALESCE(SUM(s.total_points), 0) AS total_live_points
       FROM Scores s
       JOIN Rooms r ON s.room_id = r.room_id`,
    );
    const [[activeRoomsRow]] = await pool.query(
      `SELECT COUNT(*) AS active_live_rooms
       FROM Rooms
       WHERE status IN ('waiting', 'active', 'paused')`,
    );

    res.json({
      admins: adminsRow.admins,
      quizzes: quizzesRow.quizzes,
      static_attempts: staticAttemptsRow.static_attempts,
      live_participants: liveParticipantsRow.live_participants,
      total_live_points: Number(livePointsRow.total_live_points || 0),
      active_live_rooms: activeRoomsRow.active_live_rooms,
    });
  } catch (err) {
    console.error("System overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSystemLiveRooms = async (_req, res) => {
  try {
    const [rooms] = await pool.query(
      `SELECT
        r.room_id,
        r.room_code,
        r.status,
        r.current_question_index,
        q.title AS quiz_title,
        q.num_questions AS total_questions,
        a.name AS host_name,
        COUNT(DISTINCT p.participant_id) AS participant_count
       FROM Rooms r
       JOIN Quizzes q ON r.quiz_id = q.quiz_id
       JOIN Admins a ON r.admin_id = a.admin_id
       LEFT JOIN Participants p ON p.room_id = r.room_id
       WHERE r.status IN ('waiting', 'active', 'paused')
       GROUP BY r.room_id
       ORDER BY r.room_id DESC`,
    );

    if (!rooms.length) {
      return res.json({ rooms: [] });
    }

    const roomIds = rooms.map((room) => room.room_id);
    const placeholders = roomIds.map(() => "?").join(", ");

    const [participants] = await pool.query(
      `SELECT
        p.participant_id,
        p.room_id,
        p.name,
        p.streak,
        COALESCE(SUM(resp.points_earned), 0) AS score
       FROM Participants p
       LEFT JOIN Responses resp ON resp.participant_id = p.participant_id
       WHERE p.room_id IN (${placeholders})
       GROUP BY p.participant_id
       ORDER BY score DESC, p.participant_id ASC`,
      roomIds,
    );

    const participantsByRoom = participants.reduce((acc, participant) => {
      if (!acc[participant.room_id]) acc[participant.room_id] = [];
      acc[participant.room_id].push({
        participant_id: participant.participant_id,
        name: participant.name,
        score: Number(participant.score || 0),
        streak: participant.streak,
      });
      return acc;
    }, {});

    const data = rooms.map((room) => ({
      ...room,
      participant_count: Number(room.participant_count || 0),
      participants: participantsByRoom[room.room_id] || [],
    }));

    res.json({ rooms: data });
  } catch (err) {
    console.error("System live rooms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSystemStaticAttempts = async (req, res) => {
  const quizId = req.query.quiz_id ? Number(req.query.quiz_id) : null;

  try {
    const [quizzes] = await pool.query(
      `SELECT
        q.quiz_id,
        q.title AS quiz_title,
        COUNT(sa.attempt_id) AS attempts,
        COALESCE(AVG(sa.total_points), 0) AS avg_score,
        COALESCE(MAX(sa.total_points), 0) AS top_score,
        COALESCE(MIN(NULLIF(sa.time_taken_ms, 0)), 0) AS best_time_ms
       FROM Quizzes q
       LEFT JOIN StaticAttempts sa ON sa.quiz_id = q.quiz_id
       WHERE q.is_static = 1
       GROUP BY q.quiz_id
       ORDER BY q.quiz_id DESC`,
    );

    if (!quizId) {
      return res.json({ quizzes, attempts: [] });
    }

    const [attempts] = await pool.query(
      `SELECT
        attempt_id,
        quiz_id,
        player_name,
        total_points,
        correct_count,
        wrong_count,
        time_taken_ms,
        final_rank,
        completed_at
       FROM StaticAttempts
       WHERE quiz_id = ?
       ORDER BY completed_at DESC, attempt_id DESC`,
      [quizId],
    );

    res.json({ quizzes, attempts });
  } catch (err) {
    console.error("System static attempts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.removeLiveParticipant = async (req, res) => {
  const { roomCode, participantId } = req.params;

  try {
    const [[room]] = await pool.query(
      "SELECT room_id FROM Rooms WHERE room_code = ? LIMIT 1",
      [roomCode],
    );
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const [result] = await pool.query(
      "DELETE FROM Participants WHERE participant_id = ? AND room_id = ?",
      [participantId, room.room_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Participant not found" });
    }

    res.json({ message: "Participant removed" });
  } catch (err) {
    console.error("Remove live participant error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.endLiveRoom = async (req, res) => {
  const { roomCode } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE Rooms
       SET status = 'ended', ended_at = NOW()
       WHERE room_code = ? AND status <> 'ended'`,
      [roomCode],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Live room not found" });
    }

    res.json({ message: "Room ended" });
  } catch (err) {
    console.error("End live room error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteStaticAttempt = async (req, res) => {
  const { attemptId } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM StaticAttempts WHERE attempt_id = ?",
      [attemptId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    res.json({ message: "Attempt deleted" });
  } catch (err) {
    console.error("Delete static attempt error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET STATIC QUIZ BY ID ────────────────────────────────
exports.getStaticQuizById = async (req, res) => {
  const { quizId } = req.params;

  try {
    const [[quiz]] = await pool.query(
      `SELECT * FROM Quizzes WHERE quiz_id = ? AND is_static = 1`,
      [quizId],
    );

    if (!quiz) {
      return res.status(404).json({ message: "Static quiz not found" });
    }

    const [questions] = await pool.query(
      `SELECT qb.*, qq.order_index,
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

    res.json({ quiz, questions });
  } catch (err) {
    console.error("Get static quiz by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CREATE STATIC QUIZ ───────────────────────────────────
exports.createStaticQuiz = async (req, res) => {
  const { title, genre, difficulty, time_per_question, question_ids } =
    req.body;

  if (!title || !question_ids || question_ids.length === 0) {
    return res
      .status(400)
      .json({ message: "Title and at least one question are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO Quizzes (admin_id, title, genre, difficulty, num_questions, time_per_question, is_static)
       VALUES (NULL, ?, ?, ?, ?, ?, 1)`,
      [
        title,
        genre || "Mixed",
        difficulty || "medium",
        question_ids.length,
        time_per_question || 30,
      ],
    );
    const quiz_id = result.insertId;

    for (let i = 0; i < question_ids.length; i++) {
      await conn.query(
        "INSERT INTO QuizQuestions (quiz_id, question_id, order_index) VALUES (?, ?, ?)",
        [quiz_id, question_ids[i], i],
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Static quiz created", quiz_id });
  } catch (err) {
    await conn.rollback();
    console.error("Create static quiz error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

// ─── UPDATE STATIC QUIZ ───────────────────────────────────
exports.updateStaticQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { title, genre, difficulty, time_per_question, question_ids } =
    req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  const conn = await pool.getConnection();
  try {
    const [[quiz]] = await conn.query(
      "SELECT * FROM Quizzes WHERE quiz_id = ? AND is_static = 1",
      [quizId],
    );

    if (!quiz) {
      return res.status(404).json({ message: "Static quiz not found" });
    }

    await conn.beginTransaction();

    // Update quiz metadata
    await conn.query(
      `UPDATE Quizzes
       SET title = ?, genre = ?, difficulty = ?, time_per_question = ?, num_questions = ?
       WHERE quiz_id = ?`,
      [
        title,
        genre || "Mixed",
        difficulty || "medium",
        time_per_question || 30,
        question_ids ? question_ids.length : quiz.num_questions,
        quizId,
      ],
    );

    // Update questions if provided
    if (question_ids && question_ids.length > 0) {
      await conn.query("DELETE FROM QuizQuestions WHERE quiz_id = ?", [quizId]);

      for (let i = 0; i < question_ids.length; i++) {
        await conn.query(
          "INSERT INTO QuizQuestions (quiz_id, question_id, order_index) VALUES (?, ?, ?)",
          [quizId, question_ids[i], i],
        );
      }
    }

    await conn.commit();
    res.json({ message: "Static quiz updated", quiz_id: quizId });
  } catch (err) {
    await conn.rollback();
    console.error("Update static quiz error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

// ─── DELETE STATIC QUIZ ───────────────────────────────────
exports.deleteStaticQuiz = async (req, res) => {
  const { quizId } = req.params;

  try {
    const [[quiz]] = await pool.query(
      "SELECT * FROM Quizzes WHERE quiz_id = ? AND is_static = 1",
      [quizId],
    );

    if (!quiz) {
      return res.status(404).json({ message: "Static quiz not found" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query("DELETE FROM StaticAttempts WHERE quiz_id = ?", [quizId]);
      await conn.query("DELETE FROM QuizQuestions WHERE quiz_id = ?", [quizId]);
      await conn.query("DELETE FROM Quizzes WHERE quiz_id = ?", [quizId]);

      await conn.commit();
      res.json({ message: "Static quiz deleted" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Delete static quiz error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET STATIC LEADERBOARD FOR A QUIZ ─────────────────────
exports.getStaticLeaderboard = async (req, res) => {
  const { quizId } = req.params;

  try {
    const [[quiz]] = await pool.query(
      "SELECT * FROM Quizzes WHERE quiz_id = ? AND is_static = 1",
      [quizId],
    );

    if (!quiz) {
      return res.status(404).json({ message: "Static quiz not found" });
    }

    const [leaderboard] = await pool.query(
      `SELECT
        attempt_id,
        quiz_id,
        player_name,
        total_points,
        correct_count,
        wrong_count,
        time_taken_ms,
        final_rank,
        completed_at
       FROM StaticAttempts
       WHERE quiz_id = ?
       ORDER BY final_rank ASC, total_points DESC`,
      [quizId],
    );

    res.json({
      quiz: {
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        genre: quiz.genre,
        difficulty: quiz.difficulty,
        num_questions: quiz.num_questions,
      },
      leaderboard,
    });
  } catch (err) {
    console.error("Get static leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
