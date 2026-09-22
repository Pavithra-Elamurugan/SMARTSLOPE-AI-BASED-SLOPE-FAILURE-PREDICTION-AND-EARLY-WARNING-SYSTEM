const levels = [
  { label: "SAFE", color: "safe" },
  { label: "MODERATE", color: "moderate" },
  { label: "HIGH", color: "high" },
  { label: "CRITICAL", color: "critical" },
];
export default function RiskLegend({ selected, onSelect }) {
  return (
    <div className="risk-legend">
      {levels.map((level) => (
        <button
          key={level.label}
          className={selected === level.label ? "selected" : ""}
          onClick={() =>
            onSelect(selected === level.label ? "ALL" : level.label)
          }
        >
          <i className={`risk-dot ${level.color}`} />
          {level.label}
        </button>
      ))}
    </div>
  );
}
