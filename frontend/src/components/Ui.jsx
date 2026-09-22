export function LoadingState() {
  return (
    <div className="state-box">
      <div className="loader" />
      <span>Loading live data...</span>
    </div>
  );
}
export function ErrorMessage({ message }) {
  return (
    <div className="state-box error-box">
      <strong>Connection issue</strong>
      <span>{message}</span>
    </div>
  );
}
export function EmptyState({ children = "No records found." }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">○</span>
      <strong>{children}</strong>
      <span>Data will appear here when the backend receives records.</span>
    </div>
  );
}
export function RiskBadge({ risk }) {
  const label =
    risk === "MODERATE_RISK"
      ? "MODERATE"
      : risk === "HIGH_RISK"
        ? "HIGH"
        : risk || "UNKNOWN";
  return <span className={`risk-badge ${label.toLowerCase()}`}>{label}</span>;
}
export function MetricCard({ eyebrow, value, detail, tone = "" }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span className="metric-eyebrow">{eyebrow}</span>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
