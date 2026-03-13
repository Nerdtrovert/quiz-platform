import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../utils/api";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LiveRoom() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const socketRef = useRef(null);

  // Setup
  const [quizzes, setQuizzes] = useState([]);
  const [staticQuizzes, setStaticQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const selectedQuizRef = useRef(null); // persists across status changes
  const [roomCode] = useState(generateRoomCode);
  const [roomCreated, setRoomCreated] = useState(false);

  // Room state
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("setup"); // setup | waiting | active | question-end | ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answerStats, setAnswerStats] = useState({
    answered: 0,
    total: 0,
    correct: 0,
  });
  const [correctOption, setCorrectOption] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [paused, setPaused] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuizzes();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/quizzes");
      setQuizzes(res.data.quizzes || []);
      setStaticQuizzes(res.data.staticQuizzes || []);
    } catch {}
  };

  const handleCreateRoom = () => {
    if (!selectedQuiz) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("create-room", {
        quiz_id: selectedQuiz.quiz_id,
        admin_id: admin.admin_id,
        room_code: roomCode,
        time_per_question: selectedQuiz.time_per_question || 30,
      });
    });

    socket.on("room-created", () => {
      setRoomCreated(true);
      setStatus("waiting");
    });

    socket.on("participant-joined", ({ participants, count }) => {
      setParticipants(participants || []);
    });

    socket.on("quiz-started", ({ total_questions }) => {
      setTotalQuestions(total_questions);
      setStatus("active");
    });

    socket.on("question-start", (q) => {
      setCurrentQuestion(q);
      setQuestionIndex(q.index);
      setCorrectOption(null);
      setAnswerStats({
        answered: 0,
        total: Object.keys(participants).length,
        correct: 0,
      });
      setStatus("active");
      setTimeLeft(q.time_per_question);

      // Local countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on("answer-stats", (stats) => {
      setAnswerStats(stats);
    });

    socket.on("question-end", ({ correct_option, leaderboard }) => {
      setCorrectOption(correct_option);
      setLeaderboard(leaderboard || []);
      setStatus("question-end");
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("quiz-end", ({ leaderboard }) => {
      const safeLeaderboard = leaderboard || [];
      setLeaderboard(safeLeaderboard);
      setStatus("ended");
      if (timerRef.current) clearInterval(timerRef.current);
      navigate(`/leaderboard/${roomCode}`, {
        replace: true,
        state: {
          leaderboard: safeLeaderboard,
          roomCode,
          isHost: true,
          quizTitle:
            selectedQuiz?.title || selectedQuizRef.current?.title || "Live Quiz",
        },
      });
    });

    socket.on("quiz-paused", () => setPaused(true));
    socket.on("quiz-resumed", () => setPaused(false));

    socket.on("error", ({ message }) => alert(message));
  };

  const handleStartQuiz = () => {
    socketRef.current?.emit("start-quiz", { room_code: roomCode });
  };

  const handleNextQuestion = () => {
    socketRef.current?.emit("next-question", { room_code: roomCode });
    setStatus("active");
    setCorrectOption(null);
  };

  const handlePauseResume = () => {
    if (paused) {
      socketRef.current?.emit("resume-quiz", { room_code: roomCode });
    } else {
      socketRef.current?.emit("pause-quiz", { room_code: roomCode });
    }
  };

  const handleKick = (participant_id) => {
    socketRef.current?.emit("kick-participant", {
      room_code: roomCode,
      participant_id,
    });
    setParticipants((prev) =>
      prev.filter((p) => p.participant_id !== participant_id),
    );
  };

  const timerPercent = currentQuestion
    ? (timeLeft / currentQuestion.time_per_question) * 100
    : 100;
  const timerColor =
    timerPercent > 50 ? "#f5a623" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QUIZLIVE</span>
          </div>
          <nav style={s.nav}>
            {[
              { icon: "⚡", label: "Dashboard", path: "/admin" },
              { icon: "🗃", label: "Question Bank", path: "/admin/questions" },
              { icon: "📝", label: "Create Quiz", path: "/admin/create-quiz" },
              {
                icon: "🚀",
                label: "Start Room",
                path: "/admin/live",
                active: true,
              },
              { icon: "📊", label: "Past Rooms", path: "/admin/rooms" },
            ].map((item) => (
              <button
                key={item.path}
                style={{
                  ...s.navItem,
                  ...(item.active ? s.navItemActive : {}),
                }}
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <button
          style={s.logoutBtn}
          onClick={() => {
            localStorage.clear();
            navigate("/admin/login");
          }}
        >
          Logout →
        </button>
      </aside>

      <main style={s.main}>
        {/* ── SETUP ── */}
        {status === "setup" && (
          <div style={s.setupContainer}>
            <h1 style={s.title}>Start a Live Room</h1>
            <p style={s.subtitle}>
              Select a quiz, share the room code, and go live
            </p>

            <div style={s.setupCard}>
              <div style={s.roomCodeBlock}>
                <label style={s.label}>ROOM CODE</label>
                <div style={s.roomCodeBig}>{roomCode}</div>
                <p style={s.roomCodeHint}>Share this with your participants</p>
              </div>

              <div style={s.fieldBlock}>
                <label style={s.label}>SELECT QUIZ</label>

                {/* ── Preset Static Quizzes ── */}
                <div style={s.quizSectionLabel}>⚡ Preset Quizzes</div>
                <div style={s.quizList}>
                  {staticQuizzes.map((q) => (
                    <div
                      key={q.quiz_id}
                      style={{
                        ...s.quizOption,
                        ...s.quizOptionPreset,
                        ...(selectedQuiz?.quiz_id === q.quiz_id
                          ? s.quizOptionSelected
                          : {}),
                      }}
                      onClick={() => {
                        setSelectedQuiz(q);
                        selectedQuizRef.current = q;
                      }}
                    >
                      <div style={s.quizOptionLeft}>
                        <span style={s.quizOptionTitle}>{q.title}</span>
                        <span style={s.quizOptionMeta}>
                          {q.question_count} questions · {q.time_per_question}s
                          · mixed difficulty
                        </span>
                      </div>
                      {selectedQuiz?.quiz_id === q.quiz_id && (
                        <span style={s.checkMark}>✓</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Your Quizzes ── */}
                <div style={{ ...s.quizSectionLabel, marginTop: "1rem" }}>
                  📝 Your Quizzes
                </div>
                {quizzes.length === 0 ? (
                  <p style={s.emptyNote}>
                    No quizzes yet.{" "}
                    <a href="/admin/create-quiz" style={{ color: "#f5a623" }}>
                      Create one →
                    </a>
                  </p>
                ) : (
                  <div style={s.quizList}>
                    {quizzes.map((q) => (
                      <div
                        key={q.quiz_id}
                        style={{
                          ...s.quizOption,
                          ...(selectedQuiz?.quiz_id === q.quiz_id
                            ? s.quizOptionSelected
                            : {}),
                        }}
                        onClick={() => {
                          setSelectedQuiz(q);
                          selectedQuizRef.current = q;
                        }}
                      >
                        <div style={s.quizOptionLeft}>
                          <span style={s.quizOptionTitle}>{q.title}</span>
                          <span style={s.quizOptionMeta}>
                            {q.question_count} questions · {q.time_per_question}
                            s each
                          </span>
                        </div>
                        {selectedQuiz?.quiz_id === q.quiz_id && (
                          <span style={s.checkMark}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                style={{
                  ...s.createRoomBtn,
                  ...(!selectedQuiz
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : {}),
                }}
                onClick={handleCreateRoom}
                disabled={!selectedQuiz}
              >
                Open Room →
              </button>
            </div>
          </div>
        )}

        {/* ── WAITING ── */}
        {status === "waiting" && (
          <div style={s.waitingContainer}>
            <div style={s.waitingHeader}>
              <div>
                <h1 style={s.title}>Waiting for participants</h1>
                <p style={s.subtitle}>{selectedQuiz?.title}</p>
              </div>
              <button
                style={{
                  ...s.startBtn,
                  ...(participants.length === 0
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : {}),
                }}
                onClick={handleStartQuiz}
                disabled={participants.length === 0}
              >
                ⚡ Start Quiz ({participants.length})
              </button>
            </div>

            <div style={s.roomCodeDisplay}>
              <span style={s.roomCodeLabel}>ROOM CODE</span>
              <span style={s.roomCodeValue}>{roomCode}</span>
              <span style={s.roomCodeHint2}>Share at quizlive.com</span>
            </div>

            <div style={s.participantGrid}>
              {participants.length === 0 ? (
                <div style={s.waitingEmpty}>
                  <div style={s.pulsingDot} />
                  <p style={{ color: "#888", fontSize: "0.85rem" }}>
                    Waiting for players to join...
                  </p>
                </div>
              ) : (
                participants.map((p) => (
                  <div key={p.participant_id} style={s.participantCard}>
                    <div style={s.participantAvatar}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <span style={s.participantName}>{p.name}</span>
                    <button
                      style={s.kickBtn}
                      onClick={() => handleKick(p.participant_id)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE QUESTION ── */}
        {(status === "active" || status === "question-end") &&
          currentQuestion && (
            <div style={s.liveContainer}>
              {/* Top bar */}
              <div style={s.liveTopBar}>
                <div style={s.liveRoomCode}>🔴 {roomCode}</div>
                <div style={s.liveProgress}>
                  Q{questionIndex + 1} / {totalQuestions}
                </div>
                <div style={s.liveControls}>
                  <button style={s.pauseBtn} onClick={handlePauseResume}>
                    {paused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                </div>
              </div>

              {/* Timer bar */}
              {status === "active" && (
                <div style={s.timerBar}>
                  <div
                    style={{
                      ...s.timerFill,
                      width: `${timerPercent}%`,
                      background: timerColor,
                      transition: "width 1s linear",
                    }}
                  />
                </div>
              )}

              {/* Question */}
              <div style={s.liveQuestionCard}>
                <div style={s.liveMeta}>
                  <span style={s.liveGenreTag}>{currentQuestion.genre}</span>
                  <span style={s.livePointsTag}>
                    {currentQuestion.base_points} pts
                  </span>
                  {status === "active" && (
                    <span
                      style={{
                        ...s.timerBadge,
                        color: timerColor,
                        borderColor: timerColor,
                      }}
                    >
                      {timeLeft}s
                    </span>
                  )}
                </div>
                <h2 style={s.liveQuestionText}>
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Options */}
              <div style={s.liveOptionsGrid}>
                {currentQuestion.options.map((opt) => (
                  <div
                    key={opt.option_number}
                    style={{
                      ...s.liveOption,
                      ...(status === "question-end" &&
                      opt.option_number === correctOption
                        ? s.liveOptionCorrect
                        : {}),
                    }}
                  >
                    <span style={s.liveOptLetter}>
                      {["A", "B", "C", "D"][opt.option_number - 1]}
                    </span>
                    <span style={s.liveOptText}>{opt.option_text}</span>
                    {status === "question-end" &&
                      opt.option_number === correctOption && (
                        <span style={{ color: "#10b981", fontWeight: "800" }}>
                          ✓
                        </span>
                      )}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={s.statsRow}>
                <div style={s.statBox}>
                  <span style={s.statNum}>{answerStats.answered}</span>
                  <span style={s.statLbl}>Answered</span>
                </div>
                <div style={s.statBox}>
                  <span style={s.statNum}>{answerStats.total}</span>
                  <span style={s.statLbl}>Total</span>
                </div>
                <div style={s.statBox}>
                  <span style={{ ...s.statNum, color: "#10b981" }}>
                    {answerStats.correct}
                  </span>
                  <span style={s.statLbl}>Correct</span>
                </div>
                <div style={s.statBox}>
                  <span style={{ ...s.statNum, color: "#ef4444" }}>
                    {answerStats.answered - answerStats.correct}
                  </span>
                  <span style={s.statLbl}>Wrong</span>
                </div>
              </div>

              {/* Next / End */}
              {status === "question-end" && (
                <button style={s.nextBtn} onClick={handleNextQuestion}>
                  {questionIndex + 1 === totalQuestions
                    ? "End Quiz →"
                    : "Next Question →"}
                </button>
              )}
            </div>
          )}

        {/* ── ENDED ── */}
        {status === "ended" && (
          <div style={s.endedContainer}>
            <h1 style={s.title}>Quiz Complete! 🎉</h1>
            <p style={s.subtitle}>
              Final leaderboard for{" "}
              {selectedQuiz?.title || selectedQuizRef.current?.title}
            </p>
            <div style={s.lbCard}>
              {leaderboard.map((entry, i) => (
                <div key={i} style={s.lbRow}>
                  <span style={s.lbRank}>
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : `#${i + 1}`}
                  </span>
                  <span style={s.lbName}>{entry.name}</span>
                  <span style={s.lbScore}>{entry.score} pts</span>
                </div>
              ))}
            </div>
            <button style={s.doneBtn} onClick={() => navigate("/admin")}>
              Back to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#e8e0d0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: "flex",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "fixed",
    top: "-150px",
    right: "-100px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  sidebar: {
    width: "220px",
    flexShrink: 0,
    background: "#0a0a0a",
    borderRight: "1px solid #1a1a1a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "1.5rem",
    position: "sticky",
    top: 0,
    height: "100vh",
    zIndex: 10,
  },
  sidebarTop: { display: "flex", flexDirection: "column", gap: "2rem" },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 8px rgba(245,166,35,0.7)",
  },
  logoText: {
    fontSize: "0.78rem",
    fontWeight: "800",
    letterSpacing: "0.2em",
    color: "#e8e0d0",
  },
  nav: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    padding: "0.65rem 0.8rem",
    borderRadius: "8px",
    background: "transparent",
    border: "none",
    color: "#777",
    fontSize: "0.82rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  navItemActive: {
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #222",
    color: "#666",
    padding: "0.5rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  main: {
    flex: 1,
    padding: "2rem 2.5rem",
    overflowY: "auto",
    position: "relative",
    zIndex: 1,
  },

  // Setup
  setupContainer: { maxWidth: "560px" },
  title: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  subtitle: { fontSize: "0.78rem", color: "#888", marginBottom: "1.5rem" },
  setupCard: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "14px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  roomCodeBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    alignItems: "center",
    textAlign: "center",
    padding: "1.5rem",
    background: "rgba(245,166,35,0.04)",
    border: "1px solid rgba(245,166,35,0.15)",
    borderRadius: "10px",
  },
  label: {
    fontSize: "0.63rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  roomCodeBig: {
    fontSize: "3rem",
    fontWeight: "900",
    color: "#f5a623",
    letterSpacing: "0.3em",
    fontFamily: "'JetBrains Mono', monospace",
  },
  roomCodeHint: { fontSize: "0.72rem", color: "#666" },
  fieldBlock: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  emptyNote: { fontSize: "0.78rem", color: "#666" },
  quizList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  quizSectionLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "0.4rem",
  },
  quizOptionPreset: {
    borderColor: "rgba(245,166,35,0.15)",
    background: "rgba(245,166,35,0.03)",
  },
  quizOption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.9rem 1rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  quizOptionSelected: {
    border: "1px solid rgba(245,166,35,0.4)",
    background: "rgba(245,166,35,0.05)",
  },
  quizOptionLeft: { display: "flex", flexDirection: "column", gap: "0.2rem" },
  quizOptionTitle: { fontSize: "0.88rem", fontWeight: "700", color: "#f0e8d8" },
  quizOptionMeta: { fontSize: "0.7rem", color: "#888" },
  checkMark: { color: "#f5a623", fontWeight: "800", fontSize: "1rem" },
  createRoomBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.9rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },

  // Waiting
  waitingContainer: { maxWidth: "700px" },
  waitingHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
  },
  startBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.7rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
  },
  roomCodeDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "rgba(245,166,35,0.06)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    marginBottom: "1.5rem",
  },
  roomCodeLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  roomCodeValue: {
    fontSize: "1.8rem",
    fontWeight: "900",
    color: "#f5a623",
    letterSpacing: "0.3em",
    fontFamily: "'JetBrains Mono', monospace",
    flex: 1,
    textAlign: "center",
  },
  roomCodeHint2: { fontSize: "0.7rem", color: "#666" },
  participantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "0.8rem",
  },
  waitingEmpty: {
    gridColumn: "1/-1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "3rem",
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
  },
  pulsingDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 12px rgba(245,166,35,0.8)",
  },
  participantCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "0.8rem",
  },
  participantAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: "800",
    color: "#f5a623",
    flexShrink: 0,
  },
  participantName: {
    flex: 1,
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "#f0e8d8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  kickBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: "0.75rem",
    flexShrink: 0,
  },

  // Live
  liveContainer: {
    maxWidth: "780px",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  liveTopBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveRoomCode: {
    fontSize: "0.78rem",
    fontWeight: "800",
    color: "#ef4444",
    letterSpacing: "0.1em",
  },
  liveProgress: { fontSize: "0.85rem", fontWeight: "800", color: "#f0e8d8" },
  liveControls: { display: "flex", gap: "0.5rem" },
  pauseBtn: {
    background: "transparent",
    border: "1px solid #333",
    color: "#888",
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  timerBar: {
    width: "100%",
    height: "4px",
    background: "#1a1a1a",
    borderRadius: "999px",
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: "999px" },
  liveQuestionCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "1.5rem",
  },
  liveMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.8rem",
  },
  liveGenreTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  livePointsTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    background: "#141414",
    border: "1px solid #222",
    color: "#888",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  timerBadge: {
    fontSize: "0.8rem",
    fontWeight: "800",
    border: "1px solid",
    borderRadius: "6px",
    padding: "0.15rem 0.5rem",
    marginLeft: "auto",
    transition: "color 0.3s",
  },
  liveQuestionText: {
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "#f0e8d8",
    lineHeight: "1.5",
  },
  liveOptionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.8rem",
  },
  liveOption: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "1rem",
  },
  liveOptionCorrect: {
    border: "1px solid rgba(16,185,129,0.4)",
    background: "rgba(16,185,129,0.06)",
  },
  liveOptLetter: {
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
    color: "#888",
    flexShrink: 0,
  },
  liveOptText: {
    flex: 1,
    fontSize: "0.85rem",
    color: "#e8e0d0",
    fontWeight: "600",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.8rem",
  },
  statBox: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  },
  statNum: { fontSize: "1.6rem", fontWeight: "800", color: "#f0e8d8" },
  statLbl: {
    fontSize: "0.65rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  nextBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.9rem 2rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "800",
    cursor: "pointer",
    alignSelf: "flex-end",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },

  // Ended
  endedContainer: {
    maxWidth: "560px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  lbCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  lbRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    padding: "0.8rem 1rem",
  },
  lbRank: { fontSize: "1rem", width: "28px", textAlign: "center" },
  lbName: { flex: 1, fontSize: "0.88rem", fontWeight: "700", color: "#f0e8d8" },
  lbScore: { fontSize: "0.88rem", fontWeight: "800", color: "#f5a623" },
  doneBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.9rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },
};
