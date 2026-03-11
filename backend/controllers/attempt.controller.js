const pool = require("../config/db");

// ─── SUBMIT STATIC QUIZ ATTEMPT ───────────────────────────
exports.submitAttempt = async (req, res) => {
  const { quiz_id, player_name, answers, time_taken_ms } = req.body;
  // answers: [{ question_id, selected_option }]

  if (!quiz_id || !player_name || !answers)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    // Get all questions + correct answers for this quiz
    const [questions] = await pool.query(
      `SELECT qb.question_id, qb.base_points, qb.difficulty,
              o.option_number AS correct_option
       FROM QuizQuestions qq
       JOIN QuestionBank qb ON qq.question_id = qb.question_id
       JOIN Options o ON qb.question_id = o.question_id AND o.is_correct = 1
       WHERE qq.quiz_id = ?
       ORDER BY qq.order_index ASC`,
      [quiz_id],
    );

    if (questions.length === 0)
      return res
        .status(404)
        .json({ message: "Quiz not found or has no questions" });

    // Build a map for quick lookup
    const questionMap = {};
    questions.forEach((q) => {
      questionMap[q.question_id] = q;
    });

    // Score calculation
    let total_points = 0;
    let correct_count = 0;
    let wrong_count = 0;
    let streak = 0;
    let multiplier = 1;

    const scoredAnswers = answers.map((ans) => {
      const q = questionMap[ans.question_id];
      if (!q) return { ...ans, is_correct: false, points: 0 };

      const is_correct =
        parseInt(ans.selected_option) === parseInt(q.correct_option);

      if (is_correct) {
        correct_count++;
        streak++;
        // Streak multiplier: 1 → 1.25 → 1.5 → 2
        if (streak >= 4) multiplier = 2;
        else if (streak === 3) multiplier = 1.5;
        else if (streak === 2) multiplier = 1.25;
        else multiplier = 1;

        const points = Math.round(q.base_points * multiplier);
        total_points += points;
        return { ...ans, is_correct: true, points };
      } else {
        wrong_count++;
        streak = 0;
        multiplier = 1;
        return { ...ans, is_correct: false, points: 0 };
      }
    });

    // Insert attempt
    const [result] = await pool.query(
      `INSERT INTO StaticAttempts
         (quiz_id, player_name, total_points, correct_count, wrong_count, time_taken_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        quiz_id,
        player_name,
        total_points,
        correct_count,
        wrong_count,
        time_taken_ms || 0,
      ],
    );
    const attempt_id = result.insertId;

    // Get rank (how many people scored higher)
    const [rankRows] = await pool.query(
      `SELECT COUNT(*) + 1 AS final_rank FROM StaticAttempts
       WHERE quiz_id = ? AND total_points > ? AND attempt_id != ?`,
      [quiz_id, total_points, attempt_id],
    );
    const final_rank = rankRows[0].final_rank;

    // Update rank in attempt
    await pool.query(
      "UPDATE StaticAttempts SET final_rank = ? WHERE attempt_id = ?",
      [final_rank, attempt_id],
    );

    res.status(201).json({
      message: "Attempt submitted",
      attempt_id,
      total_points,
      correct_count,
      wrong_count,
      final_rank,
      total_questions: questions.length,
      scored_answers: scoredAnswers,
    });
  } catch (err) {
    console.error("SubmitAttempt error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET LEADERBOARD FOR A STATIC QUIZ ───────────────────
exports.getLeaderboard = async (req, res) => {
  const { quiz_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT player_name, total_points, correct_count,
              wrong_count, time_taken_ms, final_rank, completed_at
       FROM StaticAttempts
       WHERE quiz_id = ?
       ORDER BY total_points DESC, time_taken_ms ASC
       LIMIT 20`,
      [quiz_id],
    );
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error("GetLeaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};