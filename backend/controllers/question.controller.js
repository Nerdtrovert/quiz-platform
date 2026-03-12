const pool = require("../config/db");

// ─── GET ALL QUESTIONS (own + system seed) ────────────────
exports.getQuestions = async (req, res) => {
  const { genre, difficulty } = req.query;
  const admin_id = req.user.admin_id;

  try {
    let query = `
      SELECT q.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'option_id', o.option_id,
            'option_number', o.option_number,
            'option_text', o.option_text,
            'is_correct', o.is_correct
          )
        ) AS options
      FROM QuestionBank q
      LEFT JOIN Options o ON q.question_id = o.question_id
      WHERE (q.admin_id = ? OR q.admin_id = 1)
    `;
    const params = [admin_id];

    if (genre) {
      query += " AND q.genre = ?";
      params.push(genre);
    }
    if (difficulty) {
      query += " AND q.difficulty = ?";
      params.push(difficulty);
    }

    query +=
      " GROUP BY q.question_id ORDER BY q.admin_id ASC, q.created_at DESC";

    const [questions] = await pool.query(query, params);
    res.json({ questions });
  } catch (err) {
    console.error("GetQuestions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ADD QUESTION ─────────────────────────────────────────
exports.addQuestion = async (req, res) => {
  const { question_text, genre, difficulty, base_points, options } = req.body;
  const admin_id = req.user.admin_id;

  if (
    !question_text ||
    !genre ||
    !difficulty ||
    !options ||
    options.length !== 4
  )
    return res
      .status(400)
      .json({ message: "All fields required. Must have exactly 4 options." });

  const correctOptions = options.filter((o) => o.is_correct);
  if (correctOptions.length !== 1)
    return res
      .status(400)
      .json({ message: "Exactly one option must be marked correct" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO QuestionBank (admin_id, question_text, genre, difficulty, base_points)
       VALUES (?, ?, ?, ?, ?)`,
      [admin_id, question_text, genre, difficulty, base_points || 500],
    );
    const question_id = result.insertId;

    for (let i = 0; i < options.length; i++) {
      await conn.query(
        `INSERT INTO Options (question_id, option_number, option_text, is_correct)
         VALUES (?, ?, ?, ?)`,
        [
          question_id,
          i + 1,
          options[i].option_text,
          options[i].is_correct ? 1 : 0,
        ],
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Question added", question_id });
  } catch (err) {
    await conn.rollback();
    console.error("AddQuestion error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

// ─── DELETE QUESTION ──────────────────────────────────────
exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.admin_id;

  try {
    const [rows] = await pool.query(
      "SELECT admin_id FROM QuestionBank WHERE question_id = ?",
      [id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Question not found" });
    // Only allow deleting own questions (not system seed questions)
    if (rows[0].admin_id === 1)
      return res
        .status(403)
        .json({ message: "Cannot delete system questions" });
    if (rows[0].admin_id !== admin_id)
      return res.status(403).json({ message: "Not your question" });

    await pool.query("DELETE FROM QuestionBank WHERE question_id = ?", [id]);
    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error("DeleteQuestion error:", err);
    res.status(500).json({ message: "Server error" });
  }
};