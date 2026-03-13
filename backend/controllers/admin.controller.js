const pool = require("../config/db");
const { listRooms } = require("../liveRoomStore");
const { getHandlers } = require("../liveRoomControl");

function isMaster(req) {
  return Boolean(req.user?.is_master);
}

exports.getStats = async (req, res) => {
  const admin_id = req.user.admin_id;
  const master = isMaster(req);

  try {
    const [[quizRow]] = await pool.query(
      master
        ? "SELECT COUNT(*) as quizzes FROM Quizzes WHERE is_static = 0"
        : "SELECT COUNT(*) as quizzes FROM Quizzes WHERE admin_id = ? AND is_static = 0",
      master ? [] : [admin_id],
    );
    const [[questionRow]] = await pool.query(
      master
        ? "SELECT COUNT(*) as questions FROM QuestionBank"
        : "SELECT COUNT(*) as questions FROM QuestionBank WHERE admin_id = ? OR admin_id = 1",
      master ? [] : [admin_id],
    );
    const [[roomRow]] = await pool.query(
      master
        ? "SELECT COUNT(*) as rooms FROM Rooms"
        : "SELECT COUNT(*) as rooms FROM Rooms WHERE admin_id = ?",
      master ? [] : [admin_id],
    );
    const [[participantRow]] = await pool.query(
      master
        ? "SELECT COUNT(*) as participants FROM Participants"
        : `SELECT COUNT(*) as participants FROM Participants p
           JOIN Rooms r ON p.room_id = r.room_id
           WHERE r.admin_id = ?`,
      master ? [] : [admin_id],
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
  const master = isMaster(req);

  try {
    const [rooms] = await pool.query(
      `SELECT 
        r.room_id, r.room_code, r.status,
        r.started_at, r.ended_at,
        q.title AS quiz_title, q.genre, q.difficulty, q.num_questions,
        a.name AS host_name,
        a.email AS host_email,
        COUNT(DISTINCT p.participant_id) AS participant_count,
        COALESCE(AVG(s.total_points), 0) AS avg_score,
        MAX(s.total_points) AS top_score
       FROM Rooms r
       JOIN Quizzes q ON r.quiz_id = q.quiz_id
       LEFT JOIN Admins a ON r.admin_id = a.admin_id
       LEFT JOIN Participants p ON p.room_id = r.room_id
       LEFT JOIN Scores s ON s.room_id = r.room_id
       WHERE (? = 1 OR r.admin_id = ?)
       GROUP BY r.room_id
       ORDER BY COALESCE(r.started_at, r.ended_at) DESC, r.room_id DESC`,
      [master ? 1 : 0, admin_id],
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
  const master = isMaster(req);

  try {
    const [[room]] = await pool.query(
      `SELECT r.*, q.title AS quiz_title, q.genre, q.num_questions, a.name AS host_name
       FROM Rooms r
       JOIN Quizzes q ON r.quiz_id = q.quiz_id
       LEFT JOIN Admins a ON r.admin_id = a.admin_id
       WHERE r.room_id = ? AND (? = 1 OR r.admin_id = ?)`,
      [room_id, master ? 1 : 0, admin_id],
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

exports.getSystemOverview = async (req, res) => {
  try {
    const [[adminsRow]] = await pool.query(
      "SELECT COUNT(*) AS admins FROM Admins",
    );
    const [[quizzesRow]] = await pool.query(
      "SELECT COUNT(*) AS quizzes FROM Quizzes",
    );
    const [[attemptsRow]] = await pool.query(
      "SELECT COUNT(*) AS static_attempts FROM StaticAttempts",
    );
    const [[participantsRow]] = await pool.query(
      "SELECT COUNT(*) AS live_participants FROM Participants",
    );
    const [[scoresRow]] = await pool.query(
      "SELECT COALESCE(SUM(total_points), 0) AS total_live_points FROM Scores",
    );

    res.json({
      admins: adminsRow.admins,
      quizzes: quizzesRow.quizzes,
      static_attempts: attemptsRow.static_attempts,
      live_participants: participantsRow.live_participants,
      total_live_points: scoresRow.total_live_points,
      active_live_rooms: listRooms().filter((room) => room.status !== "ended")
        .length,
    });
  } catch (err) {
    console.error("System overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getActiveLiveRooms = async (_req, res) => {
  try {
    const liveRooms = await Promise.all(
      listRooms()
        .filter((room) => room.status !== "ended")
        .map(async (room) => {
          const [[roomMeta]] = await pool.query(
            `SELECT r.room_id, r.status, r.started_at, r.ended_at,
                    q.title AS quiz_title, q.genre,
                    a.name AS host_name, a.email AS host_email
             FROM Rooms r
             JOIN Quizzes q ON r.quiz_id = q.quiz_id
             LEFT JOIN Admins a ON r.admin_id = a.admin_id
             WHERE r.room_id = ?`,
            [room.room_id],
          );

          return {
            room_code: room.room_code,
            room_id: room.room_id,
            status: room.status,
            paused: Boolean(room.paused),
            current_question_index: room.currentIndex,
            total_questions: room.questions.length,
            participant_count: Object.keys(room.participants || {}).length,
            participants: Object.values(room.participants || {}).map((p) => ({
              participant_id: p.participant_id,
              name: p.name,
              score: p.score,
              streak: p.streak,
              multiplier: p.multiplier,
            })),
            quiz_title: roomMeta?.quiz_title || null,
            genre: roomMeta?.genre || null,
            host_name: roomMeta?.host_name || "Unknown",
            host_email: roomMeta?.host_email || null,
            started_at: roomMeta?.started_at || null,
          };
        }),
    );

    res.json({ rooms: liveRooms });
  } catch (err) {
    console.error("Active live rooms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStaticAttemptStats = async (req, res) => {
  const { quiz_id } = req.query;

  try {
    const [rows] = await pool.query(
      `SELECT
        q.quiz_id,
        q.title AS quiz_title,
        COUNT(sa.attempt_id) AS attempts,
        COALESCE(MAX(sa.total_points), 0) AS top_score,
        COALESCE(AVG(sa.total_points), 0) AS avg_score,
        COALESCE(MIN(sa.time_taken_ms), 0) AS best_time_ms
       FROM Quizzes q
       LEFT JOIN StaticAttempts sa ON sa.quiz_id = q.quiz_id
       WHERE q.is_static = 1 AND (? IS NULL OR q.quiz_id = ?)
       GROUP BY q.quiz_id
       ORDER BY q.quiz_id ASC`,
      [quiz_id || null, quiz_id || null],
    );

    const attempts = quiz_id
      ? (
          await pool.query(
            `SELECT attempt_id, quiz_id, player_name, total_points, correct_count,
                    wrong_count, time_taken_ms, final_rank, completed_at
             FROM StaticAttempts
             WHERE quiz_id = ?
             ORDER BY total_points DESC, time_taken_ms ASC, completed_at DESC
             LIMIT 100`,
            [quiz_id],
          )
        )[0]
      : [];

    res.json({ quizzes: rows, attempts });
  } catch (err) {
    console.error("Static attempt stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteStaticAttempt = async (req, res) => {
  const { attempt_id } = req.params;

  try {
    const [[attempt]] = await pool.query(
      "SELECT attempt_id, quiz_id FROM StaticAttempts WHERE attempt_id = ?",
      [attempt_id],
    );
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    await pool.query("DELETE FROM StaticAttempts WHERE attempt_id = ?", [
      attempt_id,
    ]);

    const [remaining] = await pool.query(
      `SELECT attempt_id
       FROM StaticAttempts
       WHERE quiz_id = ?
       ORDER BY total_points DESC, time_taken_ms ASC, completed_at ASC`,
      [attempt.quiz_id],
    );

    for (let i = 0; i < remaining.length; i++) {
      await pool.query(
        "UPDATE StaticAttempts SET final_rank = ? WHERE attempt_id = ?",
        [i + 1, remaining[i].attempt_id],
      );
    }

    res.json({ message: "Static attempt removed" });
  } catch (err) {
    console.error("Delete static attempt error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.removeLiveParticipant = async (req, res) => {
  const { room_code, participant_id } = req.params;
  const { kickParticipant } = getHandlers();

  if (!kickParticipant) {
    return res.status(503).json({ message: "Live control unavailable" });
  }

  const removed = kickParticipant(room_code, parseInt(participant_id, 10));
  if (!removed) {
    return res.status(404).json({ message: "Participant not found" });
  }

  res.json({ message: "Participant removed" });
};

exports.endLiveRoom = async (req, res) => {
  const { room_code } = req.params;
  const { endRoom } = getHandlers();

  if (!endRoom) {
    return res.status(503).json({ message: "Live control unavailable" });
  }

  const ended = await endRoom(room_code, true);
  if (!ended) {
    return res.status(404).json({ message: "Room not found" });
  }

  res.json({ message: "End signal sent" });
};
