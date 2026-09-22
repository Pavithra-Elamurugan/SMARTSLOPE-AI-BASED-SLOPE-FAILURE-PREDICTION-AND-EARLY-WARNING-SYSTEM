import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { userApi, authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State for New User
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "Password123!",
    role: "ENGINEER",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getAll().catch(() => []);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to fetch user list from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setSuccessMsg(null);
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      await userApi.update(userId, { ...targetUser, role: newRole, active: true });
      setSuccessMsg(`Updated role for ${targetUser.username} to ${newRole.replace("_", " ")}`);
      loadUsers();
    } catch (err) {
      console.error("Failed to update user role:", err);
      setError("Failed to update user role.");
    }
  };

  const handleApproveUser = async (userId, defaultRole = "ENGINEER") => {
    try {
      setSuccessMsg(null);
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      await userApi.update(userId, { ...targetUser, role: defaultRole, active: true });
      setSuccessMsg(`Approved registration for ${targetUser.username} as ${defaultRole.replace("_", " ")}`);
      loadUsers();
    } catch (err) {
      console.error("Failed to approve user:", err);
      setError("Failed to approve user registration.");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user account "${username}"?`)) return;
    try {
      await userApi.delete(userId);
      setSuccessMsg(`User account "${username}" removed successfully.`);
      loadUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user account.");
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.register(newUserForm);
      setSuccessMsg(`User "${newUserForm.username}" registered successfully.`);
      setShowAddModal(false);
      setNewUserForm({ username: "", email: "", password: "Password123!", role: "ENGINEER" });
      loadUsers();
    } catch (err) {
      console.error("Failed to register user:", err);
      setError(err.response?.data?.message || "Failed to create user account.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const pendingUsers = users.filter((u) => u.role === "PENDING" || !u.active);
  const engineersCount = users.filter((u) => u.role === "ENGINEER").length;
  const safetyOfficersCount = users.filter((u) => u.role === "SAFETY_OFFICER").length;
  const adminsCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="command-app">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="command-main">
        <Header />

        {/* Universal Standardized Header */}
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                👥 User & Role Management
              </h1>
              <span className="demo-pill" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                ADMIN ONLY
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
              Manage system user accounts, assign roles, approve pending registrations, and delegate slope monitoring responsibilities.
            </p>
          </div>

          <button className="primary-action" onClick={() => setShowAddModal(true)}>
            + Add New User
          </button>
        </div>

        {/* Notifications Banner */}
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", marginBottom: "20px", fontSize: "13px" }}>
            ❌ {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: "12px 16px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#6ee7b7", marginBottom: "20px", fontSize: "13px" }}>
            ✅ {successMsg}
          </div>
        )}

        {/* User Summary Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div className="module-panel" style={{ padding: "16px" }}>
            <span className="eyebrow" style={{ color: "#94a3b8" }}>TOTAL REGISTERED USERS</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc", margin: "4px 0" }}>{totalUsers}</div>
            <small style={{ color: "#64748b" }}>Active accounts in system</small>
          </div>

          <div className="module-panel" style={{ padding: "16px" }}>
            <span className="eyebrow" style={{ color: "#fbbf24" }}>⏳ PENDING APPROVALS</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: pendingUsers.length > 0 ? "#fbbf24" : "#f8fafc", margin: "4px 0" }}>
              {pendingUsers.length}
            </div>
            <small style={{ color: "#64748b" }}>Requires admin authorization</small>
          </div>

          <div className="module-panel" style={{ padding: "16px" }}>
            <span className="eyebrow" style={{ color: "#38bdf8" }}>⚙️ GEOTECHNICAL ENGINEERS</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", margin: "4px 0" }}>{engineersCount}</div>
            <small style={{ color: "#64748b" }}>Technical site monitors</small>
          </div>

          <div className="module-panel" style={{ padding: "16px" }}>
            <span className="eyebrow" style={{ color: "#10b981" }}>🛡️ SAFETY OFFICERS</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", margin: "4px 0" }}>{safetyOfficersCount}</div>
            <small style={{ color: "#64748b" }}>Emergency response leads</small>
          </div>

          <div className="module-panel" style={{ padding: "16px" }}>
            <span className="eyebrow" style={{ color: "#a855f7" }}>👑 SYSTEM ADMINS</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#a855f7", margin: "4px 0" }}>{adminsCount}</div>
            <small style={{ color: "#64748b" }}>System administrators</small>
          </div>
        </div>

        {/* User List Table Panel */}
        <section className="module-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span className="eyebrow">SYSTEM USER ACCOUNTS</span>
              <h3 className="section-heading" style={{ margin: "4px 0 0 0" }}>User Directory & Permissions</h3>
            </div>
            <button className="secondary-action compact" onClick={loadUsers}>
              🔄 Refresh List
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading user accounts...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No user accounts found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#e2e8f0", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#94a3b8", fontSize: "11px", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "12px" }}>USER</th>
                    <th style={{ padding: "12px" }}>EMAIL</th>
                    <th style={{ padding: "12px" }}>ROLE</th>
                    <th style={{ padding: "12px" }}>STATUS</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isPending = u.role === "PENDING" || !u.active;
                    const isSelf = currentUser && String(currentUser.id) === String(u.id);

                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isPending ? "rgba(245,158,11,0.2)" : "rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", border: `1px solid ${isPending ? "#f59e0b" : "#3b82f6"}` }}>
                              {u.username ? u.username.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <strong style={{ color: "#f8fafc", display: "block" }}>
                                {u.username} {isSelf && <span style={{ fontSize: "10px", color: "#38bdf8" }}>(You)</span>}
                              </strong>
                              <small style={{ color: "#64748b" }}>ID: #{u.id}</small>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 12px", color: "#cbd5e1" }}>
                          {u.email || `${u.username.toLowerCase()}@smartslope.io`}
                        </td>

                        <td style={{ padding: "14px 12px" }}>
                          <select
                            value={u.role || "PUBLIC_USER"}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={isSelf}
                            style={{
                              background: "rgba(15,23,42,0.8)",
                              color: "#f8fafc",
                              border: "1px solid rgba(255,255,255,0.15)",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: isSelf ? "not-allowed" : "pointer",
                            }}
                          >
                            <option value="ADMIN">👑 Admin</option>
                            <option value="ENGINEER">⚙️ Geotechnical Engineer</option>
                            <option value="SAFETY_OFFICER">🛡️ Safety Officer</option>
                            <option value="PUBLIC_USER">👤 Public User</option>
                            <option value="PENDING">⏳ Pending Approval</option>
                          </select>
                        </td>

                        <td style={{ padding: "14px 12px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: isPending ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                              color: isPending ? "#fbbf24" : "#34d399",
                              border: `1px solid ${isPending ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
                            }}
                          >
                            {isPending ? "PENDING APPROVAL" : "ACTIVE"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 12px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {isPending && (
                              <button
                                className="table-action"
                                style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}
                                onClick={() => handleApproveUser(u.id, "ENGINEER")}
                              >
                                ✓ Approve
                              </button>
                            )}

                            {!isSelf && (
                              <button
                                className="table-action resolve-btn"
                                style={{ background: "rgba(220, 38, 38, 0.15)", color: "#fca5a5", border: "1px solid rgba(220, 38, 38, 0.3)" }}
                                onClick={() => handleDeleteUser(u.id, u.username)}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal for Adding New User */}
        {showAddModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "16px", padding: "28px", width: "460px", maxWidth: "95vw", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Add New System User</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "22px", cursor: "pointer" }}>×</button>
              </div>

              <form onSubmit={handleAddUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Username</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="e.g. john_engineer"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="john@smartslope.io"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Role Assignment</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  >
                    <option value="ENGINEER">⚙️ Geotechnical Engineer</option>
                    <option value="SAFETY_OFFICER">🛡️ Safety Officer</option>
                    <option value="ADMIN">👑 System Administrator</option>
                    <option value="PUBLIC_USER">👤 Public User</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button type="button" className="secondary-action" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="primary-action" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Account"}
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
