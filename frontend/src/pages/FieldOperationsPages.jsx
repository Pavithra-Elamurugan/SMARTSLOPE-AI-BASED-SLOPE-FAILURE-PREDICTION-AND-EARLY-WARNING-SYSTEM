import { useState, useEffect } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { PageFrame } from "./Phase2Pages";
import { inspectionsApi, incidentsApi, sitesApi, alertApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#788da3", font: { size: 10 } },
    },
    y: {
      grid: { color: "rgba(143,174,199,.1)" },
      ticks: { color: "#788da3", font: { size: 10 } },
    },
  },
};

const riskTone = (risk) =>
  risk === "HIGH RISK" || risk === "Critical" || risk === "HIGH" || risk === "DANGER"
    ? "danger"
    : risk === "MODERATE RISK" || risk === "Medium" || risk === "MODERATE" || risk === "ATTENTION"
      ? "warn"
      : "safe";

function Pill({ children, tone = "" }) {
  return (
    <span className={`table-pill ${tone || riskTone(children)}`}>
      {children}
    </span>
  );
}

function Intro({ kicker, title, description, action }) {
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

function Field({ label, children, name, required = false }) {
  return (
    <label className="stack-field">
      {label}
      {children || <input name={name} required={required} />}
    </label>
  );
}

export function InspectionsPage() {
  const [items, setItems] = useState([]);
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  const canEdit = role === "ADMIN" || role === "ENGINEER";

  const loadData = async () => {
    try {
      const siteList = await sitesApi.getAll().catch(() => []);
      setSites(siteList);
      const inspectionList = await inspectionsApi.getAll().catch(() => []);
      setItems(inspectionList);
    } catch (err) {
      console.error("Failed to load inspections from API:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items
    .filter((item) =>
      `${item.id} ${item.siteName || item.site || ""} ${item.inspector || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((item) => siteFilter === "ALL" || String(item.monitoringSiteId) === String(siteFilter))
    .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
    .filter((item) => riskFilter === "ALL" || (item.risk || "SAFE").includes(riskFilter.split(" ")[0]));

  const addInspection = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedSiteId = Number(form.get("siteId")) || (sites[0] ? sites[0].id : null);
    if (!selectedSiteId) {
      alert("Please save or select a monitoring location first.");
      return;
    }
    const payload = {
      monitoringSiteId: selectedSiteId,
      inspector: form.get("inspector"),
      type: form.get("type"),
      date: form.get("date") || new Date().toISOString().slice(0, 10),
      nextDate: "2026-09-15",
      status: "Scheduled",
      risk: "SAFE",
      findings: form.get("notes") || "Field observations recorded",
      weather: form.get("weather") || "Clear",
      crack: form.get("crack") || "None",
      notes: form.get("notes") || "",
    };
    try {
      await inspectionsApi.create(payload);
      setShowAdd(false);
      loadData();
    } catch (err) {
      console.error("Failed to save inspection:", err);
      alert("Could not save inspection record to MySQL.");
    }
  };

  const completeInspection = async (item) => {
    try {
      await inspectionsApi.update(item.id, { ...item, status: "Completed" });
      loadData();
    } catch (err) {
      console.error("Failed to complete inspection:", err);
    }
  };

  const summary = [
    ["Total inspections", items.length],
    ["Scheduled", items.filter((item) => item.status === "Scheduled").length],
    ["Completed", items.filter((item) => item.status === "Completed").length],
    [
      "Pending / overdue",
      items.filter((item) => item.status === "Overdue" || item.status === "In Progress").length,
    ],
    [
      "Critical findings",
      items.filter((item) => item.risk && item.risk.includes("HIGH")).length,
    ],
  ];

  return (
    <PageFrame title="Inspection management">
      <main className="module-content">
        <Intro
          kicker="FIELD OPERATIONS · PERSISTED IN MYSQL"
          title="Inspection management"
          description="Record and review geotechnical field inspection logs for your saved monitoring locations."
          action={
            canEdit ? (
              <button
                className="primary-action compact"
                onClick={() => {
                  if (sites.length === 0) {
                    alert("Please add or save a location first before logging an inspection.");
                    return;
                  }
                  setShowAdd(true);
                }}
              >
                + Add inspection
              </button>
            ) : null
          }
        />
        <div className="operation-stats">
          {summary.map(([label, value]) => (
            <div className="operation-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="filter-bar">
          <label className="module-search">
            ⌕
            <input
              placeholder="Search inspections..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            value={siteFilter}
            onChange={(event) => setSiteFilter(event.target.value)}
          >
            <option value="ALL">All saved locations</option>
            {sites.map((item) => (
              <option key={item.id} value={item.id}>
                {item.siteName || item.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {["Scheduled", "In Progress", "Completed", "Overdue"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <section className="module-panel table-panel">
          <div className="table-summary">
            Showing {filtered.length} inspection records <span>MySQL Database</span>
          </div>
          {loading ? (
            <p style={{ padding: "20px" }}>Loading field inspections from MySQL...</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No inspection records logged yet.</p>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Select a saved location and click "+ Add inspection" to record field observations.
              </p>
            </div>
          ) : (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID / Site</th>
                    <th>Inspector</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Next visit</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Findings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const displayId = typeof item.id === "number" ? `INS-00${item.id}` : item.id;
                    const siteName = item.siteName || item.site || `Site #${item.monitoringSiteId || 1}`;
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{displayId}</strong>
                          <small>{siteName}</small>
                        </td>
                        <td>{item.inspector}</td>
                        <td>{item.type}</td>
                        <td>{item.date}</td>
                        <td>{item.nextDate || "Scheduled"}</td>
                        <td>
                          <Pill>{item.status || "Scheduled"}</Pill>
                        </td>
                        <td>
                          <Pill>{item.risk || "SAFE"}</Pill>
                        </td>
                        <td>{item.findings || item.notes || "None"}</td>
                        <td>
                          <button
                            className="table-action"
                            onClick={() => setSelected(item)}
                          >
                            View
                          </button>
                          {canEdit && item.status !== "Completed" && (
                            <button
                              className="table-action"
                              onClick={() => completeInspection(item)}
                            >
                              Complete
                            </button>
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

        {selected && (
          <InspectionDetails
            inspection={selected}
            onClose={() => setSelected(null)}
          />
        )}

        {showAdd && (
          <Modal onClose={() => setShowAdd(false)}>
            <span className="eyebrow">NEW FIELD RECORD</span>
            <h2>Add inspection</h2>
            <form className="stack-form" onSubmit={addInspection}>
              <Field label="Saved Location">
                <select name="siteId" defaultValue={sites[0]?.id}>
                  {sites.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.siteName || item.name} ({item.location})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Inspector Name" name="inspector" required />
              <Field label="Inspection Type">
                <select name="type">
                  <option>Routine Geotechnical Inspection</option>
                  <option>Detailed Structural Inspection</option>
                  <option>Emergency Post-Rainfall Inspection</option>
                  <option>Slope Drainage Clearance</option>
                </select>
              </Field>
              <Field label="Inspection Date">
                <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Weather Condition" name="weather" />
              <Field label="Surface Crack Observations" name="crack" />
              <Field label="Geotechnical Findings & Notes">
                <textarea name="notes" rows="3" required placeholder="Describe slope stability, drainage, erosion..." />
              </Field>
              <button className="primary-action" type="submit">
                Save Inspection to MySQL
              </button>
            </form>
          </Modal>
        )}
      </main>
    </PageFrame>
  );
}

function InspectionDetails({ inspection, onClose }) {
  const displayId = typeof inspection.id === "number" ? `INS-00${inspection.id}` : inspection.id;
  const siteName = inspection.siteName || inspection.site || `Site #${inspection.monitoringSiteId || 1}`;
  return (
    <Modal onClose={onClose}>
      <span className="eyebrow">INSPECTION DETAIL · {displayId}</span>
      <h2>{siteName}</h2>
      <p>
        {inspection.type} · {inspection.inspector} · {inspection.date}
      </p>
      <div className="detail-grid">
        <span>
          Risk<strong>{inspection.risk || "SAFE"}</strong>
        </span>
        <span>
          Status<strong>{inspection.status || "Scheduled"}</strong>
        </span>
        <span>
          Weather<strong>{inspection.weather || "Clear"}</strong>
        </span>
        <span>
          Next visit<strong>{inspection.nextDate || "Scheduled"}</strong>
        </span>
      </div>
      <h3 className="subheading">Field observations</h3>
      <div className="observation-list">
        <p>
          <span>Findings</span>
          <strong>{inspection.findings || inspection.notes || "None"}</strong>
        </p>
        <p>
          <span>Crack observation</span>
          <strong>{inspection.crack || "None"}</strong>
        </p>
      </div>
    </Modal>
  );
}

export function IncidentsPage() {
  const [items, setItems] = useState([]);
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const siteList = await sitesApi.getAll().catch(() => []);
      setSites(siteList);
      const incidentList = await incidentsApi.getAll().catch(() => []);
      setItems(incidentList);
    } catch (err) {
      console.error("Failed to load incidents from API:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items
    .filter((item) =>
      `${item.id} ${item.siteName || item.site || ""} ${item.type || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((item) => severityFilter === "ALL" || item.severity === severityFilter)
    .filter((item) => statusFilter === "ALL" || item.status === statusFilter);

  const addIncident = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedSiteId = Number(form.get("siteId")) || (sites[0] ? sites[0].id : null);
    if (!selectedSiteId) {
      alert("Please add or select a location first before reporting an incident.");
      return;
    }
    const payload = {
      monitoringSiteId: selectedSiteId,
      type: form.get("type"),
      severity: form.get("severity"),
      date: form.get("date") || new Date().toISOString().slice(0, 10),
      time: form.get("time") || "12:00",
      description: form.get("description"),
      status: "Reported",
      cause: form.get("cause") || "Heavy precipitation & slope movement",
      impact: form.get("impact") || "Localized slope displacement",
      damage: form.get("damage") || "Debris accumulation",
      action: form.get("action") || "Field response dispatched",
      roadStatus: "Controlled",
    };
    try {
      await incidentsApi.create(payload);
      setShowAdd(false);
      loadData();
    } catch (err) {
      console.error("Error creating incident:", err);
      alert("Could not save incident to MySQL.");
    }
  };

  const toggleResolve = async (item) => {
    const nextStatus = item.status === "Resolved" ? "Investigating" : "Resolved";
    try {
      await incidentsApi.update(item.id, { ...item, status: nextStatus });
      loadData();
    } catch (err) {
      console.error("Error updating incident status:", err);
    }
  };

  const summary = [
    ["Total incidents", items.length],
    ["Active incidents", items.filter((item) => item.status !== "Resolved").length],
    ["Critical incidents", items.filter((item) => item.severity === "Critical").length],
    ["Resolved incidents", items.filter((item) => item.status === "Resolved").length],
  ];

  return (
    <PageFrame title="Incident management">
      <main className="module-content">
        <Intro
          kicker="FIELD OPERATIONS · PERSISTED IN MYSQL"
          title="Incident management"
          description="Report actual slope failures, rockfalls, landslides, or safety hazards for your saved locations."
          action={
            <button
              className="primary-action compact"
              onClick={() => {
                if (sites.length === 0) {
                  alert("Please save a location first before logging an incident.");
                  return;
                }
                setShowAdd(true);
              }}
            >
              + Report Incident
            </button>
          }
        />
        <div className="operation-stats">
          {summary.map(([label, value]) => (
            <div className="operation-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="filter-bar">
          <label className="module-search">
            ⌕
            <input
              placeholder="Search incidents..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
          >
            <option value="ALL">All severities</option>
            {["Low", "Medium", "High", "Critical"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {["Reported", "Investigating", "Contained", "Resolved"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p style={{ padding: "20px" }}>Loading incident records from MySQL...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No slope incidents reported yet.</p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Select a saved location and click "+ Report Incident" to log a landslide or rockfall event.
            </p>
          </div>
        ) : (
          <section className="incident-list">
            {filtered.map((item) => {
              const displayId = typeof item.id === "number" ? `INC-00${item.id}` : item.id;
              const siteName = item.siteName || item.site || `Site #${item.monitoringSiteId || 1}`;
              return (
                <article
                  className={`incident-card ${(item.severity || "medium").toLowerCase()}`}
                  key={item.id}
                >
                  <div className="incident-card-top">
                    <span className="eyebrow">
                      {displayId} · {item.date} {item.time}
                    </span>
                    <Pill>{item.severity}</Pill>
                  </div>
                  <h2>{siteName}</h2>
                  <strong>{item.type}</strong>
                  <p>{item.description}</p>
                  <div className="incident-card-footer">
                    <Pill>{item.status}</Pill>
                    <div>
                      <button
                        className="table-action"
                        onClick={() => setSelected(item)}
                      >
                        View details
                      </button>
                      <button
                        className="table-action"
                        onClick={() => toggleResolve(item)}
                      >
                        {item.status === "Resolved" ? "Reopen" : "Resolve"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {selected && (
          <IncidentDetails
            incident={selected}
            onClose={() => setSelected(null)}
          />
        )}

        {showAdd && (
          <Modal onClose={() => setShowAdd(false)}>
            <span className="eyebrow">NEW HAZARD EVENT</span>
            <h2>Report Incident</h2>
            <form className="stack-form" onSubmit={addIncident}>
              <Field label="Saved Location">
                <select name="siteId" defaultValue={sites[0]?.id}>
                  {sites.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.siteName || item.name} ({item.location})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Incident Type">
                <select name="type">
                  <option>Slope Failure / Landslide</option>
                  <option>Rockfall Event</option>
                  <option>Surface Crack Expansion</option>
                  <option>Severe Soil Erosion</option>
                  <option>Drainage Blockage / Overflow</option>
                </select>
              </Field>
              <Field label="Date of Occurrence">
                <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Time of Occurrence">
                <input type="time" name="time" required defaultValue="10:00" />
              </Field>
              <Field label="Severity Level">
                <select name="severity">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </Field>
              <Field label="Incident Description">
                <textarea name="description" rows="3" required placeholder="Describe what occurred, affected area, and field observations..." />
              </Field>
              <Field label="Suspected Trigger Cause" name="cause" placeholder="e.g. Continuous heavy rainfall" />
              <Field label="Impact & Damage" name="impact" placeholder="e.g. Road shoulder partially blocked" />
              <Field label="Immediate Safety Response" name="action" placeholder="e.g. Area cordoned off and safety team dispatched" />
              <button className="primary-action" type="submit">
                Save Incident to MySQL
              </button>
            </form>
          </Modal>
        )}
      </main>
    </PageFrame>
  );
}

function IncidentDetails({ incident, onClose }) {
  const displayId = typeof incident.id === "number" ? `INC-00${incident.id}` : incident.id;
  const siteName = incident.siteName || incident.site || `Site #${incident.monitoringSiteId || 1}`;
  return (
    <Modal onClose={onClose}>
      <span className="eyebrow">INCIDENT DETAIL · {displayId}</span>
      <h2>{siteName}</h2>
      <p>
        {incident.type} · {incident.date} · {incident.time}
      </p>
      <div className="detail-grid">
        <span>
          Severity<strong>{incident.severity}</strong>
        </span>
        <span>
          Status<strong>{incident.status}</strong>
        </span>
        <span>
          Cause<strong>{incident.cause || "Environmental"}</strong>
        </span>
        <span>
          Road status<strong>{incident.roadStatus || "Open"}</strong>
        </span>
      </div>
      <h3 className="subheading">Impact and response</h3>
      <p className="detail-description">
        {incident.description}. {incident.action}
      </p>
    </Modal>
  );
}

export function AnalyticsPage() {
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [siteData, incidentData, alertData, inspectionData] = await Promise.all([
          sitesApi.getAll().catch(() => []),
          incidentsApi.getAll().catch(() => []),
          alertApi.getAll().catch(() => []),
          inspectionsApi.getAll().catch(() => []),
        ]);
        setSites(siteData);
        setIncidents(incidentData);
        setAlerts(alertData);
        setInspections(inspectionData);
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const totalSites = sites.length;
  const hasData = totalSites > 0 || alerts.length > 0 || incidents.length > 0 || inspections.length > 0;

  return (
    <PageFrame title="Analytics">
      <main className="module-content">
        <Intro
          kicker="MANAGEMENT INTELLIGENCE · MYSQL DATA ENGINE"
          title="Analytics"
          description="Analytical insights generated directly from real saved locations, predictions, alerts, and field records."
        />

        <div className="operation-stats">
          <div className="operation-stat">
            <span>Saved Locations</span>
            <strong>{totalSites}</strong>
          </div>
          <div className="operation-stat">
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>
          <div className="operation-stat">
            <span>Logged Incidents</span>
            <strong>{incidents.length}</strong>
          </div>
          <div className="operation-stat">
            <span>Completed Inspections</span>
            <strong>{inspections.filter((i) => i.status === "Completed").length}</strong>
          </div>
        </div>

        {!hasData ? (
          <div className="module-panel" style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <h2>No Analytics Data Available Yet</h2>
            <p style={{ maxWidth: "500px", margin: "12px auto", fontSize: "0.95rem", color: "#cbd5e1" }}>
              Analytics charts are generated exclusively from your real saved locations, prediction history, alerts, and field logs.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Search and analyze a location on the Dashboard to start building analytics history.
            </p>
          </div>
        ) : (
          <div className="report-grid">
            <section className="module-panel">
              <div className="panel-heading">
                <h2>Saved Site Risk Status</h2>
                <span className="eyebrow">LIVE MYSQL</span>
              </div>
              <div style={{ padding: "20px" }}>
                {sites.map((site) => (
                  <div
                    key={site.id}
                    style={{
                      display: "flex",
                      justify: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#fff" }}>{site.siteName || site.name}</strong>
                      <small style={{ display: "block", color: "#94a3b8" }}>{site.location}</small>
                    </div>
                    <Pill>{site.status || "MONITORING"}</Pill>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </PageFrame>
  );
}
