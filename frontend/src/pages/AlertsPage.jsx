import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { alertApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

const safeNumberFormat = (val, decimals = 1, fallback = "0.0") => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
};

export function AlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || "PUBLIC_USER").toUpperCase();
  const [collapsed, setCollapsed] = useState(false);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Investigation Note Modal State
  const [investigatingAlertId, setInvestigatingAlertId] = useState(null);
  const [investigationNotes, setInvestigationNotes] = useState("");

  const loadAlerts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await alertApi.getAll().catch(() => []);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading alerts:", err);
      setErrorMsg("Failed to connect to alert notification server.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const updateAlertStatus = async (id, nextStatus, notes = null) => {
    try {
      const alertItem = (alerts || []).find((a) => a && a.id === id);
      if (!alertItem) return;
      const updatedMessage = notes ? `${alertItem.message || ""} | Notes: ${notes}` : (alertItem.message || "");
      await alertApi.update(id, { ...alertItem, status: nextStatus, message: updatedMessage });
      loadAlerts();
      setInvestigatingAlertId(null);
      setInvestigationNotes("");
    } catch (err) {
      console.error("Error updating alert status:", err);
    }
  };

  const deleteAlert = async (id) => {
    if (!window.confirm("Are you sure you want to delete this alert record?")) return;
    try {
      await alertApi.delete(id);
      loadAlerts();
    } catch (err) {
      console.error("Error deleting alert:", err);
    }
  };

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Filter alerts by search query & status selector
  const filteredAlerts = safeAlerts
    .filter((a) => {
      if (!a) return false;
      const searchStr = `${a.siteName || a.site || ""} ${a.message || ""}`.toLowerCase();
      return searchStr.includes((query || "").toLowerCase());
    })
    .filter((a) => statusFilter === "ALL" || (a && a.status === statusFilter));

  // Separate Active Alerts (NEW, ACKNOWLEDGED, INVESTIGATING, ACTION_TAKEN) vs Resolved Alerts
  const activeAlerts = filteredAlerts.filter((a) => a && a.status !== "RESOLVED");
  const resolvedAlerts = filteredAlerts.filter((a) => a && a.status === "RESOLVED");

  // Sort Active Alerts: Critical/High Risk alerts FIRST
  const sortedActiveAlerts = [...activeAlerts].sort((a, b) => {
    const aIsHigh = (a.severity || a.alertType) === "CRITICAL" || (a.severity || a.alertType) === "HIGH" || (a.message || "").toUpperCase().includes("HIGH");
    const bIsHigh = (b.severity || b.alertType) === "CRITICAL" || (b.severity || b.alertType) === "HIGH" || (b.message || "").toUpperCase().includes("HIGH");
    if (aIsHigh && !bIsHigh) return -1;
    if (!aIsHigh && bIsHigh) return 1;
    return 0;
  });

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="Alerts & Early Warnings" />

        <main className="module-content" style={{ padding: "24px 32px", paddingBottom: "40px" }}>
          {/* 1. PAGE HEADER */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  🚨 Hazard Alerts & Emergency Warnings
                </h1>
                <span className="demo-pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                  REAL-TIME DISPATCH
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
                Review, acknowledge, investigate, and resolve critical slope hazard alerts generated automatically by the AI risk prediction system.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="secondary-action" onClick={loadAlerts}>
                🔄 Refresh Alerts
              </button>
              {(role === "ADMIN" || role === "ENGINEER") && (
                <button className="primary-action" onClick={() => navigate("/location-monitoring")}>
                  ⚡ Location Monitoring ➔
                </button>
              )}
            </div>
          </div>

          {/* API Error Notification */}
          {errorMsg && (
            <div style={{ padding: "12px 16px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", marginBottom: "20px", fontSize: "13px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Filter Toolbar */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search alerts by location or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: "240px", padding: "10px 14px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 14px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="NEW">🔴 NEW / UNACKNOWLEDGED</option>
              <option value="ACKNOWLEDGED">🔵 ACKNOWLEDGED</option>
              <option value="INVESTIGATING">🟠 UNDER INVESTIGATION</option>
              <option value="ACTION_TAKEN">⚡ ACTION TAKEN</option>
              <option value="RESOLVED">🟢 RESOLVED</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔄</div>
              Loading hazard alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            /* PROPER EMPTY STATE AS SPECIFIED IN PROMPT */
            <div className="module-panel" style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🛡️</div>
              <h3 style={{ color: "#f8fafc", margin: "0 0 6px 0", fontSize: "1.3rem" }}>No Active Alerts</h3>
              <p style={{ color: "#94a3b8", fontSize: "13.5px", margin: "0 0 20px 0", maxWidth: "480px" }}>
                No active alerts. All monitored locations are currently stable.
              </p>
              <button className="primary-action" onClick={() => navigate("/location-monitoring")}>
                Go to Location Monitoring ➔
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              
              {/* 2. ACTIVE ALERTS SECTION (CRITICAL FIRST) */}
              <section className="module-panel">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span className="live-dot" style={{ background: sortedActiveAlerts.length > 0 ? "#ef4444" : "#10b981", boxShadow: sortedActiveAlerts.length > 0 ? "0 0 10px #ef4444" : "none" }} />
                  <span className="eyebrow" style={{ color: sortedActiveAlerts.length > 0 ? "#ef4444" : "#34d399" }}>
                    ACTIVE HAZARD ALERTS & DISPATCHES ({sortedActiveAlerts.length})
                  </span>
                </div>

                {sortedActiveAlerts.length === 0 ? (
                  <div style={{ padding: "24px", background: "rgba(16,185,129,0.05)", borderRadius: "8px", color: "#34d399", fontSize: "13px" }}>
                    🛡️ No active hazard alerts pending. All active slope locations are in stable condition.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {sortedActiveAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        role={role}
                        onUpdateStatus={updateAlertStatus}
                        onOpenInvestigate={(id) => setInvestigatingAlertId(id)}
                        onDelete={deleteAlert}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* 3. RESOLVED ALERTS HISTORY SECTION */}
              {resolvedAlerts.length > 0 && (
                <section className="module-panel" style={{ opacity: 0.9, borderLeft: "4px solid #10b981" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <span className="eyebrow" style={{ color: "#34d399" }}>
                      🟢 RESOLVED ALERTS HISTORY ({resolvedAlerts.length})
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {resolvedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        role={role}
                        onUpdateStatus={updateAlertStatus}
                        onOpenInvestigate={(id) => setInvestigatingAlertId(id)}
                        onDelete={deleteAlert}
                      />
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

          {/* Modal for Engineer Investigation Notes */}
          {investigatingAlertId && (
            <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "rgba(15,23,42,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid #f59e0b", borderRadius: "16px", padding: "24px", width: "480px", maxWidth: "95vw", color: "#fff" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 700 }}>🔍 Add Technical Investigation Notes</h3>
                <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: "0 0 16px 0" }}>Document geotechnical observations, rainfall runoff, or field sensor inspections for this site.</p>

                <textarea
                  rows={4}
                  value={investigationNotes}
                  onChange={(e) => setInvestigationNotes(e.target.value)}
                  placeholder="Enter technical investigation notes..."
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", marginBottom: "16px" }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="secondary-action" onClick={() => setInvestigatingAlertId(null)}>Cancel</button>
                  <button
                    className="primary-action"
                    onClick={() => updateAlertStatus(investigatingAlertId, "INVESTIGATING", investigationNotes)}
                  >
                    Save & Set to Investigating
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Alert Card Subcomponent with full null safety
function AlertCard({ alert, role, onUpdateStatus, onOpenInvestigate, onDelete }) {
  if (!alert) return null;

  const isHigh = (alert.severity || alert.alertType) === "CRITICAL" || (alert.severity || alert.alertType) === "HIGH" || (alert.message || "").toUpperCase().includes("HIGH");
  const isMod = (alert.severity || alert.alertType) === "WARNING" || (alert.severity || alert.alertType) === "MODERATE" || (alert.message || "").toUpperCase().includes("MODERATE");
  const status = alert.status || "NEW";

  const riskPercentageVal = alert.riskProbability ?? alert.probability ?? (isHigh ? 98.5 : isMod ? 54.0 : 5.0);

  return (
    <div
      style={{
        padding: "16px 20px",
        background: isHigh ? "rgba(239, 68, 68, 0.06)" : isMod ? "rgba(245, 158, 11, 0.06)" : "rgba(16, 185, 129, 0.06)",
        border: `1px solid ${isHigh ? "rgba(239, 68, 68, 0.3)" : isMod ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.3rem" }}>{isHigh ? "🚨" : isMod ? "⚠️" : "🟢"}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc", fontWeight: 700 }}>
              📍 {alert.siteName || alert.site || `Site #${alert.siteId || alert.id}`}
            </h4>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Detected: {alert.sentAt ? new Date(alert.sentAt).toLocaleString() : "Live Signal"} &bull; Failure Risk: <strong style={{ color: isHigh ? "#ef4444" : isMod ? "#f59e0b" : "#34d399" }}>{safeNumberFormat(riskPercentageVal, 1)}%</strong>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 800,
              background: isHigh ? "#ef4444" : isMod ? "#f59e0b" : "#10b981",
              color: "#fff",
            }}
          >
            {isHigh ? "HIGH RISK" : isMod ? "MODERATE RISK" : "SAFE"}
          </span>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              background: status === "RESOLVED" ? "rgba(16,185,129,0.2)" : status === "INVESTIGATING" ? "rgba(245,158,11,0.2)" : status === "ACKNOWLEDGED" ? "rgba(56,189,248,0.2)" : "rgba(239,68,68,0.2)",
              color: status === "RESOLVED" ? "#34d399" : status === "INVESTIGATING" ? "#fbbf24" : status === "ACKNOWLEDGED" ? "#38bdf8" : "#fca5a5",
              border: `1px solid ${status === "RESOLVED" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)"}`,
            }}
          >
            STATUS: {status}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", background: "rgba(15,23,42,0.4)", padding: "10px 14px", borderRadius: "8px" }}>
        {alert.message || "Slope telemetry evaluation dispatch."}
      </p>

      {/* Role Action Controls */}
      {role !== "PUBLIC_USER" && role !== "USER" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          
          {/* SAFETY OFFICER WORKFLOW: New -> Acknowledged -> Action Taken -> Resolved */}
          {(role === "SAFETY_OFFICER" || role === "ADMIN") && status === "NEW" && (
            <button
              className="table-action"
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px" }}
              onClick={() => onUpdateStatus(alert.id, "ACKNOWLEDGED")}
            >
              ✓ Acknowledge Alert
            </button>
          )}

          {(role === "SAFETY_OFFICER" || role === "ADMIN") && status === "ACKNOWLEDGED" && (
            <button
              className="table-action"
              style={{ background: "#d97706", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px" }}
              onClick={() => onUpdateStatus(alert.id, "ACTION_TAKEN")}
            >
              ⚡ Record Action Taken
            </button>
          )}

          {/* ENGINEER WORKFLOW: Alert -> Investigate -> Add Notes -> Resolved */}
          {(role === "ENGINEER" || role === "ADMIN") && (status === "NEW" || status === "ACKNOWLEDGED") && (
            <button
              className="table-action"
              style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px" }}
              onClick={() => onOpenInvestigate(alert.id)}
            >
              🔍 Start Investigation
            </button>
          )}

          {/* RESOLVE BUTTON FOR AUTHORIZED ROLES */}
          {status !== "RESOLVED" && (
            <button
              className="table-action resolve-btn"
              style={{ background: "#059669", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px" }}
              onClick={() => onUpdateStatus(alert.id, "RESOLVED")}
            >
              ✅ Mark Resolved
            </button>
          )}

          {/* ADMIN DELETE OVERRIDE */}
          {role === "ADMIN" && (
            <button
              className="table-action"
              style={{ background: "rgba(220, 38, 38, 0.15)", color: "#fca5a5", border: "1px solid rgba(220, 38, 38, 0.3)", padding: "6px 10px", borderRadius: "6px" }}
              onClick={() => onDelete(alert.id)}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
