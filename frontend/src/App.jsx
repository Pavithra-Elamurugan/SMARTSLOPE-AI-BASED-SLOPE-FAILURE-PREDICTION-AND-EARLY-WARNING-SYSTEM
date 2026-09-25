import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import { LocationMonitoringPage } from "./pages/LocationMonitoringPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import UserManagementPage from "./pages/UserManagementPage";
import InspectionsPage from "./pages/InspectionsPage";
import { alertApi } from "./services/api";
import "./App.css";

// React Error Boundary to prevent white screen crashes
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SmartSlope ErrorBoundary caught exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            background: "#0f172a",
            color: "#f8fafc",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "1.5rem", margin: "0 0 8px 0" }}>Interface Display Notice</h2>
          <p style={{ color: "#94a3b8", maxWidth: "500px", margin: "0 0 20px 0", fontSize: "13px" }}>
            The application encountered a transient UI update issue. Real-time background slope monitoring remains fully active.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Refresh Command Center
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Independent High-Risk Alert Popup Component
function GlobalAlertBanner() {
  const [activeAlert, setActiveAlert] = useState(null);
  const [updatingAlert, setUpdatingAlert] = useState(false);
  const dismissedRef = useRef(new Set());
  const seenRef = useRef(new Set());

  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(440, ctx.currentTime);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
    } catch (err) {
      console.warn("Audio playback context warning:", err);
    }
  };

  const triggerDesktopNotification = (alertItem) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("🚨 SmartSlope HIGH RISK LANDSLIDE WARNING", {
        body: alertItem.message || "High slope failure risk detected at monitoring site.",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("🚨 SmartSlope HIGH RISK LANDSLIDE WARNING", {
            body: alertItem.message || "High slope failure risk detected at monitoring site.",
          });
        }
      });
    }
  };

  const checkAlerts = async () => {
    if (!localStorage.getItem('smartslope_token')) {
      setActiveAlert(null);
      return;
    }
    try {
      const res = await alertApi.getAll().catch(() => []);
      const alerts = Array.isArray(res) ? res : [];
      const criticalAlert = alerts.find(
        (a) =>
          a &&
          ((a.severity === "CRITICAL" || a.alertType === "CRITICAL" || a.severity === "HIGH") ||
            (a.message || "").toUpperCase().includes("HIGH")) &&
          (a.status === "NEW" || a.status === "ACKNOWLEDGED" || a.status === "INVESTIGATING")
      );

      if (criticalAlert && !dismissedRef.current.has(criticalAlert.id)) {
        if (!seenRef.current.has(criticalAlert.id)) {
          playAlertSound();
          triggerDesktopNotification(criticalAlert);
          seenRef.current.add(criticalAlert.id);
        }
        setActiveAlert(criticalAlert);
      } else if (!criticalAlert) {
        setActiveAlert(null);
      }
    } catch (err) {
      // Safe catch
    }
  };

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    if (activeAlert) {
      dismissedRef.current.add(activeAlert.id);
    }
    setActiveAlert(null);
  };

  const handleUpdateStatus = async (nextStatus) => {
    if (!activeAlert) return;
    setUpdatingAlert(true);
    try {
      await alertApi.update(activeAlert.id, { ...activeAlert, status: nextStatus });
      dismissedRef.current.add(activeAlert.id);
      setActiveAlert(null);
      checkAlerts();
    } catch (err) {
      console.error("Failed to update alert lifecycle status:", err);
      setActiveAlert(null);
    } finally {
      setUpdatingAlert(false);
    }
  };

  if (!activeAlert) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
          border: "2px solid #ef4444",
          boxShadow: "0 0 40px rgba(239, 68, 68, 0.5)",
          borderRadius: "16px",
          width: "560px",
          maxWidth: "95vw",
          padding: "28px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🚨</span>
            <div>
              <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                EMERGENCY HIGH-RISK HAZARD ALERT
              </span>
              <h2 style={{ margin: "2px 0 0 0", fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc" }}>
                Critical Landslide Warning Detected
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "16px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
            <span><strong>Location:</strong> {activeAlert.siteName || `Site #${activeAlert.siteId}`}</span>
            <span style={{ background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
              HIGH RISK
            </span>
          </div>

          <p style={{ margin: "0 0 10px 0", fontSize: "13.5px", color: "#fca5a5", lineHeight: "1.5" }}>
            {activeAlert.message}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#cbd5e1" }}>
            <span><strong>Status:</strong> <span style={{ color: "#fbbf24", fontWeight: 700 }}>{activeAlert.status || "NEW"}</span></span>
            <span><strong>Detected:</strong> {new Date(activeAlert.sentAt || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={playAlertSound}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🔊 Replay Siren
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {activeAlert.status === "NEW" && (
              <button
                onClick={() => handleUpdateStatus("ACKNOWLEDGED")}
                disabled={updatingAlert}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ Acknowledge
              </button>
            )}

            {(activeAlert.status === "NEW" || activeAlert.status === "ACKNOWLEDGED") && (
              <button
                onClick={() => handleUpdateStatus("INVESTIGATING")}
                disabled={updatingAlert}
                style={{
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔍 Start Investigation
              </button>
            )}

            <button
              onClick={() => handleUpdateStatus("RESOLVED")}
              disabled={updatingAlert}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✅ Mark Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <GlobalAlertBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* CORE ROLE PAGES */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER", "PENDING"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-monitoring"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER"]}>
                  <LocationMonitoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER"]}>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER"]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "SAFETY_OFFICER"]}>
                  <InspectionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />

            {/* LEGACY REDIRECTS */}
            <Route path="/predictions" element={<Navigate to="/location-monitoring" replace />} />
            <Route path="/sites" element={<Navigate to="/location-monitoring" replace />} />
            <Route path="/sensors" element={<Navigate to="/location-monitoring" replace />} />
            <Route path="/incidents" element={<Navigate to="/dashboard" replace />} />
            <Route path="/map" element={<Navigate to="/location-monitoring" replace />} />
            <Route path="/reports" element={<Navigate to="/analytics" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
}
