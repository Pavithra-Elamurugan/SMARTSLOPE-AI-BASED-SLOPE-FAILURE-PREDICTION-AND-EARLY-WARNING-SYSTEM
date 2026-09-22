import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { sitesApi } from "../services/api";

function Pill({ children, tone = "" }) {
  return <span className={`table-pill ${tone}`}>{children}</span>;
}

export function InspectionsPage() {
  const { user } = useAuth();
  const role = (user?.role || "PUBLIC_USER").toUpperCase();
  const [collapsed, setCollapsed] = useState(false);

  const [sites, setSites] = useState([]);
  const [inspections, setInspections] = useState([
    {
      id: 101,
      siteName: "Mettur Dam Embankment Slope",
      location: "Mettur, Salem, Tamil Nadu",
      assignedEngineer: "Eng. Rajesh Kumar",
      status: "IN_PROGRESS",
      notes: "Inspected toe drain drainage culverts. Minor crack width observed at ch 14+20.",
      lastUpdate: new Date(Date.now() - 3600000).toLocaleString(),
    },
    {
      id: 102,
      siteName: "Pykara Incline Slope",
      location: "Nilgiris, Tamil Nadu",
      assignedEngineer: "Eng. Anitha Ramesh",
      status: "COMPLETED",
      notes: "Field geotechnical check complete. Slope surface sensors recalibrated.",
      lastUpdate: new Date(Date.now() - 86400000).toLocaleString(),
    },
    {
      id: 103,
      siteName: "Valparai Ghat Cutting",
      location: "Valparai, Coimbatore, Tamil Nadu",
      assignedEngineer: "Eng. Suresh Patel",
      status: "PENDING",
      notes: "Scheduled post-monsoon stability inspection.",
      lastUpdate: new Date(Date.now() - 172800000).toLocaleString(),
    },
  ]);

  const [loading, setLoading] = useState(true);

  // Edit / Add Inspection Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [formSiteName, setFormSiteName] = useState("");
  const [formEngineer, setFormEngineer] = useState(user?.name || "Eng. Field Specialist");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [formNotes, setFormNotes] = useState("");

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const sitesData = await sitesApi.getAll().catch(() => []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
    } catch (err) {
      console.error("Error loading sites for inspections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const openNewModal = () => {
    setSelectedInspection(null);
    setFormSiteName(sites[0]?.siteName || "Mettur Dam Embankment Slope");
    setFormEngineer(user?.name || "Eng. Field Specialist");
    setFormStatus("PENDING");
    setFormNotes("");
    setShowModal(true);
  };

  const openEditModal = (insp) => {
    setSelectedInspection(insp);
    setFormSiteName(insp.siteName);
    setFormEngineer(insp.assignedEngineer);
    setFormStatus(insp.status);
    setFormNotes(insp.notes);
    setShowModal(true);
  };

  const handleSaveInspection = (e) => {
    e.preventDefault();
    if (selectedInspection) {
      // Update existing inspection
      setInspections((prev) =>
        prev.map((item) =>
          item.id === selectedInspection.id
            ? {
                ...item,
                siteName: formSiteName,
                assignedEngineer: formEngineer,
                status: formStatus,
                notes: formNotes,
                lastUpdate: new Date().toLocaleString(),
              }
            : item
        )
      );
    } else {
      // Create new inspection
      const newInsp = {
        id: Date.now(),
        siteName: formSiteName,
        location: "Monitored Regional Sector",
        assignedEngineer: formEngineer,
        status: formStatus,
        notes: formNotes,
        lastUpdate: new Date().toLocaleString(),
      };
      setInspections((prev) => [newInsp, ...prev]);
    }
    setShowModal(false);
  };

  return (
    <div className="command-app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="command-main">
        <Header title="Field Geotechnical Inspections" />

        <main className="module-content" style={{ padding: "24px 32px", paddingBottom: "40px" }}>
          {/* Page Header */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  📋 Geotechnical Field Inspections
                </h1>
                <span className="demo-pill" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  ENGINEERING LOG
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
                Track field inspections, assign geotechnical engineers, update lifecycle status, and record slope investigation notes.
              </p>
            </div>

            {(role === "ADMIN" || role === "ENGINEER") && (
              <button className="primary-action" onClick={openNewModal}>
                + Start New Inspection
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading inspection records...</div>
          ) : inspections.length === 0 ? (
            <div className="module-panel" style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
              <h3 style={{ color: "#f8fafc", margin: "0 0 8px 0" }}>No Inspection Logs Recorded</h3>
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>Start a field inspection to log geotechnical site observations.</p>
            </div>
          ) : (
            <section className="module-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span className="eyebrow">FIELD INSPECTION RECORDS ({inspections.length})</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Status Flow: Pending → In Progress → Completed</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {inspections.map((insp) => (
                  <div
                    key={insp.id}
                    style={{
                      padding: "18px 20px",
                      background: "rgba(15,23,42,0.7)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.3rem" }}>📍</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 700 }}>
                            {insp.siteName}
                          </h3>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            Assigned Engineer: <strong style={{ color: "#cbd5e1" }}>{insp.assignedEngineer}</strong> &bull; Last Update: {insp.lastUpdate}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Pill
                          tone={
                            insp.status === "COMPLETED"
                              ? "safe"
                              : insp.status === "IN_PROGRESS"
                              ? "warn"
                              : "info"
                          }
                        >
                          STATUS: {insp.status.replace("_", " ")}
                        </Pill>

                        {(role === "ADMIN" || role === "ENGINEER") && (
                          <button
                            className="secondary-action compact"
                            onClick={() => openEditModal(insp)}
                          >
                            ✏️ Update Log
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ background: "rgba(15,23,42,0.5)", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
                      <strong>Field Notes:</strong> {insp.notes || "No additional observations logged."}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add / Edit Inspection Modal */}
          {showModal && (
            <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "rgba(15,23,42,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "24px", width: "520px", maxWidth: "95vw", color: "#fff" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.2rem", fontWeight: 700 }}>
                  {selectedInspection ? "✏️ Update Field Inspection Log" : "📋 Start New Field Inspection"}
                </h3>
                <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: "0 0 16px 0" }}>
                  Record observations, set operational status, and assign responsible geotechnical engineers.
                </p>

                <form onSubmit={handleSaveInspection} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Monitored Site Location</label>
                    <input
                      type="text"
                      required
                      value={formSiteName}
                      onChange={(e) => setFormSiteName(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Assigned Geotechnical Engineer</label>
                    <input
                      type="text"
                      required
                      value={formEngineer}
                      onChange={(e) => setFormEngineer(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Inspection Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", marginTop: "4px" }}
                    >
                      <option value="PENDING">🟡 PENDING</option>
                      <option value="IN_PROGRESS">🟠 IN PROGRESS</option>
                      <option value="COMPLETED">🟢 COMPLETED</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1" }}>Field Inspection Notes & Observations</label>
                    <textarea
                      rows={4}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Enter field observations, surface cracks, drainage check..."
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", marginTop: "4px" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                    <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="primary-action">
                      Save Inspection Log
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default InspectionsPage;
