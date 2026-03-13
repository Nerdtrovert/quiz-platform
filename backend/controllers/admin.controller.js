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