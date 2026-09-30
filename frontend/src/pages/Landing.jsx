import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useViewport from "../hooks/useViewport";
import {
  DoodleAtom,
  DoodleMonitor,
  DoodleGlobe,
  DoodleBook,
  DoodleController,
  DoodlePalette,
} from "../components/ThemeDoodles";

const PLACEMENT_META = {
  "DSA Fundamentals": {
    section: "core",
    icon: "🔗",
    description:
      "Arrays, linked lists, trees, graphs, sorting, searching, time & space complexity",
    difficultyLabel: "Hard",
    badge: "Most asked",
  },
  "Operating Systems": {
    section: "core",
    icon: "⚙️",
    description:
      "Processes, threads, scheduling, memory management, deadlocks, file systems",
    difficultyLabel: "Hard",
  },
  "DBMS + SQL": {
    section: "core",
    icon: "🗄️",
    description:
      "Normalization, SQL queries, transactions, ACID, indexing, joins",
    difficultyLabel: "Medium",
  },
  "Python Essentials": {
    section: "languages",
    icon: "🐍",
    description:
      "OOP, list comprehensions, generators, decorators, memory model, common gotchas",
    difficultyLabel: "Easy-Med",
  },
  JavaScript: {
    section: "languages",
    icon: "🟨",
    description:
      "Closures, event loop, promises/async, prototypes, hoisting, this keyword",
    difficultyLabel: "Medium",
  },
  Java: {
    section: "languages",
    icon: "☕",
    description:
      "OOP, collections, JVM internals, multithreading, exception handling",
    difficultyLabel: "Medium",
  },
  "C++": {
    section: "languages",
    icon: "💠",
    description: "Pointers, memory management, STL, OOP, constructors, RAII",
    difficultyLabel: "Hard",
  },
  C: {
    section: "languages",
    icon: "📟",
    description:
      "Pointers, arrays, strings, memory, undefined behavior, and core systems basics",
    difficultyLabel: "Medium",
  },
  "Git + Dev Tools": {
    section: "tools",
    icon: "🛠️",
    description:
      "Git commands, merge vs rebase, CI/CD concepts, terminal basics",
    difficultyLabel: "Easy",
  },
  "AI + Prompting": {
    section: "tools",
    icon: "🤖",
    description:
      "Prompt quality, safe AI use, hallucinations, verification, and when AI helps or hurts",
    difficultyLabel: "Easy-Med",
    badge: "New",
  },
};

const GENERAL_META = {
  "Science Blast": { icon: "⚗️", subtitle: "Physics, Chemistry, Biology" },
  "History Hunt": { icon: "📜", subtitle: "Ancient to Modern History" },
  "Tech Talk": { icon: "💻", subtitle: "CS, Programming, AI" },
  "Mixed Madness": { icon: "🎲", subtitle: "Everything, everywhere" },
};

const SECTION_META = {
  core: {
    title: "Core Subjects",
    eyebrow: "The essential building blocks of CS interviews",
  },
  languages: {
    title: "Language Packs",
    eyebrow: "Brush up for interview or just for the love of programming",
  },
  tools: {
    title: "Tools + Workflow",
    eyebrow: "Quick wins",
  },
};

function normalizeQuiz(quiz) {
  const placementMeta = PLACEMENT_META[quiz.title];
  const generalMeta = GENERAL_META[quiz.title];

  if (placementMeta) {
    return {
      ...quiz,
      kind: "placement",
      ...placementMeta,
    };
  }

  return {
    ...quiz,
    kind: "general",
    icon: generalMeta?.icon || "🧩",
    description:
      generalMeta?.subtitle ||
      `${quiz.genre || "Mixed"} practice pack for quick drills`,
    difficultyLabel:
      quiz.difficulty === "mixed"
        ? "Mixed"
        : `${quiz.difficulty[0].toUpperCase()}${quiz.difficulty.slice(1)}`,
  };
}

function difficultyStyle(label) {
  if (label === "Hard") return s.diffHard;
  if (label === "Medium") return s.diffMedium;
  if (label === "Easy") return s.diffEasy;
  return s.diffBlend;
}

