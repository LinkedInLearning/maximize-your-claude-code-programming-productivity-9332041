// components.jsx — shared UI bits
const { useState, useEffect, useRef, useMemo } = React;

const StatBox = ({ label, value, sub, big }) => (
  <div className={"stat-box " + (big ? "big" : "")}>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <label className="toggle">
    <span>{label}</span>
    <button type="button" role="switch" aria-checked={value} className={"toggle-track " + (value ? "on" : "off")} onClick={() => onChange(!value)}>
      <span className="toggle-thumb"/>
    </button>
  </label>
);

const Segmented = ({ label, value, options, onChange }) => (
  <div className="segmented">
    <span className="segmented-label">{label}</span>
    <div className="segmented-options">
      {options.map(o => (
        <button key={o.value} type="button" className={"seg-btn " + (value === o.value ? "active" : "")} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  </div>
);

const Modal = ({ title, children, onClose, actions }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-title">{title}</div>
      <div className="modal-body">{children}</div>
      <div className="modal-actions">{actions}</div>
    </div>
  </div>
);

const Sparkline = ({ values, width = 260, height = 60, color = "#FF5F8A" }) => {
  if (!values.length) return <svg width={width} height={height}/>;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * step},${height - ((v - min) / span) * (height - 6) - 3}`).join(" ");
  return (
    <svg width={width} height={height} className="sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"/>
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - ((v - min) / span) * (height - 6) - 3} r={i === values.length - 1 ? 4 : 2} fill={color}/>
      ))}
    </svg>
  );
};

const TrendChart = ({ values, color = "#FF5F8A", annotateAvg = false }) => {
  const width = 520, height = 140, pad = 20;
  if (!values.length) return <div className="empty-chart">No runs yet</div>;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - 2 * pad) / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${pad + i * step},${height - pad - ((v - min) / span) * (height - 2 * pad)}`).join(" ");
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = height - pad - ((avg - min) / span) * (height - 2 * pad);
  return (
    <svg width={width} height={height} className="trend-chart">
      {annotateAvg && (
        <g>
          <line x1={pad} x2={width - pad} y1={avgY} y2={avgY} stroke="#bbb" strokeDasharray="4 4"/>
          <text x={width - pad} y={avgY - 4} textAnchor="end" fontSize="11" fill="#888">avg {avg.toFixed(1)}</text>
        </g>
      )}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5"/>
      {values.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={height - pad - ((v - min) / span) * (height - 2 * pad)} r="3" fill={color}/>
      ))}
    </svg>
  );
};

const KEY_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNM".split("")
];

const KeyHeatmap = ({ keyMisses }) => {
  const max = Math.max(1, ...Object.values(keyMisses));
  const colorFor = (c) => {
    const lower = c.toLowerCase();
    const count = (keyMisses[lower] || 0) + (keyMisses[c] || 0);
    if (count === 0) return { bg: "#e8f7ef", border: "#cdebd9" };
    const ratio = count / max;
    if (ratio < 0.34) return { bg: "#fff5cc", border: "#f5e08a" };
    if (ratio < 0.67) return { bg: "#ffd49a", border: "#f0a653" };
    return { bg: "#ffb3b3", border: "#e26060" };
  };
  return (
    <div className="heatmap">
      {KEY_ROWS.map((row, i) => (
        <div className="hm-row" key={i} style={{ marginLeft: i * 12 }}>
          {row.map(c => {
            const count = (keyMisses[c.toLowerCase()] || 0) + (keyMisses[c] || 0);
            const { bg, border } = colorFor(c);
            return (
              <div key={c} className="hm-key" style={{ background: bg, borderColor: border }} title={`${c}: ${count} miss${count === 1 ? "" : "es"}`}>
                {c}
                {count > 0 && <span className="hm-count">{count}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Confetti = ({ enabled }) => {
  const colors = ["#FF5F8A","#4FB8E0","#B69CFF","#4DD9A1","#FFCC2E"];
  if (!enabled) return null;
  const pieces = Array.from({ length: 60 });
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((_, i) => {
        const c = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.6 + Math.random() * 1.2;
        const rot = Math.random() * 360;
        return <span key={i} className="confetti-piece" style={{ left: left + "%", background: c, animationDelay: delay + "s", animationDuration: dur + "s", transform: `rotate(${rot}deg)` }}/>;
      })}
    </div>
  );
};

const relTime = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 30) return d + "d ago";
  const mo = Math.floor(d / 30);
  return mo + "mo ago";
};

const modeLabel = (m) => ({ words: "Words", quote: "Quote", code: "Code", ghost: "Ghost" }[m] || m);

window.KQ_UI = { StatBox, Toggle, Segmented, Modal, Sparkline, TrendChart, KeyHeatmap, Confetti, relTime, modeLabel };
