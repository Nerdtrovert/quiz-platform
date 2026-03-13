import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function WaitingRoom() {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  const socketRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | waiting | error | kicked | ended
  const [participantCount, setParticipantCount] = useState(0);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { room_code: roomCode, name: playerName });
    });

    socket.on("joined-room", ({ participant_id, quiz_id }) => {
      // Store for use in quiz room
      sessionStorage.setItem("participant_id", participant_id);
      sessionStorage.setItem("quiz_id", quiz_id);
      sessionStorage.setItem("player_name", playerName);
      sessionStorage.setItem("room_code", roomCode);
      setStatus("waiting");
    });

    socket.on("participant-joined", ({ count, participants }) => {
      setParticipantCount(count);
      setParticipants(participants || []);
    });

    socket.on("quiz-started", () => {
      navigate(`/quiz/live/${roomCode}`);
    });

    socket.on("quiz-end", () => {
      setStatus("ended");
      socket.disconnect();
    });

    socket.on("kicked", () => {
      setStatus("kicked");
      socket.disconnect();
    });

    socket.on("error", () => {
      setStatus("error");
    });

    socket.on("connect_error", () => {
      setStatus("error");
    });

    return () => socket.disconnect();
  }, [roomCode, playerName]);

  if (status === "kicked")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <div style={s.errorIcon}>🚫</div>
            <h2 style={s.cardTitle}>You've been removed</h2>
            <p style={s.cardSub}>The host removed you from this room.</p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );

  if (status === "error")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <div style={s.errorIcon}>❌</div>
            <h2 style={s.cardTitle}>Room not found</h2>
            <p style={s.cardSub}>
              The room code{" "}
              <strong style={{ color: "#f5a623" }}>{roomCode}</strong> doesn't
              exist or the quiz has already started.
            </p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );

  if (status === "ended")
    return (
      <div style={s.page}>
        <div style={s.blob} />
        <div style={s.grid} />
        <div style={s.centered}>
          <div style={s.card}>
            <div style={s.errorIcon}>🏁</div>
            <h2 style={s.cardTitle}>Room closed</h2>
            <p style={s.cardSub}>The host ended this live room.</p>
            <button style={s.homeBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.grid} />
      <div style={s.centered}>
        <div style={s.card}>
          <div style={s.logo}>
            <div style={s.logoDot} />
            <span style={s.logoText}>QUIZLIVE</span>
          </div>

          <div style={s.roomBadge}>{roomCode}</div>

          <div style={s.playerInfo}>
            <div style={s.playerAvatar}>{playerName[0]?.toUpperCase()}</div>
            <div>
              <div style={s.playerName}>{playerName}</div>
              <div style={s.playerStatus}>
                {status === "connecting"
                  ? "Connecting..."
                  : "You're in! Waiting for host..."}
              </div>
            </div>
          </div>

          {/* Animated waiting indicator */}
          <div style={s.waitingIndicator}>
            <div style={s.dot1} />
            <div style={s.dot2} />
            <div style={s.dot3} />
          </div>

          <p style={s.waitingText}>
            {participantCount > 0
              ? `${participantCount} player${participantCount === 1 ? "" : "s"} in the room`
              : "Waiting for others to join..."}
          </p>

          {/* Participants list */}
          {participants.length > 0 && (
            <div style={s.participantsList}>
              {participants.map((p) => (
                <div key={p.participant_id} style={s.participantChip}>
                  <span style={s.chipAvatar}>{p.name[0].toUpperCase()}</span>
                  <span style={s.chipName}>{p.name}</span>
                </div>
              ))}
            </div>
          )}

          <p style={s.startHint}>The quiz will start when the host is ready</p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
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
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "fixed",
    top: "-150px",
    left: "-100px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
    textAlign: "center",
    boxShadow: "0 0 60px rgba(245,166,35,0.04)",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  logoDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5a623",
    boxShadow: "0 0 8px rgba(245,166,35,0.7)",
  },
  logoText: {
    fontSize: "0.75rem",
    fontWeight: "800",
    letterSpacing: "0.2em",
    color: "#e8e0d0",
  },
  roomBadge: {
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.2)",
    color: "#f5a623",
    padding: "0.4rem 1.5rem",
    borderRadius: "999px",
    fontSize: "1.1rem",
    fontWeight: "800",
    letterSpacing: "0.3em",
    fontFamily: "'JetBrains Mono', monospace",
  },
  playerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "10px",
    padding: "0.8rem 1rem",
    width: "100%",
  },
  playerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    border: "1px solid rgba(245,166,35,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
    fontWeight: "800",
    color: "#f5a623",
    flexShrink: 0,
  },
  playerName: { fontSize: "0.9rem", fontWeight: "700", color: "#f0e8d8" },
  playerStatus: { fontSize: "0.72rem", color: "#888" },
  waitingIndicator: { display: "flex", gap: "0.4rem", alignItems: "center" },
  dot1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s ease-in-out 0s infinite",
  },
  dot2: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s ease-in-out 0.2s infinite",
  },
  dot3: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#f5a623",
    animation: "bounce 1.4s ease-in-out 0.4s infinite",
  },
  waitingText: { fontSize: "0.82rem", color: "#888" },
  participantsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    justifyContent: "center",
    width: "100%",
  },
  participantChip: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "#141414",
    border: "1px solid #222",
    borderRadius: "999px",
    padding: "0.25rem 0.7rem",
  },
  chipAvatar: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "rgba(245,166,35,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.6rem",
    fontWeight: "800",
    color: "#f5a623",
  },
  chipName: { fontSize: "0.72rem", fontWeight: "600", color: "#e8e0d0" },
  startHint: { fontSize: "0.72rem", color: "#555" },
  errorIcon: { fontSize: "2.5rem" },
  cardTitle: { fontSize: "1.1rem", fontWeight: "800", color: "#f0e8d8" },
  cardSub: { fontSize: "0.8rem", color: "#888", lineHeight: "1.6" },
  homeBtn: {
    background: "linear-gradient(135deg, #f5a623, #e8940f)",
    border: "none",
    color: "#080808",
    padding: "0.75rem 2rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
  },
};
