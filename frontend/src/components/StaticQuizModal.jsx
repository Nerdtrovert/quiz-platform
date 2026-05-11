import { useState, useEffect } from "react";
import api from "../utils/api";

export default function StaticQuizModal({ isOpen, onClose, quiz, onSuccess }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    genre: "",
    difficulty: "medium",
    time_per_question: 30,
  });
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (quiz && isOpen) {
      setFormData({
        title: quiz.title,
        genre: quiz.genre || "",
        difficulty: quiz.difficulty || "medium",
        time_per_question: quiz.time_per_question || 30,
      });
      setIsEditing(true);
      fetchQuizDetails();
    } else {
      setIsEditing(false);
      setFormData({
        title: "",
        genre: "",
        difficulty: "medium",
        time_per_question: 30,
      });
      setSelectedQuestions([]);
    }
    fetchAvailableQuestions();
  }, [quiz, isOpen]);

  const fetchQuizDetails = async () => {
    try {
      const res = await api.get(`/admin/system/static-quizzes/${quiz.quiz_id}`);
      const questionIds = res.data.questions.map((q) => q.question_id);
      setSelectedQuestions(questionIds);
    } catch (err) {
      console.error("Error fetching quiz details:", err);
    }
  };

  const fetchAvailableQuestions = async () => {
    try {
      const res = await api.get("/questions");
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error("Error fetching questions:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "time_per_question" ? Number(value) : value,
    }));
  };

  const handleQuestionToggle = (questionId) => {
    setSelectedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.title.trim()) {
      setError("Quiz title is required");
      setIsLoading(false);
      return;
    }

    if (selectedQuestions.length === 0) {
      setError("At least one question is required");
      setIsLoading(false);
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/admin/system/static-quizzes/${quiz.quiz_id}`, {
          ...formData,
          question_ids: selectedQuestions,
        });
      } else {
        await api.post("/admin/system/static-quizzes", {
          ...formData,
          question_ids: selectedQuestions,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Error ${isEditing ? "updating" : "creating"} quiz`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>
            {isEditing ? "Edit Static Quiz" : "Create Static Quiz"}
          </h2>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>Quiz Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              style={s.input}
              placeholder="e.g., Science Blast"
              disabled={isLoading}
            />
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Genre</label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                style={s.input}
                placeholder="e.g., Science"
                disabled={isLoading}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                style={s.input}
                disabled={isLoading}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Time per Question (sec)</label>
              <select
                name="time_per_question"
                value={formData.time_per_question}
                onChange={handleInputChange}
                style={s.input}
                disabled={isLoading}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>
              Select Questions ({selectedQuestions.length} selected) *
            </label>
            <div style={s.questionsGrid}>
              {questions.map((question) => (
                <label key={question.question_id} style={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.question_id)}
                    onChange={() =>
                      handleQuestionToggle(question.question_id)
                    }
                    disabled={isLoading}
                    style={s.checkbox}
                  />
                  <span style={s.checkboxText}>
                    {question.question_text.substring(0, 50)}...
                  </span>
                </label>
              ))}
            </div>
            {questions.length === 0 && (
              <div style={s.noQuestions}>
                No questions available. Please create questions first.
              </div>
            )}
          </div>

          <div style={s.actions}>
            <button
              type="button"
              style={s.cancelBtn}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={s.submitBtn}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : isEditing
                  ? "Update Quiz"
                  : "Create Quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#0f0c0c",
    border: "1px solid #241d1b",
    borderRadius: "18px",
    padding: "2rem",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    color: "#f6ead7",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 800,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#f6ead7",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  error: {
    background: "rgba(239,68,68,0.2)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#f6ead7",
  },
  input: {
    background: "#161111",
    border: "1px solid #2d2421",
    color: "#f6ead7",
    padding: "0.75rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontFamily: "inherit",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "1rem",
  },
  questionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "0.75rem",
    maxHeight: "300px",
    overflowY: "auto",
    padding: "0.75rem",
    background: "#161111",
    borderRadius: "10px",
    border: "1px solid #2d2421",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "8px",
    transition: "background 0.2s",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "#7c3aed",
  },
  checkboxText: {
    fontSize: "0.85rem",
    color: "#d0c4b8",
  },
  noQuestions: {
    padding: "1rem",
    background: "#161111",
    borderRadius: "10px",
    color: "#8f8177",
    fontSize: "0.9rem",
    textAlign: "center",
  },
  actions: {
    display: "flex",
    gap: "0.8rem",
    justifyContent: "flex-end",
    marginTop: "1.5rem",
  },
  cancelBtn: {
    border: "1px solid #2d2421",
    background: "transparent",
    color: "#f6ead7",
    padding: "0.75rem 1.5rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  submitBtn: {
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "none",
    color: "#fff7ed",
    padding: "0.75rem 1.5rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
