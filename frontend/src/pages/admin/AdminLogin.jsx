import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api"; 
import useViewport from "../../hooks/useViewport";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    if (isRegister && !form.name) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      console.log("Attempting login to:", "/auth/login");
      const res = await api.post(endpoint, body);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      navigate(res.data.admin?.is_master ? "/admin/master" : "/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />

      <div style={s.container}>

        {/* Back link */}
        <Link to="/" style={s.backLink}>← Back to home</Link>

        {/* Card */}
        <div
          style={{
            ...s.card,
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          }}
        >

          {/* Left panel */}
          <div
            style={{
              ...s.leftPanel,
              padding: isMobile ? "1.5rem" : "2.5rem",
              borderRight: isMobile ? "none" : "1px solid #1a1a1a",
              borderBottom: isMobile ? "1px solid #1a1a1a" : "none",
            }}
          >
            <div style={s.logo}>
              <div style={s.logoDot} />
              <span style={s.logoText}>QURIO</span>
            </div>
            <h1 style={s.panelTitle}>
              Host smarter.<br />
              <span style={s.panelAccent}>Quiz better.</span>
            </h1>
            <p style={s.panelSub}>
              Create live quiz rooms, manage your question bank, and run interactive sessions your audience will remember.
            </p>

            <div style={s.featureList}>
              {[
                { icon: "⚡", text: "Live quiz rooms with real-time leaderboards" },
                { icon: "🎯", text: "Streak-based scoring system" },
                { icon: "📊", text: "Live stats panel per question" },
                { icon: "🗃", text: "Reusable question bank by genre" },
              ].map((f, i) => (
                <div key={i} style={s.feature}>
                  <span style={s.featureIcon}>{f.icon}</span>
                  <span style={s.featureText}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div
            style={{
              ...s.rightPanel,
              padding: isMobile ? "1.5rem" : "2.5rem",
            }}
          >
            <div style={s.formHeader}>
              <h2 style={s.formTitle}>{isRegister ? "Create account" : "Welcome back"}</h2>
              <p style={s.formSub}>{isRegister ? "Set up your host account" : "Sign in to your host dashboard"}</p>
            </div>

            {/* Toggle */}
            <div style={s.toggle}>
              <button
                style={{ ...s.toggleBtn, ...((!isRegister) ? s.toggleActive : {}) }}
                onClick={() => { setIsRegister(false); setError(""); }}
              >
                Sign In
              </button>
              <button
                style={{ ...s.toggleBtn, ...(isRegister ? s.toggleActive : {}) }}
                onClick={() => { setIsRegister(true); setError(""); }}
              >
                Register
              </button>
            </div>

            <div style={s.formFields}>
              {isRegister && (
                <div style={s.fieldBlock}>
                  <label style={s.fieldLabel}>NAME</label>
                  <input
                    style={s.fieldInput}
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div style={s.fieldBlock}>
                <label style={s.fieldLabel}>EMAIL</label>
                <input
                  style={s.fieldInput}
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div style={s.fieldBlock}>
                <label style={s.fieldLabel}>PASSWORD</label>
                <input
                  style={s.fieldInput}
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {error && (
                <div style={s.errorBox}>
                  <span style={s.errorIcon}>⚠</span>
                  {error}
                </div>
              )}

              <button
                style={{ ...s.submitBtn, ...(loading ? s.submitBtnLoading : {}) }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              </button>
            </div>

            <p style={s.footerNote}>
              Admin access only. Students join via room code on the{" "}
              <Link to="/" style={s.homeLink}>home page</Link>.
            </p>
            <p style={s.secretNote}>Internal ops access uses the same sign-in form.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", background: "#080808",
    color: "#e8e0d0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  blob: {
    position: "fixed", top: "-150px", right: "-100px",
    width: "500px", height: "500px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grid: {
    position: "fixed", inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
    backgroundSize: "48px 48px", pointerEvents: "none",
  },
  container: {
    width: "100%", maxWidth: "900px",
    padding: "2rem", position: "relative", zIndex: 1,
  },
  backLink: {
    display: "inline-block", marginBottom: "1.5rem",
    fontSize: "0.78rem", color: "#777",
    textDecoration: "none", fontWeight: "600",
    transition: "color 0.2s",
  },

  // Card
  card: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    background: "#0f0f0f", border: "1px solid #222",
    borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 0 60px rgba(245,166,35,0.04)",
  },

  // Left panel
  leftPanel: {
    padding: "2.5rem",
    background: "#0a0a0a",
    borderRight: "1px solid #1a1a1a",
    display: "flex", flexDirection: "column", gap: "1.5rem",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "9px", height: "9px", borderRadius: "50%",
    background: "#f5a623", boxShadow: "0 0 10px rgba(245,166,35,0.7)",
  },
  logoText: {
    fontSize: "0.8rem", fontWeight: "800",
    letterSpacing: "0.22em", color: "#e8e0d0",
  },
  panelTitle: {
    fontSize: "1.7rem", fontWeight: "800",
    lineHeight: "1.2", letterSpacing: "-0.02em", color: "#f0e8d8",
  },
  panelAccent: { color: "#f5a623" },
  panelSub: { fontSize: "0.8rem", color: "#888", lineHeight: "1.7" },
  featureList: { display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "auto" },
  feature: { display: "flex", alignItems: "flex-start", gap: "0.7rem" },
  featureIcon: {
    width: "28px", height: "28px",
    background: "rgba(245,166,35,0.1)",
    border: "1px solid rgba(245,166,35,0.15)",
    borderRadius: "6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.85rem", flexShrink: 0,
  },
  featureText: { fontSize: "0.76rem", color: "#999", lineHeight: "1.5", paddingTop: "0.3rem" },

  // Right panel
  rightPanel: {
    padding: "2.5rem",
    display: "flex", flexDirection: "column", gap: "1.5rem",
  },
  formHeader: { marginBottom: "0.2rem" },
  formTitle: { fontSize: "1.2rem", fontWeight: "800", color: "#f0e8d8", marginBottom: "0.3rem" },
  formSub: { fontSize: "0.78rem", color: "#888" },

  // Toggle
  toggle: {
    display: "flex",
    background: "#141414", border: "1px solid #222",
    borderRadius: "8px", padding: "3px", gap: "3px",
  },
  toggleBtn: {
    flex: 1, padding: "0.5rem",
    background: "transparent", border: "none",
    color: "#666", fontSize: "0.82rem", fontWeight: "700",
    cursor: "pointer", borderRadius: "6px", transition: "all 0.2s",
  },
  toggleActive: {
    background: "#1e1e1e", color: "#f5a623",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },

  // Form fields
  formFields: { display: "flex", flexDirection: "column", gap: "1.1rem" },
  fieldBlock: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  fieldLabel: {
    fontSize: "0.63rem", fontWeight: "700",
    color: "#666", letterSpacing: "0.12em",
  },
  fieldInput: {
    background: "#141414", border: "1px solid #222",
    borderRadius: "8px", padding: "0.75rem 1rem",
    color: "#f0e8d8", fontSize: "0.88rem",
    outline: "none", width: "100%",
    transition: "border-color 0.2s",
    caretColor: "#f5a623",
  },

  // Error
  errorBox: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px", padding: "0.7rem 1rem",
    color: "#ef4444", fontSize: "0.78rem", fontWeight: "600",
  },
  errorIcon: { fontSize: "0.9rem" },

  // Submit
  submitBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none", color: "#080808",
    padding: "0.9rem 1.5rem", borderRadius: "8px",
    fontSize: "0.9rem", fontWeight: "800",
    cursor: "pointer", width: "100%",
    boxShadow: "0 4px 20px rgba(245,166,35,0.25)",
    transition: "all 0.2s", letterSpacing: "0.02em",
  },
  submitBtnLoading: {
    opacity: 0.6, cursor: "not-allowed",
  },

  footerNote: {
    fontSize: "0.72rem", color: "#555",
    textAlign: "center", lineHeight: "1.6",
    marginTop: "auto",
  },
  secretNote: {
    fontSize: "0.64rem",
    color: "#3f3f3f",
    textAlign: "center",
    letterSpacing: "0.03em",
  },
  homeLink: { color: "#f5a623", textDecoration: "none" },
};
