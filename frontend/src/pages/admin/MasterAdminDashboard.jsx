import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function MasterAdminDashboard() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const [overview, setOverview] = useState({
    admins: 0,
    quizzes: 0,
    static_attempts: 0,
    live_participants: 0,
    total_live_points: 0,
    active_live_rooms: 0,
  });
  const [liveRooms, setLiveRooms] = useState([]);
  const [staticQuizzes, setStaticQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (!admin.is_master) {
      navigate("/admin");
      return;
    }
    fetchAll();
  }, [admin.is_master, navigate, selectedQuizId]);

  const fetchAll = async () => {
    try {
      const [overviewRes, liveRes, staticRes] = await Promise.all([
        api.get("/admin/system/overview"),
        api.get("/admin/system/live-rooms"),
        api.get("/admin/system/static-attempts", {
          params: selectedQuizId ? { quiz_id: selectedQuizId } : {},
        }),
      ]);

      setOverview(overviewRes.data);
      setLiveRooms(liveRes.data.rooms || []);
      setStaticQuizzes(staticRes.data.quizzes || []);
      setAttempts(staticRes.data.attempts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  const handleKickParticipant = async (roomCode, participantId) => {
    await api.delete(
      `/admin/system/live-rooms/${roomCode}/participants/${participantId}`,
    );
    fetchAll();
  };

  const handleEndRoom = async (roomCode) => {
    await api.post(`/admin/system/live-rooms/${roomCode}/end`);
    fetchAll();
  };

  const handleDeleteAttempt = async (attemptId) => {
    await api.delete(`/admin/system/static-attempts/${attemptId}`);
    fetchAll();
  };

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <div>
          <div style={s.logoRow}>
            <div style={s.logoDot} />
            <div>
              <div style={s.logoText}>QURIO OPS</div>
              <div style={s.logoSub}>master console</div>
            </div>
          </div>
          <div style={s.sideNote}>
            Full visibility into live rooms, hosts, and static leaderboard
            attempts.
          </div>
        </div>
        <div>
          <div style={s.profileCard}>
            <div style={s.profileName}>{admin.name}</div>
            <div style={s.profileMail}>{admin.email}</div>
          </div>
          <button style={s.ghostBtn} onClick={fetchAll}>
            Refresh
          </button>
          <button style={s.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.hero}>
          <div>
            <h1 style={s.title}>Master Admin Dashboard</h1>
            <p style={s.subtitle}>
              Cross-room control, moderation, and project-wide visibility.
            </p>
          </div>
        </div>

        <div style={s.statGrid}>
          {[
            ["Admins", overview.admins],
            ["Quizzes", overview.quizzes],
            ["Active Rooms", overview.active_live_rooms],
            ["Live Participants", overview.live_participants],
            ["Static Attempts", overview.static_attempts],
            ["Live Points", overview.total_live_points],
          ].map(([label, value]) => (
            <div key={label} style={s.statCard}>
              <div style={s.statLabel}>{label}</div>
              <div style={s.statValue}>{value}</div>
            </div>
          ))}
        </div>

        <section style={s.section}>
          <div style={s.sectionHead}>
            <h2 style={s.sectionTitle}>Running Live Rooms</h2>
          </div>
          {liveRooms.length === 0 ? (
            <div style={s.empty}>No active rooms right now.</div>
          ) : (
            <div style={s.roomList}>
              {liveRooms.map((room) => (
                <div key={room.room_code} style={s.roomCard}>
                  <div style={s.roomTop}>
                    <div>
                      <div style={s.roomCode}>{room.room_code}</div>
                      <div style={s.roomTitle}>
                        {room.quiz_title || "Untitled quiz"}
                      </div>
                      <div style={s.roomMeta}>
                        Host: {room.host_name} · {room.participant_count} players
                        · Q{room.current_question_index + 1}/
                        {room.total_questions || 0}
                      </div>
                    </div>
                    <div style={s.roomActions}>
                      <button
                        style={s.warnBtn}
                        onClick={() => handleEndRoom(room.room_code)}
                      >
                        End Room
                      </button>
                    </div>
                  </div>

                  <div style={s.participantList}>
                    {room.participants.length === 0 ? (
                      <div style={s.smallEmpty}>No live participants.</div>
                    ) : (
                      room.participants.map((participant) => (
                        <div
                          key={participant.participant_id}
                          style={s.participantRow}
                        >
                          <div>
                            <div style={s.participantName}>
                              {participant.name}
                            </div>
                            <div style={s.participantMeta}>
                              {participant.score} pts · streak{" "}
                              {participant.streak}
                            </div>
                          </div>
                          <button
                            style={s.tableDangerBtn}
                            onClick={() =>
                              handleKickParticipant(
                                room.room_code,
                                participant.participant_id,
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={s.section}>
          <div style={s.sectionHead}>
            <h2 style={s.sectionTitle}>Static Quiz Oversight</h2>
            <select
              style={s.select}
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
            >
              <option value="">All static quizzes</option>
              {staticQuizzes.map((quiz) => (
                <option key={quiz.quiz_id} value={quiz.quiz_id}>
                  {quiz.quiz_title}
                </option>
              ))}
            </select>
          </div>

          <div style={s.quizSummaryGrid}>
            {staticQuizzes.map((quiz) => (
              <div key={quiz.quiz_id} style={s.quizSummaryCard}>
                <div style={s.quizSummaryTitle}>{quiz.quiz_title}</div>
                <div style={s.quizSummaryMeta}>
                  {quiz.attempts} attempts · avg {Math.round(quiz.avg_score)} pts
                </div>
                <div style={s.quizSummaryTop}>
                  Best {quiz.top_score} pts · fastest {quiz.best_time_ms} ms
                </div>
              </div>
            ))}
          </div>

          {selectedQuizId && (
            <div style={s.attemptTable}>
              {attempts.length === 0 ? (
                <div style={s.empty}>No attempts for this static quiz yet.</div>
              ) : (
                attempts.map((attempt) => (
                  <div key={attempt.attempt_id} style={s.attemptRow}>
                    <div>
                      <div style={s.participantName}>{attempt.player_name}</div>
                      <div style={s.participantMeta}>
                        Rank #{attempt.final_rank || "-"} ·{" "}
                        {attempt.correct_count} correct · {attempt.time_taken_ms}{" "}
                        ms
                      </div>
                    </div>
                    <div style={s.attemptScore}>{attempt.total_points} pts</div>
                    <button
                      style={s.tableDangerBtn}
                      onClick={() => handleDeleteAttempt(attempt.attempt_id)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    background:
      "radial-gradient(circle at top right, rgba(193,59,47,0.12), transparent 35%), #070707",
    color: "#f6ead7",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  sidebar: {
    borderRight: "1px solid #1f1a18",
    background: "rgba(12,10,10,0.95)",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1.2rem",
  },
  logoRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    background: "#ef4444",
    boxShadow: "0 0 18px rgba(239,68,68,0.55)",
  },
  logoText: { fontSize: "0.88rem", fontWeight: 800, letterSpacing: "0.2em" },
  logoSub: { fontSize: "0.72rem", color: "#91847a", textTransform: "uppercase" },
  sideNote: {
    marginTop: "1rem",
    color: "#8e8075",
    fontSize: "0.8rem",
    lineHeight: 1.7,
  },
  profileCard: {
    padding: "1rem",
    borderRadius: "14px",
    background: "#120f0f",
    border: "1px solid #241d1b",
    marginBottom: "1rem",
  },
  profileName: { fontSize: "0.92rem", fontWeight: 700 },
  profileMail: { fontSize: "0.75rem", color: "#8e8075", marginTop: "0.2rem" },
  ghostBtn: {
    width: "100%",
    marginBottom: "0.7rem",
    padding: "0.8rem",
    borderRadius: "10px",
    border: "1px solid #2f2724",
    background: "transparent",
    color: "#f6ead7",
    cursor: "pointer",
  },
  logoutBtn: {
    width: "100%",
    padding: "0.8rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #c2410c)",
    color: "#fff7ed",
    fontWeight: 700,
    cursor: "pointer",
  },
  main: { padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: "1.8rem", margin: 0, fontWeight: 800 },
  subtitle: { marginTop: "0.4rem", color: "#9f9187" },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
  },
  statCard: {
    background: "#110f0f",
    border: "1px solid #241d1b",
    borderRadius: "16px",
    padding: "1rem 1.1rem",
  },
  statLabel: {
    color: "#978980",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  statValue: { marginTop: "0.45rem", fontSize: "1.8rem", fontWeight: 800 },
  section: {
    background: "#0f0c0c",
    border: "1px solid #241d1b",
    borderRadius: "18px",
    padding: "1.25rem",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  sectionTitle: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  empty: {
    borderRadius: "12px",
    padding: "1rem",
    background: "#161111",
    color: "#8f8177",
  },
  roomList: { display: "grid", gap: "1rem" },
  roomCard: {
    padding: "1rem",
    borderRadius: "16px",
    background: "#140f0f",
    border: "1px solid #2a201d",
  },
  roomTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1rem",
  },
  roomCode: {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "#fda4af",
    fontSize: "0.78rem",
  },
  roomTitle: { marginTop: "0.35rem", fontWeight: 800, fontSize: "1rem" },
  roomMeta: { marginTop: "0.35rem", color: "#93857b", fontSize: "0.8rem" },
  roomActions: { display: "flex", gap: "0.6rem" },
  warnBtn: {
    border: "none",
    borderRadius: "10px",
    padding: "0.7rem 1rem",
    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
    color: "#fff7ed",
    fontWeight: 700,
    cursor: "pointer",
    height: "fit-content",
  },
  participantList: { display: "grid", gap: "0.75rem" },
  smallEmpty: { color: "#8f8177", fontSize: "0.82rem" },
  participantRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    padding: "0.85rem 0.9rem",
    borderRadius: "12px",
    background: "#1a1414",
  },
  participantName: { fontWeight: 700, fontSize: "0.9rem" },
  participantMeta: { fontSize: "0.78rem", color: "#8f8177", marginTop: "0.2rem" },
  tableDangerBtn: {
    border: "1px solid rgba(248,113,113,0.35)",
    background: "transparent",
    color: "#fca5a5",
    borderRadius: "10px",
    padding: "0.55rem 0.8rem",
    cursor: "pointer",
  },
  select: {
    background: "#181212",
    border: "1px solid #2d2421",
    color: "#f6ead7",
    borderRadius: "10px",
    padding: "0.7rem 0.8rem",
  },
  quizSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.9rem",
    marginBottom: "1rem",
  },
  quizSummaryCard: {
    borderRadius: "14px",
    padding: "1rem",
    background: "#151010",
    border: "1px solid #2a201d",
  },
  quizSummaryTitle: { fontWeight: 800 },
  quizSummaryMeta: { marginTop: "0.35rem", color: "#91847a", fontSize: "0.8rem" },
  quizSummaryTop: { marginTop: "0.5rem", color: "#fda4af", fontSize: "0.8rem" },
  attemptTable: { display: "grid", gap: "0.8rem" },
  attemptRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    gap: "1rem",
    padding: "0.9rem 1rem",
    borderRadius: "12px",
    background: "#171111",
  },
  attemptScore: { fontWeight: 800, color: "#fdba74" },
};
