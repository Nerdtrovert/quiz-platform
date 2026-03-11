import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const GENRES = ["Science", "History", "Tech", "Mixed", "Math", "General"];
const DIFFICULTIES = ["easy", "medium", "hard"];

export default function CreateQuiz() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Mixed");
  const [difficulty, setDifficulty] = useState("medium");
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterGenre, setFilterGenre] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [search, setSearch] = useState("");
  const [loadingQ, setLoadingQ] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, [filterGenre, filterDiff]);

  const fetchQuestions = async () => {
    setLoadingQ(true);
    try {
      const params = {};
      if (filterGenre) params.genre = filterGenre;
      if (filterDiff) params.difficulty = filterDiff;
      const res = await api.get("/questions", { params });
      setAllQuestions(res.data.questions);
    } catch {
      setAllQuestions([]);
    } finally {
      setLoadingQ(false);
    }
  };

  const toggleQuestion = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredQuestions = allQuestions.filter((q) =>
    q.question_text.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedQuestions = allQuestions.filter((q) =>
    selectedIds.includes(q.question_id),
  );

  const handleSubmit = async () => {
    if (!title.trim()) return setError("Quiz title is required");
    if (selectedIds.length < 2) return setError("Select at least 2 questions");

    setSubmitting(true);
    setError("");
    try {
      await api.post("/quizzes", {
        title,
        genre,
        difficulty,
        time_per_question: timePerQuestion,
        question_ids: selectedIds,
      });
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create quiz");
    } finally {
      setSubmitting(false);
    }
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
              { icon: "📝", label: "My Quizzes", path: "/admin/exams" },
              {
                icon: "🚀",
                label: "Create Quiz",
                path: "/admin/create-quiz",
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

      {/* Main */}
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Create a Quiz</h1>
            <p style={s.subtitle}>
              Set quiz details and pick questions from your bank
            </p>
          </div>
          <button
            style={{ ...s.createBtn, ...(submitting ? { opacity: 0.6 } : {}) }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Creating..."
              : `Create Quiz (${selectedIds.length} Q)`}
          </button>
        </div>

        {error && <div style={s.errorBox}>⚠ {error}</div>}

        <div style={s.twoCol}>
          {/* Left — settings */}
          <div style={s.settingsCol}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Quiz Details</h3>

              <div style={s.fieldBlock}>
                <label style={s.label}>TITLE</label>
                <input
                  style={s.input}
                  placeholder="e.g. Science Blast Round 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={s.fieldBlock}>
                <label style={s.label}>GENRE</label>
                <select
                  style={s.select}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldBlock}>
                <label style={s.label}>DIFFICULTY</label>
                <div style={s.diffRow}>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      style={{
                        ...s.diffBtn,
                        ...(difficulty === d ? s.diffBtnActive : {}),
                      }}
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.fieldBlock}>
                <label style={s.label}>
                  TIME PER QUESTION — {timePerQuestion}s
                </label>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  style={s.slider}
                />
                <div style={s.sliderLabels}>
                  <span>10s</span>
                  <span>60s</span>
                </div>
              </div>
            </div>

            {/* Selected summary */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>
                Selected — {selectedIds.length} questions
              </h3>
              {selectedIds.length === 0 ? (
                <p style={s.emptyNote}>No questions selected yet</p>
              ) : (
                <div style={s.selectedList}>
                  {selectedQuestions.map((q, i) => (
                    <div key={q.question_id} style={s.selectedItem}>
                      <span style={s.selectedNum}>{i + 1}</span>
                      <span style={s.selectedText}>{q.question_text}</span>
                      <button
                        style={s.removeBtn}
                        onClick={() => toggleQuestion(q.question_id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — question picker */}
          <div style={s.pickerCol}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Pick from Question Bank</h3>

              <div style={s.pickerFilters}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  style={s.select}
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                >
                  <option value="">All Genres</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <select
                  style={s.select}
                  value={filterDiff}
                  onChange={(e) => setFilterDiff(e.target.value)}
                >
                  <option value="">All Diff</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {filteredQuestions.length > 0 && (
                <div style={s.selectAllRow}>
                  <span style={s.selectAllCount}>
                    {filteredQuestions.length} questions shown
                  </span>
                  <button
                    style={s.selectAllBtn}
                    onClick={() => {
                      const ids = filteredQuestions.map((q) => q.question_id);
                      const allSelected = ids.every((id) =>
                        selectedIds.includes(id),
                      );
                      if (allSelected) {
                        setSelectedIds((prev) =>
                          prev.filter((id) => !ids.includes(id)),
                        );
                      } else {
                        setSelectedIds((prev) => [
                          ...new Set([...prev, ...ids]),
                        ]);
                      }
                    }}
                  >
                    {filteredQuestions.every((q) =>
                      selectedIds.includes(q.question_id),
                    )
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
              )}

              {loadingQ ? (
                <p style={s.emptyNote}>Loading...</p>
              ) : filteredQuestions.length === 0 ? (
                <p style={s.emptyNote}>
                  No questions found. Add some in the Question Bank first.
                </p>
              ) : (
                <div style={s.pickerList}>
                  {filteredQuestions.map((q) => {
                    const selected = selectedIds.includes(q.question_id);
                    return (
                      <div
                        key={q.question_id}
                        style={{
                          ...s.pickerItem,
                          ...(selected ? s.pickerItemSelected : {}),
                        }}
                        onClick={() => toggleQuestion(q.question_id)}
                      >
                        <div
                          style={{
                            ...s.checkbox,
                            ...(selected ? s.checkboxSelected : {}),
                          }}
                        >
                          {selected && "✓"}
                        </div>
                        <div style={s.pickerItemContent}>
                          <p style={s.pickerItemText}>{q.question_text}</p>
                          <div style={s.pickerItemMeta}>
                            <span style={s.metaTag}>{q.genre}</span>
                            <span style={s.metaTag}>{q.difficulty}</span>
                            <span style={s.metaTag}>{q.base_points} pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
    backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
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
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f0e8d8",
    marginBottom: "0.3rem",
  },
  subtitle: { fontSize: "0.78rem", color: "#888" },
  createBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.7rem 1.3rem",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
    flexShrink: 0,
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px",
    padding: "0.7rem 1rem",
    color: "#ef4444",
    fontSize: "0.78rem",
    fontWeight: "600",
    marginBottom: "1rem",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: "1.5rem",
    alignItems: "start",
  },
  settingsCol: { display: "flex", flexDirection: "column", gap: "1rem" },
  pickerCol: { display: "flex", flexDirection: "column" },
  card: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  cardTitle: { fontSize: "0.88rem", fontWeight: "700", color: "#f0e8d8" },
  fieldBlock: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: {
    fontSize: "0.63rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  input: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.7rem 0.8rem",
    color: "#f0e8d8",
    fontSize: "0.85rem",
    outline: "none",
    caretColor: "#f5a623",
  },
  select: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.7rem 0.8rem",
    color: "#f0e8d8",
    fontSize: "0.82rem",
    outline: "none",
    cursor: "pointer",
  },
  diffRow: { display: "flex", gap: "0.4rem" },
  diffBtn: {
    flex: 1,
    padding: "0.5rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "6px",
    color: "#777",
    fontSize: "0.72rem",
    fontWeight: "700",
    cursor: "pointer",
    textTransform: "capitalize",
  },
  diffBtnActive: {
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.4)",
    color: "#f5a623",
  },
  slider: { width: "100%", accentColor: "#f5a623" },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.65rem",
    color: "#666",
  },
  emptyNote: {
    fontSize: "0.78rem",
    color: "#666",
    textAlign: "center",
    padding: "1rem 0",
  },
  selectedList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxHeight: "300px",
    overflowY: "auto",
  },
  selectedItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.6rem 0.8rem",
  },
  selectedNum: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.3)",
    color: "#f5a623",
    fontSize: "0.65rem",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectedText: {
    flex: 1,
    fontSize: "0.75rem",
    color: "#e8e0d0",
    lineHeight: "1.4",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: "0.75rem",
    flexShrink: 0,
  },
  pickerFilters: { display: "flex", gap: "0.6rem", flexWrap: "wrap" },
  selectAllRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.4rem 0",
    borderBottom: "1px solid #1a1a1a",
  },
  selectAllCount: { fontSize: "0.72rem", color: "#666" },
  selectAllBtn: {
    background: "none",
    border: "none",
    color: "#f5a623",
    fontSize: "0.72rem",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "underline",
  },
  pickerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxHeight: "550px",
    overflowY: "auto",
  },
  pickerItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.8rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "0.9rem",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  pickerItemSelected: {
    border: "1px solid rgba(245,166,35,0.35)",
    background: "rgba(245,166,35,0.04)",
  },
  checkbox: {
    width: "20px",
    height: "20px",
    borderRadius: "5px",
    border: "2px solid #333",
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: "800",
    color: "#080808",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  checkboxSelected: { background: "#f5a623", border: "2px solid #f5a623" },
  pickerItemContent: { flex: 1 },
  pickerItemText: {
    fontSize: "0.82rem",
    color: "#e8e0d0",
    lineHeight: "1.4",
    marginBottom: "0.4rem",
  },
  pickerItemMeta: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  metaTag: {
    fontSize: "0.6rem",
    fontWeight: "700",
    background: "#1e1e1e",
    border: "1px solid #2a2a2a",
    color: "#777",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
    textTransform: "capitalize",
  },
};