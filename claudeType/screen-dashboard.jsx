// Progress Dashboard — charts, heatmap, achievements, history

const Dashboard = ({ player, onStartRun }) => {
  const stats = player.stats;
  const runs = stats.runs;

  // Aggregate stats
  const totalRuns = runs.length;
  const avgWpm = runs.length ? Math.round(runs.reduce((a, r) => a + r.wpm, 0) / runs.length) : 0;
  const avgAcc = runs.length ? Math.round(runs.reduce((a, r) => a + r.accuracy, 0) / runs.length) : 0;
  const totalTime = runs.reduce((a, r) => a + r.duration, 0);

  // Personal bests by mode
  const bestByMode = {};
  runs.forEach(r => {
    const k = r.mode;
    if (!bestByMode[k] || r.wpm > bestByMode[k].wpm) bestByMode[k] = r;
  });

  // Achievements check
  const earned = ACHIEVEMENTS.filter(a => a.check(stats));
  const earnedIds = new Set(earned.map(a => a.id));

  return (
    <div className="center-stack" style={{ padding: "12px 0 60px" }}>
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        marginBottom: 22, gap: 16, flexWrap: "wrap"
      }}>
        <div>
          <div className="eyebrow">Player {player.name}</div>
          <h1 className="display" style={{ fontSize: 48 }}>Your Progress</h1>
          <p className="lead">Every run makes you faster.</p>
        </div>
        <button className="btn primary" onClick={onStartRun}>
          <Icon name="play" size={16} /> Start a run
        </button>
      </div>

      {/* Top stat bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16, marginBottom: 20,
      }}>
        <KpiCard color="var(--primary)" label="Best WPM" value={stats.bestWpm} icon="bolt" />
        <KpiCard color="var(--secondary)" label="Avg accuracy" value={avgAcc + "%"} icon="target" />
        <KpiCard color="var(--lavender)" label="Total runs" value={totalRuns} icon="medal" />
        <KpiCard color="var(--mint)" label="Time typed" value={fmtMin(totalTime)} icon="calendar" />
      </div>

      {/* Charts row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 20, marginBottom: 20,
      }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div className="eyebrow">WPM trend</div>
              <h3 className="section">Speed over time</h3>
            </div>
            <div className="pill primary"><Icon name="bolt" size={12}/> avg {avgWpm}</div>
          </div>
          <LineChart data={runs.map(r => r.wpm)} color="var(--primary)" height={200} label="wpm" />
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div className="eyebrow">Accuracy</div>
              <h3 className="section">Hit rate</h3>
            </div>
            <div className="pill secondary"><Icon name="target" size={12}/> avg {avgAcc}%</div>
          </div>
          <LineChart data={runs.map(r => r.accuracy)} color="var(--secondary)" height={200} label="acc" />
        </div>
      </div>

      {/* Personal bests + Heatmap */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.3fr",
        gap: 20, marginBottom: 20,
      }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow">Personal bests</div>
          <h3 className="section">Your records</h3>
          <PBList bestByMode={bestByMode} />
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow">Trouble keys</div>
          <h3 className="section">Heatmap</h3>
          <KeyHeatmap misses={stats.keyMisses} />
        </div>
      </div>

      {/* Achievements */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="eyebrow">Badges</div>
            <h3 className="section">Achievements</h3>
          </div>
          <div className="pill accent">{earned.length} / {ACHIEVEMENTS.length}</div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
        }}>
          {ACHIEVEMENTS.map(a => {
            const got = earnedIds.has(a.id);
            return (
              <div key={a.id} style={{
                background: got ? "var(--bg-2)" : "var(--bg)",
                borderRadius: 18,
                padding: "14px 12px",
                textAlign: "center",
                opacity: got ? 1 : 0.55,
                position: "relative",
                border: got ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
                <div style={{ fontSize: 32, marginBottom: 6, filter: got ? "none" : "grayscale(1)" }}>
                  {got ? a.icon : "🔒"}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="card" style={{ padding: 22 }}>
        <div className="eyebrow">Log</div>
        <h3 className="section">Recent runs</h3>
        <HistoryTable runs={runs.slice(-15).reverse()} />
      </div>
    </div>
  );
};

const KpiCard = ({ color, label, value, icon }) => (
  <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{
      width: 48, height: 48, borderRadius: 14,
      background: color, color: "white",
      display: "grid", placeItems: "center",
      boxShadow: "var(--shadow-sm)",
    }}>
      <Icon name={icon} size={22} stroke={2.4} />
    </div>
    <div>
      <div className="stat-num" style={{ color, fontSize: 32 }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const PBList = ({ bestByMode }) => {
  const order = ["words-25", "words-50", "words-100", "quote", "code", "race"];
  const labels = {
    "words-25": "25 words",
    "words-50": "50 words",
    "words-100": "100 words",
    "quote": "Quote",
    "code": "Code",
    "race": "Ghost race",
  };
  return (
    <div>
      {order.map(k => {
        const r = bestByMode[k];
        return (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: "2px dashed var(--bg-2)",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "var(--bg-2)", display: "grid", placeItems: "center",
              color: "var(--primary)",
            }}>
              <Icon name={iconForMode(k)} size={16} />
            </div>
            <div style={{ flex: 1, fontWeight: 600 }}>{labels[k]}</div>
            {r ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{r.wpm}</div>
                <div className="stat-label">WPM</div>
              </>
            ) : (
              <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>— not yet —</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const KeyHeatmap = ({ misses }) => {
  const rows = [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m"],
  ];
  const max = Math.max(1, ...Object.values(misses));
  const colorFor = (n) => {
    const t = n / max;
    if (n === 0) return { bg: "var(--bg-2)", color: "var(--ink-faint)" };
    if (t < 0.33) return { bg: "rgba(77,217,161,0.30)", color: "#1F8E5E" };
    if (t < 0.66) return { bg: "rgba(255,204,46,0.50)", color: "#8A6B00" };
    return { bg: "var(--tomato)", color: "white" };
  };
  return (
    <div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
        padding: "8px 0",
      }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 8, marginLeft: ri * 12 }}>
            {row.map(k => {
              const n = misses[k] || 0;
              const c = colorFor(n);
              return (
                <div key={k} style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: c.bg, color: c.color,
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono)", fontWeight: 700,
                  position: "relative", fontSize: 16,
                }} title={`${k} — ${n} misses`}>
                  {k.toUpperCase()}
                  {n > 0 && (
                    <div style={{
                      position: "absolute", top: -6, right: -6,
                      background: "var(--ink)", color: "white",
                      fontSize: 10, fontFamily: "var(--font-ui)",
                      padding: "2px 5px", borderRadius: 6, fontWeight: 700,
                    }}>{n}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 14, display: "flex", justifyContent: "center",
        gap: 14, fontSize: 11, color: "var(--ink-soft)", fontWeight: 600,
      }}>
        <Legend color="var(--bg-2)" label="0" />
        <Legend color="rgba(77,217,161,0.30)" label="few" />
        <Legend color="rgba(255,204,46,0.50)" label="some" />
        <Legend color="var(--tomato)" label="many" />
      </div>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 14, height: 14, background: color, borderRadius: 4, display: "inline-block" }} />
    {label}
  </div>
);

const HistoryTable = ({ runs }) => {
  if (runs.length === 0) {
    return <div style={{ color: "var(--ink-soft)", padding: "20px 0", textAlign: "center" }}>No runs yet.</div>;
  }
  return (
    <div style={{ overflow: "hidden", borderRadius: 14 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "var(--bg-2)", textAlign: "left" }}>
            <th style={th}>Mode</th>
            <th style={th}>WPM</th>
            <th style={th}>Accuracy</th>
            <th style={th}>Time</th>
            <th style={th}>When</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.id} style={{ borderBottom: "1px dashed var(--bg-2)" }}>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon name={iconForMode(r.mode)} size={14}/> {r.modeLabel}
                </span>
              </td>
              <td style={td}><b style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{r.wpm}</b></td>
              <td style={td}>{r.accuracy}%</td>
              <td style={td}>{fmtTime(r.duration)}</td>
              <td style={{ ...td, color: "var(--ink-soft)" }}>{relTime(r.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const th = { padding: "12px 14px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-soft)" };
const td = { padding: "12px 14px" };

function fmtMin(seconds) {
  if (seconds < 60) return seconds + "s";
  const m = Math.floor(seconds / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  return h + "h " + (m % 60) + "m";
}

window.Dashboard = Dashboard;
