import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { sitesApi, alertApi } from "../services/api";
import heroImage from "../assets/terrain_hero.jpg";

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || "PUBLIC_USER").toUpperCase();
  const [collapsed, setCollapsed] = useState(false);

  // Core Data State
  const [savedSites, setSavedSites] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const loadDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial && savedSites.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMsg(null);

    try {
      const [sitesResult, alertsResult] = await Promise.allSettled([
        sitesApi.getAll(),
        alertApi.getAll(),
      ]);

      if (sitesResult.status === "fulfilled" && Array.isArray(sitesResult.value)) {
        setSavedSites(sitesResult.value);
      }
      if (alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value)) {
        setRecentAlerts(alertsResult.value);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching dashboard telemetry:", err);
      setErrorMsg("Failed to connect to monitoring service.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [savedSites.length]);

  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Safe Filter Calculations
  const safeSites = Array.isArray(savedSites) ? savedSites : [];
  const safeAlerts = Array.isArray(recentAlerts) ? recentAlerts : [];

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

        <main className="module-content" style={{ padding: "24px 32px", paddingBottom: "40px" }}>
          
          {/* TOP HERO VISUAL SECTION */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(70, 213, 219, 0.25)",
              background: "linear-gradient(135deg, #091624 0%, #0d1e30 100%)",
              marginBottom: "24px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", minHeight: "200px", alignItems: "center" }}>
              <div style={{ padding: "28px 32px" }}>
                <span className="eyebrow" style={{ color: "#38bdf8", letterSpacing: "2px", fontWeight: 700 }}>
                  AI-POWERED SLOPE MONITORING & EARLY WARNING
                </span>
                <h1 style={{ fontSize: "2.0rem", fontWeight: 900, margin: "8px 0 10px 0", color: "#f8fafc", letterSpacing: "-0.5px" }}>
                  SmartSlope AI Monitoring
                </h1>
                <p style={{ margin: "0 0 18px 0", color: "#94a3b8", fontSize: "0.92rem", lineHeight: "1.5", maxWidth: "540px" }}>
                  Real-time slope monitoring and AI-powered early warning. Continuous sensor telemetry analysis and machine learning landslide risk prediction.
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

              <div style={{ height: "100%", minHeight: "200px", position: "relative", overflow: "hidden" }}>
                <img
                  src={heroImage}
                  alt="SmartSlope AI Slope Monitoring Visual"
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.85) contrast(1.1)" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #091624 0%, transparent 40%)" }} />
                <div style={{ position: "absolute", bottom: "16px", right: "16px", padding: "6px 12px", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "8px", fontSize: "11px", color: "#38bdf8", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="live-dot" /> {refreshing ? "SYNCING TELEMETRY..." : "AI RADAR SCANNING ACTIVE"}
                </div>
              </div>
            </div>
          </div>

          {/* API Error Notification */}
          {errorMsg && (
            <div style={{ padding: "12px 16px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", marginBottom: "20px", fontSize: "13px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. ACTIVE CRITICAL ALERTS (HIGHEST PRIORITY BANNER) */}
          {criticalActiveAlerts.length > 0 && (
            <div
              style={{
                padding: "16px 20px",
                background: "linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(153, 27, 27, 0.35) 100%)",
                border: "2px solid #ef4444",
                borderRadius: "12px",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "28px" }}>🚨</span>
                <div>
                  <strong style={{ color: "#ef4444", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 800 }}>
                    CRITICAL HIGH RISK ALERTS ({criticalActiveAlerts.length})
                  </strong>
                  <h3 style={{ margin: "2px 0 0 0", color: "#fff", fontSize: "1.05rem", fontWeight: 800 }}>
                    Landslide Warning: {criticalActiveAlerts[0]?.siteName || `Site #${criticalActiveAlerts[0]?.siteId || 1}`}
                  </h3>
                </div>
              </div>

              <button className="danger-action" onClick={() => navigate("/alerts")}>
                View & Respond to Alerts ({criticalActiveAlerts.length}) ➔
              </button>
            </div>
          )}

          {/* 2. REAL-TIME MONITORING KPI STAT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="module-panel" style={{ padding: "18px" }}>
              <span className="eyebrow" style={{ color: "#94a3b8" }}>MONITORED LOCATIONS</span>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#f8fafc", margin: "4px 0 2px 0" }}>
                {loading && safeSites.length === 0 ? "..." : totalSites}
              </div>
              <small style={{ color: "#64748b" }}>Active telemetric sites</small>
            </div>

            <div className="module-panel" style={{ padding: "18px", borderLeft: "4px solid #10b981" }}>
              <span className="eyebrow" style={{ color: "#10b981" }}>🟢 SAFE LOCATIONS</span>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#34d399", margin: "4px 0 2px 0" }}>
                {loading && safeSites.length === 0 ? "..." : safeSitesCount}
              </div>
              <small style={{ color: "#64748b" }}>Baseline stable conditions</small>
            </div>

            <div className="module-panel" style={{ padding: "18px", borderLeft: "4px solid #f59e0b" }}>
              <span className="eyebrow" style={{ color: "#f59e0b" }}>🟠 MODERATE RISK</span>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fbbf24", margin: "4px 0 2px 0" }}>
                {loading && safeSites.length === 0 ? "..." : modRiskSitesCount}
              </div>
              <small style={{ color: "#64748b" }}>Elevated saturation / slope</small>
            </div>

            <div className="module-panel" style={{ padding: "18px", borderLeft: "4px solid #ef4444" }}>
              <span className="eyebrow" style={{ color: "#ef4444" }}>🔴 HIGH RISK</span>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fca5a5", margin: "4px 0 2px 0" }}>
                {loading && safeSites.length === 0 ? "..." : highRiskSitesCount}
              </div>
              <small style={{ color: "#64748b" }}>Critical hazard detected</small>
            </div>
          </div>

          {/* 3. REORGANIZED MAIN DASHBOARD GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "20px" }}>
            
            {/* Left Column: EXPANDED COMMAND OPERATIONS GRID */}
            <section className="module-panel" style={{ padding: "24px" }}>
              <span className="eyebrow" style={{ color: "#38bdf8", letterSpacing: "1.5px" }}>COMMAND OPERATIONS</span>
              <h3 className="section-heading" style={{ margin: "4px 0 20px 0", fontSize: "1.2rem", color: "#f8fafc" }}>
                System Operations & Quick Navigation
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "18px" }}>
                {/* 1. Location Monitoring */}
                <div
                  onClick={() => navigate("/location-monitoring")}
                  style={{
                    padding: "22px 24px",
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
                    borderRadius: "14px",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2.2rem" }}>📍</span>
                    <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px" }}>OPEN ➔</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
                      Location Monitoring
                    </h4>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.83rem", color: "#94a3b8", lineHeight: "1.45" }}>
                      Real-time slope hazard surveillance, live Open-Meteo weather telemetry & interactive GPS map
                    </p>
                  </div>
                </div>

                {/* 2. Alert Center */}
                <div
                  onClick={() => navigate("/alerts")}
                  style={{
                    padding: "22px 24px",
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
                    borderRadius: "14px",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2.2rem" }}>🚨</span>
                    <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px" }}>RESPOND ➔</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
                      Alert Center
                    </h4>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.83rem", color: "#94a3b8", lineHeight: "1.45" }}>
                      Active landslide warnings, emergency alert dispatches & hazard status lifecycle management
                    </p>
                  </div>
                </div>

                {/* 3. Analytics */}
                <div
                  onClick={() => navigate("/analytics")}
                  style={{
                    padding: "22px 24px",
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
                    borderRadius: "14px",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2.2rem" }}>📊</span>
                    <span style={{ color: "#34d399", fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px" }}>ANALYZE ➔</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
                      Analytics
                    </h4>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.83rem", color: "#94a3b8", lineHeight: "1.45" }}>
                      Historical telemetry trends, rainfall accumulation metrics & risk distribution reporting
                    </p>
                  </div>
                </div>

                {/* 4. Inspections */}
                <div
                  onClick={() => navigate("/inspections")}
                  style={{
                    padding: "22px 24px",
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
                    borderRadius: "14px",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2.2rem" }}>📋</span>
                    <span style={{ color: "#fbbf24", fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px" }}>REVIEW ➔</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
                      Inspections
                    </h4>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.83rem", color: "#94a3b8", lineHeight: "1.45" }}>
                      Geotechnical inspection logs, engineering site surveys & field safety verification
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column: SYSTEM PIPELINE HEALTH (UNCHANGED) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <section className="module-panel" style={{ padding: "24px" }}>
                <span className="eyebrow" style={{ color: "#38bdf8", letterSpacing: "1.5px" }}>TELEMETRY INFRASTRUCTURE</span>
                <h3 className="section-heading" style={{ margin: "4px 0 20px 0", fontSize: "1.2rem", color: "#f8fafc" }}>System Pipeline Health</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ padding: "14px 16px", background: "rgba(15,23,42,0.8)", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="live-pulse-dot" />
                    <div>
                      <strong style={{ color: "#34d399", fontSize: "13px" }}>FastAPI ML Prediction Engine: ONLINE</strong>
                      <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>15s automated slope failure probability inference</div>
                    </div>
                  </div>

                  <div style={{ padding: "14px 16px", background: "rgba(15,23,42,0.8)", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "18px" }}>💾</span>
                    <div>
                      <strong style={{ color: "#38bdf8", fontSize: "13px" }}>Spring Data JPA Backend Sync: ACTIVE</strong>
                      <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>Last sync: {lastUpdated}</div>
                    </div>
                  </div>

                  <div style={{ padding: "14px 16px", background: "rgba(15,23,42,0.8)", borderRadius: "8px", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "18px" }}>📡</span>
                    <div>
                      <strong style={{ color: "#fbbf24", fontSize: "13px" }}>Open-Meteo & DEM Topography: CONNECTED</strong>
                      <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>Live precipitation & soil moisture streams active</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

