import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function FinalLeaderboard() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { state } = useLocation();

  const leaderboard = state?.leaderboard || [];
  const isHost = Boolean(state?.isHost);
  const playerName = state?.playerName || "";
  const quizTitle = state?.quizTitle || "Live Quiz";
  const score = state?.score ?? null;

  const myEntry =
    leaderboard.find((entry) => entry.name === playerName) || null;

  if (!leaderboard.length) {
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <div style={s.logo}>
              <div style={s.logoDot} />
              <span style={s.logoText}>QURIO</span>
            </div>
            <h1 style={s.title}>Leaderboard unavailable</h1>
            <p style={s.subtitle}>
              No leaderboard payload was found for room {roomCode}.
            </p>
            <button
              style={s.primaryBtn}
              onClick={() => navigate(isHost ? "/admin" : "/")}
            >
              {isHost ? "Back to Dashboard" : "Back to Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />
      <div style={s.centered}>
        <div style={s.card}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QURIO</span>
          </div>

          <div style={s.roomBadge}>{roomCode}</div>
          <h1 style={s.title}>{quizTitle}</h1>
          <p style={s.subtitle}>
            {isHost ? "Final host leaderboard" : "Final live leaderboard"}
          </p>

          {score != null && !isHost && (
            <div style={s.scorePill}>Your score: {score} pts</div>
          )}

          <div style={s.board}>
            {leaderboard.map((entry, index) => (
              <div
                key={`${entry.rank || index}-${entry.name}`}
                style={{
                  ...s.row,
                  ...(entry.name === playerName ? s.rowMe : {}),
                }}
              >
                <div style={s.rankCell}>
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : `#${entry.rank || index + 1}`}
                </div>
                <div style={s.nameCell}>
                  {entry.name}
                  {entry.name === playerName && !isHost ? " (you)" : ""}
                </div>
                <div style={s.scoreCell}>{entry.score} pts</div>
              </div>
            ))}
          </div>

          {myEntry && !isHost && (
            <div style={s.myRankBox}>
              <div style={s.myRankLabel}>Your final rank</div>
              <div style={s.myRankValue}>#{myEntry.rank}</div>
            </div>
          )}

          <button
            style={s.primaryBtn}
            onClick={() => navigate(isHost ? "/admin" : "/")}
          >
            {isHost ? "Back to Dashboard" : "Back to Home"}
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
    color: "#f0e8d8",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "fixed",
    top: "-150px",
    right: "-120px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  },
  card: {
    width: "100%",
    maxWidth: "700px",
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "18px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    boxShadow: "0 0 60px rgba(245,166,35,0.05)",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 10px rgba(245,166,35,0.7)",
  },
  logoText: {
    fontSize: "0.8rem",
    fontWeight: "800",
    letterSpacing: "0.2em",
  },
  roomBadge: {
    width: "fit-content",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: "800",
    letterSpacing: "0.2em",
    color: "#f5a623",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "999px",
    padding: "0.4rem 0.9rem",
  },
  title: { fontSize: "1.6rem", fontWeight: "800", margin: 0 },
  subtitle: { color: "#888", margin: 0 },
  scorePill: {
    width: "fit-content",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    borderRadius: "10px",
    padding: "0.55rem 0.8rem",
    fontWeight: "700",
  },
  board: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    marginTop: "0.5rem",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "80px 1fr auto",
    alignItems: "center",
    gap: "1rem",
    background: "#141414",
    border: "1px solid #1f1f1f",
    borderRadius: "12px",
    padding: "0.9rem 1rem",
  },
  rowMe: {
    border: "1px solid rgba(245,166,35,0.35)",
    background: "rgba(245,166,35,0.05)",
  },
  rankCell: {
    fontSize: "0.95rem",
    fontWeight: "800",
    color: "#f5a623",
    textAlign: "center",
  },
  nameCell: {
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "#f0e8d8",
  },
  scoreCell: {
    fontSize: "0.9rem",
    fontWeight: "800",
    color: "#f5a623",
  },
  myRankBox: {
    marginTop: "0.5rem",
    background: "rgba(245,166,35,0.05)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "12px",
    padding: "1rem",
  },
  myRankLabel: {
    fontSize: "0.72rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  myRankValue: {
    fontSize: "1.6rem",
    fontWeight: "900",
    color: "#f5a623",
    marginTop: "0.3rem",
  },
  primaryBtn: {
    marginTop: "0.5rem",
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.9rem 1.2rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: "800",
    cursor: "pointer",
  },
};
