// Colored eGFR bar with a marker at the patient's value (same zones as the prototype,
// which follow the CPG dose bands: <30 / 30–44 / 45–59 / ≥60).
const ZONES = [
  { min: 0, max: 30, color: "#B3261E", label: "<30" },
  { min: 30, max: 45, color: "#C97A1E", label: "30–44" },
  { min: 45, max: 60, color: "#C9B21E", label: "45–59" },
  { min: 60, max: 120, color: "#2E7D53", label: "≥60" },
];
const TOTAL = 120;

export function EgfrMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / TOTAL) * 100));
  return (
    <div className="egfr-meter" aria-label={`eGFR ${value}`}>
      <div className="bar">
        {ZONES.map((z) => (
          <div key={z.label} style={{ width: `${((z.max - z.min) / TOTAL) * 100}%`, background: z.color }} />
        ))}
        <div className="marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="zl">
        {ZONES.map((z) => (
          <span key={z.label} style={{ width: `${((z.max - z.min) / TOTAL) * 100}%`, textAlign: "center" }}>
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
