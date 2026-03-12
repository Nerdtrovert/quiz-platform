import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import Landing    from './pages/Landing';
import AdminLogin from './pages/admin/AdminLogin';

// Student pages
import WaitingRoom      from './pages/student/WaitingRoom';
import QuizRoom         from './pages/student/QuizRoom';
import StaticQuiz       from './pages/student/StaticQuiz';
import FinalLeaderboard from './pages/student/FinalLeaderboard';
import Result           from './pages/student/Result';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import QuestionBank   from './pages/admin/QuestionBank';
import CreateQuiz     from './pages/admin/CreateQuiz';
import LiveRoom from "./pages/admin/LiveRoom";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Student — live quiz flow */}
          <Route path="/waiting/:roomCode" element={<WaitingRoom />} />
          <Route path="/quiz/live/:roomCode" element={<QuizRoom />} />
          <Route path="/leaderboard/:roomCode" element={<FinalLeaderboard />} />
          <Route path="/result/:quizId" element={<Result />} />

          {/* Student — static quiz flow */}
          <Route path="/quiz/:quizId" element={<StaticQuiz />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/questions" element={<QuestionBank />} />
          <Route path="/admin/create-quiz" element={<CreateQuiz />} />
          <Route path="/admin/live" element={<LiveRoom />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
