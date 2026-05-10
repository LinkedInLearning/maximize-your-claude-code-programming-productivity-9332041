// Results screen

const Results = ({ player, run, isPersonalBest, prevBest, onPlayAgain, onHome, onDashboard, newAchievements }) => {
  const cardRef = React.useRef(null);
  return (
    <div className="center-stack" style={{ padding: "12px 0 60px", maxWidth: 1000 }}>
      {(isPersonalBest || newAchievements.length > 0) && (window.__tweaks?.confetti ?? true) && <Confetti count={isPersonalBest ? 100 : 60} />}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <div className="card pop" ref={cardRef} style={{
          padding: 36,
          background: isPersonalBest
            ? "linear-gradient(135deg, #FFE099, #FFCC2E)"
            : "var(--surface)",
          color: isPersonalBest ? "var(--ink)" : "inherit",
          position: "relative",
          overflow: "hidden",
        }}>
          {isPersonalBest && (
            <div style={{
              position: "absolute", top: 18, right: 18,
              fontFamily: "var(--font-display)",
              fontSize: 14, padding: "6px 14px",
              borderRadius: 999,
              background: "var(--ink)", color: "white",
            }}>
              ★ NEW BEST ★
            </div>
          )}
          <div className="eyebrow" style={{ color: isPersonalBest ? "var(--primary-deep)" : "var(--primary)" }}>
            {run.modeLabel} · {fmtTime(run.duration)}
          </div>
          <h1 className="display" style={{ fontSize: 64, marginBottom: 0 }}>
            {isPersonalBest ? "PERSONAL BEST!" : run.wpm >= 60 ? "NICE RUN!" : run.accuracy >= 95 ? "CLEAN!" : "GOOD GAME!"}
          </h1>
          <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>
            {isPersonalBest
              ? `You crushed your old best by ${run.wpm - (prevBest || 0)} WPM. 🎉`
              : `Player ${player.name} clocked in.`}
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14, marginTop: 26,
          }}>
            <BigStat label="WPM" value={run.wpm} color="var(--primary)" big />
            <BigStat label="ACCURACY" value={run.accuracy + "%"} color="var(--secondary)" />
            <BigStat label="TIME" value={fmtTime(run.duration)} color="var(--lavender)" />
          </div>

          {run.beatGhost && (
            <div style={{
              marginTop: 22, padding: "14px 18px",
              background: "rgba(255,255,255,0.55)",
              borderRadius: 16,
              display: "flex", alignItems: "center", gap: 12,
              fontWeight: 600,
            }}>
              <span style={{ fontSize: 28 }} className="bounce">👻</span>
              You beat your ghost!
            </div>
          )}

          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn primary lg" onClick={onPlayAgain}>
              <Icon name="refresh" size={18} /> Run it again
            </button>
            <button className="btn ghost lg" onClick={onHome}>
              <Icon name="back" size={16} /> Modes
            </button>
            <button className="btn ghost lg" onClick={onDashboard}>
              <Icon name="chart" size={16} /> Progress
            </button>
          </div>
        </div>

        {/* Sidebar — achievements & breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {newAchievements.length > 0 && (
            <div className="card pop" style={{ padding: 22, background: "var(--ink)", color: "white" }}>
              <div className="eyebrow" style={{ color: "var(--accent)" }}>Unlocked!</div>
              {newAchievements.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 32 }} className="wiggle">{a.icon}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow">Breakdown</div>
            <h3 className="section">How it went</h3>
            <BreakdownRow label="Characters" value={run.target.length} />
            <BreakdownRow label="Errors" value={countErrorsForRun(run)} />
            <BreakdownRow label="Best ever" value={Math.max(player.stats.bestWpm, run.wpm) + " WPM"} />
            <BreakdownRow label="Run #" value={player.stats.runs.length + 1} />
          </div>

          <RunSparkline player={player} latest={run.wpm} />
        </div>
      </div>
    </div>
  );
};

const BigStat = ({ label, value, color, big }) => (
  <div style={{
    background: "rgba(255,255,255,0.55)",
    borderRadius: 18,
    padding: "16px 14px",
    textAlign: "center",
  }}>
    <div style={{
      fontFamily: "var(--font-display)",
      fontSize: big ? 64 : 44,
      color, lineHeight: 1,
    }}>{value}</div>
    <div className="stat-label" style={{ marginTop: 6 }}>{label}</div>
  </div>
);

const BreakdownRow = ({ label, value }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    padding: "10px 0", borderBottom: "2px dashed var(--bg-2)",
    fontSize: 15,
  }}>
    <span style={{ color: "var(--ink-soft)" }}>{label}</span>
    <b>{value}</b>
  </div>
);

const RunSparkline = ({ player, latest }) => {
  const last = player.stats.runs.slice(-12).map(r => r.wpm);
  const all = [...last, latest];
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="eyebrow">Trend</div>
      <h3 className="section">Last {all.length} runs</h3>
      <LineChart data={all} color="var(--primary)" height={120} label="trend" />
    </div>
  );
};

function countErrorsForRun(run) {
  let e = 0;
  for (let i = 0; i < run.typed.length; i++) {
    if (run.typed[i] !== run.target[i]) e++;
  }
  return e;
}

window.Results = Results;
