import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function PastRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // room detail modal
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/admin/rooms");
      setRooms(res.data.rooms);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (room_id) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/rooms/${room_id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleView = (room) => {
    setSelected(room);
    fetchDetail(room.room_id);
  };

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = (start, end) => {
    if (!start || !end) return "—";
    const ms = new Date(end) - new Date(start);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const statusColor = (status) => {
    if (status === "ended")
      return {
        color: "#10b981",
        bg: "rgba(16,185,129,0.1)",
        border: "rgba(16,185,129,0.25)",
      };
    if (status === "active")
      return {
        color: "#f5a623",
        bg: "rgba(245,166,35,0.1)",
        border: "rgba(245,166,35,0.25)",
      };
    return {
      color: "#888",
      bg: "rgba(136,136,136,0.1)",
      border: "rgba(136,136,136,0.2)",
    };
  };

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
              { icon: "🚀", label: "Start Room", path: "/admin/live" },
              {
                icon: "📊",
                label: "Past Rooms",
                path: "/admin/rooms",
                active: true,
              },
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
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Past Rooms</h1>
            <p style={s.subtitle}>All live quiz sessions you've hosted</p>
          </div>
          <button style={s.newBtn} onClick={() => navigate("/admin/live")}>
            + New Room
          </button>
        </div>

        {loading ? (
          <div style={s.emptyState}>
            <div style={s.loadingDot} />
            <p style={{ color: "#888", fontSize: "0.85rem" }}>
              Loading rooms...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>🚀</div>
            <p style={s.emptyText}>No rooms hosted yet</p>
            <p style={s.emptySubText}>
              Start your first live quiz room to see history here
            </p>
            <button style={s.startBtn} onClick={() => navigate("/admin/live")}>
              Start a Room
            </button>
          </div>
        ) : (
          <div style={s.roomsList}>
            {rooms.map((room) => {
              const sc = statusColor(room.status);
              return (
                <div key={room.room_id} style={s.roomCard}>
                  <div style={s.roomLeft}>
                    <div style={s.roomTop}>
                      <span style={s.roomCode}>{room.room_code}</span>
                      <span
                        style={{
                          ...s.statusBadge,
                          color: sc.color,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        {room.status}
                      </span>
                    </div>
                    <h3 style={s.roomTitle}>{room.quiz_title}</h3>
                    <div style={s.roomMeta}>
                      <span style={s.metaTag}>{room.genre}</span>
                      <span style={s.metaTag}>{room.difficulty}</span>
                      <span style={s.metaTag}>
                        {room.num_questions} questions
                      </span>
                    </div>
                  </div>

                  <div style={s.roomStats}>
                    <div style={s.roomStat}>
                      <span style={s.roomStatVal}>
                        {room.participant_count}
                      </span>
                      <span style={s.roomStatLbl}>Players</span>
                    </div>
                    <div style={s.roomStat}>
                      <span style={s.roomStatVal}>
                        {Math.round(room.avg_score)}
                      </span>
                      <span style={s.roomStatLbl}>Avg Score</span>
                    </div>
                    <div style={s.roomStat}>
                      <span style={s.roomStatVal}>{room.top_score || "—"}</span>
                      <span style={s.roomStatLbl}>Top Score</span>
                    </div>
                    <div style={s.roomStat}>
                      <span style={s.roomStatVal}>
                        {getDuration(room.started_at, room.ended_at)}
                      </span>
                      <span style={s.roomStatLbl}>Duration</span>
                    </div>
                  </div>

                  <div style={s.roomRight}>
                    <p style={s.roomDate}>{formatDate(room.started_at)}</p>
                    <button style={s.viewBtn} onClick={() => handleView(room)}>
                      View Results →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selected && (
        <div
          style={s.overlay}
          onClick={() => {
            setSelected(null);
            setDetail(null);
          }}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalCode}>{selected.room_code}</div>
                <h2 style={s.modalTitle}>{selected.quiz_title}</h2>
                <p style={s.modalMeta}>
                  {formatDate(selected.started_at)} ·{" "}
                  {getDuration(selected.started_at, selected.ended_at)}
                </p>
              </div>
              <button
                style={s.closeBtn}
                onClick={() => {
                  setSelected(null);
                  setDetail(null);
                }}
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div
                style={{ textAlign: "center", padding: "2rem", color: "#888" }}
              >
                Loading...
              </div>
            ) : detail?.scores?.length > 0 ? (
              <>
                <div style={s.lbHeader}>
                  <span style={s.lbCol}>Rank</span>
                  <span style={{ ...s.lbCol, flex: 2, textAlign: "left" }}>
                    Player
                  </span>
                  <span style={s.lbCol}>Score</span>
                  <span style={s.lbCol}>Correct</span>
                  <span style={s.lbCol}>Streak</span>
                </div>
                <div style={s.lbList}>
                  {detail.scores.map((s2, i) => (
                    <div key={i} style={s.lbRow}>
                      <span style={s.lbRank}>
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `#${s2.final_rank}`}
                      </span>
                      <span
                        style={{
                          ...s.lbCell,
                          flex: 2,
                          textAlign: "left",
                          fontWeight: "700",
                          color: "#f0e8d8",
                        }}
                      >
                        {s2.name}
                      </span>
                      <span
                        style={{
                          ...s.lbCell,
                          color: "#f5a623",
                          fontWeight: "800",
                        }}
                      >
                        {s2.total_points}
                      </span>
                      <span style={{ ...s.lbCell, color: "#10b981" }}>
                        {s2.correct_count}/{detail.room.num_questions}
                      </span>
                      <span style={{ ...s.lbCell, color: "#888" }}>
                        {s2.highest_streak}x
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p
                style={{
                  color: "#888",
                  textAlign: "center",
                  padding: "2rem",
                  fontSize: "0.85rem",
                }}
              >
                No score data available for this room.
              </p>
            )}
          </div>
        </div>
      )}
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
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  subtitle: { fontSize: "0.78rem", color: "#888" },
  newBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.7rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
  },
  emptyState: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
    textAlign: "center",
  },
  loadingDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 12px rgba(245,166,35,0.8)",
  },
  emptyIcon: { fontSize: "2rem", marginBottom: "0.5rem" },
  emptyText: { fontSize: "0.9rem", fontWeight: "700", color: "#f0e8d8" },
  emptySubText: { fontSize: "0.75rem", color: "#888", marginBottom: "0.5rem" },
  startBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.65rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
  },
  roomsList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  roomCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.2rem 1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
    transition: "border-color 0.2s",
  },
  roomLeft: {
    flex: 2,
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  roomTop: { display: "flex", alignItems: "center", gap: "0.6rem" },
  roomCode: {
    fontSize: "0.75rem",
    fontWeight: "800",
    color: "#f5a623",
    letterSpacing: "0.2em",
    fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
  },
  statusBadge: {
    fontSize: "0.65rem",
    fontWeight: "700",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    textTransform: "capitalize",
  },
  roomTitle: { fontSize: "0.95rem", fontWeight: "700", color: "#f0e8d8" },
  roomMeta: { display: "flex", gap: "0.4rem" },
  metaTag: {
    fontSize: "0.65rem",
    color: "#888",
    background: "#141414",
    border: "1px solid #222",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
  },
  roomStats: { display: "flex", gap: "1.5rem", flex: 2 },
  roomStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.15rem",
  },
  roomStatVal: { fontSize: "1.1rem", fontWeight: "800", color: "#f0e8d8" },
  roomStatLbl: {
    fontSize: "0.62rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  roomRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.5rem",
    flexShrink: 0,
  },
  roomDate: { fontSize: "0.72rem", color: "#666" },
  viewBtn: {
    background: "transparent",
    border: "1px solid rgba(245,166,35,0.3)",
    color: "#f5a623",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  modal: {
    background: "#0f0f0f",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "620px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 0 60px rgba(0,0,0,0.8)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
  },
  modalCode: {
    fontSize: "0.72rem",
    fontWeight: "800",
    color: "#f5a623",
    letterSpacing: "0.2em",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "0.3rem",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  modalMeta: { fontSize: "0.72rem", color: "#888" },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#888",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0.2rem",
  },
  lbHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.5rem 1rem",
    marginBottom: "0.4rem",
  },
  lbCol: {
    flex: 1,
    fontSize: "0.62rem",
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    textAlign: "center",
  },
  lbList: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  lbRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    padding: "0.7rem 1rem",
  },
  lbRank: { flex: 1, fontSize: "0.9rem", textAlign: "center" },
  lbCell: { flex: 1, fontSize: "0.82rem", textAlign: "center" },
};
