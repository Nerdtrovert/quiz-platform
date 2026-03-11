import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../utils/api";

export default function Result() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const result = state?.result;
  const playerName = state?.playerName;
  const quizTitle = state?.quizTitle;
  const questions = state?.questions || [];
  const answers = state?.answers || [];

  useEffect(() => {
    if (!result) navigate("/");
  }, [result]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/attempts/leaderboard/${quizId}`);
      setLeaderboard(res.data.leaderboard);
      setShowLeaderboard(true);
    } catch {
      alert("Failed to load leaderboard");
    }
  };

  if (!result) return null;

  const accuracy = Math.round(
    (result.correct_count / result.total_questions) * 100,
  );
  const grade =
    accuracy >= 90
      ? { label: "Outstanding!", color: "#f5a623" }
      : accuracy >= 70
        ? { label: "Great job!", color: "#10b981" }
        : accuracy >= 50
          ? { label: "Not bad!", color: "#3b82f6" }
          : { label: "Keep practicing!", color: "#ef4444" };

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QUIZLIVE</span>
          </div>
          <button style={s.homeBtn} onClick={() => navigate("/")}>
            ← Home
          </button>
        </div>

        {/* Result card */}
        <div style={s.resultCard}>
          <div style={s.gradeLabel}>{grade.label}</div>
          <h1 style={s.quizTitle}>{quizTitle}</h1>
          <p style={s.playerName}>👤 {playerName}</p>

          {/* Score big */}
          <div style={s.scoreBig}>
            <span style={s.scoreVal}>{result.total_points}</span>
            <span style={s.scoreSub}>points</span>
          </div>

          {/* Rank */}
          <div style={s.rankBadge}>🏆 Rank #{result.final_rank}</div>

          {/* Stats row */}
          <div style={s.statsRow}>
            {[
              {
                label: "Correct",
                value: result.correct_count,
                color: "#10b981",
              },
              { label: "Wrong", value: result.wrong_count, color: "#ef4444" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#f5a623" },
              {
                label: "Total Qs",
                value: result.total_questions,
                color: "#888",
              },
            ].map((stat, i) => (
              <div key={i} style={s.statItem}>
                <span style={{ ...s.statVal, color: stat.color }}>
                  {stat.value}
                </span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answer review */}
        <div style={s.reviewSection}>
          <h2 style={s.reviewTitle}>Answer Review</h2>
          <div style={s.reviewList}>
            {questions.map((q, i) => {
              const ans = answers[i];
              const options = (
                typeof q.options === "string"
                  ? JSON.parse(q.options)
                  : q.options
              ).sort((a, b) => a.option_number - b.option_number);
              const correctOpt = options.find((o) => o.is_correct);
              const scoredAns = result.scored_answers?.[i];
              const isCorrect = scoredAns?.is_correct;

              return (
                <div key={q.question_id} style={s.reviewCard}>
                  <div style={s.reviewTop}>
                    <span style={s.reviewNum}>Q{i + 1}</span>
                    <span
                      style={{
                        ...s.reviewBadge,
                        ...(isCorrect ? s.reviewCorrect : s.reviewWrong),
                      }}
                    >
                      {isCorrect
                        ? "✓ Correct"
                        : ans?.selected_option
                          ? "✗ Wrong"
                          : "⏱ Skipped"}
                    </span>
                    {isCorrect && (
                      <span style={s.reviewPoints}>
                        +{scoredAns?.points} pts
                      </span>
                    )}
                  </div>
                  <p style={s.reviewQuestion}>{q.question_text}</p>
                  <div style={s.reviewOptions}>
                    {options.map((opt) => (
                      <div
                        key={opt.option_number}
                        style={{
                          ...s.reviewOption,
                          ...(opt.is_correct
                            ? s.reviewOptionCorrect
                            : opt.option_number === ans?.selected_option &&
                                !opt.is_correct
                              ? s.reviewOptionWrong
                              : {}),
                        }}
                      >
                        <span style={s.reviewOptLetter}>
                          {["A", "B", "C", "D"][opt.option_number - 1]}
                        </span>
                        <span style={s.reviewOptText}>{opt.option_text}</span>
                        {opt.is_correct && (
                          <span style={{ color: "#10b981", fontWeight: "800" }}>
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={s.lbSection}>
          {!showLeaderboard ? (
            <button style={s.lbBtn} onClick={fetchLeaderboard}>
              🏆 View Leaderboard
            </button>
          ) : (
            <div style={s.lbCard}>
              <h2 style={s.reviewTitle}>Leaderboard</h2>
              <div style={s.lbList}>
                {leaderboard.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      ...s.lbRow,
                      ...(entry.player_name === playerName
                        ? s.lbRowHighlight
                        : {}),
                    }}
                  >
                    <span style={s.lbRank}>
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${i + 1}`}
                    </span>
                    <span style={s.lbName}>{entry.player_name}</span>
                    <span style={s.lbCorrect}>
                      {entry.correct_count}/{result.total_questions} correct
                    </span>
                    <span style={s.lbPoints}>{entry.total_points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button
            style={s.retryBtn}
            onClick={() => navigate(`/quiz/${quizId}`)}
          >
            Try Again
          </button>
          <button style={s.homeActionBtn} onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
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
  container: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
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
  homeBtn: {
    background: "transparent",
    border: "1px solid #222",
    color: "#777",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    fontSize: "0.78rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  // Result card
  resultCard: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "2.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    textAlign: "center",
    boxShadow: "0 0 60px rgba(245,166,35,0.04)",
  },
  gradeLabel: {
    fontSize: "0.78rem",
    fontWeight: "800",
    color: "#f5a623",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  quizTitle: { fontSize: "1.3rem", fontWeight: "800", color: "#f0e8d8" },
  playerName: { fontSize: "0.82rem", color: "#888" },
  scoreBig: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    margin: "0.5rem 0",
  },
  scoreVal: {
    fontSize: "4rem",
    fontWeight: "900",
    color: "#f5a623",
    lineHeight: "1",
    letterSpacing: "-0.03em",
  },
  scoreSub: {
    fontSize: "0.78rem",
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  rankBadge: {
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.25)",
    color: "#f5a623",
    padding: "0.4rem 1.2rem",
    borderRadius: "999px",
    fontSize: "0.82rem",
    fontWeight: "800",
  },
  statsRow: {
    display: "flex",
    gap: "0",
    width: "100%",
    marginTop: "0.5rem",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    padding: "1rem",
    borderRight: "1px solid #1e1e1e",
  },
  statVal: { fontSize: "1.4rem", fontWeight: "800", letterSpacing: "-0.02em" },
  statLabel: {
    fontSize: "0.65rem",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  // Review
  reviewSection: { marginBottom: "1.5rem" },
  reviewTitle: {
    fontSize: "1rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "1rem",
  },
  reviewList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  reviewCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.2rem",
  },
  reviewTop: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "0.7rem",
  },
  reviewNum: { fontSize: "0.65rem", color: "#666", fontWeight: "700" },
  reviewBadge: {
    fontSize: "0.68rem",
    fontWeight: "800",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  reviewCorrect: {
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.2)",
    color: "#10b981",
  },
  reviewWrong: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "#ef4444",
  },
  reviewPoints: {
    fontSize: "0.68rem",
    color: "#f5a623",
    fontWeight: "800",
    marginLeft: "auto",
  },
  reviewQuestion: {
    fontSize: "0.88rem",
    color: "#f0e8d8",
    fontWeight: "600",
    marginBottom: "0.8rem",
    lineHeight: "1.4",
  },
  reviewOptions: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  reviewOption: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "0.5rem 0.8rem",
  },
  reviewOptionCorrect: {
    border: "1px solid rgba(16,185,129,0.3)",
    background: "rgba(16,185,129,0.05)",
  },
  reviewOptionWrong: {
    border: "1px solid rgba(239,68,68,0.3)",
    background: "rgba(239,68,68,0.05)",
  },
  reviewOptLetter: {
    width: "22px",
    height: "22px",
    borderRadius: "4px",
    background: "#1e1e1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    fontWeight: "800",
    color: "#888",
    flexShrink: 0,
  },
  reviewOptText: { flex: 1, fontSize: "0.78rem", color: "#e8e0d0" },

  // Leaderboard
  lbSection: { marginBottom: "1.5rem" },
  lbBtn: {
    background: "transparent",
    border: "1px solid rgba(245,166,35,0.3)",
    color: "#f5a623",
    padding: "0.8rem 2rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
  },
  lbCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  lbList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  lbRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    padding: "0.8rem 1rem",
  },
  lbRowHighlight: {
    border: "1px solid rgba(245,166,35,0.3)",
    background: "rgba(245,166,35,0.04)",
  },
  lbRank: { fontSize: "0.9rem", width: "28px", textAlign: "center" },
  lbName: { flex: 1, fontSize: "0.85rem", fontWeight: "700", color: "#f0e8d8" },
  lbCorrect: { fontSize: "0.72rem", color: "#888" },
  lbPoints: { fontSize: "0.85rem", fontWeight: "800", color: "#f5a623" },

  // Actions
  actions: { display: "flex", gap: "1rem" },
  retryBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid #222",
    color: "#e8e0d0",
    padding: "0.85rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  homeActionBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.85rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },
};
