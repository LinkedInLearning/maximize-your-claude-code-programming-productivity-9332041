// screen-settings.jsx
const SettingsScreen = ({ player, setState, onBack, onSwitch }) => {
  const { useState } = React;
  const { Toggle, Segmented, Modal } = window.KQ_UI;
  const Icon = window.KQ_Icon;
  const [confirmReset, setConfirmReset] = useState(false);

  const update = (key, value) => {
    setState(s => window.KQ_Storage.withPlayer(s, player.id, p => ({ ...p, settings: { ...p.settings, [key]: value } })));
  };

  const resetStats = () => {
    setState(s => window.KQ_Storage.withPlayer(s, player.id, p => ({ ...p, runs: [], keyMisses: {}, unlocked: {} })));
    setConfirmReset(false);
  };

  const s = player.settings;

  return (
    <div className="screen settings">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}><Icon name="back" size={16}/> Home</button>
        <h1 className="display">Settings</h1>
        <div/>
      </header>

      <div className="settings-grid">
        <section className="panel">
          <h3>Feedback</h3>
          <Toggle label="Sound effects" value={s.sfx} onChange={v => update("sfx", v)}/>
          <Toggle label="Combo counter" value={s.comboVisible} onChange={v => update("comboVisible", v)}/>
          <Toggle label="Confetti" value={s.confetti} onChange={v => update("confetti", v)}/>
        </section>
        <section className="panel">
          <h3>Input</h3>
          <Toggle label="Strict mode (block past errors)" value={s.strict} onChange={v => update("strict", v)}/>
        </section>
        <section className="panel">
          <h3>Appearance</h3>
          <Segmented label="Text size" value={s.textSize} onChange={v => update("textSize", v)}
            options={[{ label: "S", value: "S" }, { label: "M", value: "M" }, { label: "L", value: "L" }]}/>
          <Segmented label="Cursor" value={s.cursor} onChange={v => update("cursor", v)}
            options={[{ label: "Bar", value: "bar" }, { label: "Block", value: "block" }, { label: "Underline", value: "underline" }]}/>
        </section>
        <section className="panel">
          <h3>Profile</h3>
          <button className="btn ghost" onClick={onSwitch}>Switch player</button>
          <button className="btn danger" onClick={() => setConfirmReset(true)}>Reset stats</button>
        </section>
      </div>

      <footer className="version-footer">KeyQuest v1.0.0 · localStorage key <code>keyquest.v1</code></footer>

      {confirmReset && (
        <Modal title="Reset stats?"
          onClose={() => setConfirmReset(false)}
          actions={<>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn danger" onClick={resetStats}>Reset</button>
          </>}>
          <p>This clears all runs, the key heatmap, and achievement unlocks for <b>{player.name}</b>. The profile itself is preserved.</p>
        </Modal>
      )}
    </div>
  );
};
window.KQ_SettingsScreen = SettingsScreen;
