import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Header({
  onNotification,
  title = "Command dashboard",
}) {
  const [now, setNow] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const roleLabel = user?.role ? user.role.replace("_", " ") : "ADMIN";

  return (
    <header className="command-header">
      <div className="header-page">
        <span className="header-kicker">OPERATIONS CENTER</span>
        <h1>{title}</h1>
      </div>
      <div className="header-tools">
        <label className="global-search">
          <span>⌕</span>
          <input placeholder="Search monitoring site..." />
          <kbd>/</kbd>
        </label>
        <div className="system-online">
          <i /> SYSTEM ONLINE
        </div>
        <div className="notification-wrap">
          <button
            className="icon-button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            ♢<b>3</b>
          </button>
          {notificationsOpen && (
            <div className="notification-menu">
              <strong>Notifications</strong>
              <p>3 active hazard signals require review.</p>
              <button
                onClick={() => {
                  setNotificationsOpen(false);
                  onNotification();
                }}
              >
                Acknowledge demo
              </button>
            </div>
          )}
        </div>

        <div className="profile-wrap" style={{ position: "relative" }}>
          <div
            className="profile"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{ cursor: "pointer" }}
          >
            <div className="avatar">{initials}</div>
            <div>
              <strong>{user?.name || "Administrator"}</strong>
              <span>{roleLabel}</span>
            </div>
            <span className="chevron">⌄</span>
          </div>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-info">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
                <span className="role-badge">{roleLabel}</span>
              </div>
              <hr />
              <button className="dropdown-logout-btn" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>

        <time>
          {now.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          <br />
          <b>
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </b>
        </time>
      </div>
    </header>
  );
}
