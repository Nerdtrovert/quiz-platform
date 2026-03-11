import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import useAntiCheat from "../../hooks/useAntiCheat";

export default function StaticQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  // Quiz data
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Player
  const [playerName, setPlayerName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);

  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // { question_id, selected_option }
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  useAntiCheat({
    active: nameSubmitted && !revealed && questions.length > 0,
    onViolation: (msg, count, remaining) => {
      setWarningMsg(
        `⚠ ${msg} — ${remaining} warning${remaining === 1 ? "" : "s"} left before auto-submit`,
      );
      setTimeout(() => setWarningMsg(""), 3000);
    },
    maxViolations: 3,
    onForceSubmit: () => {
      setWarningMsg("❌ Too many violations — submitting quiz...");
      setTimeout(() => submitQuiz(), 1500);
    },
  });

  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (!nameSubmitted || revealed || !quiz) return;
    setTimeLeft(quiz.time_per_question);
    setStartTime(Date.now());

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, nameSubmitted]);

  const fetchQuiz = async () => {
    try {
      const res = await api.get(`/quizzes/${quizId}`);
      setQuiz(res.data.quiz);
      setQuestions(res.data.questions);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (playerName.trim().length < 2) return;
    setNameSubmitted(true);
    setQuizStartTime(Date.now());
  };

  const handleTimeUp = () => {
    if (revealed) return;
    // Record unanswered
    const q = questions[currentIndex];
    setAnswers((prev) => [
      ...prev,
      { question_id: q.question_id, selected_option: null },
    ]);
    setRevealed(true);
  };

  const handleOptionSelect = (optionNumber) => {
    if (revealed) return;
    clearInterval(timerRef.current);

    const q = questions[currentIndex];
    const timeTaken = Date.now() - startTime;

    setSelectedOption(optionNumber);
    setAnswers((prev) => [
      ...prev,
      {
        question_id: q.question_id,
        selected_option: optionNumber,
        time_taken_ms: timeTaken,
      },
    ]);
    setRevealed(true);
  };

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      // Submit quiz
      await submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      const totalTime = Date.now() - quizStartTime;
      const res = await api.post("/attempts", {
        quiz_id: parseInt(quizId),
        player_name: playerName,
        answers,
        time_taken_ms: totalTime,
      });
      navigate(`/result/${quizId}`, {
        state: {
          result: res.data,
          playerName,
          quizTitle: quiz.title,
          questions,
          answers,
        },
      });
    } catch {
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionStyle = (optNum, correctOption) => {
    if (!revealed) {
      return selectedOption === optNum ? s.optionSelected : s.option;
    }
    if (optNum === correctOption) return { ...s.option, ...s.optionCorrect };
    if (optNum === selectedOption && optNum !== correctOption)
      return { ...s.option, ...s.optionWrong };
    return { ...s.option, ...s.optionDim };
  };

  const timerPercent = quiz ? (timeLeft / quiz.time_per_question) * 100 : 100;
  const timerColor =
    timerPercent > 50 ? "#f5a623" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  if (loading)
    return (
      <div style={s.centered}>
        <div style={s.loadingDot} />
        <p style={{ color: "#888", fontSize: "0.85rem" }}>Loading quiz...</p>
      </div>
    );

  // Name entry screen
  if (!nameSubmitted)
    return (
      <div style={s.page}>
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.nameCard}>
            <div style={s.nameLogo}>
              <div style={s.logoDot} />
              <span style={s.logoText}>QUIZLIVE</span>
            </div>
            <div style={s.quizBadge}>
              {quiz?.genre} · {quiz?.difficulty}
            </div>
            <h1 style={s.quizTitle}>{quiz?.title}</h1>
            <p style={s.quizMeta}>
              {questions.length} questions · {quiz?.time_per_question}s per
              question
            </p>
            <div style={s.nameInputBlock}>
              <label style={s.nameLabel}>YOUR NAME</label>
              <input
                style={s.nameInput}
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartQuiz()}
                autoFocus
              />
            </div>
            <button
              style={{
                ...s.startBtn,
                ...(playerName.trim().length < 2 ? s.startBtnDisabled : {}),
              }}
              onClick={handleStartQuiz}
              disabled={playerName.trim().length < 2}
            >
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    );

  const currentQ = questions[currentIndex];
  const options = (
    typeof currentQ.options === "string"
      ? JSON.parse(currentQ.options)
      : currentQ.options
  ).sort((a, b) => a.option_number - b.option_number);
  const correctOption = options.find((o) => o.is_correct)?.option_number;
  const isCorrect = selectedOption === correctOption;

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <div style={s.quizContainer}>
        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QUIZLIVE</span>
          </div>
          <div style={s.progress}>
            {questions.map((_, i) => (
              <div
                key={i}
                style={{
                  ...s.progressDot,
                  ...(i < currentIndex
                    ? s.progressDone
                    : i === currentIndex
                      ? s.progressActive
                      : {}),
                }}
              />
            ))}
          </div>
          <div style={s.questionCount}>
            {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {/* Timer bar */}
        <div style={s.timerBar}>
          <div
            style={{
              ...s.timerFill,
              width: `${timerPercent}%`,
              background: timerColor,
              transition: "width 1s linear, background 0.3s",
            }}
          />
        </div>

        {/* Timer + player */}
        <div style={s.timerRow}>
          <span style={s.playerTag}>👤 {playerName}</span>
          <div
            style={{
              ...s.timerBadge,
              color: timerColor,
              borderColor: timerColor,
            }}
          >
            {timeLeft}s
          </div>
        </div>

        {/* Question */}
        <div style={s.questionCard}>
          <div style={s.questionMeta}>
            <span style={s.genreTag}>{currentQ.genre}</span>
            <span style={s.pointsTag}>{currentQ.base_points} pts</span>
          </div>
          <h2 style={s.questionText}>{currentQ.question_text}</h2>
        </div>
        {/* Anti-cheat warning */}
        {warningMsg && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              padding: "0.7rem 1rem",
              color: "#ef4444",
              fontSize: "0.8rem",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {warningMsg}
          </div>
        )}
        {/* Options */}
        <div style={s.optionsGrid}>
          {options.map((opt) => (
            <button
              key={opt.option_number}
              style={getOptionStyle(opt.option_number, correctOption)}
              onClick={() => handleOptionSelect(opt.option_number)}
              disabled={revealed}
            >
              <span style={s.optionLetter}>
                {["A", "B", "C", "D"][opt.option_number - 1]}
              </span>
              <span style={s.optionText}>{opt.option_text}</span>
              {revealed && opt.option_number === correctOption && (
                <span style={s.correctMark}>✓</span>
              )}
              {revealed &&
                opt.option_number === selectedOption &&
                opt.option_number !== correctOption && (
                  <span style={s.wrongMark}>✗</span>
                )}
            </button>
          ))}
        </div>

        {/* Feedback + Next */}
        {revealed && (
          <div style={s.feedbackRow}>
            <div
              style={{
                ...s.feedbackBadge,
                ...(selectedOption === null
                  ? s.feedbackTimeout
                  : isCorrect
                    ? s.feedbackCorrect
                    : s.feedbackWrong),
              }}
            >
              {selectedOption === null
                ? "⏱ Time's up!"
                : isCorrect
                  ? "✓ Correct!"
                  : "✗ Wrong"}
            </div>
            <button
              style={{ ...s.nextBtn, ...(submitting ? { opacity: 0.6 } : {}) }}
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : currentIndex + 1 === questions.length
                  ? "See Results →"
                  : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#e8e0d0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  blob1: {
    position: "fixed",
    top: "-150px",
    left: "-100px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blob2: {
    position: "fixed",
    bottom: "-150px",
    right: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.05) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: "1rem",
    position: "relative",
    zIndex: 1,
  },
  loadingDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 12px rgba(245,166,35,0.8)",
  },

  // Name card
  nameCard: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "440px",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    boxShadow: "0 0 60px rgba(245,166,35,0.04)",
  },
  nameLogo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 8px rgba(245,166,35,0.7)",
  },
  logoText: {
    fontSize: "0.75rem",
    fontWeight: "800",
    letterSpacing: "0.2em",
    color: "#e8e0d0",
  },
  quizBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.25rem 0.7rem",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "capitalize",
    width: "fit-content",
  },
  quizTitle: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#f0e8d8",
    lineHeight: "1.2",
  },
  quizMeta: { fontSize: "0.78rem", color: "#888" },
  nameInputBlock: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  nameLabel: {
    fontSize: "0.63rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  nameInput: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #f5a623",
    color: "#f0e8d8",
    fontSize: "1.1rem",
    fontWeight: "600",
    padding: "0.4rem 0",
    outline: "none",
    caretColor: "#f5a623",
  },
  startBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.9rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "800",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 4px 20px rgba(245,166,35,0.25)",
  },
  startBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },

  // Quiz container
  quizContainer: {
    width: "100%",
    maxWidth: "680px",
    padding: "1.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    position: "relative",
    zIndex: 1,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLeft: { display: "flex", alignItems: "center", gap: "0.5rem" },
  progress: { display: "flex", gap: "0.3rem", alignItems: "center" },
  progressDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#222",
    transition: "all 0.3s",
  },
  progressDone: { background: "#f5a623", opacity: 0.5 },
  progressActive: {
    background: "#f5a623",
    width: "20px",
    borderRadius: "4px",
    boxShadow: "0 0 8px rgba(245,166,35,0.5)",
  },
  questionCount: { fontSize: "0.78rem", color: "#888", fontWeight: "700" },

  // Timer
  timerBar: {
    width: "100%",
    height: "4px",
    background: "#1a1a1a",
    borderRadius: "999px",
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: "999px" },
  timerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerTag: { fontSize: "0.75rem", color: "#888", fontWeight: "600" },
  timerBadge: {
    fontSize: "0.85rem",
    fontWeight: "800",
    border: "1px solid",
    borderRadius: "8px",
    padding: "0.25rem 0.7rem",
    transition: "color 0.3s, border-color 0.3s",
  },

  // Question
  questionCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "1.5rem",
  },
  questionMeta: { display: "flex", gap: "0.5rem", marginBottom: "0.8rem" },
  genreTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  pointsTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    background: "#141414",
    border: "1px solid #222",
    color: "#888",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  questionText: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#f0e8d8",
    lineHeight: "1.5",
  },

  // Options
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.8rem",
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "1rem",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
    width: "100%",
    color: "#e8e0d0",
  },
  optionSelected: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.4)",
    borderRadius: "10px",
    padding: "1rem",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    color: "#f5a623",
  },
  optionCorrect: {
    background: "rgba(16,185,129,0.08)",
    border: "1px solid rgba(16,185,129,0.4)",
    color: "#10b981",
  },
  optionWrong: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#ef4444",
  },
  optionDim: {
    background: "#0a0a0a",
    border: "1px solid #141414",
    color: "#444",
  },
  optionLetter: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: "800",
    flexShrink: 0,
    color: "#888",
  },
  optionText: {
    flex: 1,
    fontSize: "0.85rem",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  correctMark: { color: "#10b981", fontWeight: "800", fontSize: "1rem" },
  wrongMark: { color: "#ef4444", fontWeight: "800", fontSize: "1rem" },

  // Feedback
  feedbackRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  feedbackBadge: {
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "800",
  },
  feedbackCorrect: {
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#10b981",
  },
  feedbackWrong: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444",
  },
  feedbackTimeout: {
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.3)",
    color: "#f5a623",
  },
  nextBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.7rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
    marginLeft: "auto",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },
};