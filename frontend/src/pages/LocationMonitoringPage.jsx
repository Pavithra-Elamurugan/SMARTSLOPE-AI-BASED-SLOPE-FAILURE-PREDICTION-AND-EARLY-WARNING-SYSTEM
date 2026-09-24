import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MonitoringMap from "../components/MonitoringMap";
import { sitesApi, predictionApi, fetchLocationWeather } from "../services/api";
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

  // Search Location Input State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Open-Meteo Real Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const monitoringTimerRef = useRef(null);
  const lastAlertedRiskRef = useRef(null);

  // GPS Real-Time Monitoring State
  const [userGps, setUserGps] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    status: "STANDBY", // STANDBY, ACQUIRING, ACTIVE, DENIED, ERROR
    errorMsg: null,
  });
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  // Add Location Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAcquiringModalGps, setIsAcquiringModalGps] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    slopeType: "Moderate",
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [savingSite, setSavingSite] = useState(false);

  // Toast System State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
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
      showToast("Failed to fetch saved monitoring sites.", "error");
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

  // --- Load Weather Data for Coordinates (Real Open-Meteo API) ---
  const loadWeatherForCoords = useCallback(async (lat, lng) => {
    if (lat == null || lng == null) return;
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const w = await fetchLocationWeather(lat, lng);
      setWeatherData(w);
      setLastUpdatedTime(new Date().toLocaleTimeString());
      return w;
    } catch (err) {
      console.warn("Open-Meteo weather fetch error:", err);
      setWeatherError("Unable to fetch live weather data for coordinates.");
      const fallback = {
        rainfall: null,
        humidity: null,
        temperature: null,
        windSpeed: null,
        surfacePressure: null,
        soilMoisture: null,
        elevation: null,
        condition: "Unavailable",
        source: "Unavailable",
      };
      setWeatherData(fallback);
      return fallback;
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  // --- Real-Time Monitoring & Weather Update Cycle ---
  const runMonitoringCycle = useCallback(async (siteObj) => {
    if (!siteObj || siteObj.latitude == null || siteObj.longitude == null) return;
    try {
      await loadWeatherForCoords(siteObj.latitude, siteObj.longitude);
    } catch (err) {
      console.warn("Monitoring weather refresh error:", err);
    }
  }, [loadWeatherForCoords]);

  // Real-Time Controlled Interval Hook (Prevents duplicate intervals and does NOT run auto prediction)
  useEffect(() => {
    if (monitoringTimerRef.current) {
      clearInterval(monitoringTimerRef.current);
      monitoringTimerRef.current = null;
    }

    if (!isMonitoring || !selectedSite) return;

    runMonitoringCycle(selectedSite);

    monitoringTimerRef.current = setInterval(() => {
      runMonitoringCycle(selectedSite);
    }, 30000);

    return () => {
      if (monitoringTimerRef.current) {
        clearInterval(monitoringTimerRef.current);
        monitoringTimerRef.current = null;
      }
    };
  }, [selectedSite, isMonitoring, runMonitoringCycle]);

  // When selected site changes, clear stale prediction and load weather
  useEffect(() => {
    if (selectedSiteId) {
      setCurrentPrediction(null);
      const siteObj = sites.find((s) => String(s.id) === String(selectedSiteId));
      if (siteObj && siteObj.latitude != null && siteObj.longitude != null) {
        loadWeatherForCoords(siteObj.latitude, siteObj.longitude);
      }
    }
  }, [selectedSiteId, sites, loadWeatherForCoords]);

  // --- Toggle Monitoring Handler ---
  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      if (monitoringTimerRef.current) {
        clearInterval(monitoringTimerRef.current);
        monitoringTimerRef.current = null;
      }
      showToast("Real-time location monitoring paused.", "info");
    } else {
      setIsMonitoring(true);
      showToast("Real-time location monitoring started.", "success");
    }
  };

  // --- FIX USE CURRENT GPS FUNCTIONALITY ---
  const handleUseCurrentGps = (isModal = false) => {
    if (!navigator.geolocation) {
      const errMsg = "Geolocation is not supported by your browser.";
      showToast(errMsg, "error");
      return;
    }

    if (isModal) {
      setIsAcquiringModalGps(true);
    } else {
      setIsAcquiringGps(true);
      setUserGps((prev) => ({ ...prev, status: "ACQUIRING", errorMsg: null }));
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latStr = latitude.toFixed(6);
        const lngStr = longitude.toFixed(6);

        setUserGps({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          status: "ACTIVE",
          errorMsg: null,
        });

        // Always update addForm when GPS button is clicked (modal or panel)
        setAddForm((prev) => ({
          ...prev,
          latitude: latStr,
          longitude: lngStr,
        }));
        setAddFormErrors((prev) => ({ ...prev, latitude: null, longitude: null }));

        if (isModal) {
          setIsAcquiringModalGps(false);
        } else {
          setIsAcquiringGps(false);
        }

        // Reverse Geocode place name if available
        let detectedName = "Current GPS Location";
        try {
          const rev = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (rev.ok) {
            const data = await rev.json();
            if (data && data.display_name) {
              detectedName = data.address?.suburb || data.address?.town || data.address?.city || data.address?.county || "GPS Location";
            }
          }
        } catch (ignored) {}

        setAddForm((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : detectedName,
        }));

        setCurrentPrediction(null);
        await loadWeatherForCoords(latitude, longitude);
        showToast(`GPS Position acquired: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E (±${Math.round(accuracy)}m)`, "success");
      },
      (err) => {
        if (isModal) setIsAcquiringModalGps(false);
        else setIsAcquiringGps(false);

        let msg = "Unable to access GPS location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS location permission was denied by your browser settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS position is unavailable on your device.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS location request timed out. Please try again.";
        }

        setUserGps((prev) => ({
          ...prev,
          status: err.code === err.PERMISSION_DENIED ? "DENIED" : "ERROR",
          errorMsg: msg,
        }));
        showToast(msg, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // --- Search Location Handler ---
  const handleSearchLocation = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      showToast("Please enter a location name to search.", "error");
      return;
    }

    setSearchingLocation(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      if (!res.ok) throw new Error("Search service returned an error.");
      const results = await res.json();

      if (results && results.length > 0) {
        const place = results[0];
        const latNum = parseFloat(place.lat);
        const lngNum = parseFloat(place.lon);
        const placeName = place.display_name.split(",")[0] || query;

        setUserGps({
          lat: latNum,
          lng: lngNum,
          accuracy: null,
          status: "ACTIVE",
          errorMsg: null,
        });

        setCurrentPrediction(null);
        await loadWeatherForCoords(latNum, lngNum);
        showToast(`Location found: ${placeName} (${latNum.toFixed(4)}°N, ${lngNum.toFixed(4)}°E)`, "success");
      } else {
        showToast(`No coordinates found for "${query}". Try searching another location name.`, "error");
      }
    } catch (err) {
      console.error("Search error:", err);
      showToast("Failed to search location.", "error");
    } finally {
      setSearchingLocation(false);
    }
  };

  // --- Run AI Prediction / Analysis ---
  const handleRunPrediction = async () => {
    const activeLat = userGps.lat != null ? userGps.lat : (selectedSite?.latitude != null ? Number(selectedSite.latitude) : null);
    const activeLng = userGps.lng != null ? userGps.lng : (selectedSite?.longitude != null ? Number(selectedSite.longitude) : null);

    if (activeLat == null || activeLng == null) {
      showToast("Please select a monitoring location or use GPS first.", "error");
      return;
    }

    setPredicting(true);

    try {
      const snapshot = {
        monitoring_site_id: selectedSiteId ? Number(selectedSiteId) : 1,
        latitude: activeLat,
        longitude: activeLng,
        rainfall: weatherData?.rainfall != null ? Number(weatherData.rainfall) : 0.0,
        rainfall24h: weatherData?.rainfall24h != null ? Number(weatherData.rainfall24h) : 0.0,
        rainfall72h: weatherData?.rainfall72h != null ? Number(weatherData.rainfall72h) : 0.0,
        soilMoisture: weatherData?.soilMoisture != null ? Number(weatherData.soilMoisture) : 0.0,
        temperature: weatherData?.temperature != null ? Number(weatherData.temperature) : 0.0,
        humidity: weatherData?.humidity != null ? Number(weatherData.humidity) : 0.0,
        windSpeed: weatherData?.windSpeed != null ? Number(weatherData.windSpeed) : 0.0,
        surfacePressure: weatherData?.surfacePressure != null ? Number(weatherData.surfacePressure) : 0.0,
        elevation: weatherData?.elevation != null ? Number(weatherData.elevation) : (selectedSite?.elevation != null ? Number(selectedSite.elevation) : 0.0),
        slopeAngle: weatherData?.demSlopeAngle != null ? Number(weatherData.demSlopeAngle) : (selectedSite?.slopeAngle != null ? Number(selectedSite.slopeAngle) : 0.0),
        soilType: selectedSite?.soilType || selectedSite?.soil_type || "Residual Soil",
      };

      const result = await predictionApi.evaluateSite(selectedSiteId || 1, snapshot);
      setCurrentPrediction(result);
      showToast(`AI prediction updated for ${selectedSite?.name || selectedSite?.siteName || "location"}!`, "success");
    } catch (err) {
      console.error("Prediction evaluation error:", err);
      const detailMsg = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.customMessage 
        || err.message 
        || "Failed to connect to FastAPI microservice.";
      showToast(`Prediction failed: ${detailMsg}`, "error");
    } finally {
      setPredicting(false);
    }
  };

  // --- Add Location Handlers ---
  const handleOpenAddModal = () => {
    setAddForm({
      name: "",
      latitude: userGps.lat != null ? userGps.lat.toFixed(6) : (selectedSite?.latitude != null ? String(selectedSite.latitude) : ""),
      longitude: userGps.lng != null ? userGps.lng.toFixed(6) : (selectedSite?.longitude != null ? String(selectedSite.longitude) : ""),
      slopeType: "Moderate",
    });
    setAddFormErrors({});
    setShowAddModal(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (savingSite) return;
    const errors = {};

    const trimmedName = addForm.name.trim();

    if (!trimmedName) errors.name = "Location name is required.";
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
      const slopeAngleMap = {
        "Normal Flat Surface": 5.0,
        "Gentle": 15.0,
        "Moderate": 30.0,
        "Steep": 45.0,
        "Very Steep": 60.0,
      };

      const payload = {
        name: trimmedName,
        siteName: trimmedName,
        location: trimmedName,
        latitude: latNum,
        longitude: lngNum,
        siteType: addForm.slopeType || "Moderate",
        slopeAngle: slopeAngleMap[addForm.slopeType] || 30.0,
        soilType: "Residual Soil",
        status: "ACTIVE",
      };

      const newSite = await sitesApi.create(payload);
      showToast(`Location "${newSite.name || trimmedName}" saved successfully!`, "success");
      setShowAddModal(false);

      await loadSites();
      if (newSite && newSite.id) {
        setSelectedSiteId(newSite.id);
        loadWeatherForCoords(latNum, lngNum);
      }
    } catch (err) {
      console.error("Error creating location:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.siteName || "Failed to save location.";
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

  // Active map coordinates
  const activeMapCoords = useMemo(() => {
    if (userGps.lat && userGps.lng) {
      return { lat: userGps.lat, lng: userGps.lng };
    }
    if (selectedSite && selectedSite.latitude != null && selectedSite.longitude != null) {
      return { lat: selectedSite.latitude, lng: selectedSite.longitude };
    }
    return null;
  }, [userGps, selectedSite]);

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

        <div className="loc-monitoring-container">
          {/* ========================================================================= */}
          {/* SECTION 1 — LOCATION MONITORING HEADER                                    */}
          {/* ========================================================================= */}
          <div className="loc-section-header">
            <div className="loc-header-info">
              <h2>Location Monitoring Control Panel</h2>
              <p>Real-time AI slope hazard surveillance & GPS location intelligence</p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2 — LOCATION SETUP (NEAT CARD)                                    */}
          {/* ========================================================================= */}
          <div className="loc-setup-card">
            <div className="loc-setup-header">
              <span className="icon">📍</span>
              <h3>Target Location Selection & Search</h3>
            </div>
            <div className="loc-setup-controls">
              {/* 1. Location Dropdown Selector */}
              <div className="loc-control-item loc-select-group">
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

              {/* 2 & 3. Search place input + Search button */}
              <form onSubmit={handleSearchLocation} className="loc-search-form">
                <input
                  type="text"
                  placeholder="Search place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="loc-search-input"
                />
                <button
                  type="submit"
                  disabled={searchingLocation}
                  className="btn-loc-search"
                >
                  {searchingLocation ? "..." : "🔍 Search"}
                </button>
              </form>

              {/* 4. Use Current GPS button */}
              <button
                type="button"
                onClick={() => handleUseCurrentGps(false)}
                disabled={isAcquiringGps}
                className="btn-use-gps"
              >
                📡 {isAcquiringGps ? "Acquiring GPS..." : "Use Current GPS"}
              </button>

              {/* 5. Start / Stop Real-Time Monitoring button */}
              <button
                type="button"
                onClick={handleToggleMonitoring}
                className={`btn-monitoring-toggle ${isMonitoring ? "stop" : "start"}`}
              >
                {isMonitoring ? "🛑 Stop Monitoring" : "▶️ Start Monitoring"}
              </button>

              {/* 6. Add Location button */}
              {canManageLocations && (
                <button type="button" onClick={handleOpenAddModal} className="btn-add-loc">
                  <span>+</span> Add Location
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3 — LIVE ENVIRONMENTAL WEATHER & TOPOGRAPHY                       */}
          {/* ========================================================================= */}
          <div className="loc-panel loc-telemetry-panel">
            <div className="telemetry-bar-header">
              <div className="telemetry-title">
                <span className="icon">🌿</span>
                <h4>Live Environmental Weather & Topography</h4>
                <span className="pill-sim-tag active">
                  {loadingWeather ? "Fetching Open-Meteo..." : weatherData?.source || "Live Open-Meteo API"}
                </span>
                {lastUpdatedTime && (
                  <span className="pill-sim-tag" style={{ background: "rgba(148, 163, 184, 0.15)", color: "#cbd5e1" }}>
                    🕒 Updated: {lastUpdatedTime}
                  </span>
                )}
              </div>

              <div className="site-tag">
                Location: <strong>{selectedSite?.name || selectedSite?.siteName || "Current Location"}</strong>
              </div>
            </div>

            {weatherError && (
              <div className="weather-error-alert">
                ⚠️ {weatherError}
              </div>
            )}

            {/* Weather Metric Cards Grid (8 Real Environmental Parameters) */}
            <div className="sensor-compact-grid">
              {/* 1. Rainfall / Precipitation */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">🌧️</span>
                  <span className="sensor-label">Rainfall</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.rainfall != null ? `${weatherData.rainfall} mm` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.rainfall != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.rainfall != null ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 2. Relative Humidity */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">💧</span>
                  <span className="sensor-label">Humidity</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.humidity != null ? `${weatherData.humidity}%` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.humidity != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.humidity != null ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 3. Temperature */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">🌡️</span>
                  <span className="sensor-label">Temperature</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.temperature != null ? `${weatherData.temperature}°C` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.temperature != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.temperature != null ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 4. Weather Condition */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">🌤️</span>
                  <span className="sensor-label">Condition</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val sensor-val-text" title={weatherData?.condition || "Unavailable"}>
                    {weatherData?.condition || "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.condition && weatherData?.condition !== "Unavailable" ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.condition && weatherData?.condition !== "Unavailable" ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 5. Wind Speed */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">💨</span>
                  <span className="sensor-label">Wind Speed</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.windSpeed != null ? `${weatherData.windSpeed} km/h` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.windSpeed != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.windSpeed != null ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 6. Surface Pressure */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">⏲️</span>
                  <span className="sensor-label">Pressure</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.surfacePressure != null ? `${weatherData.surfacePressure} hPa` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.surfacePressure != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.surfacePressure != null ? "Live Open-Meteo" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 7. Soil Moisture */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">🌱</span>
                  <span className="sensor-label">Soil Moisture</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.soilMoisture != null ? `${weatherData.soilMoisture}%` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.soilMoisture != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.soilMoisture != null ? "Live 0-7cm" : "Unavailable"}
                  </span>
                </div>
              </div>

              {/* 8. Elevation */}
              <div className="sensor-card-compact">
                <div className="sensor-top">
                  <span className="sensor-icon">🏔️</span>
                  <span className="sensor-label">Elevation</span>
                </div>
                <div className="sensor-bottom">
                  <strong className="sensor-val">
                    {weatherData?.elevation != null ? `${weatherData.elevation} m` : "Unavailable"}
                  </strong>
                  <span className={`sensor-badge ${weatherData?.elevation != null ? "badge-safe" : "badge-info"}`}>
                    {weatherData?.elevation != null ? "DEM Topography" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4 — MAIN MONITORING AREA (BALANCED TWO-COLUMN LAYOUT)             */}
          {/* ========================================================================= */}
          <div className="loc-dashboard-grid">
            
            {/* LEFT COLUMN: AI PREDICTION & RISK ANALYTICS PANEL */}
            <div className="loc-panel loc-pred-panel">
              <div className="panel-title-bar">
                <div className="panel-title">
                  <span className="icon">🧠</span>
                  <div>
                    <h3>AI Landslide Prediction Engine</h3>
                    <small>Physics & ML Slope Failure Assessment</small>
                  </div>
                </div>

                {canAnalyzePrediction && (
                  <button
                    type="button"
                    onClick={handleRunPrediction}
                    disabled={predicting || !selectedSiteId}
                    className="btn-predict-action"
                  >
                    {predicting ? "Analyzing..." : "⚡ Predict / Analyze"}
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
                    <strong>{selectedSite?.name || selectedSite?.siteName || "this location"}</strong>.
                  </p>
                  {canAnalyzePrediction ? (
                    <button type="button" onClick={handleRunPrediction} className="btn-predict-action mt-2">
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
                          {currentPrediction.failure_probability != null
                            ? `${(Number(currentPrediction.failure_probability) * (Number(currentPrediction.failure_probability) <= 1.0 ? 100 : 1)).toFixed(1)}%`
                            : currentPrediction.riskProbability != null
                            ? `${Number(currentPrediction.riskProbability).toFixed(1)}%`
                            : currentPrediction.risk_probability != null
                            ? `${Number(currentPrediction.risk_probability).toFixed(1)}%`
                            : currentPrediction.probability != null
                            ? `${Number(currentPrediction.probability).toFixed(1)}%`
                            : "0.0%"}
                        </strong>
                      </div>

                      <div className="risk-stat">
                        <span className="stat-label">Confidence Score</span>
                        <strong className="stat-value">
                          {currentPrediction.confidenceScore != null
                            ? `${Number(currentPrediction.confidenceScore).toFixed(1)}%`
                            : currentPrediction.confidence_score != null
                            ? `${Number(currentPrediction.confidence_score).toFixed(1)}%`
                            : currentPrediction.confidence != null
                            ? `${Number(currentPrediction.confidence).toFixed(1)}%`
                            : "N/A"}
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
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: GPS LOCATION MAP PANEL */}
            <div className="loc-panel loc-map-panel">
              <div className="panel-title-bar">
                <div className="panel-title">
                  <span className="icon">🗺️</span>
                  <div>
                    <h3>GPS Location Map</h3>
                    <small>Live Geographic Positioning System</small>
                  </div>
                </div>

                {/* GPS Actions */}
                <div className="gps-btn-group">
                  <button
                    type="button"
                    onClick={() => handleUseCurrentGps(false)}
                    disabled={isAcquiringGps}
                    className="btn-gps-small"
                    title="Refresh browser GPS location"
                  >
                    📡 {isAcquiringGps ? "Acquiring..." : "Refresh GPS"}
                  </button>
                </div>
              </div>

              {/* Leaflet Map Integration */}
              <div className="loc-map-container">
                <MonitoringMap
                  sites={sites}
                  filter="ALL"
                  onSelect={(site) => setSelectedSiteId(site.id)}
                  clickedCoords={activeMapCoords}
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

          </div>

        </div>

        {/* --- Feature 1: Add Location Modal --- */}
        {showAddModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h3>📍 Add New Monitoring Location</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="modal-close-btn">&times;</button>
              </div>

              <form onSubmit={handleSaveLocation} className="modal-form">
                {addFormErrors.server && (
                  <div className="form-error-alert">{addFormErrors.server}</div>
                )}

                {/* Location Name (Required) */}
                <div className="form-group">
                  <label htmlFor="add-name">Location Name *</label>
                  <input
                    id="add-name"
                    type="text"
                    placeholder="e.g. Wayanad Hill Slope Site 4"
                    value={addForm.name}
                    onChange={(e) => {
                      setAddForm({ ...addForm, name: e.target.value });
                      if (addFormErrors.name) setAddFormErrors((prev) => ({ ...prev, name: null }));
                    }}
                    className={addFormErrors.name ? "input-err" : ""}
                  />
                  {addFormErrors.name && <span className="field-err">{addFormErrors.name}</span>}
                </div>

                {/* Coordinates (2-Column Desktop Layout) */}
                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="add-lat">Latitude * (-90 to 90)</label>
                    <input
                      id="add-lat"
                      type="number"
                      step="any"
                      placeholder="e.g. 11.3530"
                      value={addForm.latitude}
                      onChange={(e) => {
                        setAddForm({ ...addForm, latitude: e.target.value });
                        if (addFormErrors.latitude) setAddFormErrors((prev) => ({ ...prev, latitude: null }));
                      }}
                      className={addFormErrors.latitude ? "input-err" : ""}
                    />
                    {addFormErrors.latitude && <span className="field-err">{addFormErrors.latitude}</span>}
                  </div>

                  <div className="form-group half">
                    <label htmlFor="add-lng">Longitude * (-180 to 180)</label>
                    <input
                      id="add-lng"
                      type="number"
                      step="any"
                      placeholder="e.g. 76.7950"
                      value={addForm.longitude}
                      onChange={(e) => {
                        setAddForm({ ...addForm, longitude: e.target.value });
                        if (addFormErrors.longitude) setAddFormErrors((prev) => ({ ...prev, longitude: null }));
                      }}
                      className={addFormErrors.longitude ? "input-err" : ""}
                    />
                    {addFormErrors.longitude && <span className="field-err">{addFormErrors.longitude}</span>}
                  </div>
                </div>

                {/* Auto-detect GPS button inside modal */}
                <div className="gps-auto-box">
                  <button
                    type="button"
                    onClick={() => handleUseCurrentGps(true)}
                    disabled={isAcquiringModalGps}
                    className="btn-gps-auto"
                  >
                    📡 {isAcquiringModalGps ? "Acquiring GPS..." : "Use Current GPS Location"}
                  </button>
                  <small>Auto-fills latitude and longitude from device GPS sensor</small>
                </div>

                {/* Slope Type Selection */}
                <div className="form-group">
                  <label htmlFor="add-slope-type">Slope Type *</label>
                  <select
                    id="add-slope-type"
                    value={addForm.slopeType}
                    onChange={(e) => setAddForm({ ...addForm, slopeType: e.target.value })}
                  >
                    <option value="Normal Flat Surface">Normal Flat Surface</option>
                    <option value="Gentle">Gentle</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Steep">Steep</option>
                    <option value="Very Steep">Very Steep</option>
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
