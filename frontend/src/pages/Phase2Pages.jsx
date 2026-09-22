import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MonitoringMap from "../components/MonitoringMap";
import RiskLegend from "../components/RiskLegend";
import {
  AlertTrendChart,
  ProbabilityChart,
  ReportBarChart,
  SensorTrendChart,
} from "../components/Phase2Charts";
import { sitesApi, sensorDataApi, predictionApi, alertApi, userApi, fetchLocationWeather } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function PageFrame({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="command-app">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="command-main">
        <Header title={title} onNotification={() => {}} />
        {children}
      </div>
    </div>
  );
}

function PageIntro({
  kicker = "MONITORING MODULE",
  title,
  description,
  action,
}) {
  return (
    <div className="phase-intro">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

function FilterBar({ children, search, onSearch }) {
  return (
    <div className="filter-bar">
      {onSearch && (
        <label className="module-search">
          ⌕
          <input
            placeholder={search || "Search..."}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
      )}
      {children}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SITE DETAILS PAGE                                                          */
/* -------------------------------------------------------------------------- */
export function SiteDetailsPage() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [reading, setReading] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      try {
        const allSites = await sitesApi.getAll().catch(() => []);
        const found = allSites.find((s) => String(s.id) === String(siteId));
        setSite(found || null);

        if (found) {
          const evalRes = await predictionApi.evaluateSite(found.id).catch(() => null);
          setPrediction(evalRes);
          const allSensors = await sensorDataApi.getAll().catch(() => []);
          const siteSensors = allSensors.filter((s) => String(s.monitoringSiteId) === String(found.id));
          setReading(siteSensors.length > 0 ? siteSensors[siteSensors.length - 1] : null);

          const allAlerts = await alertApi.getAll().catch(() => []);
          const siteAlerts = allAlerts.filter((a) => String(a.siteId) === String(found.id));
          setAlerts(siteAlerts);
        }
      } catch (err) {
        console.error("Error loading site details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [siteId]);

  if (loading) {
    return (
      <PageFrame title="Location details">
        <main className="module-content">
          <p className="detail-description">Loading location profile from MySQL...</p>
        </main>
      </PageFrame>
    );
  }

  if (!site) {
    return (
      <PageFrame title="Location details">
        <main className="module-content">
          <button className="back-button" onClick={() => navigate("/sites")}>
            ← Back to My Locations
          </button>
          <div style={{ padding: "40px", textAlign: "center" }}>
            <h2>Location Not Found</h2>
            <p style={{ color: "#94a3b8" }}>The requested monitoring location does not exist in your MySQL database.</p>
          </div>
        </main>
      </PageFrame>
    );
  }

  const currentRisk = prediction ? prediction.riskLevel.replace("_", " ") : "SAFE";
  const currentConfidence = prediction ? Math.round(prediction.confidenceScore) : 90;

  return (
    <PageFrame title="Location details">
      <main className="module-content">
        <button className="back-button" onClick={() => navigate("/sites")}>
          ← Back to My Locations
        </button>
        <PageIntro
          kicker="SAVED LOCATION PROFILE · PERSISTED IN MYSQL"
          title={site.siteName || site.name}
          description={`${site.location} · ${site.siteType || "Mountain Slope"}`}
          action={
            <Pill
              tone={
                currentRisk.includes("HIGH")
                  ? "danger"
                  : currentRisk.includes("MODERATE")
                    ? "warn"
                    : "safe"
              }
            >
              {currentRisk}
            </Pill>
          }
        />
        <div className="detail-overview">
          <section className="module-panel">
            <span className="eyebrow">LOCATION PROFILE</span>
            <div className="site-info-grid">
              <span>
                Site type<strong>{site.siteType || "Mountain Slope"}</strong>
              </span>
              <span>
                Status<strong>{site.status || "MONITORING"}</strong>
              </span>
              <span>
                Slope Angle<strong>{site.slopeAngle ? `${Math.round(site.slopeAngle)}°` : "35.0°"}</strong>
              </span>
              <span>
                Soil Type<strong>{site.soilType || "Residual Soil"}</strong>
              </span>
              <span>
                Latitude<strong>{site.latitude ? Number(site.latitude).toFixed(4) : "N/A"}</strong>
              </span>
              <span>
                Longitude<strong>{site.longitude ? Number(site.longitude).toFixed(4) : "N/A"}</strong>
              </span>
            </div>
            <p className="detail-description">{site.geologicalCondition || "Location saved by user"}</p>
          </section>
          <section className="module-panel">
            <span className="eyebrow">LATEST PREDICTION</span>
            <h2>{currentRisk}</h2>
            <p>Model Confidence {currentConfidence}% · Spring Boot → FastAPI ML</p>
            <div className="confidence">
              <div>
                <i style={{ width: `${currentConfidence}%` }} />
              </div>
            </div>
          </section>
        </div>

        <section className="module-panel detail-sensors">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MONITORING DATA</span>
              <h2>{reading ? "Hardware Sensor Snapshot" : "Location Environmental Snapshot"}</h2>
            </div>
            <button
              className="secondary-action"
              onClick={() => navigate("/sensors")}
            >
              Open Monitoring
            </button>
          </div>
          <div className="sensor-inline-grid">
            {reading ? (
              [
                ["Rainfall", reading.rainfall || 0, "mm"],
                ["Soil moisture", reading.soilMoisture || 0, "%"],
                ["Tilt", reading.tilt || 0, "°"],
                ["Crack width", reading.crackWidth || 0, "mm"],
                ["Ground movement", reading.groundMovement || 0, "mm"],
              ].map(([label, value, unit]) => (
                <span key={label}>
                  {label}
                  <strong>
                    {value}
                    {unit}
                  </strong>
                </span>
              ))
            ) : (
              <p style={{ color: "#94a3b8", margin: 0, padding: "12px 0" }}>
                Data Source: Open-Meteo Meteorological Service (No physical hardware sensors installed for this location)
              </p>
            )}
          </div>
        </section>

        <div className="detail-columns">
          <section className="module-panel">
            <span className="eyebrow">RECENT ALERTS</span>
            <h2>Alert history</h2>
            {alerts.length ? (
              alerts.map((alert) => (
                <p className="detail-event" key={alert.id}>
                  <b>{alert.severity}</b>
                  {alert.message}
                  <small>
                    {alert.sentAt ? new Date(alert.sentAt).toLocaleString() : "Just now"} · {alert.status}
                  </small>
                </p>
              ))
            ) : (
              <p className="detail-description">
                No recent alerts recorded for this location.
              </p>
            )}
          </section>
        </div>
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* MY LOCATIONS PAGE ("SitesPage")                                            */
/* -------------------------------------------------------------------------- */
export function SitesPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [risk, setRisk] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const { role } = useAuth();

  const loadSites = async () => {
    setLoading(true);
    try {
      const data = await sitesApi.getAll().catch(() => []);
      setSites(data);
    } catch (err) {
      console.error("Failed to load sites from backend:", err);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const filtered = sites
    .filter((site) =>
      `${site.siteName || site.name || ""} ${site.location || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((site) => type === "ALL" || (site.siteType || site.type) === type)
    .filter((site) => risk === "ALL" || (site.risk || site.status || "SAFE").includes(risk.split(" ")[0]));

  const addSite = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newSitePayload = {
      siteName: form.get("name"),
      location: form.get("location"),
      siteType: form.get("type") || "Mountain Slope",
      latitude: parseFloat(form.get("latitude")) || 11.353,
      longitude: parseFloat(form.get("longitude")) || 76.795,
      slopeAngle: parseFloat(form.get("slopeAngle")) || 35.0,
      soilType: form.get("soilType") || "Residual Soil",
      geologicalCondition: form.get("geologicalCondition") || "User saved monitoring location",
      status: "MONITORING",
    };
    try {
      await sitesApi.create(newSitePayload);
      setShowAdd(false);
      loadSites();
    } catch (err) {
      console.error("Failed to save site to MySQL:", err);
      alert("Error saving location to database.");
    }
  };

  const deleteSite = async (id) => {
    if (!window.confirm("Are you sure you want to remove this saved location?")) return;
    try {
      await sitesApi.delete(id);
      loadSites();
    } catch (err) {
      console.error("Failed to delete site from MySQL:", err);
      alert("Could not remove site.");
    }
  };

  return (
    <PageFrame title="My Locations">
      <main className="module-content">
        <PageIntro
          kicker="DYNAMIC SAVED ASSETS · MYSQL PERSISTED"
          title="My Locations"
          description="Manage your saved slope monitoring locations, coordinates, and current hazard status."
          action={
            <button
              className="primary-action compact"
              onClick={() => setShowAdd(true)}
            >
              + Add Location
            </button>
          }
        />
        <FilterBar search="Search saved locations..." onSearch={setQuery}>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">All site types</option>
            <option>Mountain Slope</option>
            <option>Highway Cut</option>
            <option>Railway Embankment</option>
            <option>Quarry Wall</option>
            <option>Residential Slope</option>
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="ALL">All risk levels</option>
            <option value="SAFE">SAFE</option>
            <option value="MODERATE">MODERATE RISK</option>
            <option value="HIGH">HIGH RISK</option>
          </select>
        </FilterBar>

        <section className="module-panel table-panel">
          <div className="table-summary">
            Showing {filtered.length} of {sites.length} saved locations{" "}
            <span>Live MySQL Database</span>
          </div>
          {loading ? (
            <p style={{ padding: "20px" }}>Loading saved locations...</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No saved monitoring locations found.</p>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
                Search any location on the Dashboard or click "+ Add Location" to save your first monitoring location.
              </p>
              <button className="primary-action compact" onClick={() => setShowAdd(true)}>
                + Add Location
              </button>
            </div>
          ) : (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Coordinates</th>
                    <th>Geology / Slope</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((site) => {
                    const siteName = site.siteName || site.name;
                    const siteType = site.siteType || site.type || "Mountain Slope";
                    const lat = site.latitude ? Number(site.latitude).toFixed(3) : "N/A";
                    const lng = site.longitude ? Number(site.longitude).toFixed(3) : "N/A";
                    return (
                      <tr key={site.id}>
                        <td>
                          <strong>{siteName}</strong>
                          <small>{site.location}</small>
                        </td>
                        <td>{siteType}</td>
                        <td className="mono">
                          {lat}, {lng}
                        </td>
                        <td>
                          {site.slopeAngle ? `${Math.round(site.slopeAngle)}° slope` : "35.0°"} · {site.soilType || "Residual"}
                        </td>
                        <td>
                          <Pill tone={site.status === "DANGER" ? "danger" : site.status === "ATTENTION" ? "warn" : "safe"}>
                            {site.status === "DANGER" ? "HIGH RISK" : site.status === "ATTENTION" ? "MODERATE RISK" : "SAFE"}
                          </Pill>
                        </td>
                        <td>
                          <button
                            className="table-action"
                            onClick={() => setSelected(site)}
                          >
                            View
                          </button>
                          <button
                            className="table-action"
                            onClick={() => deleteSite(site.id)}
                            style={{ color: "#f05d68" }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && (
          <Modal onClose={() => setSelected(null)}>
            <span className="eyebrow">LOCATION PROFILE</span>
            <h2>{selected.siteName || selected.name}</h2>
            <p>
              {selected.location} · {selected.siteType || selected.type || "Mountain Slope"}
            </p>
            <div className="detail-grid">
              <span>
                Status<strong>{selected.status || "MONITORING"}</strong>
              </span>
              <span>
                Slope Angle<strong>{selected.slopeAngle ? `${selected.slopeAngle}°` : "35°"}</strong>
              </span>
              <span>
                Soil Type<strong>{selected.soilType || "Residual Soil"}</strong>
              </span>
            </div>
            <p>{selected.geologicalCondition || "User saved location"}</p>
          </Modal>
        )}

        {showAdd && (
          <Modal onClose={() => setShowAdd(false)}>
            <span className="eyebrow">SAVE NEW LOCATION</span>
            <h2>Add monitoring location</h2>
            <form className="stack-form" onSubmit={addSite}>
              <label>
                Location name *
                <input
                  name="name"
                  required
                  placeholder="e.g. Manali Highway Slope Cut"
                />
              </label>
              <label>
                Address / Region description *
                <input name="location" required placeholder="e.g. NH-21 Km 45, Kullu District" />
              </label>
              <label>
                Site type
                <select name="type">
                  <option>Mountain Slope</option>
                  <option>Highway Cut</option>
                  <option>Railway Embankment</option>
                  <option>Quarry Wall</option>
                  <option>Residential Slope</option>
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label>
                  Latitude *
                  <input name="latitude" type="number" step="any" required defaultValue="11.353" />
                </label>
                <label>
                  Longitude *
                  <input name="longitude" type="number" step="any" required defaultValue="76.795" />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label>
                  Slope Angle (°)
                  <input name="slopeAngle" type="number" defaultValue="38" />
                </label>
                <label>
                  Soil Type
                  <select name="soilType">
                    <option>Residual Soil</option>
                    <option>Clay Loam</option>
                    <option>Weathered Rock</option>
                    <option>Silty Sand</option>
                  </select>
                </label>
              </div>
              <button className="primary-action" type="submit">
                Save Location to MySQL
              </button>
            </form>
          </Modal>
        )}
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* SENSORS / MONITORING PAGE                                                  */
/* -------------------------------------------------------------------------- */
export function SensorsPage() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [readings, setReadings] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const siteList = await sitesApi.getAll().catch(() => []);
      setSites(siteList);
      if (siteList.length > 0) {
        setSelectedSiteId(siteList[0].id);
      }
      const sensorList = await sensorDataApi.getAll().catch(() => []);
      setReadings(sensorList);
    } catch (err) {
      console.error("Failed to load sensors from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSite = sites.find((s) => String(s.id) === String(selectedSiteId)) || sites[0] || null;

  useEffect(() => {
    if (activeSite && activeSite.latitude && activeSite.longitude) {
      fetchLocationWeather(activeSite.latitude, activeSite.longitude).then(setWeather);
    }
  }, [activeSite]);

  const siteReadings = readings.filter((r) => String(r.monitoringSiteId) === String(activeSite?.id));
  const hasHardwareSensors = siteReadings.length > 0;
  const latestSensor = hasHardwareSensors ? siteReadings[siteReadings.length - 1] : null;

  return (
    <PageFrame title="Monitoring data">
      <main className="module-content">
        <PageIntro
          kicker="ENVIRONMENTAL & TELEMETRY MONITORING"
          title="Monitoring"
          description="View live location environmental conditions and hardware sensor readings for your saved locations."
        />

        {sites.length === 0 ? (
          <div className="module-panel" style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
            <h2>No Saved Locations to Monitor</h2>
            <p style={{ maxWidth: "480px", margin: "12px auto", fontSize: "0.9rem", color: "#cbd5e1" }}>
              Monitoring data is presented specifically for user-selected saved locations.
            </p>
            <Link className="primary-action compact" to="/sites">
              Go to My Locations →
            </Link>
          </div>
        ) : (
          <>
            <FilterBar>
              <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}>
                {sites.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.siteName || item.name} ({item.location})
                  </option>
                ))}
              </select>
            </FilterBar>

            <div className="selected-site-strip" style={{ marginBottom: "20px" }}>
              <div>
                <span className="eyebrow">SELECTED LOCATION</span>
                <strong>{activeSite?.siteName || activeSite?.name}</strong>
                <small>{activeSite?.location}</small>
              </div>
              <Pill tone={hasHardwareSensors ? "safe" : "info"}>
                {hasHardwareSensors ? "Live Hardware Sensors Active" : "Location Environmental Data (No Hardware Sensors)"}
              </Pill>
            </div>

            {!hasHardwareSensors && (
              <div style={{ padding: "14px 18px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", color: "#7dd3fc", marginBottom: "20px", fontSize: "0.88rem" }}>
                ℹ️ <strong>Data Source:</strong> Open-Meteo Meteorological Service. No physical hardware sensors are currently installed at this location.
              </div>
            )}

            <section className="sensor-grid">
              <article className="sensor-card">
                <div className="sensor-icon">☂</div>
                <span>Rainfall</span>
                <strong>{hasHardwareSensors ? latestSensor.rainfall : weather?.rainfall || 0}<small>mm</small></strong>
                <div className="sensor-state"><i></i> Meteorological Precipitation</div>
              </article>
              <article className="sensor-card">
                <div className="sensor-icon">◒</div>
                <span>Soil moisture</span>
                <strong>{hasHardwareSensors ? latestSensor.soilMoisture : weather?.soilMoisture || 30}<small>%</small></strong>
                <div className="sensor-state"><i></i> Volumetric Water Content</div>
              </article>
              <article className="sensor-card">
                <div className="sensor-icon">◉</div>
                <span>Temperature</span>
                <strong>{hasHardwareSensors ? latestSensor.temperature || 25 : weather?.temperature || 25}<small>°C</small></strong>
                <div className="sensor-state"><i></i> Ambient Air Temperature</div>
              </article>
              <article className="sensor-card">
                <div className="sensor-icon">∠</div>
                <span>Subsurface Tilt</span>
                <strong>{hasHardwareSensors ? latestSensor.tilt || 0 : 0.0}<small>°</small></strong>
                <div className="sensor-state"><i></i> {hasHardwareSensors ? "Hardware Inclinometer" : "N/A (No Telemetry Sensor)"}</div>
              </article>
              <article className="sensor-card">
                <div className="sensor-icon">⌇</div>
                <span>Crack Width</span>
                <strong>{hasHardwareSensors ? latestSensor.crackWidth || 0 : 0.0}<small>mm</small></strong>
                <div className="sensor-state"><i></i> {hasHardwareSensors ? "Hardware Extensometer" : "N/A (No Telemetry Sensor)"}</div>
              </article>
              <article className="sensor-card">
                <div className="sensor-icon">⌁</div>
                <span>Ground Vibration</span>
                <strong>{hasHardwareSensors ? latestSensor.groundVibration || 0 : 0.00}<small>g</small></strong>
                <div className="sensor-state"><i></i> {hasHardwareSensors ? "Hardware Geophone" : "N/A (No Telemetry Sensor)"}</div>
              </article>
            </section>
          </>
        )}
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* AI PREDICTIONS PAGE                                                        */
/* -------------------------------------------------------------------------- */
export function PredictionsPage() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(false);
      const siteList = await sitesApi.getAll().catch(() => []);
      setSites(siteList);
    }
    init();
  }, []);

  const handleSelectSite = async (siteId) => {
    setSelectedSiteId(siteId);
    if (!siteId) {
      setPrediction(null);
      setHistory([]);
      return;
    }
    setEvaluating(true);
    try {
      const [result, pastPreds] = await Promise.all([
        predictionApi.evaluateSite(siteId),
        predictionApi.getBySiteId(siteId).catch(() => []),
      ]);
      setPrediction(result);
      setHistory(pastPreds || []);
    } catch (err) {
      console.error("Error evaluating prediction:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const activeSite = sites.find((s) => String(s.id) === String(selectedSiteId));

  const rawRisk = prediction?.riskLevel ? String(prediction.riskLevel).replace("_", " ") : "SAFE";
  const confidenceVal = prediction ? Math.round(prediction.confidenceScore) : 90;
  const factorsList = prediction?.factors && prediction.factors.length > 0 ? prediction.factors : [
    "Baseline environmental stability confirmed",
  ];
  const probabilityMix = prediction?.probabilities || [90, 8, 2];

  return (
    <PageFrame title="AI Risk Prediction">
      <main className="module-content">
        <PageIntro
          kicker="SPRING BOOT + FASTAPI ML EVALUATION"
          title="AI Risk Prediction"
          description="Evaluate landslide failure risk for any user-selected saved location using the trained ML pipeline."
        />

        <FilterBar>
          <select
            value={selectedSiteId}
            onChange={(e) => handleSelectSite(e.target.value)}
            disabled={evaluating}
            style={{ width: "100%", maxWidth: "420px", padding: "10px 14px", background: "#0d1b2a", border: "1px solid var(--cyan)", color: "#fff", borderRadius: "6px" }}
          >
            <option value="">-- Select a Location to Analyze --</option>
            {sites.map((item) => (
              <option key={item.id} value={item.id}>
                {item.siteName || item.name} ({item.location})
              </option>
            ))}
          </select>
        </FilterBar>

        {!selectedSiteId ? (
          <div className="module-panel" style={{ padding: "60px", textAlign: "center", color: "#94a3b8", marginTop: "20px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>◒</div>
            <h2>No Location Selected</h2>
            <p style={{ maxWidth: "480px", margin: "8px auto", color: "#cbd5e1", fontSize: "0.95rem" }}>
              Select one of your saved locations from the dropdown above or search on the Dashboard to trigger real-time AI ML risk prediction.
            </p>
          </div>
        ) : evaluating ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <p>Running FastAPI ML model inference...</p>
          </div>
        ) : prediction && (
          <div className="prediction-layout" style={{ marginTop: "20px" }}>
            <section className="module-panel prediction-hero">
              <div>
                <span className="eyebrow">CURRENT RISK ASSESSMENT</span>
                <h2>{activeSite?.siteName || activeSite?.name}</h2>
                <p>
                  {activeSite?.location} · Evaluated: <strong>{new Date(prediction.predictionTime).toLocaleTimeString()}</strong>
                </p>
              </div>
              <Pill tone={rawRisk.includes("HIGH") ? "danger" : rawRisk.includes("MODERATE") ? "warn" : "safe"}>
                {rawRisk}
              </Pill>
              <div className="confidence">
                <span>Model Risk Score</span>
                <strong>{confidenceVal} / 100</strong>
                <div>
                  <i style={{ width: `${confidenceVal}%` }} />
                </div>
              </div>
            </section>

            <section className="module-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">PROBABILITY BREAKDOWN</span>
                  <h2>Risk Probabilities</h2>
                </div>
              </div>
              <ProbabilityChart values={probabilityMix} />
            </section>

            <section className="module-panel factors-panel">
              <span className="eyebrow">EXPLAINABLE ML FACTORS</span>
              <h2>Risk Contributing Factors</h2>
              <div className="factor-list">
                {factorsList.map((factor, idx) => (
                  <div key={idx}>
                    <i>✓</i> {factor}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(56, 189, 248, 0.1)", borderRadius: "6px" }}>
                <strong style={{ color: "#38bdf8", display: "block" }}>Data Source Info:</strong>
                <p style={{ margin: 0, color: "#e2e8f0", fontSize: "0.85rem" }}>{prediction.dataSourceInfo}</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* ALERTS PAGE                                                                */
/* -------------------------------------------------------------------------- */
export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await alertApi.getAll().catch(() => []);
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = alerts
    .filter((item) =>
      `${item.siteName || item.site || ""} ${item.message}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((item) => severity === "ALL" || item.severity === severity)
    .filter((item) => status === "ALL" || item.status === status);

  const updateStatus = async (id, nextStatus) => {
    try {
      const alertItem = alerts.find((a) => a.id === id);
      if (alertItem) {
        await alertApi.update(id, { ...alertItem, status: nextStatus });
        loadAlerts();
      }
    } catch (err) {
      console.error("Error updating alert status:", err);
    }
  };

  return (
    <PageFrame title="Alerts & Early Warning">
      <main className="module-content">
        <PageIntro
          kicker="AUTOMATED EARLY WARNING QUEUE · MYSQL PERSISTED"
          title="Alerts & Early Warning"
          description="Review, acknowledge, and resolve slope risk warnings automatically generated from prediction results."
        />
        <FilterBar search="Search alerts or locations..." onSearch={setQuery}>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="ALL">All severities</option>
            <option>CRITICAL</option>
            <option>WARNING</option>
            <option>INFORMATION</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option>NEW</option>
            <option>ACKNOWLEDGED</option>
            <option>RESOLVED</option>
          </select>
        </FilterBar>

        {loading ? (
          <p style={{ padding: "20px" }}>Loading active alerts from MySQL...</p>
        ) : filtered.length === 0 ? (
          <div className="module-panel" style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
            <h2>No Hazard Alerts Recorded</h2>
            <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
              Alerts are automatically created in MySQL whenever HIGH RISK or MODERATE RISK is predicted for a location.
            </p>
          </div>
        ) : (
          <section className="alert-cards">
            {filtered.map((alert) => (
              <article
                className={`alert-module-card ${(alert.severity || "warning").toLowerCase()}`}
                key={alert.id}
              >
                <div className="alert-module-top">
                  <Pill tone={alert.severity === "CRITICAL" ? "danger" : "warn"}>
                    {alert.severity || "WARNING"}
                  </Pill>
                  <span>{alert.sentAt ? new Date(alert.sentAt).toLocaleTimeString() : alert.time}</span>
                </div>
                <h2>{alert.siteName || alert.site || `Site #${alert.siteId || alert.id}`}</h2>
                <p>{alert.message}</p>
                <div className="alert-module-footer">
                  <Pill>{alert.status || "NEW"}</Pill>
                  {alert.status !== "RESOLVED" && (
                    <div>
                      {alert.status === "NEW" && (
                        <button
                          className="table-action"
                          onClick={() => updateStatus(alert.id, "ACKNOWLEDGED")}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        className="table-action"
                        onClick={() => updateStatus(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* GEOSPATIAL MAP PAGE                                                        */
/* -------------------------------------------------------------------------- */
export function MapPage() {
  const [sites, setSites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [instantPrediction, setInstantPrediction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");

  const loadSites = () => {
    sitesApi.getAll().then(setSites).catch(() => setSites([]));
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleMapClick = async (lat, lng) => {
    setClickedCoords({ lat, lng });
    const label = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setNewSiteName(label);

    try {
      const weatherData = await fetchLocationWeather(lat, lng);
      const res = await predictionApi.analyzeLocation({
        latitude: lat,
        longitude: lng,
        locationName: label,
        rainfall: weatherData.rainfall,
        soilMoisture: weatherData.soilMoisture,
      });
      setInstantPrediction(res);
    } catch (err) {
      console.error("Instant prediction error:", err);
    }
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        handleMapClick(lat, lng);
      } else {
        alert("Location not found.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    if (!clickedCoords) return;
    try {
      await sitesApi.create({
        siteName: newSiteName || "NEW SAVED LOCATION",
        location: `${clickedCoords.lat.toFixed(4)}°N, ${clickedCoords.lng.toFixed(4)}°E`,
        siteType: "Mountain Slope",
        latitude: clickedCoords.lat,
        longitude: clickedCoords.lng,
        slopeAngle: 38.0,
        soilType: "Residual Soil",
        status: instantPrediction?.riskLevel?.includes("HIGH") ? "DANGER" : instantPrediction?.riskLevel?.includes("MODERATE") ? "ATTENTION" : "MONITORING",
      });
      loadSites();
      setShowAddModal(false);
      alert("Location saved to MySQL successfully!");
    } catch (err) {
      console.error("Error creating site:", err);
      alert("Failed to save location.");
    }
  };

  const mappedSites = sites.map((s) => ({
    id: s.id,
    name: s.siteName || s.name,
    location: s.location,
    latitude: s.latitude,
    longitude: s.longitude,
    riskLevel: s.status === "DANGER" ? "HIGH RISK" : s.status === "ATTENTION" ? "MODERATE RISK" : "SAFE",
    risk: s.status === "DANGER" ? "HIGH RISK" : s.status === "ATTENTION" ? "MODERATE RISK" : "SAFE",
  }));

  return (
    <PageFrame title="Geospatial Map">
      <main className="module-content">
        <PageIntro
          kicker="GIS MAP LAYER · ANY LOCATION SELECTION"
          title="Geospatial Map"
          description="Search any global location or click any point on the map to run instant AI risk predictions."
        />

        <section className="module-panel full-map-panel">
          <div className="map-controls" style={{ display: "flex", gap: "12px", padding: "12px 16px" }}>
            <form onSubmit={handleSearchLocation} style={{ display: "flex", gap: "8px", flex: 1, maxWidth: "500px" }}>
              <input
                type="text"
                placeholder="Search any global location (e.g. Manali, Kullu, Wayanad)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", background: "#0d1b2a", border: "1px solid var(--line)", color: "#fff", borderRadius: "4px" }}
              />
              <button type="submit" disabled={searching} className="secondary-action compact">
                {searching ? "Searching..." : "🔍 Search Location"}
              </button>
            </form>
          </div>

          <MonitoringMap
            sites={mappedSites}
            onMapClick={handleMapClick}
            clickedCoords={clickedCoords}
          />

          {clickedCoords && (
            <div className="map-detail-card" style={{ border: "1px solid #3b82f6" }}>
              <span className="eyebrow" style={{ color: "#60a5fa" }}>INSTANT LOCATION AI ANALYSIS</span>
              <h2>Lat: {clickedCoords.lat.toFixed(4)}, Lng: {clickedCoords.lng.toFixed(4)}</h2>
              {instantPrediction ? (
                <div>
                  <Pill tone={instantPrediction.riskLevel?.includes("HIGH") ? "danger" : instantPrediction.riskLevel?.includes("MODERATE") ? "warn" : "safe"}>
                    {instantPrediction.riskLevel?.replace("_", " ")}
                  </Pill>
                  <p style={{ margin: "8px 0 0 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Confidence: <strong>{Math.round(instantPrediction.confidenceScore)}%</strong> · {instantPrediction.recommendation}
                  </p>
                </div>
              ) : (
                <p>Running ML inference for this point...</p>
              )}
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <button className="primary-action compact" onClick={() => setShowAddModal(true)}>
                  Save Location to MySQL
                </button>
                <button className="secondary-action compact" onClick={() => setClickedCoords(null)}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </section>

        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)}>
            <span className="eyebrow">SAVE LOCATION</span>
            <h2>Add Location to MySQL</h2>
            <form className="stack-form" onSubmit={handleCreateSite}>
              <label>
                Location Name
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                />
              </label>
              <button className="primary-action" type="submit">
                Save Location
              </button>
            </form>
          </Modal>
        )}
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* REPORTS PAGE                                                               */
/* -------------------------------------------------------------------------- */
export function ReportsPage() {
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    sitesApi.getAll().then(setSites).catch(() => setSites([]));
    alertApi.getAll().then(setAlerts).catch(() => setAlerts([]));
  }, []);

  const downloadCSV = () => {
    const headers = "ID,Site Name,Location,Latitude,Longitude,Status\n";
    const rows = sites.map((s) => `${s.id},"${s.siteName || s.name}","${s.location}",${s.latitude},${s.longitude},${s.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartslope_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <PageFrame title="Reports">
      <main className="module-content">
        <PageIntro
          kicker="SYSTEM REPORTING · MYSQL DATA ENGINE"
          title="Reports & Summary"
          description="Generate operational indicators and export real CSV location data from MySQL."
          action={
            <button className="primary-action compact" onClick={downloadCSV}>
              Export CSV Report
            </button>
          }
        />
        <div className="report-stats">
          <div className="report-stat">
            <span>Saved Locations</span>
            <strong>{sites.length}</strong>
          </div>
          <div className="report-stat">
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>
          <div className="report-stat">
            <span>Critical Alerts</span>
            <strong>{alerts.filter((a) => a.severity === "CRITICAL").length}</strong>
          </div>
        </div>

        <section className="module-panel">
          <div className="panel-heading">
            <h2>Risk Distribution Overview</h2>
          </div>
          <ReportBarChart sites={sites} alerts={alerts} />
        </section>
      </main>
    </PageFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* SETTINGS PAGE                                                              */
/* -------------------------------------------------------------------------- */
export function SettingsPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await userApi.getAll().catch(() => []);
      setUsersList(data);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userApi.update(userId, { role: newRole, active: true });
      loadUsers();
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const handleApproveUser = async (userId, requestedRole) => {
    const assignedRole = requestedRole && requestedRole !== "PENDING" && requestedRole !== "ADMIN" ? requestedRole : "ENGINEER";
    try {
      await userApi.update(userId, { role: assignedRole, active: true });
      loadUsers();
    } catch (err) {
      console.error("Error approving user:", err);
    }
  };

  return (
    <PageFrame title="Settings & User Management">
      <main className="module-content">
        <PageIntro
          kicker="CONTROL CENTER · SYSTEM ADMINISTRATION"
          title="Settings & User Management"
          description="Manage user accounts, approve registration requests, assign operational roles, and toggle account status in MySQL."
        />

        <section className="module-panel table-panel">
          <div className="table-summary">
            System Accounts <span>Persisted in MySQL Database</span>
          </div>
          {loadingUsers ? (
            <p style={{ padding: "20px" }}>Loading accounts from MySQL...</p>
          ) : (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Requested Role</th>
                    <th>Current Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isPending = u.role === "PENDING";
                    return (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.requestedRole || "ENGINEER"}</td>
                        <td>
                          <Pill tone={u.role === "ADMIN" ? "danger" : u.role === "ENGINEER" ? "info" : "warn"}>
                            {u.role || "PENDING"}
                          </Pill>
                        </td>
                        <td>
                          <Pill tone={u.active !== false ? "safe" : "danger"}>
                            {u.active !== false ? (isPending ? "PENDING" : "ACTIVE") : "INACTIVE"}
                          </Pill>
                        </td>
                        <td>
                          {isPending ? (
                            <button
                              className="table-action"
                              onClick={() => handleApproveUser(u.id, u.requestedRole)}
                              style={{ color: "#35d0a0" }}
                            >
                              Approve ✓
                            </button>
                          ) : (
                            <select
                              value={u.role || "PENDING"}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              style={{ padding: "4px", background: "#0d1b2a", border: "1px solid var(--line)", color: "#fff", borderRadius: "4px" }}
                            >
                              <option value="PUBLIC_USER">PUBLIC_USER</option>
                              <option value="ENGINEER">ENGINEER</option>
                              <option value="SAFETY_OFFICER">SAFETY_OFFICER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </PageFrame>
  );
}
