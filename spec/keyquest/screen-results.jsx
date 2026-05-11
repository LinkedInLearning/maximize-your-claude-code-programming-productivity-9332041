// screen-results.jsx
const HEADLINES = ["NICE RUN!", "CLEAN!", "GOOD GAME!", "KEEP GOING!", "SMOOTH!", "ON FIRE!"];

const ResultsScreen = ({ player, run, config, newlyUnlocked, isPB, onAgain, onModes, onProgress }) => {
  const { useMemo } = React;
  const { Sparkline, Confetti, modeLabel } = window.KQ_UI;
  const Icon = window.KQ_Icon;
  const last12 = player.runs.slice(-13).map(r => r.wpm); // current already pushed
  const headline = useMemo(() => HEADLINES[Math.floor(Math.random() * HEADLINES.length)], []);
  const lifetimeBest = Math.max(...player.runs.map(r => r.wpm));
  const totalChars = run.duration > 0 ? Math.round((run.wpm * 5) * (run.duration / 60)) : 0;
  const errorCount = Object.values(run.keyMisses).reduce((a, b) => a + b, 0);
  const showConfetti = (isPB || newlyUnlocked.length > 0) && player.settings.confetti;
  const beatGhost = run.mode === "ghost" && run.beatGhost;

  return (
    <div className={"screen results " + (isPB ? "pb" : "")}>
      <Confetti enabled={showConfetti}/>
      <header className="results-headline">
        {isPB ? (
          <h1 className="display gold bounce">★ PERSONAL BEST! ★</h1>
        ) : (
          <h1 className="display">{headline}</h1>
        )}
        <div className="dim">{modeLabel(run.mode)}{config.count ? ` · ${config.count}` : ""}</div>
      </header>

      <div className="results-main">
        <div className="big-stats">
          <div className="stat-box big"><div className="stat-value">{run.wpm}</div><div className="stat-label">WPM</div></div>
          <div className="stat-box big"><div className="stat-value">{run.accuracy}%</div><div className="stat-label">Accuracy</div></div>
          <div className="stat-box big"><div className="stat-value">{run.duration}s</div><div className="stat-label">Duration</div></div>
        </div>

        {beatGhost && (
          <div className="ghost-badge wiggle"><Icon name="ghost" size={20}/> Beat your ghost!</div>
        )}

        <aside className="results-side">
          <div className="side-row"><span>Chars typed</span><b>{totalChars}</b></div>
          <div className="side-row"><span>Errors</span><b>{errorCount}</b></div>
          <div className="side-row"><span>Lifetime best</span><b>{lifetimeBest} wpm</b></div>
          <div className="side-row"><span>Run #</span><b>{player.runs.length}</b></div>
          <div className="side-spark">
            <div className="dim">Last 12 runs</div>
            <Sparkline values={last12}/>
          </div>
        </aside>

        {newlyUnlocked.length > 0 && (
          <div className="unlocks">
            <div className="dim">New achievements</div>
            <div className="unlock-list">
              {newlyUnlocked.map(a => (
                <div key={a.id} className="unlock pop">
                  <div className="ach-icon">{a.icon}</div>
                  <div>
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc dim">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="results-actions">
        <button className="btn primary" onClick={onAgain}><Icon name="play" size={16}/> Run it again</button>
        <button className="btn ghost" onClick={onModes}>Modes</button>
        <button className="btn ghost" onClick={onProgress}><Icon name="chart" size={16}/> Progress</button>
      </div>
    </div>
  );
};
window.KQ_ResultsScreen = ResultsScreen;
