import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({
  children,
  requireMaster = false,
  redirectTo = "/admin/login",
}) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const admin = JSON.parse(localStorage.getItem("admin") || "null");

  if (!token || !admin) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requireMaster && !admin.is_master) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  return children;
}
