import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Landing from "./pages/Landing";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MasterAdminDashboard from "./pages/admin/MasterAdminDashboard";
import QuestionBank from "./pages/admin/QuestionBank";
import CreateQuiz from "./pages/admin/CreateQuiz";
import LiveRoom from "./pages/admin/LiveRoom";
import PastRooms from "./pages/admin/PastRooms";
import StaticQuiz from "./pages/student/StaticQuiz";
import Result from "./pages/student/Result";
import WaitingRoom from "./pages/student/WaitingRoom";
import QuizRoom from "./pages/student/QuizRoom";
import FinalLeaderboard from "./pages/student/FinalLeaderboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/quiz/:quizId" element={<StaticQuiz />} />
            <Route path="/result/:quizId" element={<Result />} />
            <Route path="/waiting/:roomCode" element={<WaitingRoom />} />
            <Route path="/quiz/live/:roomCode" element={<QuizRoom />} />
            <Route
              path="/leaderboard/:roomCode"
              element={<FinalLeaderboard />}
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/master" element={<MasterAdminDashboard />} />
            <Route path="/admin/questions" element={<QuestionBank />} />
            <Route path="/admin/create-quiz" element={<CreateQuiz />} />
            <Route path="/admin/live" element={<LiveRoom />} />
            <Route path="/admin/rooms" element={<PastRooms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <div style={footerStyle}>Copyright 2026 Qurio. All rights reserved.</div>
        </>
      </BrowserRouter>
    </AuthProvider>
  );
}

const footerStyle = {
  position: "fixed",
  left: "50%",
  bottom: "10px",
  transform: "translateX(-50%)",
  fontSize: "0.68rem",
  color: "#5f5f5f",
  letterSpacing: "0.04em",
  zIndex: 999,
  pointerEvents: "none",
};
