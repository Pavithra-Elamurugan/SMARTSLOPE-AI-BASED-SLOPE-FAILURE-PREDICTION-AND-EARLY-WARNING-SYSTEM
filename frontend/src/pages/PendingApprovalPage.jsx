import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { authApi } from "../services/api";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleRefreshStatus = async () => {
    setChecking(true);
    setStatusMessage("");
    try {
      const updatedUser = await authApi.me();
      if (updatedUser && updatedUser.role !== "PENDING") {
        localStorage.setItem("smartslope_user", JSON.stringify(updatedUser));
        window.location.reload();
      } else {
        setStatusMessage("Account role is still PENDING. Please contact system administrator.");
      }
    } catch (err) {
      console.error("Error refreshing profile status:", err);
      setStatusMessage("Could not refresh account status. Please try signing in again later.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="login-container flex-center-content">
      <div className="login-card" style={{ maxWidth: "520px", textAlign: "center" }}>
        <div className="login-brand" style={{ justifyContent: "center", marginBottom: "20px" }}>
          <div className="brand-symbol">S</div>
          <div>
            <strong>SMART<span>SLOPE</span></strong>
            <small>COMMAND CENTER</small>
          </div>
        </div>

        <div style={{ fontSize: "44px", marginBottom: "12px" }}>⏳</div>

        <span className="eyebrow warn" style={{ fontSize: "11px", letterSpacing: "1px", fontWeight: "700" }}>
          REGISTRATION COMPLETE · PENDING APPROVAL
        </span>

        <h2 style={{ color: "#fff", marginTop: "8px", marginBottom: "12px" }}>
          Account Pending Admin Approval
        </h2>

        <p style={{ color: "#aebfca", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          Hello, <strong>{user?.name || "User"}</strong> ({user?.email}). Your account has been registered successfully in MySQL, but currently holds the <strong>PENDING</strong> access role.
        </p>

        <div style={{
          background: "#0d1b2a",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "16px",
          textAlign: "left",
          fontSize: "13px",
          color: "#cbd5e1",
          marginBottom: "24px"
        }}>
          <strong style={{ color: "var(--cyan)", display: "block", marginBottom: "6px" }}>What happens next?</strong>
          <ul style={{ paddingLeft: "18px", margin: 0, lineHeight: "1.7" }}>
            <li>An <strong>ADMIN</strong> must assign your role (<strong>ENGINEER</strong> or <strong>SAFETY_OFFICER</strong>) in User Management.</li>
            <li>No operational features (Sensors, Maps, Predictions) are accessible until your role is assigned.</li>
          </ul>
        </div>

        {statusMessage && (
          <div className="login-error-alert" style={{ marginBottom: "16px", fontSize: "13px" }}>
            {statusMessage}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            className="primary-action"
            onClick={handleRefreshStatus}
            disabled={checking}
            style={{ padding: "10px 18px", fontSize: "13px" }}
          >
            {checking ? "Checking status..." : "Check Approval Status ↻"}
          </button>
          <button
            className="secondary-action"
            onClick={logout}
            style={{ padding: "10px 18px", fontSize: "13px" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
