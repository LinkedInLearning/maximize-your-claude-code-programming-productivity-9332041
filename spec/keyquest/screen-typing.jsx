// screen-typing.jsx
const TypingScreen = ({ player, config, onFinish, onAbort }) => {
  const { useState, useEffect, useRef, useMemo } = React;
  const { WORDS, QUOTES, CODE_SAMPLES } = window.KQ_DATA;
  const { initEngine, applyKey, applyBackspace, calcWPM, calcAccuracy, ghostCharsAt, buildRun } = window.KQ_Engine;

  const best = player.runs.length ? Math.max(...player.runs.map(r => r.wpm)) : 0;
  const settings = player.settings;

  const target = useMemo(() => {
    if (config.mode === "words") {
      const n = config.count || 25;
      const picks = [];
      for (let i = 0; i < n; i++) picks.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
      return picks.join(" ");
    }
    if (config.mode === "quote") {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      return q.text + "  — " + q.author;
    }
    if (config.mode === "code") {
      const c = CODE_SAMPLES[Math.floor(Math.random() * CODE_SAMPLES.length)];
      return c.text;
    }
    if (config.mode === "ghost") {
      const n = 50;
      const picks = [];
      for (let i = 0; i < n; i++) picks.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
      return picks.join(" ");
    }
    return "";
  }, [config.mode, config.count]);

  const [engine, setEngine] = useState(() => initEngine(target));
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);

  // tick at 100ms while running
  useEffect(() => {
    if (!engine.startedAt || engine.finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [engine.startedAt, engine.finishedAt]);

  // also re-sync `now` on every keystroke so the ghost marker's position
  // updates within one animation frame of the player's input
  useEffect(() => {
    if (engine.startedAt && !engine.finishedAt) setNow(Date.now());
  }, [engine.totalKeystrokes]);

  // keyboard handler
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onAbort(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") { e.preventDefault(); setEngine(s => applyBackspace(s, settings.strict)); return; }
      if (e.key === "Enter") { e.preventDefault(); setEngine(s => applyKey(s, "\n", settings.strict)); return; }
      if (e.key === "Tab") { e.preventDefault(); setEngine(s => applyKey(s, "  ", settings.strict)); return; }
      if (e.key.length === 1) {
        e.preventDefault();
        setEngine(s => applyKey(s, e.key, settings.strict));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings.strict, onAbort]);

  const [ghostWin, setGhostWin] = useState(false);

  // detect finish
  useEffect(() => {
    if (engine.finishedAt && !finishedRef.current) {
      finishedRef.current = true;
      const run = buildRun(engine, config.mode, best);
      if (run.mode === "ghost" && run.beatGhost) {
        setGhostWin(true);
        setTimeout(() => onFinish(run, config), 1200);
      } else {
        onFinish(run, config);
      }
    }
  }, [engine.finishedAt]);

  const elapsedMs = engine.startedAt ? (engine.finishedAt || now) - engine.startedAt : 0;
  const wpm = Math.round(calcWPM(engine.correctChars, elapsedMs));
  const accuracy = Math.round(calcAccuracy(engine.correctChars, engine.totalKeystrokes) * 10) / 10;
  const elapsedSec = Math.floor(elapsedMs / 1000);

  const idx = engine.typed.length;
  const errors = new Set(engine.errors);
  const isCode = config.mode === "code";

  const renderedChars = useMemo(() => {
    const out = [];
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      let cls = "char untyped";
      if (i < idx) cls = errors.has(i) ? "char wrong" : "char correct";
      if (i === idx) cls += " cursor cursor-" + settings.cursor;
      if (ch === "\n") {
        out.push(<span key={i} className={cls}>↵<br/></span>);
      } else if (ch === " ") {
        out.push(<span key={i} className={cls + " space"}> </span>);
      } else {
        out.push(<span key={i} className={cls}>{ch}</span>);
      }
    }
    return out;
  }, [target, idx, engine.errors.length, settings.cursor]);

  // ghost progress
  const ghostChars = config.mode === "ghost" && best > 0 ? Math.min(target.length, ghostCharsAt(best, elapsedMs)) : 0;
  const playerPct = (idx / target.length) * 100;
  const ghostPct = (ghostChars / target.length) * 100;

  const comboClass = engine.combo >= 24 ? "combo-c3" : engine.combo >= 16 ? "combo-c2" : engine.combo >= 8 ? "combo-c1" : "";
  const showCombo = settings.comboVisible && engine.combo >= 8;

  return (
    <div className={"screen typing text-" + settings.textSize}>
      <header className="typing-top">
        <button className="btn ghost sm" onClick={onAbort}><span>Esc</span> Quit</button>
        <div className="live-stats">
          <span><b>{wpm}</b> wpm</span>
          <span><b>{accuracy}</b>%</span>
          <span><b>{elapsedSec}</b>s</span>
        </div>
        {showCombo && (
          <div className={"combo " + comboClass} key={engine.combo}>×{engine.combo} combo</div>
        )}
      </header>

      {config.mode === "ghost" && best > 0 && (
        <div className="ghost-bar">
          <div className="ghost-track">
            <div className="ghost-marker ghost" style={{ left: ghostPct + "%" }} title="Ghost (95% of best)">👻</div>
            <div className="ghost-marker player" style={{ left: playerPct + "%" }} title="You">▲</div>
          </div>
          <div className="ghost-target">Target: {Math.round(best * 0.95)} wpm</div>
        </div>
      )}

      <div className={"target " + (isCode ? "is-code" : "")}>
        {renderedChars}
      </div>

      <div className="hint dim">Type the passage above. <kbd>Esc</kbd> to quit.</div>

      {ghostWin && (
        <div className="ghost-win-overlay" role="status" aria-live="polite">
          <div className="ghost-win-burst">
            <span className="gw gw1">👻</span>
            <span className="gw gw2">🎉</span>
            <span className="gw gw3">👻</span>
            <span className="gw gw4">✨</span>
            <span className="gw gw5">👻</span>
          </div>
          <div className="ghost-win-label">You beat the ghost!</div>
        </div>
      )}
    </div>
  );
};
window.KQ_TypingScreen = TypingScreen;
