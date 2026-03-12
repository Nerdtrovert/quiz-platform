const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth.middleware");

// ─── GET DASHBOARD STATS ──────────────────────────────────
router.get("/stats", verifyToken, async (req, res) => {
  const admin_id = req.user.admin_id;
  try {
    const [[{ quizzes }]] = await pool.query(
      `SELECT COUNT(*) as quizzes FROM Quizzes WHERE admin_id = ? AND is_static = 0`,
      [admin_id],
    );
    const [[{ questions }]] = await pool.query(
      `SELECT COUNT(*) as questions FROM QuestionBank WHERE admin_id = ? OR admin_id = 1`,
      [admin_id],
    );
    const [[{ rooms }]] = await pool.query(
      `SELECT COUNT(*) as rooms FROM Rooms WHERE admin_id = ?`,
      [admin_id],
    );
    const [[{ participants }]] = await pool.query(
      `SELECT COUNT(*) as participants FROM Participants p
       JOIN Rooms r ON p.room_id = r.room_id
       WHERE r.admin_id = ?`,
      [admin_id],
    );
    res.json({ quizzes, questions, rooms, participants });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;