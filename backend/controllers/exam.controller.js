const pool = require("../config/db");

// ─── GET ALL QUIZZES FOR ADMIN (own + static presets) ────
exports.getQuizzes = async (req, res) => {
  const admin_id = req.user.admin_id;
  try {
    const [quizzes] = await pool.query(
      `SELECT q.*,
        (SELECT COUNT(*) FROM QuizQuestions qq WHERE qq.quiz_id = q.quiz_id) AS question_count
       FROM Quizzes q
       WHERE q.admin_id = ? AND q.is_static = 0
       ORDER BY q.created_at DESC`,
      [admin_id],
    );

    // Also fetch static preset quizzes (admin_id=1, is_static=1)
    const [staticQuizzes] = await pool.query(
      `SELECT q.*,
        (SELECT COUNT(*) FROM QuizQuestions qq WHERE qq.quiz_id = q.quiz_id) AS question_count
       FROM Quizzes q
       WHERE q.is_static = 1
       ORDER BY q.quiz_id ASC`,
    );

    res.json({ quizzes, staticQuizzes });
  } catch (err) {
    console.error("GetQuizzes error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET SINGLE QUIZ WITH QUESTIONS ──────────────────────
exports.getQuizById = async (req, res) => {
  const { id } = req.params;
  try {
    const [quizRows] = await pool.query(
      "SELECT * FROM Quizzes WHERE quiz_id = ?",
      [id],
    );
    if (quizRows.length === 0)
      return res.status(404).json({ message: "Quiz not found" });

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
       ORDER BY RAND()`,
      [id],
    );

    res.json({ quiz: quizRows[0], questions });
  } catch (err) {
    console.error("GetQuizById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CREATE QUIZ ──────────────────────────────────────────
exports.createQuiz = async (req, res) => {
  const { title, genre, difficulty, time_per_question, question_ids } =
    req.body;
  const admin_id = req.user.admin_id;

  if (!title || !question_ids || question_ids.length === 0)
    return res
      .status(400)
      .json({ message: "Title and at least one question are required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO Quizzes (admin_id, title, genre, difficulty, num_questions, time_per_question, is_static)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        admin_id,
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
    res.status(201).json({ message: "Quiz created", quiz_id });
  } catch (err) {
    await conn.rollback();
    console.error("CreateQuiz error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

// ─── DELETE QUIZ ──────────────────────────────────────────
exports.deleteQuiz = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.admin_id;
  try {
    const [rows] = await pool.query(
      "SELECT admin_id FROM Quizzes WHERE quiz_id = ?",
      [id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Quiz not found" });
    if (rows[0].admin_id !== admin_id)
      return res.status(403).json({ message: "Not your quiz" });

    await pool.query("DELETE FROM QuizQuestions WHERE quiz_id = ?", [id]);
    await pool.query("DELETE FROM Quizzes WHERE quiz_id = ?", [id]);
    res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error("DeleteQuiz error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET ALL STATIC QUIZZES (public, no auth) ────────────
exports.getStaticQuizzes = async (req, res) => {
  try {
    const [quizzes] = await pool.query(
      `SELECT q.*,
        (SELECT COUNT(*) FROM QuizQuestions qq WHERE qq.quiz_id = q.quiz_id) AS question_count
       FROM Quizzes q
       WHERE q.is_static = 1
       ORDER BY q.created_at ASC`,
    );
    res.json({ quizzes });
  } catch (err) {
    console.error("GetStaticQuizzes error:", err);
    res.status(500).json({ message: "Server error" });
  }
};