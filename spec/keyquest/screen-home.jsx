// screen-home.jsx
const HomeScreen = ({ player, onStart, onOpenDashboard, onOpenSettings, onSwitch }) => {
  const { useState } = React;
  const { relTime, modeLabel } = window.KQ_UI;
  const Icon = window.KQ_Icon;
  const [showWordCount, setShowWordCount] = useState(false);
  const best = player.runs.length ? Math.max(...player.runs.map(r => r.wpm)) : 0;
  const last3 = player.runs.slice(-3).reverse();
  const hasPB = player.runs.length > 0;

  return (
    <div className="screen home">
      <header className="topbar">
        <button className="topbar-id" onClick={onSwitch}>
          <span className="avatar-sm">{player.avatar}</span>
          <span>{player.name}</span>
          <span className="dim">switch</span>
        </button>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={onOpenDashboard}><Icon name="chart" size={16}/> Progress</button>
          <button className="btn ghost" onClick={onOpenSettings}><Icon name="settings" size={16}/> Settings</button>
        </div>
      </header>

      <div className="home-main">
        <section className="modes">
          <h2 className="display">Choose a Mode</h2>
          <div className="mode-grid">
            <div className="mode-card" onClick={() => setShowWordCount(s => !s)}>
              <div className="mode-icon"><Icon name="type" size={28}/></div>
              <div className="mode-name">Words</div>
              <div className="mode-sub">Common English</div>
              {showWordCount && (
                <div className="word-count-row" onClick={e => e.stopPropagation()}>
                  {[25, 50, 100].map(n => (
                    <button key={n} className="btn primary sm" onClick={() => onStart({ mode: "words", count: n })}>{n}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="mode-card" onClick={() => onStart({ mode: "quote" })}>
              <div className="mode-icon"><Icon name="quote" size={28}/></div>
              <div className="mode-name">Quote</div>
              <div className="mode-sub">Curated quotations</div>
            </div>
            <div className="mode-card" onClick={() => onStart({ mode: "code" })}>
              <div className="mode-icon"><Icon name="code" size={28}/></div>
              <div className="mode-name">Code</div>
              <div className="mode-sub">Symbols + indentation</div>
            </div>
            <div className="mode-card ghost" onClick={() => onStart({ mode: "ghost" })}>
              <div className="mode-icon"><Icon name="ghost" size={28}/></div>
              <div className="mode-name">Ghost Race</div>
              <div className="mode-sub">Beat 95% of your best</div>
            </div>
          </div>
        </section>

        <aside className="side">
          <div className="side-card">
            <div className="side-label">Best WPM</div>
            <div className="side-best">{best}</div>
          </div>
          <div className="side-card">
            <div className="side-label">Last Runs</div>
            {last3.length === 0 && <div className="dim">No runs yet — pick a mode →</div>}
            {last3.map((r, i) => (
              <div key={i} className="run-row">
                <span className="run-mode">{modeLabel(r.mode)}</span>
                <span className="run-when">{relTime(r.timestamp)}</span>
                <span className="run-wpm"><b>{r.wpm}</b> wpm</span>
                <span className="run-acc">{r.accuracy}%</span>
              </div>
            ))}
          </div>
          {hasPB && (
            <div className="side-card ghost-callout">
              <Icon name="ghost" size={20}/>
              <div>
                <div className="callout-title">Ghost is waiting</div>
                <div className="callout-sub">Beat 95% of your best</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
window.KQ_HomeScreen = HomeScreen;
