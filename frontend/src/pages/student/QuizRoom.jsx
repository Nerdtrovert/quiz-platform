import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function QuizRoom() {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerNameFromUrl = searchParams.get("name");
  const storedPlayerName = sessionStorage.getItem("player_name");
  const playerName = useMemo(() => playerNameFromUrl || storedPlayerName || "Player", [playerNameFromUrl, storedPlayerName]);
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | waiting | active | ended | error | kicked
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
          name: playerName,
        });
        setStatus("waiting");
      } else {
        socket.emit("join-room", { room_code: roomCode, name: playerName });
      }
    });

    socket.on("joined-room", ({ participant_id, quiz_id }) => {
      setStatus("waiting");
      sessionStorage.setItem("participant_id", participant_id);
      sessionStorage.setItem("quiz_id", quiz_id);
      sessionStorage.setItem("player_name", playerName);
      sessionStorage.setItem("room_code", roomCode);
    });

    socket.on("participant-joined", ({ count, participants }) => {
      setParticipantCount(count);
      setParticipants(participants || []);
    });

    socket.on("quiz-started", () => {
      setStatus("active");
    });

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
      setStatus("ended");
      setFinalLeaderboard(leaderboard || []);
      setCurrentQuestion(null);
    });

    socket.on("kicked", () => {
      setStatus("kicked");
      socket.disconnect();
    });

    socket.on("error", () => {
      setStatus("error");
    });

    socket.on("connect_error", () => {
      setStatus("error");
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [roomCode, playerName]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (status !== "active" || !currentQuestion || paused || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
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

  if (status === "kicked") {
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
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
  }

  if (status === "error") {
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <div style={s.errorIcon}>❌</div>
            <h2 style={s.cardTitle}>Room not found</h2>
            <p style={s.cardSub}>
              The room code <strong style={{ color: "#f5a623" }}>{roomCode}</strong> doesn't
              exist or the quiz has already started.
            </p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Quiz Complete 🎉</h2>
            <p style={s.cardSub}>Final score: {score}</p>
            {finalLeaderboard.length > 0 && (
              <div style={s.participantsList}>
                {finalLeaderboard.map((entry) => (
                  <div key={`${entry.rank}-${entry.name}`} style={s.participantChip}>
                    <span style={s.chipName}>#{entry.rank} {entry.name}</span>
                    <span style={s.chipAvatar}>{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isQuestionVisible = status === "active" && currentQuestion;

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />
      <div style={s.centered}>
        <div style={s.card}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QUIZLIVE</span>
          </div>

          <div style={s.roomBadge}>{roomCode}</div>
          <div style={s.waitingText}>Score: {score}</div>

          {!isQuestionVisible ? (
            <>
              <div style={s.playerInfo}>
                <div style={s.playerAvatar}>{playerName[0]?.toUpperCase()}</div>
                <div>
                  <div style={s.playerName}>{playerName}</div>
                  <div style={s.playerStatus}>
                    {status === "connecting"
                      ? "Connecting..."
                      : "You're in! Waiting for host to start..."}
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
                      <span style={s.chipAvatar}>{p.name[0].toUpperCase()}</span>
                      <span style={s.chipName}>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={s.questionHeader}>
                <span>
                  Question {currentQuestion.index + 1} / {currentQuestion.total}
                </span>
                <span>{paused ? "Paused" : `${timeLeft}s`}</span>
              </div>
              <h2 style={s.cardTitle}>{currentQuestion.question_text}</h2>
              <div style={s.participantsList}>
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt.option_number;
                  const isCorrect = correctOption === opt.option_number;
                  return (
                    <button
                      key={opt.option_number}
                      style={{
                        ...s.optionBtn,
                        ...(isSelected ? s.optionSelected : {}),
                        ...(correctOption != null && isCorrect ? s.optionCorrect : {}),
                      }}
                      onClick={() => setSelectedOption(opt.option_number)}
                      disabled={submitted || paused}
                    >
                      <strong>{opt.option_number}.</strong> {opt.option_text}
                    </button>
                  );
                })}
              </div>
              <button
                style={{ ...s.homeBtn, ...(submitted ? { opacity: 0.55, cursor: "default" } : {}) }}
                onClick={submitAnswer}
                disabled={submitted || selectedOption == null || paused}
              >
                {submitted ? "Answer submitted" : "Submit Answer"}
              </button>
            </>
          )}

          <p style={s.startHint}>The quiz will move automatically to the next question</p>
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
    padding: "2.5rem",
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
    boxShadow: "0 0 16px #f5a62399",
  },
  logoText: {
    fontSize: "0.8rem",
    letterSpacing: "0.22em",
    fontWeight: "700",
    color: "#f5a623",
  },
  roomBadge: {
    fontSize: "1.8rem",
    fontWeight: "800",
    letterSpacing: "0.12em",
    color: "#f5a623",
    fontFamily: "'Courier New', monospace",
    background: "#111",
    border: "1px solid #2a2a2a",
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
  },
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
    background: "linear-gradient(135deg, #f5a623, #d88d1b)",
    color: "#000",
    display: "grid",
    placeItems: "center",
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  playerName: { fontWeight: "700", color: "#f2e7d1", fontSize: "0.92rem", textAlign: "left" },
  playerStatus: { fontSize: "0.78rem", color: "#9a9a9a", marginTop: "0.12rem", textAlign: "left" },
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
  waitingText: { fontSize: "0.85rem", color: "#888" },
  participantsList: {
    width: "100%",
    maxHeight: "160px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  participantChip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.6rem",
    padding: "0.5rem 0.7rem",
    border: "1px solid #242424",
    borderRadius: "8px",
    background: "#121212",
  },
  chipAvatar: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#1c1c1c",
    color: "#f5a623",
    display: "grid",
    placeItems: "center",
    fontSize: "0.72rem",
    fontWeight: "700",
  },
  chipName: { fontSize: "0.78rem", color: "#d7cfbf" },
  questionHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    color: "#a9a9a9",
  },
  optionBtn: {
    width: "100%",
    background: "#151515",
    color: "#f0e8d8",
    border: "1px solid #2d2d2d",
    borderRadius: "8px",
    padding: "0.75rem",
    textAlign: "left",
    cursor: "pointer",
  },
  optionSelected: {
    border: "1px solid #f5a623",
    boxShadow: "0 0 0 1px rgba(245,166,35,0.3)",
  },
  optionCorrect: {
    border: "1px solid #28c76f",
    background: "#0e1f16",
  },
  startHint: { fontSize: "0.72rem", color: "#555" },
  errorIcon: { fontSize: "2rem", marginBottom: "0.4rem" },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#f6efdf",
    margin: 0,
  },
  cardSub: {
    fontSize: "0.85rem",
    color: "#9f9f9f",
    lineHeight: 1.6,
    margin: 0,
  },
  homeBtn: {
    marginTop: "0.5rem",
    background: "#f5a623",
    color: "#000",
    border: "none",
    borderRadius: "10px",
    padding: "0.65rem 1.2rem",
    fontSize: "0.8rem",
    fontWeight: "800",
    cursor: "pointer",
  },
};
