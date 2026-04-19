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