export default function Landing() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [step, setStep] = useState("code");
  const [error, setError] = useState("");
  const [staticQuizzes, setStaticQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  useEffect(() => {
    const loadStaticQuizzes = async () => {
      try {
        const res = await api.get("/quizzes/static");
        setStaticQuizzes((res.data.quizzes || []).map(normalizeQuiz));
      } catch (err) {
        console.error("Failed to load static quizzes", err);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    loadStaticQuizzes();
  }, []);

  const placementSections = useMemo(() => {
    const grouped = { core: [], languages: [], tools: [] };

    staticQuizzes
      .filter((quiz) => quiz.kind === "placement")
      .forEach((quiz) => {
        grouped[quiz.section].push(quiz);
      });

    return grouped;
  }, [staticQuizzes]);

  const generalQuizzes = useMemo(
    () => staticQuizzes.filter((quiz) => quiz.kind === "general"),
    [staticQuizzes],
  );

  const placementCount = Object.values(placementSections).reduce(
    (total, section) => total + section.length,
    0,
  );

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--mouse-x", x);
    document.documentElement.style.setProperty("--mouse-y", y);
  };

  const handleCodeSubmit = () => {
    if (roomCode.trim().length !== 6) {
      setError("Room code must be exactly 6 characters");
      return;
    }
    setError("");
    setStep("name");
  };

  const handleJoin = () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setError("");
    navigate(
      `/waiting/${roomCode.trim()}?name=${encodeURIComponent(playerName.trim())}`,
    );
  };

  return (
    <div style={s.page} onMouseMove={handleMouseMove}>
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <DoodleAtom style={{ top: "10%", left: "6%" }} />
      <DoodleMonitor style={{ top: "9%", right: "8%" }} />
      <DoodleGlobe style={{ top: "24%", left: "2%" }} />
      <DoodleBook style={{ top: "30%", right: "4%" }} />
      <DoodleController style={{ top: "31%", left: "15%" }} />
      <DoodlePalette style={{ top: "21%", right: "16%" }} />

      <div
        style={{
          ...s.container,
          padding: isMobile ? "0 1rem" : "0 2.5rem",
        }}
      >
        <header
          style={{
            ...s.header,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "1rem" : 0,
          }}
        >
          <a href="/" style={s.logoLink}>
            <div style={s.logo}>
              <div style={s.logoIconWrap}>
                <img
                  src="/favicon-32x32.png"
                  alt="Qurio logo"
                  style={s.logoIcon}
                />
              </div>
              <span style={s.logoText}>Qurio</span>
            </div>
          </a>
          <a href="/admin/login" style={s.hostLink}>
            Host a Quiz →
          </a>
        </header>

        <section style={{ ...s.hero, marginBottom: isMobile ? "2rem" : "3rem" }}>
          <div style={s.heroBadge}>
            <span style={s.badgeDot} />
            Live &amp; Static Quizzes
          </div>
          <h1 style={s.heroTitle}>
            Test your knowledge.
            <br />
            <span style={s.heroAccent}>Beat the clock.</span>
          </h1>
          <p style={{ ...s.heroSub, fontSize: isMobile ? "0.88rem" : "0.95rem" }}>
            Join a live quiz with a room code, or explore our new placement prep
            packs with fresh balanced questions on every attempt.
          </p>
        </section>

        <div
          style={{
            ...s.mainGrid,
            gridTemplateColumns: isTablet ? "1fr" : "460px minmax(0, 1fr)",
            gap: isMobile ? "1rem" : "1.5rem",
          }}
        >
          <div
            style={{
              ...s.joinCard,
              maxWidth: isTablet ? "100%" : "420px",
              minHeight: isMobile ? "auto" : "342px",
              padding: isMobile ? "1.25rem" : "1.8rem",
            }}
          >
            <div style={s.joinHeader}>
              <div style={s.joinIcon}>⚡</div>
              <div>
                <h2 style={s.joinTitle}>Join a Live Quiz</h2>
                <p style={s.joinSub}>Enter your 6-character room code</p>
              </div>
            </div>

            {step === "code" ? (
              <div style={s.inputGroup}>
                <div style={s.inputBlock}>
                  <label style={s.inputLabel}>ROOM CODE</label>
                  <input
                    style={s.codeInput}
                    type="text"
                    placeholder="_ _ _ _ _ _"
                    value={roomCode}
                    onChange={(e) =>
                      setRoomCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                {error && <p style={s.error}>{error}</p>}
                <button
                  style={{
                    ...s.joinBtn,
                    ...(roomCode.length === 6 ? s.joinBtnActive : {}),
                  }}
                  onClick={handleCodeSubmit}
                >
                  Continue <span>→</span>
                </button>
              </div>
            ) : (
              <div style={s.inputGroup}>
                <div style={s.roomPill}>
                  <span style={s.roomPillLabel}>Room</span>
                  <span style={s.roomPillCode}>{roomCode}</span>
                  <button
                    style={s.changeBtn}
                    onClick={() => {
                      setStep("code");
                      setError("");
                    }}
                  >
                    change
                  </button>
                </div>
                <div style={s.inputBlock}>
                  <label style={s.inputLabel}>YOUR NAME</label>
                  <input
                    style={s.nameInput}
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    autoFocus
                  />
                </div>
                {error && <p style={s.error}>{error}</p>}
                <button
                  style={{
                    ...s.joinBtn,
                    ...(playerName.length >= 2 ? s.joinBtnActive : {}),
                  }}
                  onClick={handleJoin}
                >
                  Join Quiz <span>⚡</span>
                </button>
              </div>
            )}

            <div style={s.stepRow}>
              <div
                style={{
                  ...s.stepDot,
                  ...(step === "code" ? s.stepActive : s.stepDone),
                }}
              />
              <div style={s.stepLine} />
              <div
                style={{
                  ...s.stepDot,
                  ...(step === "name" ? s.stepActive : {}),
                }}
              />
            </div>
          </div>

          <div style={s.staticSection}>
            <div
              style={{
                ...s.staticHeader,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <h2 style={s.staticTitle}>Placement Prep</h2>
              <span style={s.noSignupTag}>NEW</span>
              <span style={s.staticMeta}>{placementCount || 8} packs</span>
            </div>

            <p style={s.sectionCopy}>
              Each pack is designed to brush up fundamental skills quickly.
            </p>

            {loadingQuizzes ? (
              <div style={s.emptyState}>Loading quiz packs...</div>
            ) : (
              Object.entries(SECTION_META).map(([sectionKey, meta]) =>
                placementSections[sectionKey].length ? (
                  <div key={sectionKey} style={s.subSection}>
                    <div style={s.subHeader}>
                      <span style={s.subTitle}>
                        {meta.title.toUpperCase()}{" "}
                        <span style={s.subEyebrow}>— {meta.eyebrow}</span>
                      </span>
                    </div>
                    <div
                      style={{
                        ...s.quizGrid,
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(3, minmax(0, 1fr))",
                      }}
                    >
                      {placementSections[sectionKey].map((quiz) => (
                        <div
                          key={quiz.quiz_id}
                          style={s.quizCard}
                          onClick={() => navigate(`/quiz/${quiz.quiz_id}`)}
                        >
                          <div style={s.quizTop}>
                            <span style={s.quizIcon}>{quiz.icon}</span>
                          </div>
                          <h3 style={s.quizName}>{quiz.title}</h3>
                          <p style={s.quizDesc}>{quiz.description}</p>
                          <div style={s.chipRow}>
                            <span style={s.countChip}>{quiz.num_questions} Qs</span>
                            <span
                              style={{
                                ...s.diffChip,
                                ...difficultyStyle(quiz.difficultyLabel),
                              }}
                            >
                              {quiz.difficultyLabel}
                            </span>
                            {quiz.badge ? (
                              <span style={s.badgeChip}>{quiz.badge}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            )}
          </div>
        </div>

        <div style={s.generalSection}>
          <div style={s.generalHeader}>
            <h2 style={s.staticTitle}>General Quizzes</h2>
            <span style={s.staticMeta}>Quick casual practice packs</span>
          </div>
          <div
            style={{
              ...s.generalGrid,
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            }}
          >
            {generalQuizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                style={s.generalCard}
                onClick={() => navigate(`/quiz/${quiz.quiz_id}`)}
              >
                <div style={s.generalCardTop}>
                  <span style={s.quizIcon}>{quiz.icon}</span>
                  <span style={s.generalCount}>{quiz.num_questions} Qs</span>
                </div>
                <h3 style={s.quizName}>{quiz.title}</h3>
                <p style={s.quizDesc}>{quiz.description}</p>
              </div>
            ))}
          </div>
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
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  blob1: {
    position: "fixed",
    top: "-200px",
    left: "-150px",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
    animation: "floatOrb1 12s ease-in-out infinite",
  },
  blob2: {
    position: "fixed",
    bottom: "-200px",
    right: "-100px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.04) 0%, transparent 70%)",
    pointerEvents: "none",
    animation: "floatOrb2 15s ease-in-out infinite",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
    animation: "scrollGrid 20s linear infinite",
  },
  container: {
    maxWidth: "1480px",
    width: "100%",
    margin: "0 auto",
    padding: "0 2rem",
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.5rem 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    marginBottom: "3rem",
  },
  logoLink: {
    textDecoration: "none",
    color: "inherit",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 14px rgba(245,166,35,0.22)",
  },
  logoIcon: { width: "100%", height: "100%", display: "block" },
  logoText: {
    fontSize: "1.15rem",
    fontWeight: "800",
    letterSpacing: "0.18em",
    color: "#e8e0d0",
  },
  hostLink: {
    fontSize: "0.8rem",
    color: "#777",
    textDecoration: "none",
    fontWeight: "600",
  },
  hero: { textAlign: "center", marginBottom: "3rem" },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.3rem 1rem",
    borderRadius: "999px",
    fontSize: "0.72rem",
    fontWeight: "700",
    letterSpacing: "0.06em",
    marginBottom: "1.2rem",
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 6px rgba(245,166,35,0.8)",
  },
  heroTitle: {
    fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
    fontWeight: "800",
    lineHeight: "1.15",
    marginBottom: "1rem",
    letterSpacing: "-0.02em",
    color: "#f0e8d8",
  },
  heroAccent: { color: "#f5a623" },
  heroSub: {
    color: "#999",
    fontSize: "0.95rem",
    maxWidth: "560px",
    margin: "0 auto",
    lineHeight: "1.7",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: "1.5rem",
    marginBottom: "2rem",
    alignItems: "start",
  },
  joinCard: {
    background: "rgba(15, 15, 15, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid #222",
    borderRadius: "14px",
    padding: "1.8rem",
    boxShadow: "0 0 40px rgba(245,166,35,0.03)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "420px",
    minHeight: "342px",
  },
  joinHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1.8rem",
  },
  joinIcon: {
    width: "40px",
    height: "40px",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  joinTitle: {
    fontSize: "1rem",
    fontWeight: "700",
    color: "#f0e8d8",
    marginBottom: "0.25rem",
  },
  joinSub: { fontSize: "0.76rem", color: "#888" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "1rem" },
  inputBlock: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  inputLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  codeInput: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #f5a623",
    color: "#f5a623",
    fontSize: "1.8rem",
    fontWeight: "800",
    letterSpacing: "0.5em",
    padding: "0.4rem 0",
    outline: "none",
    width: "100%",
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    caretColor: "#f5a623",
  },
  nameInput: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #333",
    color: "#f0e8d8",
    fontSize: "1.1rem",
    fontWeight: "600",
    padding: "0.4rem 0",
    outline: "none",
    width: "100%",
    caretColor: "#f5a623",
  },
  roomPill: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "8px",
    padding: "0.5rem 0.8rem",
  },
  roomPillLabel: {
    fontSize: "0.65rem",
    color: "#888",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  roomPillCode: {
    fontSize: "0.9rem",
    fontWeight: "800",
    color: "#f5a623",
    letterSpacing: "0.2em",
    fontFamily: "'JetBrains Mono', monospace",
    flex: 1,
  },
  changeBtn: {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: "0.7rem",
    cursor: "pointer",
    textDecoration: "underline",
  },
  error: { color: "#ef4444", fontSize: "0.75rem", margin: 0 },
  joinBtn: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    color: "#555",
    padding: "0.85rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "all 0.2s",
  },
  joinBtnActive: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "1px solid #f5a623",
    color: "#080808",
    boxShadow: "0 4px 20px rgba(245,166,35,0.25)",
  },
  stepRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    marginTop: "1.5rem",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#222",
    transition: "all 0.3s",
  },
  stepActive: {
    background: "#f5a623",
    boxShadow: "0 0 8px rgba(245,166,35,0.5)",
    width: "20px",
    borderRadius: "4px",
  },
  stepDone: { background: "#f5a623", opacity: 0.4 },
  stepLine: { width: "30px", height: "1px", background: "#222" },
  staticSection: { display: "flex", flexDirection: "column", gap: "1rem" },
  staticHeader: { display: "flex", alignItems: "center", gap: "0.8rem" },
  staticTitle: { fontSize: "1.05rem", fontWeight: "700", color: "#f0e8d8" },
  noSignupTag: {
    fontSize: "0.68rem",
    fontWeight: "700",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    letterSpacing: "0.04em",
  },
  staticMeta: { fontSize: "0.72rem", color: "#777", fontWeight: "600" },
  sectionCopy: {
    fontSize: "0.78rem",
    color: "#8c8c8c",
    lineHeight: "1.6",
    margin: 0,
  },
  subSection: { display: "flex", flexDirection: "column", gap: "0.65rem" },
  subHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subTitle: {
    fontSize: "0.8rem",
    color: "#c8b9a3",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  subEyebrow: {
    color: "#7b7368",
    fontWeight: "600",
  },
  quizGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" },
  quizCard: {
    background: "rgba(22, 22, 22, 0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "1.1rem",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  quizTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.6rem",
  },
  quizIcon: { fontSize: "1.3rem" },
  quizName: {
    fontSize: "0.96rem",
    fontWeight: "700",
    color: "#f0e8d8",
    marginBottom: "0.35rem",
  },
  quizDesc: {
    fontSize: "0.75rem",
    color: "#888",
    marginBottom: "0.8rem",
    lineHeight: "1.5",
  },
  chipRow: {
    display: "flex",
    gap: "0.45rem",
    flexWrap: "wrap",
  },
  countChip: {
    fontSize: "0.68rem",
    color: "#8b560f",
    background: "#ffe2b0",
    padding: "0.18rem 0.5rem",
    borderRadius: "6px",
    fontWeight: "700",
  },
  diffChip: {
    fontSize: "0.68rem",
    padding: "0.18rem 0.5rem",
    borderRadius: "6px",
    fontWeight: "700",
  },
  diffHard: {
    background: "#ffe1e1",
    color: "#962626",
  },
  diffMedium: {
    background: "#ffe9c9",
    color: "#8a5a11",
  },
  diffEasy: {
    background: "#dff3d1",
    color: "#3e6b17",
  },
  diffBlend: {
    background: "#dff3d1",
    color: "#436a25",
  },
  badgeChip: {
    fontSize: "0.68rem",
    background: "#232323",
    color: "#c8c8c8",
    padding: "0.18rem 0.5rem",
    borderRadius: "6px",
    fontWeight: "700",
  },
  generalSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
    marginTop: "1rem",
    marginBottom: "2.5rem",
  },
  generalHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    flexWrap: "wrap",
  },
  generalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" },
  generalCard: {
    background: "rgba(22, 22, 22, 0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "1.1rem",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  generalCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.6rem",
  },
  generalCount: { fontSize: "0.72rem", color: "#999", fontWeight: "700" },
  emptyState: {
    background: "rgba(22, 22, 22, 0.6)",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "1rem",
    color: "#8f8f8f",
    fontSize: "0.82rem",
  },
};
