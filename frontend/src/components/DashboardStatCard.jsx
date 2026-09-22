export default function DashboardStatCard({
  label,
  value,
  change,
  trend,
  icon,
  tone,
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small
          className={trend === "danger" || trend === "warn" ? "negative" : ""}
        >
          {trend === "up" ? "↗" : trend === "danger" ? "!" : "•"} {change}
        </small>
      </div>
      <div className="stat-spark">▁▃▂▅▆</div>
    </article>
  );
}
