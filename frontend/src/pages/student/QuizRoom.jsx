import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import useViewport from "../../hooks/useViewport";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function QuizRoom() {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isMobile } = useViewport();

  const playerNameFromUrl = searchParams.get("name");
  const storedPlayerName = sessionStorage.getItem("player_name");
  const playerName = useMemo(
    () => playerNameFromUrl || storedPlayerName || "Player",
    [playerNameFromUrl, storedPlayerName],
  );

  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const [status, setStatus] = useState("connecting");
  const [participantCount, setParticipantCount] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctOption, setCorrectOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      const participantId = sessionStorage.getItem("participant_id");
      if (participantId) {
        socket.emit("rejoin-room", {
          room_code: roomCode,
          participant_id: Number(participantId),
          name: sessionStorage.getItem("player_name") || playerName,
        });
        setStatus("waiting");
      } else {
        socket.emit("join-room", { room_code: roomCode, name: playerName });
      }
    });

    socket.on("joined-room", ({ participant_id, quiz_id, name }) => {
      setStatus("waiting");
      sessionStorage.setItem("participant_id", participant_id);
      sessionStorage.setItem("quiz_id", quiz_id);
      sessionStorage.setItem("player_name", name || playerName);
      sessionStorage.setItem("room_code", roomCode);
    });

    socket.on("participant-joined", ({ count, participants }) => {
      setParticipantCount(count);
      setParticipants(participants || []);
    });

    socket.on("quiz-started", () => setStatus("active"));

    socket.on("question-start", (question) => {
      setStatus("active");
      setPaused(false);
      setCurrentQuestion(question);
      setSelectedOption(null);
      setSubmitted(false);
      setCorrectOption(null);
      setTimeLeft(question.time_per_question || 0);
    });

    socket.on("answer-result", ({ total_score }) => {
      setScore(total_score || 0);
    });

    socket.on("question-end", ({ correct_option }) => {
      setCorrectOption(correct_option);
      setSubmitted(true);
    });

    socket.on("quiz-paused", () => setPaused(true));
    socket.on("quiz-resumed", () => setPaused(false));

    socket.on("quiz-end", ({ leaderboard }) => {
      const lb = leaderboard || [];
      const savedName = sessionStorage.getItem("player_name") || playerName;
      sessionStorage.clear();
      setFinalLeaderboard(lb);
      setCurrentQuestion(null);
      const myEntry = lb.find((e) => e.name === savedName);
      if (myEntry) setScore(myEntry.score);
      setStatus("ended");
    });

    socket.on("kicked", () => {
      setStatus("kicked");
      socket.disconnect();
    });

    socket.on("error", (err) => {
      // Don't overwrite ended/kicked status
      setStatus((prev) =>
        prev === "ended" || prev === "kicked" ? prev : "error",
      );
    });
    socket.on("connect_error", () => {
      setStatus((prev) =>
        prev === "ended" || prev === "kicked" ? prev : "error",
      );
    });
    socket.on("disconnect", () => {
      setStatus((prev) =>
        prev === "ended" || prev === "kicked" ? prev : "error",
      );
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [roomCode, playerName]);

  // Timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (status !== "active" || !currentQuestion || paused || timeLeft <= 0)
      return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, currentQuestion, paused]);

  const submitAnswer = () => {
    if (!currentQuestion || selectedOption == null || submitted) return;
    const totalTime = currentQuestion.time_per_question || 0;
    const response_time_ms = Math.max(totalTime - timeLeft, 0) * 1000;
    socketRef.current?.emit("submit-answer", {
      room_code: roomCode,
      question_id: currentQuestion.question_id,
      selected_option: selectedOption,
      response_time_ms,
    });
    setSubmitted(true);
  };

  const participantId = Number(sessionStorage.getItem("participant_id") || 0);
  const topFiveLeaderboard = finalLeaderboard.slice(0, 5);
  const myEntry =
    finalLeaderboard.find((e) => Number(e.participant_id) === participantId) ||
    finalLeaderboard.find((e) => e.name === playerName) ||
    null;
  const isQuestionVisible = status === "active" && currentQuestion;

  // ── Kicked ───────────────────────────────────────────────
  if (status === "kicked")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={{ ...s.centered, padding: isMobile ? "1rem" : "2rem" }}>
          <div style={{ ...s.card, padding: isMobile ? "1.25rem" : "2rem" }}>
            <div style={s.errorIcon}>🚫</div>
            <h2 style={s.cardTitle}>You've been removed</h2>
            <p style={s.cardSub}>The host removed you from this room.</p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );

  // ── Error ────────────────────────────────────────────────
  if (status === "error")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={{ ...s.centered, padding: isMobile ? "1rem" : "2rem" }}>
          <div style={{ ...s.card, padding: isMobile ? "1.25rem" : "2rem" }}>
            <div style={s.errorIcon}>❌</div>
            <h2 style={s.cardTitle}>Room not found</h2>
            <p style={s.cardSub}>
              Room <strong style={{ color: "#f5a623" }}>{roomCode}</strong>{" "}
              doesn't exist or quiz already started.
            </p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );

  // ── Ended ────────────────────────────────────────────────
  if (status === "ended")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={{ ...s.centered, padding: isMobile ? "1rem" : "2rem" }}>
          <div style={{ ...s.card, padding: isMobile ? "1.25rem" : "2rem" }}>
            <div style={s.logo}>
              <div style={s.logoDot} />
              <span style={s.logoText}>QURIO</span>
            </div>
            <h2 style={s.cardTitle}>Quiz Complete 🎉</h2>
            <p style={s.cardSub}>
              Final score:{" "}
              <strong style={{ color: "#f5a623" }}>{score} pts</strong>
            </p>

            {topFiveLeaderboard.length > 0 && (
              <>
                <p style={s.sectionTitle}>Top 5 Leaderboard</p>
                <div style={s.participantsList}>
                  {topFiveLeaderboard.map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.name}`}
                      style={{
                        ...s.participantChip,
                        ...(entry.name === playerName
                          ? s.participantChipMe
                          : {}),
                      }}
                    >
                      <span style={s.chipName}>
                        {entry.rank === 1
                          ? "🥇"
                          : entry.rank === 2
                            ? "🥈"
                            : entry.rank === 3
                              ? "🥉"
                              : `#${entry.rank}`}{" "}
                        {entry.name}
                        {entry.name === playerName ? " (you)" : ""}
                      </span>
                      <span style={s.chipScore}>{entry.score} pts</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {myEntry &&
              !topFiveLeaderboard.find((e) => e.name === playerName) && (
                <div style={s.myRankCard}>
                  <div style={s.myRankLabel}>Your Rank</div>
                  <div style={s.myRankValue}>#{myEntry.rank}</div>
                  <div style={s.myRankSub}>
                    {myEntry.name} · {myEntry.score} pts
                  </div>
                </div>
              )}

            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );

  // ── Main ─────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />
      <div style={{ ...s.centered, padding: isMobile ? "1rem" : "2rem" }}>
        <div style={{ ...s.card, padding: isMobile ? "1.25rem" : "2rem" }}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QURIO</span>
          </div>

          <div
            style={{
              ...s.roomBadge,
              fontSize: isMobile ? "1rem" : "1.4rem",
              letterSpacing: isMobile ? "0.18em" : "0.3em",
            }}
          >
            {roomCode}
          </div>
          <div style={s.scoreTag}>⭐ {score} pts</div>

          {!isQuestionVisible ? (
            <>
              <div
                style={{
                  ...s.playerInfo,
                  alignItems: isMobile ? "flex-start" : "center",
                }}
              >
                <div style={s.playerAvatar}>{playerName[0]?.toUpperCase()}</div>
                <div>
                  <div style={s.playerName}>{playerName}</div>
                  <div style={s.playerStatus}>
                    {status === "connecting"
                      ? "Connecting..."
                      : "You're in! Waiting for host..."}
                  </div>
                </div>
              </div>

              <div style={s.waitingIndicator}>
                <div style={s.dot1} />
                <div style={s.dot2} />
                <div style={s.dot3} />
              </div>

              <p style={s.waitingText}>
                {participantCount > 0
                  ? `${participantCount} player${participantCount === 1 ? "" : "s"} in the room`
                  : "Waiting for others to join..."}
              </p>

              {participants.length > 0 && (
                <div style={s.participantsList}>
                  {participants.map((p) => (
                    <div key={p.participant_id} style={s.participantChip}>
                      <span style={s.chipAvatar}>
                        {p.name[0].toUpperCase()}
                      </span>
                      <span style={s.chipName}>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={s.timerBar}>
                <div
                  style={{
                    ...s.timerFill,
                    width: `${(timeLeft / currentQuestion.time_per_question) * 100}%`,
                    background:
                      timeLeft > currentQuestion.time_per_question * 0.5
                        ? "#f5a623"
                        : timeLeft > currentQuestion.time_per_question * 0.25
                          ? "#f59e0b"
                          : "#ef4444",
                    transition: "width 1s linear",
                  }}
                />
              </div>

              <div
                style={{
                  ...s.questionHeader,
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? "0.35rem" : 0,
                }}
              >
                <span style={{ color: "#f5a623", fontWeight: "700" }}>
                  Q{currentQuestion.index + 1}/{currentQuestion.total}
                </span>
                <span
                  style={{
                    color: timeLeft <= 5 ? "#ef4444" : "#888",
                    fontWeight: "800",
                  }}
                >
                  {paused ? "⏸ Paused" : `${timeLeft}s`}
                </span>
              </div>

              <h2 style={s.cardTitle}>{currentQuestion.question_text}</h2>

              <div
                style={{
                  ...s.optionsGrid,
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                }}
              >
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt.option_number;
                  const isCorrect = correctOption === opt.option_number;
                  const isWrong = submitted && isSelected && !isCorrect;
                  return (
                    <button
                      key={opt.option_number}
                      style={{
                        ...s.optionBtn,
                        ...(isSelected && !submitted ? s.optionSelected : {}),
                        ...(correctOption != null && isCorrect
                          ? s.optionCorrect
                          : {}),
                        ...(isWrong ? s.optionWrong : {}),
                      }}
                      onClick={() =>
                        !submitted &&
                        !paused &&
                        setSelectedOption(opt.option_number)
                      }
                      disabled={submitted || paused}
                    >
                      <span style={s.optLetter}>
                        {["A", "B", "C", "D"][opt.option_number - 1]}
                      </span>
                      <span style={s.optText}>{opt.option_text}</span>
                    </button>
                  );
                })}
              </div>

              {!submitted ? (
                <button
                  style={{
                    ...s.homeBtn,
                    ...(selectedOption == null || paused
                      ? { opacity: 0.4, cursor: "not-allowed" }
                      : {}),
                  }}
                  onClick={submitAnswer}
                  disabled={submitted || selectedOption == null || paused}
                >
                  Submit Answer →
                </button>
              ) : (
                <div style={s.submittedBadge}>
                  ✓ Answer submitted — waiting for next question
                </div>
              )}
            </>
          )}

          <p style={s.startHint}>
            The quiz moves automatically to the next question
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
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
  blob: {
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
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "560px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "center",
    boxShadow: "0 0 60px rgba(245,166,35,0.04)",
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
  roomBadge: {
    fontSize: "1.4rem",
    fontWeight: "900",
    letterSpacing: "0.3em",
    color: "#f5a623",
    fontFamily: "'JetBrains Mono', monospace",
    background: "#111",
    border: "1px solid #2a2a2a",
    padding: "0.4rem 1rem",
    borderRadius: "8px",
  },
  scoreTag: { fontSize: "0.82rem", fontWeight: "800", color: "#f5a623" },
  playerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    padding: "0.8rem 1rem",
    borderRadius: "10px",
    background: "#141414",
    border: "1px solid #222",
    width: "100%",
  },
  playerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.3)",
    color: "#f5a623",
    display: "grid",
    placeItems: "center",
    fontWeight: "700",
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  playerName: {
    fontWeight: "700",
    color: "#f2e7d1",
    fontSize: "0.92rem",
    textAlign: "left",
  },
  playerStatus: { fontSize: "0.75rem", color: "#888", textAlign: "left" },
  waitingIndicator: { display: "flex", gap: "0.4rem", alignItems: "center" },
  dot1: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s infinite ease-in-out both",
    animationDelay: "-0.32s",
  },
  dot2: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s infinite ease-in-out both",
    animationDelay: "-0.16s",
  },
  dot3: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s infinite ease-in-out both",
  },
  waitingText: { fontSize: "0.82rem", color: "#888" },
  participantsList: {
    width: "100%",
    maxHeight: "200px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  participantChip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.6rem",
    padding: "0.5rem 0.8rem",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    background: "#141414",
  },
  participantChipMe: {
    border: "1px solid rgba(245,166,35,0.3)",
    background: "rgba(245,166,35,0.04)",
  },
  chipAvatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    color: "#f5a623",
    display: "grid",
    placeItems: "center",
    fontSize: "0.7rem",
    fontWeight: "800",
    flexShrink: 0,
  },
  chipName: {
    fontSize: "0.8rem",
    color: "#d7cfbf",
    flex: 1,
    textAlign: "left",
  },
  chipScore: { fontSize: "0.8rem", fontWeight: "800", color: "#f5a623" },
  timerBar: {
    width: "100%",
    height: "4px",
    background: "#1a1a1a",
    borderRadius: "999px",
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: "999px" },
  questionHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.82rem",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#f6efdf",
    margin: 0,
    lineHeight: 1.5,
  },
  cardSub: { fontSize: "0.85rem", color: "#888", lineHeight: 1.6, margin: 0 },
  optionsGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.6rem",
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    width: "100%",
    background: "#141414",
    color: "#e8e0d0",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.75rem 0.8rem",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  optionSelected: {
    border: "1px solid rgba(245,166,35,0.5)",
    background: "rgba(245,166,35,0.07)",
  },
  optionCorrect: {
    border: "1px solid rgba(16,185,129,0.5)",
    background: "rgba(16,185,129,0.07)",
    color: "#10b981",
  },
  optionWrong: {
    border: "1px solid rgba(239,68,68,0.5)",
    background: "rgba(239,68,68,0.07)",
    color: "#ef4444",
  },
  optLetter: {
    width: "24px",
    height: "24px",
    borderRadius: "5px",
    background: "#1e1e1e",
    display: "grid",
    placeItems: "center",
    fontSize: "0.72rem",
    fontWeight: "800",
    color: "#888",
    flexShrink: 0,
  },
  optText: { fontSize: "0.82rem", fontWeight: "600", lineHeight: 1.4 },
  submittedBadge: {
    background: "rgba(16,185,129,0.08)",
    border: "1px solid rgba(16,185,129,0.25)",
    color: "#10b981",
    borderRadius: "8px",
    padding: "0.6rem 1rem",
    fontSize: "0.8rem",
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "0.72rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    margin: "0.25rem 0",
  },
  myRankCard: {
    width: "100%",
    border: "1px solid rgba(245,166,35,0.2)",
    background: "rgba(245,166,35,0.04)",
    borderRadius: "10px",
    padding: "0.85rem",
  },
  myRankLabel: {
    fontSize: "0.68rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  myRankValue: { fontSize: "1.4rem", color: "#f5a623", fontWeight: "900" },
  myRankSub: { fontSize: "0.8rem", color: "#d7cfbf" },
  errorIcon: { fontSize: "2rem" },
  startHint: { fontSize: "0.68rem", color: "#555" },
  homeBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    color: "#080808",
    border: "none",
    borderRadius: "8px",
    padding: "0.7rem 1.5rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
    width: "100%",
  },
};
