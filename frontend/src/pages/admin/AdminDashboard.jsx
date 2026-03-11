import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const [stats, setStats] = useState({
    quizzes: 0,
    questions: 0,
    rooms: 0,
    participants: 0,
  });

  useEffect(() => {
    // TODO: fetch real stats from API
    // For now using placeholder data
    setStats({ quizzes: 3, questions: 24, rooms: 5, participants: 87 });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  return (
    <div style={s.page}>
      <div style={s.blob1} />
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
              { icon: "⚡", label: "Dashboard", path: "/admin", active: true },
              { icon: "🗃", label: "Question Bank", path: "/admin/questions" },
              { icon: "📝", label: "My Quizzes", path: "/admin/exams" },
              { icon: "🚀", label: "Start Room", path: "/admin/create-quiz" },
            ].map((item) => (
              <button
                key={item.path}
                style={{
                  ...s.navItem,
                  ...(item.active ? s.navItemActive : {}),
                }}
                onClick={() => navigate(item.path)}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div style={s.sidebarBottom}>
          <div style={s.adminInfo}>
            <div style={s.adminAvatar}>
              {admin.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div style={s.adminName}>{admin.name || "Admin"}</div>
              <div style={s.adminEmail}>{admin.email || ""}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            Logout →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.greeting}>
              Good to see you, {admin.name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p style={s.headerSub}>Here's what's happening with your quizzes</p>
          </div>
          <button
            style={s.newQuizBtn}
            onClick={() => navigate("/admin/create-quiz")}
          >
            + New Quiz
          </button>
        </div>

        {/* Stats cards */}
        <div style={s.statsGrid}>
          {[
            {
              label: "Total Quizzes",
              value: stats.quizzes,
              icon: "📝",
              color: "#f5a623",
            },
            {
              label: "Questions",
              value: stats.questions,
              icon: "❓",
              color: "#10b981",
            },
            {
              label: "Rooms Hosted",
              value: stats.rooms,
              icon: "🚀",
              color: "#3b82f6",
            },
            {
              label: "Total Players",
              value: stats.participants,
              icon: "👥",
              color: "#a855f7",
            },
          ].map((stat, i) => (
            <div key={i} style={s.statCard}>
              <div
                style={{
                  ...s.statIcon,
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}25`,
                }}
              >
                {stat.icon}
              </div>
              <div style={s.statVal}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={s.sectionTitle}>Quick Actions</div>
        <div style={s.actionsGrid}>
          {[
            {
              icon: "🗃",
              title: "Question Bank",
              desc: "Add, edit and manage your question library by genre and difficulty",
              action: () => navigate("/admin/questions"),
              primary: true,
            },
            {
              icon: "📝",
              title: "Create a Quiz",
              desc: "Build a new quiz by selecting questions from your bank",
              action: () => navigate("/admin/create-quiz"),
            },
            {
              icon: "🚀",
              title: "Start Live Room",
              desc: "Launch a room with a 6-char code and host a live session",
              action: () => navigate("/admin/create-quiz"),
            },
            {
              icon: "📊",
              title: "View Stats",
              desc: "See how participants performed across all your quizzes",
              action: () => navigate("/admin/exams"),
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                ...s.actionCard,
                ...(item.primary ? s.actionCardPrimary : {}),
              }}
              onClick={item.action}
            >
              <div style={s.actionIcon}>{item.icon}</div>
              <h3 style={s.actionTitle}>{item.title}</h3>
              <p style={s.actionDesc}>{item.desc}</p>
              <span style={s.actionArrow}>→</span>
            </div>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div style={s.sectionTitle}>Recent Rooms</div>
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>🚀</div>
          <p style={s.emptyText}>No rooms hosted yet</p>
          <p style={s.emptySubText}>
            Start your first live quiz room to see activity here
          </p>
          <button
            style={s.emptyBtn}
            onClick={() => navigate("/admin/create-exam")}
          >
            Start a Room
          </button>
        </div>
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
  blob1: {
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
    backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },

  // Sidebar
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
    transition: "all 0.2s",
  },
  navItemActive: {
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
  },
  navIcon: { fontSize: "1rem" },
  sidebarBottom: { display: "flex", flexDirection: "column", gap: "1rem" },
  adminInfo: { display: "flex", alignItems: "center", gap: "0.7rem" },
  adminAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: "800",
    color: "#f5a623",
    flexShrink: 0,
  },
  adminName: { fontSize: "0.78rem", fontWeight: "700", color: "#e8e0d0" },
  adminEmail: { fontSize: "0.65rem", color: "#666" },
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
    transition: "all 0.2s",
  },

  // Main
  main: {
    flex: 1,
    padding: "2rem 2.5rem",
    overflowY: "auto",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  greeting: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  headerSub: { fontSize: "0.8rem", color: "#888" },
  newQuizBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.7rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  statIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
  },
  statVal: {
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#f0e8d8",
    letterSpacing: "-0.02em",
  },
  statLabel: { fontSize: "0.72rem", color: "#888", fontWeight: "600" },

  // Actions
  sectionTitle: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "1rem",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  actionCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.3rem",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    position: "relative",
  },
  actionCardPrimary: {
    border: "1px solid rgba(245,166,35,0.25)",
    background: "rgba(245,166,35,0.04)",
  },
  actionIcon: { fontSize: "1.3rem" },
  actionTitle: {
    fontSize: "0.88rem",
    fontWeight: "700",
    color: "#f0e8d8",
  },
  actionDesc: {
    fontSize: "0.72rem",
    color: "#888",
    lineHeight: "1.5",
  },
  actionArrow: {
    fontSize: "0.8rem",
    color: "#f5a623",
    fontWeight: "700",
    marginTop: "auto",
  },

  // Empty state
  emptyState: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    textAlign: "center",
  },
  emptyIcon: { fontSize: "2rem", marginBottom: "0.5rem" },
  emptyText: { fontSize: "0.9rem", fontWeight: "700", color: "#f0e8d8" },
  emptySubText: { fontSize: "0.75rem", color: "#888", marginBottom: "1rem" },
  emptyBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.65rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
  },
};
