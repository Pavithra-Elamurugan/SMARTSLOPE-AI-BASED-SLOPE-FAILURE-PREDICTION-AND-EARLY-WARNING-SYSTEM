import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaultRoute = user?.role === "ADMIN" ? "/" : "/location-monitoring";

  return (
    <div className="command-app">
      <Sidebar collapsed={false} onToggle={() => {}} />
      <div className="command-main">
        <Header title="403 - Access Denied" onNotification={() => {}} />
        <main className="module-content flex-center-content">
          <div className="access-denied-card">
            <div className="denied-icon">🛑</div>
            <span className="eyebrow danger">AUTHORIZATION RESTRICTION</span>
            <h1>Access Denied</h1>
            <p>
              Your user account role <strong>{user?.role || "UNAUTHORIZED"}</strong> does not have permission to access this module or operational resource.
            </p>
            <div className="denied-actions">
              <button className="primary-action" onClick={() => navigate(defaultRoute)}>
                Return to Permitted Operations
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
