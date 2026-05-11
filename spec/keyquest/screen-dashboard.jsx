// screen-dashboard.jsx
const DashboardScreen = ({ player, onBack }) => {
  const { TrendChart, KeyHeatmap, relTime, modeLabel } = window.KQ_UI;
  const { ACHIEVEMENTS } = window.KQ_DATA;
  const Icon = window.KQ_Icon;
  const runs = player.runs;
  const best = runs.length ? Math.max(...runs.map(r => r.wpm)) : 0;
  const avgAcc = runs.length ? (runs.reduce((a, r) => a + r.accuracy, 0) / runs.length) : 0;
  const totalTime = runs.reduce((a, r) => a + r.duration, 0);

  const pbForMode = (filter) => {
    const subset = runs.filter(filter);
    return subset.length ? Math.max(...subset.map(r => r.wpm)) : null;
  };
  const modeRows = [
    { label: "Words 25",  pb: pbForMode(r => r.mode === "words" && (r.config?.count === 25 || r.wordCount === 25)) },
    { label: "Words 50",  pb: pbForMode(r => r.mode === "words" && (r.config?.count === 50 || r.wordCount === 50)) },
    { label: "Words 100", pb: pbForMode(r => r.mode === "words" && (r.config?.count === 100 || r.wordCount === 100)) },
    { label: "Quote",     pb: pbForMode(r => r.mode === "quote") },
    { label: "Code",      pb: pbForMode(r => r.mode === "code") },
    { label: "Ghost",     pb: pbForMode(r => r.mode === "ghost") }
  ];

  const last15 = runs.slice(-15).reverse();

  return (
    <div className="screen dashboard">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}><Icon name="back" size={16}/> Home</button>
        <h1 className="display">Progress</h1>
        <div/>
      </header>

      <div className="kpis">
        <div className="kpi"><div className="kpi-value">{best}</div><div className="kpi-label">Best WPM</div></div>
        <div className="kpi"><div className="kpi-value">{avgAcc.toFixed(1)}%</div><div className="kpi-label">Avg Accuracy</div></div>
        <div className="kpi"><div className="kpi-value">{runs.length}</div><div className="kpi-label">Total Runs</div></div>
        <div className="kpi"><div className="kpi-value">{Math.round(totalTime)}s</div><div className="kpi-label">Total Typed</div></div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h3>WPM Trend</h3>
          <TrendChart values={runs.map(r => r.wpm)} annotateAvg color="#FF5F8A"/>
        </section>

        <section className="panel">
          <h3>Accuracy Trend</h3>
          <TrendChart values={runs.map(r => r.accuracy)} color="#4FB8E0"/>
        </section>

        <section className="panel">
          <h3>Personal Best per Mode</h3>
          <ul className="mode-pbs">
            {modeRows.map(m => (
              <li key={m.label}><span>{m.label}</span><b>{m.pb == null ? <span className="dim">—not yet—</span> : `${m.pb} wpm`}</b></li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h3>Key Heatmap</h3>
          <KeyHeatmap keyMisses={player.keyMisses}/>
          <div className="dim small">Hover a key to see miss count</div>
        </section>

        <section className="panel wide">
          <h3>Achievements</h3>
          <div className="ach-grid">
            {ACHIEVEMENTS.map(a => {
              const unlocked = !!player.unlocked[a.id];
              return (
                <div key={a.id} className={"ach " + (unlocked ? "on" : "off")} title={a.desc}>
                  <div className="ach-icon">{a.icon}</div>
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                  {!unlocked && <Icon name="lock" size={14}/>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel wide">
          <h3>Recent Runs</h3>
          {last15.length === 0 ? <div className="dim">No runs yet</div> : (
            <table className="runs-table">
              <thead><tr><th>When</th><th>Mode</th><th>WPM</th><th>Accuracy</th><th>Duration</th></tr></thead>
              <tbody>
                {last15.map((r, i) => (
                  <tr key={i}>
                    <td>{relTime(r.timestamp)}</td>
                    <td>{modeLabel(r.mode)}</td>
                    <td><b>{r.wpm}</b></td>
                    <td>{r.accuracy}%</td>
                    <td>{r.duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};
window.KQ_DashboardScreen = DashboardScreen;
