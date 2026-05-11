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

    // Save attempt to StaticAttempts table for admin tracking
    await pool.query(
      `INSERT INTO StaticAttempts (quiz_id, player_name, total_points, correct_count, wrong_count, time_taken_ms, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [quiz_id, player_name, total_points, correct_count, wrong_count, time_taken_ms || 0],
    );

    res.status(201).json({
      message: "Practice quiz scored",
      total_points,
      correct_count,
      wrong_count,
      total_questions: scoredAnswers.length,
      time_taken_ms: time_taken_ms || 0,
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
