import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const GENRES = ["Science", "History", "Tech", "Mixed", "Math", "General"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const POINTS = { easy: 500, medium: 750, hard: 1000 };

const emptyForm = {
  question_text: "",
  genre: "Science",
  difficulty: "medium",
  base_points: 750,
  options: [
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ],
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [filterGenre, filterDiff]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterGenre) params.genre = filterGenre;
      if (filterDiff) params.difficulty = filterDiff;
      const res = await api.get("/questions", { params });
      setQuestions(res.data.questions);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const opts = [...form.options];
    opts[index] = { ...opts[index], option_text: value };
    setForm({ ...form, options: opts });
  };

  const handleCorrectOption = (index) => {
    const opts = form.options.map((o, i) => ({
      ...o,
      is_correct: i === index,
    }));
    setForm({ ...form, options: opts });
  };

  const handleDifficultyChange = (diff) => {
    setForm({ ...form, difficulty: diff, base_points: POINTS[diff] });
  };

  const handleSubmit = async () => {
    if (!form.question_text.trim())
      return setError("Question text is required");
    if (form.options.some((o) => !o.option_text.trim()))
      return setError("All 4 options must be filled");
    if (!form.options.some((o) => o.is_correct))
      return setError("Select one correct answer");

    setSubmitting(true);
    setError("");
    try {
      await api.post("/questions", form);
      setForm(emptyForm);
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions(questions.filter((q) => q.question_id !== id));
    } catch {
      alert("Failed to delete question");
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
              {
                icon: "🗃",
                label: "Question Bank",
                path: "/admin/questions",
                active: true,
              },
              { icon: "📝", label: "Create Quiz", path: "/admin/create-quiz" },
              { icon: "🚀", label: "Start Room", path: "/admin/live" },
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
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Question Bank</h1>
            <p style={s.subtitle}>
              {questions.length} questions · reusable across all quizzes
            </p>
          </div>
          <button
            style={s.addBtn}
            onClick={() => {
              setShowForm(!showForm);
              setError("");
            }}
          >
            {showForm ? "✕ Cancel" : "+ Add Question"}
          </button>
        </div>

        {/* Add Question Form */}
        {showForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>New Question</h3>

            <div style={s.fieldBlock}>
              <label style={s.label}>QUESTION</label>
              <textarea
                style={s.textarea}
                placeholder="Type your question here..."
                value={form.question_text}
                onChange={(e) =>
                  setForm({ ...form, question_text: e.target.value })
                }
                rows={3}
              />
            </div>

            <div style={s.formRow}>
              <div style={s.fieldBlock}>
                <label style={s.label}>GENRE</label>
                <select
                  style={s.select}
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
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
                        ...(form.difficulty === d ? s.diffBtnActive : {}),
                      }}
                      onClick={() => handleDifficultyChange(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.fieldBlock}>
                <label style={s.label}>BASE POINTS</label>
                <div style={s.pointsBadge}>{form.base_points} pts</div>
              </div>
            </div>

            <div style={s.fieldBlock}>
              <label style={s.label}>
                OPTIONS — click circle to mark correct
              </label>
              <div style={s.optionsGrid}>
                {form.options.map((opt, i) => (
                  <div
                    key={i}
                    style={{
                      ...s.optionRow,
                      ...(opt.is_correct ? s.optionRowCorrect : {}),
                    }}
                  >
                    <button
                      style={{
                        ...s.correctCircle,
                        ...(opt.is_correct ? s.correctCircleActive : {}),
                      }}
                      onClick={() => handleCorrectOption(i)}
                    >
                      {opt.is_correct ? "✓" : i + 1}
                    </button>
                    <input
                      style={s.optionInput}
                      placeholder={`Option ${i + 1}`}
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <div style={s.errorBox}>⚠ {error}</div>}

            <button
              style={{
                ...s.submitBtn,
                ...(submitting ? { opacity: 0.6 } : {}),
              }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Question"}
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={s.filters}>
          <select
            style={s.filterSelect}
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
            style={s.filterSelect}
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {(filterGenre || filterDiff) && (
            <button
              style={s.clearFilter}
              onClick={() => {
                setFilterGenre("");
                setFilterDiff("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Questions list */}
        {loading ? (
          <div style={s.loadingState}>Loading questions...</div>
        ) : questions.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: "2rem" }}>🗃</div>
            <p style={{ color: "#f0e8d8", fontWeight: "700" }}>
              No questions yet
            </p>
            <p style={{ color: "#888", fontSize: "0.8rem" }}>
              Click "+ Add Question" to get started
            </p>
          </div>
        ) : (
          <div style={s.questionList}>
            {questions.map((q) => (
              <div key={q.question_id} style={s.questionCard}>
                <div style={s.questionTop}>
                  <div style={s.questionMeta}>
                    <span style={s.genreTag}>{q.genre}</span>
                    <span
                      style={{
                        ...s.diffTag,
                        ...(s.diffColors[q.difficulty] || {}),
                      }}
                    >
                      {q.difficulty}
                    </span>
                    <span style={s.pointsTag}>{q.base_points} pts</span>
                  </div>
                  <div style={s.questionActions}>
                    <button
                      style={s.expandBtn}
                      onClick={() =>
                        setExpandedQ(
                          expandedQ === q.question_id ? null : q.question_id,
                        )
                      }
                    >
                      {expandedQ === q.question_id ? "Hide" : "View"} options
                    </button>
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(q.question_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={s.questionText}>{q.question_text}</p>
                {expandedQ === q.question_id && (
                  <div style={s.optionsList}>
                    {(typeof q.options === "string"
                      ? JSON.parse(q.options)
                      : q.options
                    )
                      .sort((a, b) => a.option_number - b.option_number)
                      .map((opt, i) => (
                        <div
                          key={i}
                          style={{
                            ...s.optionItem,
                            ...(opt.is_correct ? s.optionItemCorrect : {}),
                          }}
                        >
                          <span style={s.optionNum}>{opt.option_number}</span>
                          <span style={s.optionText}>{opt.option_text}</span>
                          {opt.is_correct && (
                            <span style={s.correctTag}>✓ Correct</span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
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
  addBtn: {
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

  // Form
  formCard: {
    background: "#0f0f0f",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "14px",
    padding: "1.8rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  formTitle: { fontSize: "1rem", fontWeight: "700", color: "#f0e8d8" },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  fieldBlock: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label: {
    fontSize: "0.63rem",
    fontWeight: "700",
    color: "#666",
    letterSpacing: "0.12em",
  },
  textarea: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.8rem",
    color: "#f0e8d8",
    fontSize: "0.85rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
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
    padding: "0.5rem 0.3rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "6px",
    color: "#777",
    fontSize: "0.72rem",
    fontWeight: "700",
    cursor: "pointer",
    textTransform: "capitalize",
    transition: "all 0.2s",
  },
  diffBtnActive: {
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.4)",
    color: "#f5a623",
  },
  pointsBadge: {
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    borderRadius: "8px",
    padding: "0.7rem 0.8rem",
    color: "#f5a623",
    fontWeight: "800",
    fontSize: "0.9rem",
  },
  optionsGrid: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.6rem 0.8rem",
    transition: "all 0.2s",
  },
  optionRowCorrect: {
    border: "1px solid rgba(16,185,129,0.4)",
    background: "rgba(16,185,129,0.05)",
  },
  correctCircle: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#1a1a1a",
    border: "2px solid #333",
    color: "#666",
    fontSize: "0.72rem",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  correctCircleActive: {
    background: "#10b981",
    border: "2px solid #10b981",
    color: "white",
  },
  optionInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#f0e8d8",
    fontSize: "0.85rem",
    outline: "none",
    caretColor: "#f5a623",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px",
    padding: "0.7rem 1rem",
    color: "#ef4444",
    fontSize: "0.78rem",
    fontWeight: "600",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.85rem",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.2)",
  },

  // Filters
  filters: {
    display: "flex",
    gap: "0.7rem",
    marginBottom: "1.2rem",
    alignItems: "center",
  },
  filterSelect: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "0.55rem 0.8rem",
    color: "#e8e0d0",
    fontSize: "0.78rem",
    outline: "none",
    cursor: "pointer",
  },
  clearFilter: {
    background: "transparent",
    border: "none",
    color: "#f5a623",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "underline",
  },

  // Question list
  questionList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  questionCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "1.2rem",
    transition: "border-color 0.2s",
  },
  questionTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.6rem",
  },
  questionMeta: { display: "flex", alignItems: "center", gap: "0.5rem" },
  genreTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    letterSpacing: "0.04em",
  },
  diffTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    letterSpacing: "0.04em",
    textTransform: "capitalize",
  },
  diffColors: {
    easy: {
      background: "rgba(16,185,129,0.1)",
      color: "#10b981",
      border: "1px solid rgba(16,185,129,0.2)",
    },
    medium: {
      background: "rgba(245,166,35,0.1)",
      color: "#f5a623",
      border: "1px solid rgba(245,166,35,0.2)",
    },
    hard: {
      background: "rgba(239,68,68,0.1)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.2)",
    },
  },
  pointsTag: { fontSize: "0.65rem", color: "#666" },
  questionActions: { display: "flex", gap: "0.5rem" },
  expandBtn: {
    background: "transparent",
    border: "1px solid #222",
    color: "#888",
    padding: "0.3rem 0.7rem",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "#ef4444",
    padding: "0.3rem 0.7rem",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  questionText: { fontSize: "0.88rem", color: "#f0e8d8", lineHeight: "1.5" },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginTop: "0.8rem",
  },
  optionItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    padding: "0.6rem 0.8rem",
  },
  optionItemCorrect: {
    border: "1px solid rgba(16,185,129,0.3)",
    background: "rgba(16,185,129,0.05)",
  },
  optionNum: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#222",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    fontWeight: "800",
    color: "#888",
    flexShrink: 0,
  },
  optionText: { flex: 1, fontSize: "0.82rem", color: "#e8e0d0" },
  correctTag: { fontSize: "0.65rem", color: "#10b981", fontWeight: "700" },
  loadingState: {
    textAlign: "center",
    color: "#888",
    padding: "3rem",
    fontSize: "0.85rem",
  },
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
};
