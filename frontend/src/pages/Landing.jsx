import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useViewport from "../hooks/useViewport";
import { DoodleAtom, DoodleMonitor, DoodleGlobe, DoodleBook, DoodleController, DoodlePalette } from "../components/ThemeDoodles";

const STATIC_QUIZZES = [
  {
    id: 1,
    title: "Science Blast",
    genre: "Science",
    icon: "⚗️",
    desc: "Physics, Chemistry, Biology",
    difficulty: "Medium",
    players: "2.4k",
    particles: ["🧬", "🔬", "⚛️", "🌡️"],
  },
  {
    id: 2,
    title: "History Hunt",
    genre: "History",
    icon: "📜",
    desc: "Ancient to Modern History",
    difficulty: "Medium",
    players: "1.8k",
    particles: ["🏺", "🏛️", "👑", "🏹"],
  },
  {
    id: 3,
    title: "Tech Talk",
    genre: "Tech",
    icon: "💻",
    desc: "CS, Programming, AI",
    difficulty: "Medium",
    players: "3.1k",
    particles: ["01", "</>", "⚡", "🖥️"],
  },
  {
    id: 4,
    title: "Mixed Madness",
    genre: "Mixed",
    icon: "🎲",
    desc: "Everything, everywhere",
    difficulty: "Mixed",
    players: "4.2k",
    particles: ["🌟", "❓", "🧩", "🎯"],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [step, setStep] = useState("code");
  const [error, setError] = useState("");
  const [hoveredQuiz, setHoveredQuiz] = useState(null);
  const [particles, setParticles] = useState([]);
  
  const spawnParticles = (e, qParticles) => {
    if (!qParticles) return;
    const x = e.clientX;
    const y = e.clientY;
    
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      x: x,
      y: y,
      tx: (Math.random() - 0.5) * 400, // Travel distance X
      ty: (Math.random() - 0.5) * 400, // Travel distance Y
      text: qParticles[Math.floor(Math.random() * qParticles.length)]
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2400);
  };

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty('--mouse-x', x);
    document.documentElement.style.setProperty('--mouse-y', y);
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
      
      {/* Full-screen Particles */}
      {particles.map(p => (
        <span 
          key={p.id} 
          className="particle" 
          style={{ 
            left: p.x, 
            top: p.y, 
            '--tx': `${p.tx}px`, 
            '--ty': `${p.ty}px` 
          }}
        >
          {p.text}
        </span>
      ))}
      
      {/* Background Thematic Doodles */}
      <DoodleAtom style={{ top: "18%", left: "6%" }} />
      <DoodleMonitor style={{ top: "15%", right: "8%" }} />
      <DoodleGlobe style={{ top: "35%", left: "2%" }} />
      <DoodleBook style={{ top: "42%", right: "4%" }} />
      <DoodleController style={{ top: "45%", left: "15%" }} />
      <DoodlePalette style={{ top: "32%", right: "16%" }} />

      <div
        style={{
          ...s.container,
          padding: isMobile ? "0 1rem" : "0 2rem",
        }}
      >
        {/* Header */}
        <header
          style={{
            ...s.header,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "1rem" : 0,
            marginBottom: isMobile ? "2rem" : "3rem",
          }}
        >
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QURIO</span>
          </div>
          <a href="/admin/login" style={s.hostLink}>
            Host a Quiz →
          </a>
        </header>

        {/* Hero */}
        <section style={{ ...s.hero, marginBottom: isMobile ? "2rem" : "3rem" }}>
          <div style={s.heroBadge}>
            <span style={s.badgeDot} />
            Live &amp; Static Quizzes
          </div>
          <h1 style={s.heroTitle}>
            Test your knowledge.
            <br />
            <span style={s.heroAccent} className="shimmer-text">Beat the clock.</span>
          </h1>
          <p style={{ ...s.heroSub, fontSize: isMobile ? "0.88rem" : "0.95rem" }}>
            Join a live quiz with a room code, or try one of our curated quizzes
            anytime — no signup needed.
          </p>
        </section>

        {/* Main Grid */}
        <div
          style={{
            ...s.mainGrid,
            gridTemplateColumns: isTablet ? "1fr" : "420px 1fr",
            gap: isMobile ? "1rem" : "1.5rem",
          }}
        >
          {/* Join Card */}
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

          {/* Static Quizzes */}
          <div style={s.staticSection}>
            <div
              style={{
                ...s.staticHeader,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <h2 style={s.staticTitle}>Try a Quiz</h2>
              <span style={s.noSignupTag}>No signup needed</span>
            </div>
            <div
              style={{
                ...s.quizGrid,
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              }}
            >
              {STATIC_QUIZZES.map((q) => (
                <div
                  key={q.id}
                  style={{
                    ...s.quizCard,
                    ...(hoveredQuiz === q.id ? s.quizCardHover : {}),
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredQuiz(q.id);
                    spawnParticles(e, q.particles);
                  }}
                  onMouseLeave={() => setHoveredQuiz(null)}
                  onClick={() => navigate(`/quiz/${q.id}`)}
                >
                  <div style={s.quizTop}>
                    <span style={s.quizIcon}>{q.icon}</span>
                    <span style={s.quizDiff}>{q.difficulty}</span>
                  </div>
                  <h3 style={s.quizName}>{q.title}</h3>
                  <p style={s.quizDesc}>{q.desc}</p>
                  <div style={s.quizFooter}>
                    <span style={s.quizPlayers}>👥 {q.players} played</span>
                    <span style={s.quizPlay}>Play →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div style={{ marginTop: "auto", width: "100%", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Stats bar */}
          <div
            style={{
              ...s.statsBar,
              display: isMobile ? "grid" : "flex",
              gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
              padding: isMobile ? "1rem" : "1.2rem 2rem",
              gap: isMobile ? "0.75rem" : 0,
            }}
          >
            {[
              { label: "Questions", value: "500+" },
              { label: "Genres", value: "4" },
              { label: "Players Today", value: "1.2k" },
              { label: "Avg Score", value: "72%" },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  ...s.statItem,
                  ...(isMobile
                    ? { borderRight: "none", padding: "0.75rem 0.5rem" }
                    : i === 3
                      ? { borderRight: "none" }
                      : {}),
                }}
              >
                <span style={s.statVal}>{stat.value}</span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Footer details */}
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#666", fontWeight: "600", letterSpacing: "0.05em", lineHeight: "1.6" }}>
            Made with <span style={{ color: "#f5a623" }}>⚡</span> by Prajwal Navada G P
            <br />
            <span style={{ fontSize: "0.65rem", color: "#555", fontWeight: "500" }}>&copy; {new Date().getFullYear()} Qurio.</span>
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
    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
    animation: "scrollGrid 20s linear infinite",
  },
  container: {
    maxWidth: "1200px",
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
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 10px rgba(245,166,35,0.7)",
    animation: "pulseGlow 2.5s infinite",
  },
  logoText: {
    fontSize: "0.85rem",
    fontWeight: "800",
    letterSpacing: "0.22em",
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
    fontSize: "clamp(2rem, 5vw, 3.4rem)",
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
    maxWidth: "460px",
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
  quizCardHover: {
    border: "1px solid rgba(245,166,35,0.4)",
    background: "rgba(28, 28, 28, 0.8)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(245,166,35,0.1)",
  },
  quizTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.6rem",
  },
  quizIcon: { fontSize: "1.3rem" },
  quizDiff: {
    fontSize: "0.62rem",
    color: "#f5a623",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    padding: "0.12rem 0.4rem",
    borderRadius: "4px",
    fontWeight: "700",
    letterSpacing: "0.04em",
  },
  quizName: {
    fontSize: "0.88rem",
    fontWeight: "700",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  quizDesc: {
    fontSize: "0.75rem",
    color: "#888",
    marginBottom: "0.8rem",
    lineHeight: "1.5",
  },
  quizFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quizPlayers: { fontSize: "0.66rem", color: "#777" },
  quizPlay: { fontSize: "0.72rem", color: "#f5a623", fontWeight: "700" },
  statsBar: {
    display: "flex",
    justifyContent: "center",
    background: "rgba(15, 15, 15, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.2rem 2rem",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    flex: 1,
    borderRight: "1px solid #1e1e1e",
    padding: "0 1.5rem",
  },
  statVal: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f0e8d8",
    letterSpacing: "-0.02em",
  },
  statLabel: {
    fontSize: "0.67rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: "600",
  },
};
