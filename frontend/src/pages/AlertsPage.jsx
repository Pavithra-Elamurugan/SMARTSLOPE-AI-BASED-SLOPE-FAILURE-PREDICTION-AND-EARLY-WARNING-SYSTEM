import { useState, useEffect, useMemo } from "react";
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

  const loadAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const data = await alertApi.getAll().catch(() => []);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading alerts:", err);
      if (!silent) setErrorMsg("Failed to connect to alert notification server.");
      setAlerts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(() => {
      loadAlerts(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateAlertStatus = async (id, nextStatus, notes = null) => {
    try {
      const alertItem = (alerts || []).find((a) => a && a.id === id);
      if (!alertItem) return;
      const updatedMessage = notes ? `${alertItem.message || ""} | Notes: ${notes}` : (alertItem.message || "");
      await alertApi.update(id, { ...alertItem, status: nextStatus, message: updatedMessage });
      loadAlerts(true);
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
      loadAlerts(true);
    } catch (err) {
      console.error("Error deleting alert:", err);
    }
  };

  const safeAlerts = useMemo(() => (Array.isArray(alerts) ? alerts : []), [alerts]);

  // Compute Alert Summary Stats
  const summaryStats = useMemo(() => {
    const active = safeAlerts.filter((a) => a && a.status !== "RESOLVED");
    const high = active.filter((a) => {
      const sev = (a.severity || a.alertType || "").toUpperCase();
      const msg = (a.message || "").toUpperCase();
      return sev === "CRITICAL" || sev === "HIGH" || msg.includes("HIGH");
    });
    const moderate = active.filter((a) => {
      const sev = (a.severity || a.alertType || "").toUpperCase();
      const msg = (a.message || "").toUpperCase();
      return (sev === "WARNING" || sev === "MODERATE") && !high.includes(a);
    });
    const newUnresolved = active.filter((a) => a.status === "NEW");

    return {
      activeCount: active.length,
      highCount: high.length,
      modCount: moderate.length,
      newCount: newUnresolved.length,
    };
  }, [safeAlerts]);

  // Filter & Priority-Sort Alerts
  const filteredAlerts = useMemo(() => {
    return safeAlerts
      .filter((a) => {
        if (!a) return false;
        const searchStr = `${a.siteName || a.site || ""} ${a.message || ""}`.toLowerCase();
        return searchStr.includes((query || "").toLowerCase());
      })
      .filter((a) => statusFilter === "ALL" || (a && a.status === statusFilter));
  }, [safeAlerts, query, statusFilter]);

  const activeAlerts = useMemo(() => filteredAlerts.filter((a) => a && a.status !== "RESOLVED"), [filteredAlerts]);
  const resolvedAlerts = useMemo(() => filteredAlerts.filter((a) => a && a.status === "RESOLVED"), [filteredAlerts]);

  // Priority Sort: HIGH/CRITICAL first, MODERATE second
  const sortedActiveAlerts = useMemo(() => {
    return [...activeAlerts].sort((a, b) => {
      const aIsHigh = (a.severity || a.alertType) === "CRITICAL" || (a.severity || a.alertType) === "HIGH" || (a.message || "").toUpperCase().includes("HIGH");
      const bIsHigh = (b.severity || b.alertType) === "CRITICAL" || (b.severity || b.alertType) === "HIGH" || (b.message || "").toUpperCase().includes("HIGH");
      if (aIsHigh && !bIsHigh) return -1;
      if (!aIsHigh && bIsHigh) return 1;
      return 0;
    });
  }, [activeAlerts]);

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="Alerts & Early Warnings" />

        <main className="module-content" style={{ padding: "24px 32px", paddingBottom: "40px" }}>
          
          {/* 1. PAGE HEADER */}
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 900, margin: 0, color: "#f8fafc", letterSpacing: "-0.5px" }}>
                🚨 Hazard Alerts & Emergency Warnings
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.88rem" }}>
                Review, acknowledge, investigate, and resolve AI-predicted landslide hazard dispatches.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button className="secondary-action" onClick={() => loadAlerts(false)}>
                🔄 Refresh Alerts
              </button>
              {(role === "ADMIN" || role === "ENGINEER") && (
                <button className="primary-action" onClick={() => navigate("/location-monitoring")}>
                  📍 Location Monitoring ➔
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

          {/* 2. ALERT SUMMARY (COMPACT SUMMARY ROW) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            <div className="module-panel" style={{ padding: "14px 18px", borderLeft: "4px solid #38bdf8" }}>
              <span className="eyebrow" style={{ color: "#38bdf8", fontSize: "10.5px" }}>ACTIVE ALERTS</span>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#f8fafc", margin: "2px 0 0 0" }}>
                {summaryStats.activeCount}
              </div>
            </div>

            <div className="module-panel" style={{ padding: "14px 18px", borderLeft: "4px solid #ef4444" }}>
              <span className="eyebrow" style={{ color: "#ef4444", fontSize: "10.5px" }}>CRITICAL / HIGH RISK</span>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fca5a5", margin: "2px 0 0 0" }}>
                {summaryStats.highCount}
              </div>
            </div>

            <div className="module-panel" style={{ padding: "14px 18px", borderLeft: "4px solid #f59e0b" }}>
              <span className="eyebrow" style={{ color: "#f59e0b", fontSize: "10.5px" }}>MODERATE RISK</span>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fbbf24", margin: "2px 0 0 0" }}>
                {summaryStats.modCount}
              </div>
            </div>

            <div className="module-panel" style={{ padding: "14px 18px", borderLeft: "4px solid #a855f7" }}>
              <span className="eyebrow" style={{ color: "#c084fc", fontSize: "10.5px" }}>NEW / UNRESOLVED</span>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#e9d5ff", margin: "2px 0 0 0" }}>
                {summaryStats.newCount}
              </div>
            </div>
          </div>

          {/* 3. FILTER BAR */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search alerts by location or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: "240px", padding: "10px 14px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 14px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "13px", minWidth: "180px" }}
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="NEW">🔴 NEW / UNACKNOWLEDGED</option>
              <option value="ACKNOWLEDGED">🔵 ACKNOWLEDGED</option>
              <option value="INVESTIGATING">🟠 UNDER INVESTIGATION</option>
              <option value="ACTION_TAKEN">⚡ ACTION TAKEN</option>
              <option value="RESOLVED">🟢 RESOLVED</option>
            </select>
          </div>

          {/* 4. ALERTS LIST OR EMPTY STATE */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔄</div>
              Loading hazard alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="module-panel" style={{ padding: "50px 30px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🛡️</div>
              <h3 style={{ color: "#f8fafc", margin: "0 0 6px 0", fontSize: "1.2rem" }}>No Alerts Matching Filter</h3>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 18px 0", maxWidth: "460px" }}>
                All monitored locations are operating within normal baseline limits.
              </p>
              <button className="primary-action" onClick={() => navigate("/location-monitoring")}>
                Go to Location Monitoring ➔
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Active Priority Alerts */}
              {sortedActiveAlerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="live-dot" style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
                    <span className="eyebrow" style={{ color: "#ef4444", letterSpacing: "1px" }}>
                      PRIORITY HAZARD ALERTS ({sortedActiveAlerts.length})
                    </span>
                  </div>

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

              {/* Resolved Alerts History */}
              {resolvedAlerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>🟢</span>
                    <span className="eyebrow" style={{ color: "#34d399", letterSpacing: "1px" }}>
                      RESOLVED ALERTS HISTORY ({resolvedAlerts.length})
                    </span>
                  </div>

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

// 5. ALERT CARD HIERARCHY SUBCOMPONENT
function AlertCard({ alert, role, onUpdateStatus, onOpenInvestigate, onDelete }) {
  if (!alert) return null;

  const isHigh = (alert.severity || alert.alertType) === "CRITICAL" || (alert.severity || alert.alertType) === "HIGH" || (alert.message || "").toUpperCase().includes("HIGH");
  const isMod = (alert.severity || alert.alertType) === "WARNING" || (alert.severity || alert.alertType) === "MODERATE" || (alert.message || "").toUpperCase().includes("MODERATE");
  const status = alert.status || "NEW";

  const riskPercentageVal = alert.riskProbability ?? alert.probability;
  const confScoreVal = alert.confidenceScore;

  let mainMsg = alert.message || "Slope telemetry evaluation dispatch.";
  let cleanRecommendation = alert.recommendation;

  return (
    <div
      style={{
        padding: "18px 22px",
        background: isHigh ? "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)" : isMod ? "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)" : "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)",
        border: `1px solid ${isHigh ? "rgba(239, 68, 68, 0.4)" : isMod ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.3)"}`,
        borderRadius: "12px",
        boxShadow: isHigh ? "0 4px 18px rgba(239, 68, 68, 0.15)" : "0 4px 12px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Top: Location Name + Coordinates | Risk Badge + Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>{isHigh ? "🚨" : isMod ? "⚠️" : "🟢"}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800 }}>
              📍 {alert.siteName || alert.site || `Site #${alert.siteId || alert.id}`}
              {alert.latitude != null && alert.longitude != null && (
                <span style={{ fontSize: "12px", fontWeight: 400, color: "#94a3b8", marginLeft: "8px" }}>
                  ({Number(alert.latitude).toFixed(4)}°N, {Number(alert.longitude).toFixed(4)}°E)
                </span>
              )}
            </h4>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              background: isHigh ? "#ef4444" : isMod ? "#f59e0b" : "#10b981",
              color: "#fff",
              boxShadow: isHigh ? "0 0 10px rgba(239, 68, 68, 0.4)" : "none"
            }}
          >
            {isHigh ? "CRITICAL / HIGH RISK" : isMod ? "MODERATE RISK" : "SAFE"}
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

      {/* Middle: Detected Time | Failure Probability | Confidence */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#94a3b8", background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: "6px" }}>
        <span>🕒 Detected: <strong style={{ color: "#cbd5e1" }}>{alert.sentAt ? new Date(alert.sentAt).toLocaleString() : "Live Signal"}</strong></span>
        <span>⚡ Failure Risk: <strong style={{ color: isHigh ? "#f87171" : isMod ? "#fbbf24" : "#34d399" }}>{riskPercentageVal != null ? `${safeNumberFormat(riskPercentageVal, 1)}%` : (isHigh ? "CRITICAL" : "ELEVATED")}</strong></span>
        {confScoreVal != null && (
          <span>🎯 Confidence: <strong style={{ color: "#cbd5e1" }}>{safeNumberFormat(confScoreVal, 1)}%</strong></span>
        )}
      </div>

      {/* Main Message */}
      <div style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: "1.5" }}>
        {mainMsg}
      </div>

      {/* Clearly Separated Recommendation */}
      {cleanRecommendation && cleanRecommendation !== mainMsg && (
        <div style={{ padding: "10px 14px", background: "rgba(56, 189, 248, 0.08)", borderLeft: "3px solid #38bdf8", borderRadius: "6px", fontSize: "12px" }}>
          <strong style={{ color: "#38bdf8", display: "block", marginBottom: "2px" }}>💡 Recommended Action:</strong>
          <span style={{ color: "#cbd5e1" }}>{cleanRecommendation}</span>
        </div>
      )}

      {/* Bottom Action Buttons */}
      {role !== "PUBLIC_USER" && role !== "USER" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          
          {(role === "SAFETY_OFFICER" || role === "ADMIN") && status === "NEW" && (
            <button
              className="table-action"
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
              onClick={() => onUpdateStatus(alert.id, "ACKNOWLEDGED")}
            >
              ✓ Acknowledge Alert
            </button>
          )}

          {(role === "SAFETY_OFFICER" || role === "ADMIN") && status === "ACKNOWLEDGED" && (
            <button
              className="table-action"
              style={{ background: "#d97706", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
              onClick={() => onUpdateStatus(alert.id, "ACTION_TAKEN")}
            >
              ⚡ Record Action Taken
            </button>
          )}

          {(role === "ENGINEER" || role === "ADMIN") && (status === "NEW" || status === "ACKNOWLEDGED") && (
            <button
              className="table-action"
              style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
              onClick={() => onOpenInvestigate(alert.id)}
            >
              🔍 Start Investigation
            </button>
          )}

          {status !== "RESOLVED" && (
            <button
              className="table-action resolve-btn"
              style={{ background: "#059669", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
              onClick={() => onUpdateStatus(alert.id, "RESOLVED")}
            >
              ✅ Mark Resolved
            </button>
          )}

          {role === "ADMIN" && (
            <button
              className="table-action"
              style={{ background: "rgba(220, 38, 38, 0.15)", color: "#fca5a5", border: "1px solid rgba(220, 38, 38, 0.3)", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
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
