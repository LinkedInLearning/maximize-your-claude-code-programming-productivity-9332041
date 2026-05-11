// screen-player-select.jsx
const PlayerSelectScreen = ({ state, setState, onSelect }) => {
  const { useState } = React;
  const { Modal } = window.KQ_UI;
  const { AVATARS, PALETTES } = window.KQ_DATA;
  const Icon = window.KQ_Icon;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [palette, setPalette] = useState(PALETTES[0].id);
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState("");

  const submit = () => {
    const n = name.trim();
    if (n.length < 1 || n.length > 8) { setError("Name must be 1–8 characters"); return; }
    if (state.players.some(p => p.name.toLowerCase() === n.toLowerCase())) { setError("Name already taken"); return; }
    const p = window.KQ_Storage.newPlayer({ name: n, avatar, palette });
    setState(s => ({ ...s, players: [...s.players, p], activePlayerId: p.id }));
    onSelect(p.id);
  };

  const remove = (id) => {
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== id), activePlayerId: s.activePlayerId === id ? null : s.activePlayerId }));
    setConfirmDel(null);
  };

  const bestFor = (p) => p.runs.length ? Math.max(...p.runs.map(r => r.wpm)) : 0;

  return (
    <div className="screen player-select">
      <div className="ps-header">
        <h1 className="display">KeyQuest</h1>
        <div className="insert-coin">▸ INSERT COIN ◂</div>
        <p className="ps-sub">Pick a player to begin</p>
      </div>

      <div className="player-grid">
        {state.players.map(p => {
          const pal = PALETTES.find(x => x.id === p.palette) || PALETTES[0];
          return (
            <div key={p.id} className="player-tile" style={{ borderColor: pal.primary }}>
              <button className="player-tile-main" onClick={() => onSelect(p.id)} style={{ background: pal.bg }}>
                <div className="avatar-big">{p.avatar}</div>
                <div className="player-name">{p.name}</div>
                <div className="player-stats">
                  <span>Best <b>{bestFor(p)}</b> wpm</span>
                  <span>{p.runs.length} run{p.runs.length === 1 ? "" : "s"}</span>
                </div>
              </button>
              <button className="player-del" aria-label="Delete profile" onClick={() => setConfirmDel(p)}><Icon name="trash" size={16}/></button>
            </div>
          );
        })}

        {state.players.length < 8 && (
          <button className="player-tile new" onClick={() => setCreating(true)}>
            <Icon name="plus" size={36}/>
            <div>New Player</div>
          </button>
        )}
      </div>

      {creating && (
        <Modal title="Create a Player"
          onClose={() => setCreating(false)}
          actions={<>
            <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn primary" onClick={submit}>Create</button>
          </>}>
          <label className="field">
            <span>Name (1–8 chars)</span>
            <input autoFocus value={name} maxLength={8} onChange={e => { setName(e.target.value); setError(""); }}/>
          </label>
          <div className="field">
            <span>Avatar</span>
            <div className="avatar-grid">
              {AVATARS.map((a, i) => (
                <button key={i} type="button" className={"avatar-pick " + (avatar === a ? "sel" : "")} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Palette</span>
            <div className="palette-grid">
              {PALETTES.map(p => (
                <button key={p.id} type="button" className={"pal-pick " + (palette === p.id ? "sel" : "")} style={{ background: p.primary }} onClick={() => setPalette(p.id)} aria-label={p.id}/>
              ))}
            </div>
          </div>
          {error && <div className="err">{error}</div>}
        </Modal>
      )}

      {confirmDel && (
        <Modal title={`Delete ${confirmDel.name}?`}
          onClose={() => setConfirmDel(null)}
          actions={<>
            <button className="btn ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="btn danger" onClick={() => remove(confirmDel.id)}>Delete</button>
          </>}>
          <p>All run history for this profile will be removed from this browser. This cannot be undone.</p>
        </Modal>
      )}

      {state.corruptRecovered && (
        <div className="banner warn">Saved data couldn't be read and was reset. Sorry about that — start fresh.</div>
      )}
    </div>
  );
};
window.KQ_PlayerSelectScreen = PlayerSelectScreen;
