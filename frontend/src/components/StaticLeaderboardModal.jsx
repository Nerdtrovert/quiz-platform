import { useState, useEffect } from "react";
import api from "../utils/api";

export default function StaticLeaderboardModal({
  isOpen,
  onClose,
  quizId,
  onEntryDeleted,
}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingAttemptId, setDeletingAttemptId] = useState(null);

  useEffect(() => {
    if (isOpen && quizId) {
      fetchLeaderboard();
    }
  }, [isOpen, quizId]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/admin/system/static-quizzes/${quizId}/leaderboard`,
      );
      setLeaderboard(res.data.leaderboard || []);
      setQuiz(res.data.quiz);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(err.response?.data?.message || "Error loading leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const handleDeleteEntry = async (attemptId, playerName) => {
    if (!window.confirm(`Delete ${playerName}'s leaderboard entry?`)) {
      return;
    }
    setError("");
    setDeletingAttemptId(attemptId);
    try {
      await api.delete(`/admin/system/static-attempts/${attemptId}`);
      await fetchLeaderboard();
      onEntryDeleted?.();
    } catch (err) {
      console.error("Error deleting leaderboard entry:", err);
      setError(err.response?.data?.message || "Error deleting leaderboard entry");
    } finally {
      setDeletingAttemptId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>
              {quiz ? `${quiz.title} - Leaderboard` : "Loading..."}
            </h2>
            {quiz && (
              <p style={s.subtitle}>
                {quiz.genre} · {quiz.difficulty} · {quiz.num_questions} questions
              </p>
            )}
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {isLoading ? (
          <div style={s.loading}>Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div style={s.empty}>No attempts yet. Be the first to play!</div>
        ) : (
          <div style={s.tableWrapper}>
            <div style={s.table}>
              <div style={s.tableHeader}>
                <div style={s.colRank}>Rank</div>
                <div style={s.colName}>Player</div>
                <div style={s.colScore}>Score</div>
                <div style={s.colCorrect}>Correct</div>
                <div style={s.colTime}>Time</div>
                <div style={s.colDate}>Completed</div>
                <div style={s.colActions}>Actions</div>
              </div>

              {leaderboard.map((entry, index) => (
                <div
                  key={entry.attempt_id}
                  style={{
                    ...s.tableRow,
                    background:
                      index === 0
                        ? "rgba(251, 191, 36, 0.1)"
                        : index === 1
                          ? "rgba(192, 192, 192, 0.1)"
                          : index === 2
                            ? "rgba(205, 127, 50, 0.1)"
                            : "transparent",
                    borderLeft:
                      index === 0
                        ? "3px solid #fbbf24"
                        : index === 1
                          ? "3px solid #c0c0c0"
                          : index === 2
                            ? "3px solid #cd7f32"
                            : "3px solid transparent",
                  }}
                >
                  <div style={s.colRank}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : entry.final_rank}
                  </div>
                  <div style={s.colName}>{entry.player_name}</div>
                  <div style={s.colScore}>{entry.total_points} pts</div>
                  <div style={s.colCorrect}>
                    {entry.correct_count}/{quiz?.num_questions}
                  </div>
                  <div style={s.colTime}>{formatTime(entry.time_taken_ms)}</div>
                  <div style={s.colDate}>
                    {new Date(entry.completed_at).toLocaleDateString()}
                  </div>
                  <div style={s.colActions}>
                    <button
                      style={s.deleteBtn}
                      onClick={() =>
                        handleDeleteEntry(entry.attempt_id, entry.player_name)
                      }
                      disabled={deletingAttemptId === entry.attempt_id}
                    >
                      {deletingAttemptId === entry.attempt_id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.footer}>
          <button style={s.closeActionBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#0f0c0c",
    border: "1px solid #241d1b",
    borderRadius: "18px",
    padding: "2rem",
    maxWidth: "900px",
    width: "90%",
    maxHeight: "85vh",
    overflowY: "auto",
    color: "#f6ead7",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 800,
  },
  subtitle: {
    margin: "0.5rem 0 0 0",
    fontSize: "0.85rem",
    color: "#91847a",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#f6ead7",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  error: {
    background: "rgba(239,68,68,0.2)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  loading: {
    padding: "2rem",
    textAlign: "center",
    color: "#91847a",
  },
  empty: {
    padding: "2rem",
    textAlign: "center",
    color: "#8f8177",
    background: "#161111",
    borderRadius: "12px",
    marginBottom: "1rem",
  },
  tableWrapper: {
    overflowX: "auto",
    marginBottom: "1.5rem",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    minWidth: "100%",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 100px 100px 100px 120px 100px",
    gap: "1rem",
    padding: "0.9rem 1rem",
    background: "#1a1414",
    borderRadius: "12px",
    fontWeight: 800,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    color: "#978980",
    letterSpacing: "0.05em",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 100px 100px 100px 120px 100px",
    gap: "1rem",
    padding: "0.9rem 1rem",
    alignItems: "center",
    borderRadius: "12px",
    background: "#141010",
    transition: "background 0.2s",
  },
  colRank: {
    fontWeight: 800,
    fontSize: "0.95rem",
    textAlign: "center",
  },
  colName: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#f6ead7",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  colScore: {
    fontWeight: 800,
    fontSize: "0.95rem",
    color: "#fdba74",
    textAlign: "center",
  },
  colCorrect: {
    fontSize: "0.85rem",
    color: "#d0c4b8",
    textAlign: "center",
  },
  colTime: {
    fontSize: "0.85rem",
    color: "#d0c4b8",
    textAlign: "center",
  },
  colDate: {
    fontSize: "0.85rem",
    color: "#8f8177",
    textAlign: "center",
  },
  colActions: {
    textAlign: "center",
  },
  deleteBtn: {
    border: "1px solid rgba(248,113,113,0.35)",
    background: "transparent",
    color: "#fca5a5",
    borderRadius: "8px",
    padding: "0.4rem 0.7rem",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  footer: {
    display: "flex",
    gap: "0.8rem",
    justifyContent: "flex-end",
  },
  closeActionBtn: {
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "none",
    color: "#fff7ed",
    padding: "0.75rem 1.5rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
