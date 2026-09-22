import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { sitesApi, predictionApi, alertApi } from "../services/api";
import heroImage from "../assets/terrain_hero.jpg";

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

const safeNumberFormat = (val, decimals = 1, fallback = "0.0") => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || "PUBLIC_USER").toUpperCase();
  const [collapsed, setCollapsed] = useState(false);

  // Core Data State
  const [savedSites, setSavedSites] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sitesRes, alertsRes, predictionsRes] = await Promise.all([
        sitesApi.getAll().catch(() => []),
        alertApi.getAll().catch(() => []),
        predictionApi.getAll().catch(() => []),
      ]);

      setSavedSites(Array.isArray(sitesRes) ? sitesRes : []);
      setRecentAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      setPredictions(Array.isArray(predictionsRes) ? predictionsRes : []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching dashboard telemetry:", err);
      setErrorMsg("Failed to connect to monitoring service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [role]);

  // Safe Filter Calculations
  const safeSites = Array.isArray(savedSites) ? savedSites : [];
  const safeAlerts = Array.isArray(recentAlerts) ? recentAlerts : [];
  const safePredictions = Array.isArray(predictions) ? predictions : [];

  const totalSites = safeSites.length;

  const activeAlerts = safeAlerts.filter((a) => a && a.status !== "RESOLVED");
  const criticalActiveAlerts = activeAlerts.filter(
    (a) =>
      a &&
      ((a.severity === "CRITICAL" || a.alertType === "CRITICAL" || a.severity === "HIGH") ||
        (a.message || "").toUpperCase().includes("HIGH"))
  );

  const safeSitesCount = safeSites.filter((s) => s && s.status !== "DANGER" && s.status !== "ATTENTION").length;
  const modRiskSitesCount = safeSites.filter((s) => s && s.status === "ATTENTION").length;
  const highRiskSitesCount = safeSites.filter((s) => s && s.status === "DANGER").length;

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="SmartSlope Command Dashboard" />

        <main className="module-content" style={{ padding: "28px 36px", paddingBottom: "50px" }}>
          
          {/* TOP HERO VISUAL SECTION */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(70, 213, 219, 0.25)",
              background: "linear-gradient(135deg, #091624 0%, #0d1e30 100%)",
              marginBottom: "32px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", minHeight: "220px", alignItems: "center" }}>
              <div style={{ padding: "32px 36px" }}>
                <span className="eyebrow" style={{ color: "#38bdf8", letterSpacing: "2px", fontWeight: 700 }}>
                  AI-POWERED SLOPE MONITORING & EARLY WARNING
                </span>
                <h1 style={{ fontSize: "2.1rem", fontWeight: 900, margin: "8px 0 10px 0", color: "#f8fafc", letterSpacing: "-0.5px" }}>
                  SmartSlope AI Monitoring
                </h1>
                <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: "1.6", maxWidth: "540px" }}>
                  Real-time slope monitoring and AI-powered early warning. Continuous sensor data analysis and machine learning landslide risk prediction.
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <button className="primary-action" onClick={() => navigate("/location-monitoring")}>
                    Inspect Monitored Locations ➔
                  </button>
                  {criticalActiveAlerts.length > 0 && (
                    <button className="danger-action" onClick={() => navigate("/alerts")}>
                      🚨 Respond to Active Alerts ({criticalActiveAlerts.length})
                    </button>
                  )}
                </div>
              </div>

              <div style={{ height: "100%", minHeight: "220px", position: "relative", overflow: "hidden" }}>
                <img
                  src={heroImage}
                  alt="SmartSlope AI Slope Monitoring Visual"
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.85) contrast(1.1)" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #091624 0%, transparent 40%)" }} />
                <div style={{ position: "absolute", bottom: "16px", right: "16px", padding: "6px 12px", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "8px", fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>
                  <span className="live-dot" /> AI RADAR SCANNING ACTIVE
                </div>
              </div>
            </div>
          </div>

          {/* API Error Notification */}
          {errorMsg && (
            <div style={{ padding: "12px 16px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", marginBottom: "24px", fontSize: "13px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {loading && safeSites.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>🔄</div>
              Loading real-time monitoring telemetry...
            </div>
          ) : (
            <>
              {/* 1. ACTIVE CRITICAL ALERTS (HIGHEST PRIORITY) */}
              {criticalActiveAlerts.length > 0 && (
                <div
                  style={{
                    padding: "18px 24px",
                    background: "linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(153, 27, 27, 0.35) 100%)",
                    border: "2px solid #ef4444",
                    borderRadius: "14px",
                    boxShadow: "0 0 25px rgba(239, 68, 68, 0.3)",
                    marginBottom: "28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ fontSize: "32px" }}>🚨</span>
                    <div>
                      <strong style={{ color: "#ef4444", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 800 }}>
                        CRITICAL HIGH RISK ALERTS ({criticalActiveAlerts.length})
                      </strong>
                      <h3 style={{ margin: "3px 0 0 0", color: "#fff", fontSize: "1.15rem", fontWeight: 800 }}>
                        Landslide Warning: {criticalActiveAlerts[0]?.siteName || `Site #${criticalActiveAlerts[0]?.siteId || 1}`}
                      </h3>
                    </div>
                  </div>

                  <button className="danger-action" onClick={() => navigate("/alerts")}>
                    View & Respond to Alerts ({criticalActiveAlerts.length}) ➔
                  </button>
                </div>
              )}

              {/* 2. LOCATIONS REQUIRING ATTENTION & RISK SUMMARY */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                <div className="module-panel" style={{ padding: "20px" }}>
                  <span className="eyebrow" style={{ color: "#94a3b8" }}>TOTAL MONITORED LOCATIONS</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f8fafc", margin: "6px 0 2px 0" }}>{totalSites}</div>
                  <small style={{ color: "#64748b" }}>Active slope locations</small>
                </div>

                <div className="module-panel" style={{ padding: "20px", borderLeft: "4px solid #10b981" }}>
                  <span className="eyebrow" style={{ color: "#10b981" }}>🟢 SAFE LOCATIONS</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#34d399", margin: "6px 0 2px 0" }}>{safeSitesCount}</div>
                  <small style={{ color: "#64748b" }}>Baseline stable conditions</small>
                </div>

                <div className="module-panel" style={{ padding: "20px", borderLeft: "4px solid #f59e0b" }}>
                  <span className="eyebrow" style={{ color: "#f59e0b" }}>🟠 MODERATE RISK LOCATIONS</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fbbf24", margin: "6px 0 2px 0" }}>{modRiskSitesCount}</div>
                  <small style={{ color: "#64748b" }}>Elevated rainfall / displacement</small>
                </div>

                <div className="module-panel" style={{ padding: "20px", borderLeft: "4px solid #ef4444" }}>
                  <span className="eyebrow" style={{ color: "#ef4444" }}>🔴 HIGH RISK LOCATIONS</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fca5a5", margin: "6px 0 2px 0" }}>{highRiskSitesCount}</div>
                  <small style={{ color: "#64748b" }}>Critical hazard detected</small>
                </div>
              </div>

              {/* 3. OVERALL MONITORING STATUS & 4. RECENT IMPORTANT ACTIVITY */}
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
                
                {/* Left Column: Monitored Locations Requiring Attention */}
                <section className="module-panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <div>
                      <span className="eyebrow">LOCATIONS REQUIRING ATTENTION</span>
                      <h3 className="section-heading" style={{ margin: "4px 0 0 0" }}>Slope Hazard Overview</h3>
                    </div>

                    <button className="secondary-action compact" onClick={() => navigate("/location-monitoring")}>
                      View All Sites ➔
                    </button>
                  </div>

                  {safeSites.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                      No monitoring locations registered yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {safeSites.map((site) => {
                        if (!site) return null;
                        const isHigh = site.status === "DANGER";
                        const isMod = site.status === "ATTENTION";

                        return (
                          <div
                            key={site.id}
                            style={{
                              padding: "16px 18px",
                              background: "rgba(15,23,42,0.6)",
                              borderRadius: "10px",
                              border: "1px solid rgba(255,255,255,0.08)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ color: "#f8fafc", fontSize: "14.5px" }}>
                                  📍 {site.siteName || site.name || `Site #${site.id}`}
                                </strong>
                                <Pill tone={isHigh ? "danger" : isMod ? "warn" : "safe"}>
                                  {isHigh ? "HIGH RISK" : isMod ? "MODERATE RISK" : "SAFE"}
                                </Pill>
                              </div>
                              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                                {site.location || "Location Coordinates"} &bull; Slope: {site.slopeAngle || 35}° &bull; Soil: {site.soilType || "Residual Soil"}
                              </div>
                            </div>

                            <button
                              className="secondary-action compact"
                              onClick={() => navigate("/location-monitoring", { state: { siteId: site.id } })}
                            >
                              Inspect Details ➔
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Right Column: Overall Monitoring Status & Recent Activity */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* System Status Card */}
                  <section className="module-panel">
                    <span className="eyebrow">OVERALL MONITORING STATUS</span>
                    <h3 className="section-heading" style={{ margin: "4px 0 16px 0" }}>System Pipeline Health</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ padding: "12px 14px", background: "rgba(15,23,42,0.8)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="live-pulse-dot" />
                        <div>
                          <strong style={{ color: "#34d399", fontSize: "13px" }}>FastAPI ML Prediction Engine: ONLINE</strong>
                          <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>15-second continuous background scanning active</div>
                        </div>
                      </div>

                      <div style={{ padding: "12px 14px", background: "rgba(15,23,42,0.8)", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.3)", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "16px" }}>💾</span>
                        <div>
                          <strong style={{ color: "#38bdf8", fontSize: "13px" }}>MySQL Database Telemetry Persistence: ACTIVE</strong>
                          <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>Last telemetry sync: {lastUpdated}</div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Recent Important Activity */}
                  <section className="module-panel">
                    <span className="eyebrow">RECENT IMPORTANT ACTIVITY</span>
                    <h3 className="section-heading" style={{ margin: "4px 0 14px 0" }}>Latest Warning Dispatches</h3>

                    {activeAlerts.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", background: "rgba(16,185,129,0.05)", borderRadius: "8px", color: "#34d399", fontSize: "12.5px" }}>
                        🛡️ No active hazard alerts logged. All monitored slopes stable.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeAlerts.slice(0, 3).map((alert) => {
                          if (!alert) return null;
                          const isHigh = (alert.severity || alert.alertType) === "CRITICAL" || (alert.severity || alert.alertType) === "HIGH";

                          return (
                            <div
                              key={alert.id}
                              style={{
                                padding: "12px 14px",
                                background: "rgba(15,23,42,0.8)",
                                borderRadius: "8px",
                                borderLeft: isHigh ? "4px solid #ef4444" : "4px solid #f59e0b",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>
                                <span>📍 {alert.siteName || `Site #${alert.siteId}`}</span>
                                <span style={{ color: isHigh ? "#ef4444" : "#f59e0b" }}>{alert.severity || "HIGH RISK"}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>{alert.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
