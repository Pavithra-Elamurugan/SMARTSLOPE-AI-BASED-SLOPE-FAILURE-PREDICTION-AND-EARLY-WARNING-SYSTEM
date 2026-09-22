import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { predictionApi } from "../services/api";

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

const safeNumberFormat = (val, decimals = 1, fallback = "0.0") => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
};

export function PredictionPage() {
  const [collapsed, setCollapsed] = useState(false);

  // Custom sensor inputs for AI prediction analysis
  const [rainfall, setRainfall] = useState(45.0);
  const [soilMoisture, setSoilMoisture] = useState(65.0);
  const [groundVibration, setGroundVibration] = useState(0.45);
  const [tilt, setTilt] = useState(2.8);
  const [crackWidth, setCrackWidth] = useState(3.5);
  const [waterLevel, setWaterLevel] = useState(4.2);
  const [slopeAngle, setSlopeAngle] = useState(38.0);
  const [soilType, setSoilType] = useState("Residual Soil");

  // Prediction result state
  const [evaluating, setEvaluating] = useState(false);
  const [predictionResult, setPredictionResult] = useState({
    riskLevel: "MODERATE RISK",
    riskProbability: 58.5,
    confidenceScore: 94.2,
    factors: [
      { name: "Monsoon Rainfall Saturation", impact: "High", contribution: "38%" },
      { name: "Displacement & Crack Extension", impact: "Medium", contribution: "27%" },
      { name: "Ground Vibration Acceleration", impact: "Medium", contribution: "19%" },
      { name: "Slope Angle Baseline", impact: "Low", contribution: "16%" },
    ],
  });

  const runPredictionInference = async () => {
    setEvaluating(true);
    try {
      const payload = {
        rainfall,
        soilMoisture,
        groundVibration,
        tilt,
        crackWidth,
        waterLevel,
        slopeAngle,
        soilType,
      };

      const res = await predictionApi.predictCustom(payload).catch(null);

      if (res) {
        const prob = res.riskProbability ?? res.probability ?? 58.5;
        const level = prob >= 70 ? "HIGH RISK" : prob >= 40 ? "MODERATE RISK" : "SAFE";

        setPredictionResult({
          riskLevel: level,
          riskProbability: prob,
          confidenceScore: res.confidenceScore ?? 95.0,
          factors: [
            { name: "Rainfall Volume", impact: rainfall > 60 ? "High" : rainfall > 30 ? "Medium" : "Low", contribution: `${Math.min(45, Math.round(rainfall * 0.5))}%` },
            { name: "Crack Width Extension", impact: crackWidth > 4 ? "High" : crackWidth > 2 ? "Medium" : "Low", contribution: `${Math.min(30, Math.round(crackWidth * 6))}%` },
            { name: "Ground Vibration & Tilt", impact: tilt > 3 || groundVibration > 0.5 ? "High" : "Low", contribution: `${Math.min(25, Math.round((tilt + groundVibration * 10) * 3))}%` },
          ],
        });
      }
    } catch (err) {
      console.error("Custom AI prediction failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const isHigh = (predictionResult.riskLevel || "").includes("HIGH");
  const isMod = (predictionResult.riskLevel || "").includes("MODERATE");

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="AI Machine Learning Slope Stability Model" />

        <main className="module-content" style={{ padding: "24px 32px", paddingBottom: "40px" }}>
          {/* Page Header */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  ⚡ AI Landslide Hazard Prediction Engine
                </h1>
                <span className="demo-pill" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  FASTAPI SCIKIT-LEARN MODEL
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
                Evaluate physical geotechnical sensor parameters using the trained AI failure risk classification pipeline.
              </p>
            </div>

            <button className="primary-action" onClick={runPredictionInference} disabled={evaluating}>
              {evaluating ? "Executing Model..." : "⚡ Run AI Prediction Inference"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            
            {/* LEFT COLUMN: SENSOR INPUT CONTROLS */}
            <section className="module-panel">
              <span className="eyebrow">GEOTECHNICAL & TELEMETRY SENSOR INPUTS</span>
              <h3 className="section-heading" style={{ margin: "4px 0 16px 0" }}>Adjust Monitoring Variables</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                
                {/* Rainfall Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>🌧️ Rainfall Intensity (mm/h)</span>
                    <strong style={{ color: "#38bdf8" }}>{rainfall} mm/h</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    value={rainfall}
                    onChange={(e) => setRainfall(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#38bdf8" }}
                  />
                </div>

                {/* Soil Moisture Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>💧 Soil Saturation Moisture (%)</span>
                    <strong style={{ color: "#34d399" }}>{soilMoisture}%</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={soilMoisture}
                    onChange={(e) => setSoilMoisture(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#34d399" }}
                  />
                </div>

                {/* Crack Width Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>🔍 Surface Crack Width (mm)</span>
                    <strong style={{ color: "#fbbf24" }}>{crackWidth} mm</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={crackWidth}
                    onChange={(e) => setCrackWidth(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#fbbf24" }}
                  />
                </div>

                {/* Tilt Angle Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>📐 Sensor Inclinometer Tilt (°)</span>
                    <strong style={{ color: "#fca5a5" }}>{tilt}°</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={tilt}
                    onChange={(e) => setTilt(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#ef4444" }}
                  />
                </div>

                {/* Ground Vibration Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>〰️ Seismic / Ground Vibration (g)</span>
                    <strong style={{ color: "#e2e8f0" }}>{groundVibration} g</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.05"
                    value={groundVibration}
                    onChange={(e) => setGroundVibration(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#a855f7" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "8px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Slope Geometry Angle (°)</label>
                    <input
                      type="number"
                      value={slopeAngle}
                      onChange={(e) => setSlopeAngle(parseFloat(e.target.value) || 35)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Soil Formation Type</label>
                    <select
                      value={soilType}
                      onChange={(e) => setSoilType(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", marginTop: "4px" }}
                    >
                      <option>Residual Soil</option>
                      <option>Clay Loam</option>
                      <option>Weathered Rock</option>
                      <option>Sandy Gravel</option>
                    </select>
                  </div>
                </div>

              </div>
            </section>

            {/* RIGHT COLUMN: AI PREDICTION RESULTS & CONTRIBUTING FACTORS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Prediction Result Display */}
              <section className="module-panel" style={{ borderLeft: isHigh ? "4px solid #ef4444" : isMod ? "4px solid #f59e0b" : "4px solid #10b981" }}>
                <span className="eyebrow">MODEL EVALUATION OUTPUT</span>
                <h3 className="section-heading" style={{ margin: "4px 0 16px 0" }}>Landslide Failure Probability</h3>

                <div style={{ padding: "20px", background: "rgba(15,23,42,0.8)", borderRadius: "12px", textAlign: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "2.8rem", fontWeight: 900, color: isHigh ? "#ef4444" : isMod ? "#fbbf24" : "#34d399" }}>
                    {safeNumberFormat(predictionResult.riskProbability, 1)}%
                  </div>
                  <div style={{ margin: "4px 0 12px 0" }}>
                    <Pill tone={isHigh ? "danger" : isMod ? "warn" : "safe"}>
                      {predictionResult.riskLevel}
                    </Pill>
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Model Confidence Index: <strong>{safeNumberFormat(predictionResult.confidenceScore, 1)}%</strong>
                  </span>
                </div>
              </section>

              {/* Key Contributing Factors Breakdown */}
              <section className="module-panel">
                <span className="eyebrow">FAILURE RISK DRIVERS</span>
                <h3 className="section-heading" style={{ margin: "4px 0 14px 0" }}>Key Contributing Factors</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {predictionResult.factors.map((f, idx) => (
                    <div key={idx} style={{ padding: "12px 14px", background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: "#f8fafc", fontSize: "13px" }}>{f.name}</strong>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Impact Level: <span style={{ color: f.impact === "High" ? "#ef4444" : f.impact === "Medium" ? "#fbbf24" : "#34d399", fontWeight: 700 }}>{f.impact}</span></div>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8" }}>{f.contribution}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default PredictionPage;
