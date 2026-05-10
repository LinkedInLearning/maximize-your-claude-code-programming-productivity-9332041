// Settings screen

const Settings = ({ player, settings, onChange, onResetStats, onSwitchPlayer }) => {
  return (
    <div className="center-stack" style={{ padding: "12px 0 60px", maxWidth: 800 }}>
      <div className="eyebrow">Player {player.name}</div>
      <h1 className="display" style={{ fontSize: 48, marginBottom: 22 }}>Settings</h1>

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h3 className="section">Game feel</h3>

        <SettingRow label="Sound effects" desc="Play arcade-style hits and pings">
          <Toggle on={settings.sfx} onChange={v => onChange({ sfx: v })}/>
        </SettingRow>

        <SettingRow label="Combo counter" desc="Show streaks while typing">
          <Toggle on={settings.combo} onChange={v => onChange({ combo: v })}/>
        </SettingRow>

        <SettingRow label="Confetti on records" desc="Celebrate personal bests">
          <Toggle on={settings.confetti} onChange={v => onChange({ confetti: v })}/>
        </SettingRow>

        <SettingRow label="Strict mode" desc="Force backspace to fix every typo before continuing">
          <Toggle on={settings.strict} onChange={v => onChange({ strict: v })}/>
        </SettingRow>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h3 className="section">Display</h3>

        <SettingRow label="Text size" desc="Size of typing characters">
          <Segmented value={settings.textSize} onChange={v => onChange({ textSize: v })}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}/>
        </SettingRow>

        <SettingRow label="Cursor style" desc="What guides your typing">
          <Segmented value={settings.cursor} onChange={v => onChange({ cursor: v })}
            options={[
              { value: "bar", label: "Bar" },
              { value: "block", label: "Block" },
              { value: "underline", label: "Underline" },
            ]}/>
        </SettingRow>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h3 className="section">Profile</h3>
        <SettingRow label="Switch player" desc={`Currently playing as ${player.name}`}>
          <button className="btn ghost sm" onClick={onSwitchPlayer}>
            <Icon name="users" size={14}/> Player select
          </button>
        </SettingRow>

        <SettingRow label="Reset stats" desc="Clear runs, badges and heatmap for this player">
          <button className="btn sm" style={{ background: "var(--tomato)" }}
            onClick={() => { if (confirm(`Wipe all stats for ${player.name}? This can't be undone.`)) onResetStats(); }}>
            Reset
          </button>
        </SettingRow>
      </div>

      <div style={{
        textAlign: "center", color: "var(--ink-soft)",
        fontSize: 13, marginTop: 24,
      }}>
        KeyQuest v1.0 — keep your fingers warm 🌶️
      </div>
    </div>
  );
};

const SettingRow = ({ label, desc, children }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, padding: "14px 0", borderBottom: "2px dashed var(--bg-2)",
  }}>
    <div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>{desc}</div>
    </div>
    <div>{children}</div>
  </div>
);

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} style={{
    width: 56, height: 32, borderRadius: 999,
    background: on ? "var(--mint)" : "var(--bg-2)",
    border: "none", position: "relative",
    cursor: "pointer", padding: 4,
    transition: "background 200ms",
  }}>
    <span style={{
      position: "absolute", top: 4, left: on ? 28 : 4,
      width: 24, height: 24, borderRadius: "50%",
      background: "white", boxShadow: "var(--shadow-sm)",
      transition: "left 160ms",
    }}/>
  </button>
);

const Segmented = ({ value, onChange, options }) => (
  <div style={{
    display: "inline-flex", background: "var(--bg-2)",
    borderRadius: 999, padding: 4,
  }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: "8px 14px", borderRadius: 999, border: "none",
        background: value === o.value ? "var(--ink)" : "transparent",
        color: value === o.value ? "white" : "var(--ink-soft)",
        fontWeight: 600, fontSize: 13, cursor: "pointer",
      }}>{o.label}</button>
    ))}
  </div>
);

window.Settings = Settings;
