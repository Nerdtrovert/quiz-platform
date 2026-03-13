import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Landing from "./pages/Landing";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import QuestionBank from "./pages/admin/QuestionBank";
import CreateQuiz from "./pages/admin/CreateQuiz";
import LiveRoom from "./pages/admin/LiveRoom";
import PastRooms from "./pages/admin/PastRooms";
import MasterAdminDashboard from "./pages/admin/MasterAdminDashboard";
import StaticQuiz from "./pages/student/StaticQuiz";
import Result from "./pages/student/Result";
import WaitingRoom from "./pages/student/WaitingRoom";
import QuizRoom from "./pages/student/QuizRoom";
import FinalLeaderboard from "./pages/student/FinalLeaderboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/quiz/:quizId" element={<StaticQuiz />} />
          <Route path="/result/:quizId" element={<Result />} />
          <Route path="/waiting/:roomCode" element={<WaitingRoom />} />
          <Route path="/quiz/live/:roomCode" element={<QuizRoom />} />
          <Route path="/leaderboard/:roomCode" element={<FinalLeaderboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute>
                <QuestionBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-quiz"
            element={
              <ProtectedRoute>
                <CreateQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live"
            element={
              <ProtectedRoute>
                <LiveRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <ProtectedRoute>
                <PastRooms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/master"
            element={
              <ProtectedRoute requireMaster>
                <MasterAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
