import { NavLink } from "react-router-dom";
import { navigation } from "../data/navigation";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const role = (user?.role || "PUBLIC_USER").toUpperCase();

  const allowedNav = navigation.filter((item) => {
    if (role === "ADMIN") {
      return true; // All 6 pages
    }
    if (role === "ENGINEER") {
      return ["/dashboard", "/location-monitoring", "/alerts", "/inspections", "/predictions"].includes(item.to);
    }
    if (role === "SAFETY_OFFICER") {
      return ["/dashboard", "/location-monitoring", "/alerts", "/inspections"].includes(item.to);
    }
    // PUBLIC_USER / USER
    return ["/dashboard", "/location-monitoring", "/alerts"].includes(item.to);
  });

  const getLabelForItem = (item) => {
    if (item.to === "/location-monitoring") {
      if (role === "PUBLIC_USER" || role === "USER") return "Location Status";
      return "Location Monitoring";
    }
    return item.label;
  };

  return (
    <aside className={`command-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-symbol">S</div>
        {!collapsed && (
          <div>
            <strong>
              SMART<span>SLOPE</span>
            </strong>
            <small>COMMAND CENTER</small>
          </div>
        )}
      </div>
      <button
        className="collapse-button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "»" : "«"}
      </button>
      <div className="nav-caption">NAVIGATION</div>
      <nav>
        {allowedNav.map((item) => {
          const displayLabel = getLabelForItem(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/dashboard"}
              className={({ isActive }) =>
                `command-nav ${isActive ? "active" : ""}`
              }
              title={displayLabel}
            >
              <span>{item.icon}</span>
              {!collapsed && displayLabel}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        {!collapsed && (
          <>
            <span className="demo-pill">{role.replace("_", " ")} ACCESS</span>
            <button className="logout-sidebar-btn" onClick={logout}>
              Sign out ➔
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
