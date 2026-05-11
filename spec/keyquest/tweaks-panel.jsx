// tweaks-panel.jsx — dev overlay, not persisted
const TweaksPanel = () => {
  const { useState, useEffect } = React;
  const [open, setOpen] = useState(false);
  const [font, setFont] = useState("Nunito");
  const [weight, setWeight] = useState(700);
  const [accent, setAccent] = useState("#FF5F8A");
  const [combo, setCombo] = useState("normal");
  const [shake, setShake] = useState(true);
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--font-ui", font + ", system-ui, sans-serif");
    r.setProperty("--display-weight", String(weight));
    r.setProperty("--c-accent", accent);
    document.body.dataset.combo = combo;
    document.body.dataset.shake = String(shake);
    document.body.dataset.confetti = String(confetti);
  }, [font, weight, accent, combo, shake, confetti]);

  if (!open) {
    return <button className="tweaks-fab" onClick={() => setOpen(true)} title="Dev tweaks">⚙</button>;
  }
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>Tweaks (dev)</span>
        <button className="tweaks-close" onClick={() => setOpen(false)}>×</button>
      </div>
      <label>Font
        <select value={font} onChange={e => setFont(e.target.value)}>
          <option>Nunito</option><option>Fredoka</option><option>Quicksand</option><option>Bagel Fat One</option>
        </select>
      </label>
      <label>Weight {weight}
        <input type="range" min={400} max={900} step={100} value={weight} onChange={e => setWeight(+e.target.value)}/>
      </label>
      <label>Accent
        <input type="color" value={accent} onChange={e => setAccent(e.target.value)}/>
      </label>
      <label>Combo
        <select value={combo} onChange={e => setCombo(e.target.value)}>
          <option value="normal">normal</option><option value="loud">loud</option><option value="off">off</option>
        </select>
      </label>
      <label><input type="checkbox" checked={shake} onChange={e => setShake(e.target.checked)}/> Shake on error</label>
      <label><input type="checkbox" checked={confetti} onChange={e => setConfetti(e.target.checked)}/> Confetti</label>
      <div className="tweaks-note">Tweaks are session-only — reload to reset.</div>
    </div>
  );
};
window.KQ_TweaksPanel = TweaksPanel;
