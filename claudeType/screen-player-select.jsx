// Player Select — arcade roster

const PlayerSelect = ({ players, currentPlayerId, onPick, onCreate, onDelete, onClose }) => {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [glyphIdx, setGlyphIdx] = React.useState(0);
  const [palIdx, setPalIdx] = React.useState(0);

  const submit = () => {
    const n = name.trim().toUpperCase().slice(0, 8);
    if (!n) return;
    onCreate({
      name: n,
      avatar: { glyph: AVATAR_GLYPHS[glyphIdx], palette: AVATAR_PALETTES[palIdx] }
    });
    setCreating(false); setName("");
  };

  return (
    <div style={{ padding: "20px 0 60px" }}>
      <div className="center-stack" style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="eyebrow">Insert coin</div>
        <h1 className="display" style={{ fontSize: 64 }}>SELECT PLAYER</h1>
        <p className="lead">Each player has their own stats, badges and ghost runs.</p>
      </div>

      <div className="center-stack" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 20,
      }}>
        {players.map(p => {
          const isCurrent = p.id === currentPlayerId;
          return (
            <div key={p.id} className="card" style={{
              textAlign: "center",
              padding: "26px 18px 22px",
              cursor: "pointer",
              position: "relative",
              border: isCurrent ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "transform 120ms",
            }}
              onClick={() => onPick(p.id)}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              {isCurrent && (
                <div className="pill primary" style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  fontSize: 11, padding: "4px 10px",
                }}>PLAYING</div>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Avatar avatar={p.avatar} size={84} halo />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 6 }}>{p.name}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
                <span><b style={{ color: "var(--ink)" }}>{p.stats.bestWpm}</b> wpm</span>
                <span><b style={{ color: "var(--ink)" }}>{p.stats.runs.length}</b> runs</span>
              </div>
              <button className="btn primary sm" style={{ width: "100%" }}>
                <Icon name="play" size={14} />
                {isCurrent ? "Continue" : "Play as " + p.name}
              </button>
              {players.length > 1 && (
                <button className="icon-btn" style={{
                  position: "absolute", top: 8, right: 8, width: 28, height: 28,
                  background: "transparent", boxShadow: "none", color: "var(--ink-faint)"
                }}
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${p.name}?`)) onDelete(p.id); }}
                  title="Delete player">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          );
        })}

        {!creating && (
          <button className="card" onClick={() => setCreating(true)} style={{
            border: "3px dashed var(--ink-faint)",
            background: "transparent",
            display: "grid", placeItems: "center",
            cursor: "pointer", padding: 30, color: "var(--ink-soft)",
            fontWeight: 700, fontSize: 16, gap: 8,
            minHeight: 220,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--bg-2)", display: "grid", placeItems: "center"
            }}>
              <Icon name="plus" size={28} />
            </div>
            New Player
          </button>
        )}

        {creating && (
          <div className="card pop" style={{
            gridColumn: "span 2", padding: 24,
            border: "3px solid var(--accent)",
          }}>
            <div className="eyebrow">New player</div>
            <h3 className="section">Pick your look</h3>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <Avatar avatar={{ glyph: AVATAR_GLYPHS[glyphIdx], palette: AVATAR_PALETTES[palIdx] }} size={80} halo />
              <input
                value={name}
                onChange={e => setName(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="NAME"
                maxLength={8}
                autoFocus
                style={{
                  flex: 1, fontFamily: "var(--font-display)", fontSize: 32,
                  border: "none", outline: "none", background: "var(--bg)",
                  borderRadius: 14, padding: "12px 18px", letterSpacing: 1,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>Color</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {AVATAR_PALETTES.map((p, i) => (
                  <button key={i} onClick={() => setPalIdx(i)} style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `radial-gradient(circle at 30% 30%, ${p.glow}, ${p.bg} 70%)`,
                    border: i === palIdx ? "3px solid var(--ink)" : "3px solid transparent",
                    cursor: "pointer", padding: 0,
                  }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>Glyph</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {AVATAR_GLYPHS.map((g, i) => (
                  <button key={i} onClick={() => setGlyphIdx(i)} style={{
                    width: 36, height: 36, borderRadius: 10,
                    fontFamily: "var(--font-display)", fontSize: 18,
                    background: i === glyphIdx ? "var(--ink)" : "var(--bg)",
                    color: i === glyphIdx ? "white" : "var(--ink)",
                    border: "none", cursor: "pointer",
                  }}>{g}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn primary" onClick={submit} disabled={!name.trim()}>
                <Icon name="check" size={16} /> Create
              </button>
              <button className="btn ghost" onClick={() => { setCreating(false); setName(""); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {currentPlayerId && onClose && (
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button className="btn ghost" onClick={onClose}>
            <Icon name="back" size={14} /> Back to game
          </button>
        </div>
      )}
    </div>
  );
};

window.PlayerSelect = PlayerSelect;
