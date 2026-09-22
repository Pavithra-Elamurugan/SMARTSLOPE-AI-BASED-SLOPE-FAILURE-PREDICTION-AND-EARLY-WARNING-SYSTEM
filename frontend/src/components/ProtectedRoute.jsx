import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import PendingApprovalPage from "../pages/PendingApprovalPage";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" style={{ padding: "40px", textAlign: "center", color: "#38bdf8" }}>
        <p>Verifying authentication session & security context...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is PENDING, render PendingApprovalPage unless navigating to /login or /register
  if (user.role === "PENDING") {
    return <PendingApprovalPage />;
  }

  // Check allowed roles for route authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return children;
}
