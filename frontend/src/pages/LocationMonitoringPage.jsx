import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MonitoringMap from "../components/MonitoringMap";
import { sitesApi, predictionApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

// --- Haversine Distance Calculation (in meters / km) ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMeters = R * c;
  if (distanceInMeters >= 1000) {
    return `${(distanceInMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceInMeters)} m`;
}

export function LocationMonitoringPage() {
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Role Permissions
  const canManageLocations = role === "ADMIN" || role === "ENGINEER";
  const canAnalyzePrediction = role === "ADMIN" || role === "ENGINEER" || role === "SAFETY_OFFICER";

  // Data States
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [loadingSites, setLoadingSites] = useState(true);
  const [predicting, setPredicting] = useState(false);

  // Real-Time Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTelemetry, setSimulatedTelemetry] = useState(null);
  const simIntervalRef = useRef(null);

  // GPS Real-Time Monitoring State
  const [userGps, setUserGps] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    status: "STANDBY", // STANDBY, ACQUIRING, ACTIVE, DENIED, ERROR
    errorMsg: null,
  });
  const gpsWatchIdRef = useRef(null);

  // Add Location Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAcquiringModalGps, setIsAcquiringModalGps] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    siteType: "Rock Slope",
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [savingSite, setSavingSite] = useState(false);

  // Toast System State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // --- Load Sites on Component Mount ---
  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const sitesData = await sitesApi.getAll();
      const list = Array.isArray(sitesData) ? sitesData : [];
      setSites(list);
      if (list.length > 0) {
        setSelectedSiteId((prev) => {
          if (prev && list.some((s) => String(s.id) === String(prev))) {
            return prev;
          }
          return list[0].id;
        });
      } else {
        setSelectedSiteId(null);
      }
    } catch (err) {
      console.error("Error loading sites:", err);
      showToast("Failed to fetch monitoring locations", "error");
    } finally {
      setLoadingSites(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Selected site object
  const selectedSite = useMemo(() => {
    if (!selectedSiteId) return null;
    return sites.find((s) => String(s.id) === String(selectedSiteId)) || null;
  }, [sites, selectedSiteId]);

  // --- Load Prediction for Selected Site ---
  const loadPredictionForSite = useCallback(async (siteId) => {
    if (!siteId) {
      setCurrentPrediction(null);
      return;
    }
    try {
      const res = await predictionApi.getBySiteId(siteId);
      if (Array.isArray(res) && res.length > 0) {
        const sorted = [...res].sort(
          (a, b) => new Date(b.predictionTime || 0) - new Date(a.predictionTime || 0)
        );
        setCurrentPrediction(sorted[0]);
      } else {
        setCurrentPrediction(null);
      }
    } catch (err) {
      console.warn(`No existing prediction for site ${siteId}:`, err);
      setCurrentPrediction(null);
    }
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadPredictionForSite(selectedSiteId);
    }
  }, [selectedSiteId, loadPredictionForSite]);

  // Initial Base Telemetry for Selected Site
  const baseTelemetry = useMemo(() => {
    if (!selectedSite) {
      return {
        rainfall: 0.0,
        groundVibration: 0.02,
        tilt: 0.1,
        soilMoisture: 28.5,
        crackWidth: 0.2,
        temperature: 24.5,
      };
    }
    return {
      rainfall: selectedSite.rainfall != null ? Number(selectedSite.rainfall) : 12.4,
      groundVibration: selectedSite.groundVibration != null ? Number(selectedSite.groundVibration) : 0.04,
      tilt: selectedSite.tilt != null ? Number(selectedSite.tilt) : 0.45,
      soilMoisture: selectedSite.soilMoisture != null ? Number(selectedSite.soilMoisture) : 42.0,
      crackWidth: selectedSite.crackWidth != null ? Number(selectedSite.crackWidth) : 0.8,
      temperature: selectedSite.temperature != null ? Number(selectedSite.temperature) : 26.2,
    };
  }, [selectedSite]);

  // Sync telemetry when site changes or when not simulating
  useEffect(() => {
    if (!isSimulating) {
      setSimulatedTelemetry(baseTelemetry);
    }
  }, [baseTelemetry, isSimulating]);

  // --- Controlled Simulation Mode (3s Refresh) ---
  useEffect(() => {
    if (isSimulating) {
      simIntervalRef.current = setInterval(() => {
        setSimulatedTelemetry((prev) => {
          const current = prev || baseTelemetry;
          const deltaRain = +(Math.random() * 2.5 - 0.5).toFixed(1);
          const deltaVib = +(Math.random() * 0.03 - 0.01).toFixed(3);
          const deltaTilt = +(Math.random() * 0.05 - 0.01).toFixed(2);
          const deltaMoist = +(Math.random() * 1.2 - 0.3).toFixed(1);
          const deltaCrack = +(Math.random() * 0.04 - 0.01).toFixed(2);
          const deltaTemp = +(Math.random() * 0.4 - 0.2).toFixed(1);

          return {
            rainfall: Math.max(0, +(current.rainfall + deltaRain).toFixed(1)),
            groundVibration: Math.max(0, +(current.groundVibration + deltaVib).toFixed(3)),
            tilt: Math.max(0, +(current.tilt + deltaTilt).toFixed(2)),
            soilMoisture: Math.min(100, Math.max(0, +(current.soilMoisture + deltaMoist).toFixed(1))),
            crackWidth: Math.max(0, +(current.crackWidth + deltaCrack).toFixed(2)),
            temperature: +(current.temperature + deltaTemp).toFixed(1),
          };
        });
      }, 3000);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [isSimulating, baseTelemetry]);

  // --- Real GPS Geolocation Watcher ---
  const startGpsMonitoring = useCallback(() => {
    if (!navigator.geolocation) {
      setUserGps((prev) => ({
        ...prev,
        status: "ERROR",
        errorMsg: "Geolocation is not supported by your browser.",
      }));
      return;
    }

    setUserGps((prev) => ({ ...prev, status: "ACQUIRING", errorMsg: null }));

    if (gpsWatchIdRef.current) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          status: "ACTIVE",
          errorMsg: null,
        });
      },
      (err) => {
        let msg = "GPS Location error.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS Permission denied by user/browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS Position unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS Request timed out.";
        }
        setUserGps((prev) => ({
          ...prev,
          status: err.code === err.PERMISSION_DENIED ? "DENIED" : "ERROR",
          errorMsg: msg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  useEffect(() => {
    startGpsMonitoring();
    return () => {
      if (gpsWatchIdRef.current) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [startGpsMonitoring]);

  // --- Run Prediction / Analysis ---
  const handleRunPrediction = async () => {
    if (!selectedSiteId) {
      showToast("Please select a monitoring location first.", "error");
      return;
    }

    setPredicting(true);

    try {
      const payload = simulatedTelemetry || baseTelemetry;
      const result = await predictionApi.evaluateSite(selectedSiteId, payload);
      setCurrentPrediction(result);
      showToast(`Prediction updated for ${selectedSite?.name || "selected location"}!`, "success");
    } catch (err) {
      console.error("Prediction evaluation error:", err);
      showToast("Failed to run prediction evaluation.", "error");
    } finally {
      setPredicting(false);
    }
  };

  // --- Add Location Handlers ---
  const handleOpenAddModal = () => {
    setAddForm({
      name: "",
      location: "",
      latitude: selectedSite?.latitude ? String(selectedSite.latitude) : "11.35300",
      longitude: selectedSite?.longitude ? String(selectedSite.longitude) : "76.79500",
      siteType: "Rock Slope",
    });
    setAddFormErrors({});
    setShowAddModal(true);
  };

  const handleUseGpsInModal = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setIsAcquiringModalGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setIsAcquiringModalGps(false);
        showToast("Auto-filled coordinates from current GPS position!", "info");
      },
      () => {
        setIsAcquiringModalGps(false);
        showToast("Could not access GPS coordinates. You can enter manually.", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!addForm.name.trim()) errors.name = "Location name is required.";
    if (!addForm.location.trim()) errors.location = "Address/Description is required.";
    const latNum = parseFloat(addForm.latitude);
    const lngNum = parseFloat(addForm.longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.latitude = "Valid latitude is required (-90 to 90).";
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.longitude = "Valid longitude is required (-180 to 180).";
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }

    setSavingSite(true);
    setAddFormErrors({});

    try {
      const payload = {
        name: addForm.name.trim(),
        location: addForm.location.trim(),
        latitude: latNum,
        longitude: lngNum,
        siteType: addForm.siteType,
        status: "ACTIVE",
      };

      const newSite = await sitesApi.create(payload);
      showToast(`Location "${newSite.name || addForm.name}" created successfully!`, "success");
      setShowAddModal(false);

      await loadSites();
      if (newSite && newSite.id) {
        setSelectedSiteId(newSite.id);
      }
    } catch (err) {
      console.error("Error creating location:", err);
      const serverMsg = err.response?.data?.message || "Failed to create location.";
      setAddFormErrors({ server: serverMsg });
      showToast(serverMsg, "error");
    } finally {
      setSavingSite(false);
    }
  };

  // Distance between user GPS and selected site
  const computedDistance = useMemo(() => {
    if (userGps.lat != null && userGps.lng != null && selectedSite?.latitude != null && selectedSite?.longitude != null) {
      return calculateDistance(userGps.lat, userGps.lng, selectedSite.latitude, selectedSite.longitude);
    }
    return null;
  }, [userGps, selectedSite]);

  // Risk Color Mapping
  const riskInfo = useMemo(() => {
    if (!currentPrediction) {
      return { label: "NO DATA", color: "#94a3b8", tone: "info", bg: "rgba(148, 163, 184, 0.15)" };
    }
    const rStr = String(currentPrediction.riskLevel || "").toUpperCase();
    if (rStr.includes("HIGH") || rStr.includes("CRITICAL") || rStr.includes("DANGER")) {
      return { label: "HIGH RISK", color: "#f87171", tone: "danger", bg: "rgba(239, 68, 68, 0.2)" };
    }
    if (rStr.includes("MODERATE") || rStr.includes("MEDIUM") || rStr.includes("WARN")) {
      return { label: "MODERATE RISK", color: "#fbbf24", tone: "warning", bg: "rgba(245, 158, 11, 0.2)" };
    }
    return { label: "SAFE", color: "#34d399", tone: "safe", bg: "rgba(16, 185, 129, 0.2)" };
  }, [currentPrediction]);

  // Sensors list for bottom compact grid
  const sensorDisplayList = useMemo(() => {
    const data = simulatedTelemetry || baseTelemetry;
    return [
      {
        id: "rain",
        label: "Rainfall",
        value: `${data.rainfall} mm`,
        status: data.rainfall > 50 ? "Critical" : data.rainfall > 20 ? "Elevated" : "Normal",
        statusTone: data.rainfall > 50 ? "danger" : data.rainfall > 20 ? "warning" : "safe",
        icon: "🌧️",
      },
      {
        id: "vibration",
        label: "Ground Vibration",
        value: `${data.groundVibration} g`,
        status: data.groundVibration > 0.1 ? "Elevated" : "Normal",
        statusTone: data.groundVibration > 0.1 ? "warning" : "safe",
        icon: "📳",
      },
      {
        id: "tilt",
        label: "Tilt Angle",
        value: `${data.tilt}°`,
        status: data.tilt > 2.0 ? "Critical" : data.tilt > 0.8 ? "Elevated" : "Normal",
        statusTone: data.tilt > 2.0 ? "danger" : data.tilt > 0.8 ? "warning" : "safe",
        icon: "📐",
      },
      {
        id: "moisture",
        label: "Soil Moisture",
        value: `${data.soilMoisture}%`,
        status: data.soilMoisture > 75 ? "Critical" : data.soilMoisture > 50 ? "Elevated" : "Normal",
        statusTone: data.soilMoisture > 75 ? "danger" : data.soilMoisture > 50 ? "warning" : "safe",
        icon: "💧",
      },
      {
        id: "crack",
        label: "Crack Width",
        value: `${data.crackWidth} mm`,
        status: data.crackWidth > 3.0 ? "Critical" : data.crackWidth > 1.2 ? "Elevated" : "Normal",
        statusTone: data.crackWidth > 3.0 ? "danger" : data.crackWidth > 1.2 ? "warning" : "safe",
        icon: "🔍",
      },
      {
        id: "temp",
        label: "Temperature",
        value: `${data.temperature}°C`,
        status: "Normal",
        statusTone: "safe",
        icon: "🌡️",
      },
    ];
  }, [simulatedTelemetry, baseTelemetry]);

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="Location Monitoring" onNotification={() => {}} />

        {/* --- Toast System Banner --- */}
        {toast && (
          <div className={`loc-toast loc-toast-${toast.type}`}>
            <span>{toast.type === "error" ? "⚠️" : toast.type === "info" ? "ℹ️" : "✅"}</span>
            <div className="loc-toast-content">{toast.message}</div>
            <button onClick={() => setToast(null)} className="loc-toast-close">&times;</button>
          </div>
        )}

        {/* --- Top Dashboard Controls Header Bar --- */}
        <div className="loc-header-bar">
          <div className="loc-header-info">
            <h2>Location Monitoring Control Panel</h2>
            <p>Real-time AI slope hazard surveillance & GPS location intelligence</p>
          </div>

          <div className="loc-header-actions">
            {/* Selected Location Selector */}
            <div className="loc-select-wrapper">
              <label htmlFor="site-select">LOCATION:</label>
              <select
                id="site-select"
                value={selectedSiteId || ""}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={loadingSites || sites.length === 0}
                className="loc-select-input"
              >
                {loadingSites ? (
                  <option value="">Loading locations...</option>
                ) : sites.length === 0 ? (
                  <option value="">No locations available</option>
                ) : (
                  sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.siteName} ({s.siteType || "Slope"})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Simulation Mode Toggle Button */}
            <button
              onClick={() => {
                const nextState = !isSimulating;
                setIsSimulating(nextState);
                showToast(
                  nextState ? "Simulation Mode Started (3s interval)" : "Simulation Mode Stopped",
                  nextState ? "info" : "default"
                );
              }}
              className={`btn-sim ${isSimulating ? "btn-sim-active" : ""}`}
              title="Toggle 3-second live sensor simulation mode"
            >
              <span className="sim-dot"></span>
              {isSimulating ? "Stop Simulation" : "Start Simulation"}
            </button>

            {/* Add Location Button (ADMIN / ENGINEER) */}
            {canManageLocations && (
              <button onClick={handleOpenAddModal} className="btn-add-loc">
                <span>+</span> Add Location
              </button>
            )}
          </div>
        </div>

        {/* --- Main One-Screen Compact Dashboard Grid --- */}
        <div className="loc-dashboard-grid">
          {/* LEFT COLUMN: Advanced Real GPS Map & Location Metadata */}
          <div className="loc-panel loc-map-panel">
            <div className="panel-title-bar">
              <div className="panel-title">
                <span className="icon">🗺️</span>
                <div>
                  <h3>Advanced GPS Monitoring</h3>
                  <small>Live Geographic Positioning System</small>
                </div>
              </div>

              {/* GPS Actions */}
              <div className="gps-btn-group">
                <button
                  onClick={startGpsMonitoring}
                  className="btn-gps-small"
                  title="Refresh browser GPS location"
                >
                  📡 Refresh GPS
                </button>
              </div>
            </div>

            {/* Leaflet Map Integration */}
            <div className="loc-map-container">
              <MonitoringMap
                sites={sites}
                filter="ALL"
                onSelect={(site) => setSelectedSiteId(site.id)}
                clickedCoords={
                  userGps.lat && userGps.lng
                    ? { lat: userGps.lat, lng: userGps.lng }
                    : selectedSite
                    ? { lat: selectedSite.latitude, lng: selectedSite.longitude }
                    : null
                }
              />
            </div>

            {/* GPS Metadata Strip */}
            <div className="gps-metadata-strip">
              <div className="gps-meta-item">
                <span className="meta-label">Selected Location:</span>
                <span className="meta-val">
                  {selectedSite ? `${selectedSite.latitude?.toFixed(4)}°N, ${selectedSite.longitude?.toFixed(4)}°E` : "None"}
                </span>
              </div>

              <div className="gps-meta-item">
                <span className="meta-label">Current GPS Position:</span>
                <span className="meta-val">
                  {userGps.lat != null
                    ? `${userGps.lat.toFixed(4)}°N, ${userGps.lng.toFixed(4)}°E`
                    : userGps.status === "DENIED"
                    ? "Permission Denied"
                    : userGps.status === "ACQUIRING"
                    ? "Acquiring..."
                    : "Unavailable"}
                </span>
              </div>

              <div className="gps-meta-item">
                <span className="meta-label">GPS Accuracy:</span>
                <span className="meta-val">
                  {userGps.accuracy != null ? `±${userGps.accuracy} m` : "N/A"}
                </span>
              </div>

              <div className="gps-meta-item">
                <span className="meta-label">Distance to Location:</span>
                <span className="meta-val highlight-dist">
                  {computedDistance || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Prediction & Risk Analytics Panel */}
          <div className="loc-panel loc-pred-panel">
            <div className="panel-title-bar">
              <div className="panel-title">
                <span className="icon">🧠</span>
                <div>
                  <h3>AI Risk Prediction Engine</h3>
                  <small>Physics & ML Slope Failure Assessment</small>
                </div>
              </div>

              {canAnalyzePrediction && (
                <button
                  onClick={handleRunPrediction}
                  disabled={predicting || !selectedSiteId}
                  className="btn-predict-action"
                >
                  {predicting ? "Analyzing..." : "Predict / Analyze"}
                </button>
              )}
            </div>

            {/* Prediction Body / Empty State */}
            {!currentPrediction && !predicting ? (
              <div className="pred-empty-state">
                <div className="empty-icon">📊</div>
                <h4>No Prediction Evaluated Yet</h4>
                <p>
                  No AI risk evaluation has been computed for{" "}
                  <strong>{selectedSite?.name || "this location"}</strong>.
                </p>
                {canAnalyzePrediction ? (
                  <button onClick={handleRunPrediction} className="btn-predict-action mt-2">
                    ⚡ Run Instant AI Analysis
                  </button>
                ) : (
                  <small style={{ color: "#94a3b8" }}>
                    Ask an Engineer or Admin to evaluate slope risk.
                  </small>
                )}
              </div>
            ) : predicting ? (
              <div className="pred-loading-state">
                <div className="pred-spinner"></div>
                <p>Running Physics-Informed ML Failure Assessment...</p>
              </div>
            ) : (
              <div className="pred-content">
                {/* Primary Risk Status Box */}
                <div className="risk-display-box" style={{ background: riskInfo.bg, borderColor: riskInfo.color }}>
                  <div className="risk-badge-large" style={{ color: riskInfo.color }}>
                    {riskInfo.label}
                  </div>
                  <div className="risk-metric-group">
                    <div className="risk-stat">
                      <span className="stat-label">Failure Probability</span>
                      <strong className="stat-value" style={{ color: riskInfo.color }}>
                        {currentPrediction.riskProbability != null
                          ? `${Number(currentPrediction.riskProbability).toFixed(1)}%`
                          : "N/A"}
                      </strong>
                    </div>

                    <div className="risk-stat">
                      <span className="stat-label">Confidence Score</span>
                      <strong className="stat-value">
                        {currentPrediction.confidenceScore != null
                          ? `${Number(currentPrediction.confidenceScore).toFixed(1)}%`
                          : "95.0%"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Key Insights & Recommendation */}
                <div className="pred-details-grid">
                  <div className="pred-detail-card">
                    <span className="detail-heading">Recommended Action</span>
                    <p className="detail-text">
                      {currentPrediction.recommendation ||
                        "Maintain routine telemetry sensors and automated surveillance."}
                    </p>
                  </div>

                  <div className="pred-detail-card">
                    <span className="detail-heading">Primary Contributing Factors</span>
                    <ul className="factors-list">
                      {currentPrediction.factors && currentPrediction.factors.length > 0 ? (
                        currentPrediction.factors.map((factor, idx) => (
                          <li key={idx}>
                            <span className="factor-bullet">•</span> {factor}
                          </li>
                        ))
                      ) : (
                        <>
                          <li><span className="factor-bullet">•</span> Rainfall & Pore Water Saturation</li>
                          <li><span className="factor-bullet">•</span> Subsurface Moisture Retention</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Prediction Footer Timestamp */}
                <div className="pred-footer-info">
                  <span>
                    🕒 Last Prediction:{" "}
                    {currentPrediction.predictionTime
                      ? new Date(currentPrediction.predictionTime).toLocaleString()
                      : "Just now"}
                  </span>
                  {isSimulating && <span className="sim-mode-indicator">Mode: SIMULATION</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Bottom Compact Row: Real-Time Telemetry Panel --- */}
        <div className="loc-bottom-row">
          <div className="loc-panel loc-telemetry-panel">
            <div className="telemetry-bar-header">
              <div className="telemetry-title">
                <span className="icon">📡</span>
                <h4>Real-Time Simulated Sensor Data</h4>
                {isSimulating ? (
                  <span className="pill-sim-tag active">Simulation Mode Active (3s)</span>
                ) : (
                  <span className="pill-sim-tag paused">Simulation Paused</span>
                )}
              </div>

              <div className="site-tag">
                Location: <strong>{selectedSite?.name || "None"}</strong>
              </div>
            </div>

            {/* Sensor Cards Grid */}
            <div className="sensor-compact-grid">
              {sensorDisplayList.map((sensor) => (
                <div key={sensor.id} className="sensor-card-compact">
                  <div className="sensor-top">
                    <span className="sensor-icon">{sensor.icon}</span>
                    <span className="sensor-label">{sensor.label}</span>
                  </div>

                  <div className="sensor-bottom">
                    <strong className="sensor-val">{sensor.value}</strong>
                    <span className={`sensor-badge badge-${sensor.statusTone}`}>
                      {sensor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Feature 1: Add Location Modal --- */}
        {showAddModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h3>📍 Add New Monitoring Location</h3>
                <button onClick={() => setShowAddModal(false)} className="modal-close-btn">&times;</button>
              </div>

              <form onSubmit={handleSaveLocation} className="modal-form">
                {addFormErrors.server && (
                  <div className="form-error-alert">{addFormErrors.server}</div>
                )}

                <div className="form-group">
                  <label htmlFor="add-name">Location Name *</label>
                  <input
                    id="add-name"
                    type="text"
                    placeholder="e.g. Wayanad Hill Slope Site 4"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className={addFormErrors.name ? "input-err" : ""}
                  />
                  {addFormErrors.name && <span className="field-err">{addFormErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="add-location">Location Address / Description *</label>
                  <input
                    id="add-location"
                    type="text"
                    placeholder="e.g. NH-766 Highway Corridor, Km 42"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className={addFormErrors.location ? "input-err" : ""}
                  />
                  {addFormErrors.location && <span className="field-err">{addFormErrors.location}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="add-lat">Latitude *</label>
                    <input
                      id="add-lat"
                      type="number"
                      step="any"
                      placeholder="11.3530"
                      value={addForm.latitude}
                      onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
                      className={addFormErrors.latitude ? "input-err" : ""}
                    />
                    {addFormErrors.latitude && <span className="field-err">{addFormErrors.latitude}</span>}
                  </div>

                  <div className="form-group half">
                    <label htmlFor="add-lng">Longitude *</label>
                    <input
                      id="add-lng"
                      type="number"
                      step="any"
                      placeholder="76.7950"
                      value={addForm.longitude}
                      onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
                      className={addFormErrors.longitude ? "input-err" : ""}
                    />
                    {addFormErrors.longitude && <span className="field-err">{addFormErrors.longitude}</span>}
                  </div>
                </div>

                {/* Auto-detect GPS button inside modal */}
                <div className="gps-auto-box">
                  <button
                    type="button"
                    onClick={handleUseGpsInModal}
                    disabled={isAcquiringModalGps}
                    className="btn-gps-auto"
                  >
                    📡 {isAcquiringModalGps ? "Acquiring GPS..." : "Use Current GPS Location"}
                  </button>
                  <small>Fills latitude and longitude using device GPS sensor</small>
                </div>

                <div className="form-group">
                  <label htmlFor="add-type">Location Type</label>
                  <select
                    id="add-type"
                    value={addForm.siteType}
                    onChange={(e) => setAddForm({ ...addForm, siteType: e.target.value })}
                  >
                    <option value="Rock Slope">Rock Slope</option>
                    <option value="Soil Cut">Soil Cut</option>
                    <option value="Embankment">Embankment</option>
                    <option value="Open Pit">Open Pit</option>
                    <option value="Highway Margin">Highway Margin</option>
                    <option value="Mining Slope">Mining Slope</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-cancel"
                    disabled={savingSite}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSite}
                    className="btn-save"
                  >
                    {savingSite ? "Saving..." : "Save Location"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationMonitoringPage;
