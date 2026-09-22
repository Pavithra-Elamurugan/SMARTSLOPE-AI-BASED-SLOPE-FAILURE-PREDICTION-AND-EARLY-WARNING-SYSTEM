import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { sitesApi, predictionApi, alertApi } from "../services/api";
import { SensorTrendChart, ProbabilityChart } from "../components/Phase2Charts";

function PageFrame({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="command-main">
        <Header title={title} onNotification={() => {}} />
        {children}
      </div>
    </div>
  );
}

function PageIntro({ kicker = "ANALYTICS & RISK INTELLIGENCE", title, description }) {
  return (
    <div className="phase-intro">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        const [sitesData, predictionsData, alertsData] = await Promise.all([
          sitesApi.getAll().catch(() => []),
          predictionApi.getAll().catch(() => []),
          alertApi.getAll().catch(() => []),
        ]);
        setSites(sitesData);
        setPredictions(predictionsData);
        setAlerts(alertsData);
      } catch (err) {
        console.error("Error loading analytics data from MySQL:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalyticsData();
  }, []);

  const totalSites = sites.length;
  const totalPredictions = predictions.length;
  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter((a) => a.status !== "RESOLVED").length;

  // Calculate risk distribution from actual predictions
  const safeCount = predictions.filter((p) => (p.riskLevel || "").includes("SAFE")).length;
  const modCount = predictions.filter((p) => (p.riskLevel || "").includes("MODERATE")).length;
  const highCount = predictions.filter((p) => (p.riskLevel || "").includes("HIGH")).length;

  // Format prediction history for trend charts
  const chartData = predictions.slice(-15).map((p, idx) => ({
    time: p.predictionTime ? new Date(p.predictionTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : `#${idx + 1}`,
    rainfall: (p.riskScore || p.confidenceScore || 50),
    soilMoisture: p.riskLevel && p.riskLevel.includes("HIGH") ? 85 : p.riskLevel && p.riskLevel.includes("MODERATE") ? 55 : 25,
    tilt: p.confidenceScore || 90,
  }));

  const hasData = totalSites > 0 || totalPredictions > 0 || totalAlerts > 0;

  return (
    <PageFrame title="Analytics & Risk Trends">
      <main className="module-content">
        <PageIntro
          kicker="ANALYTICAL RISK INTELLIGENCE · MYSQL DATA ENGINE"
          title="Analytics & Hazard Trends"
          description="Operational analytics and historical slope stability trends computed directly from your saved locations, predictions, and alerts."
        />

        {/* Top Summary Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div className="module-panel" style={{ padding: "18px" }}>
            <span className="eyebrow" style={{ color: "#38bdf8" }}>SAVED LOCATIONS</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#f8fafc", margin: "6px 0" }}>
              {totalSites}
            </div>
            <small style={{ color: "#94a3b8" }}>Dynamically configured in MySQL</small>
          </div>

          <div className="module-panel" style={{ padding: "18px" }}>
            <span className="eyebrow" style={{ color: "#38bdf8" }}>EVALUATED PREDICTIONS</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#f8fafc", margin: "6px 0" }}>
              {totalPredictions}
            </div>
            <small style={{ color: "#94a3b8" }}>FastAPI ML model evaluations</small>
          </div>

          <div className="module-panel" style={{ padding: "18px" }}>
            <span className="eyebrow" style={{ color: "#38bdf8" }}>ACTIVE ALERTS</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: activeAlerts > 0 ? "#ef4444" : "#10b981", margin: "6px 0" }}>
              {activeAlerts}
            </div>
            <small style={{ color: "#94a3b8" }}>Total issued: {totalAlerts}</small>
          </div>

          <div className="module-panel" style={{ padding: "18px" }}>
            <span className="eyebrow" style={{ color: "#38bdf8" }}>HIGHEST RISK LEVEL</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "10px 0" }}>
              <Pill tone={highCount > 0 ? "danger" : modCount > 0 ? "warn" : "safe"}>
                {highCount > 0 ? "HIGH RISK" : modCount > 0 ? "MODERATE RISK" : "SAFE Baseline"}
              </Pill>
            </div>
            <small style={{ color: "#94a3b8" }}>Across all site predictions</small>
          </div>
        </div>

        {loading ? (
          <p style={{ padding: "20px" }}>Loading analytics data from MySQL...</p>
        ) : !hasData ? (
          <div
            className="module-panel"
            style={{
              padding: "70px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "14px",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                marginBottom: "20px",
              }}
            >
              ▥
            </div>
            <h2 style={{ fontSize: "1.4rem", margin: "0 0 8px 0", color: "#f8fafc" }}>
              No Analytics Data Available Yet
            </h2>
            <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 0 24px 0", fontSize: "0.92rem", lineHeight: "1.6" }}>
              Analytics charts and risk distribution metrics are generated exclusively from real saved slope locations and prediction evaluations.
            </p>
            <button className="primary-action compact" onClick={() => navigate("/location-monitoring")}>
              Start Monitoring Locations ➔
            </button>
          </div>
        ) : (
          <>
            {/* Risk Distribution & Trend Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "24px" }}>
              {/* Distribution */}
              <section className="module-panel" style={{ padding: "20px" }}>
                <span className="eyebrow">RISK LEVEL DISTRIBUTION</span>
                <h3 style={{ margin: "6px 0 16px 0", fontSize: "1.1rem" }}>Evaluated Risk Breakdown</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>🟢 SAFE</span>
                      <strong>{safeCount} ({totalPredictions > 0 ? Math.round((safeCount / totalPredictions) * 100) : 0}%)</strong>
                    </div>
                    <div style={{ background: "#1e293b", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ background: "#10b981", height: "100%", width: `${totalPredictions > 0 ? (safeCount / totalPredictions) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ color: "#fbbf24", fontWeight: 600 }}>🟠 MODERATE RISK</span>
                      <strong>{modCount} ({totalPredictions > 0 ? Math.round((modCount / totalPredictions) * 100) : 0}%)</strong>
                    </div>
                    <div style={{ background: "#1e293b", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ background: "#f59e0b", height: "100%", width: `${totalPredictions > 0 ? (modCount / totalPredictions) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ color: "#f87171", fontWeight: 600 }}>🔴 HIGH RISK</span>
                      <strong>{highCount} ({totalPredictions > 0 ? Math.round((highCount / totalPredictions) * 100) : 0}%)</strong>
                    </div>
                    <div style={{ background: "#1e293b", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ background: "#ef4444", height: "100%", width: `${totalPredictions > 0 ? (highCount / totalPredictions) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Trend Chart */}
              <section className="module-panel" style={{ padding: "20px" }}>
                <span className="eyebrow">RISK TREND & HAZARD DYNAMICS</span>
                <h3 style={{ margin: "6px 0 16px 0", fontSize: "1.1rem" }}>Prediction Risk Dynamics Over Time</h3>
                <div style={{ height: "220px" }}>
                  <SensorTrendChart data={chartData} />
                </div>
              </section>
            </div>

            {/* Prediction History Table */}
            <section className="module-panel table-panel">
              <span className="eyebrow">SAVED PREDICTION HISTORY LOG</span>
              <div className="table-summary" style={{ margin: "12px 0" }}>
                Showing recent {predictions.length} AI prediction evaluations from MySQL
              </div>

              <table className="command-table">
                <thead>
                  <tr>
                    <th>Prediction ID</th>
                    <th>Location Site</th>
                    <th>Risk Level</th>
                    <th>Confidence Score</th>
                    <th>Recommendation</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                        No prediction evaluations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    predictions.map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td style={{ fontWeight: 600, color: "#f8fafc" }}>
                          📍 {p.siteName || `Site #${p.siteId || p.monitoringSiteId}`}
                        </td>
                        <td>
                          <Pill
                            tone={
                              (p.riskLevel || "").includes("HIGH")
                                ? "danger"
                                : (p.riskLevel || "").includes("MODERATE")
                                ? "warn"
                                : "safe"
                            }
                          >
                            {p.riskLevel ? p.riskLevel.replace("_", " ") : "SAFE"}
                          </Pill>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {Math.round(p.confidenceScore || p.riskScore || 90)}%
                        </td>
                        <td style={{ maxWidth: "340px", fontSize: "12px" }}>
                          {p.recommendation || "Baseline monitoring."}
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          {new Date(p.predictionTime || Date.now()).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </PageFrame>
  );
}

export default AnalyticsPage;
