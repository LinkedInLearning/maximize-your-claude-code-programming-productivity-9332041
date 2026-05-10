// Home / Mode picker

const Home = ({ player, onStart, onNav }) => {
  const [mode, setMode] = React.useState("words");
  const [variant, setVariant] = React.useState(25);

  const modes = [
  { id: "words", icon: "type", title: "Words", desc: "Race against random words", color: "var(--primary)" },
  { id: "quote", icon: "quote", title: "Quote", desc: "Type famous lines", color: "var(--secondary)" },
  { id: "code", icon: "code", title: "Code", desc: "Programming snippets", color: "var(--lavender)" },
  { id: "race", icon: "ghost", title: "Ghost Race", desc: "Beat your last best", color: "var(--accent)" }];

  const variants = {
    words: [25, 50, 100]
  };

  const start = () => {
    onStart({ mode, variant: mode === "words" ? variant : null });
  };

  const last3 = [...player.stats.runs].slice(-3).reverse();

  return (
    <div className="center-stack" style={{ padding: "12px 0 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <div>
          <div className="eyebrow">Player {player.name}</div>
          <h1 className="display" style={{ fontFamily: "Nunito" }}>Pick your mode.</h1>
          <p className="lead">Warm up your fingers. Best run today: <b style={{ color: "var(--ink)" }}>{player.stats.bestWpm} WPM</b>.</p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16, marginTop: 24
          }}>
            {modes.map((m) =>
            <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              textAlign: "left",
              padding: 22,
              borderRadius: 24,
              border: "3px solid " + (mode === m.id ? m.color : "transparent"),
              background: "var(--surface)",
              boxShadow: "var(--shadow-md)",
              cursor: "pointer",
              transition: "transform 120ms",
              position: "relative"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: m.color, color: "white",
                display: "grid", placeItems: "center",
                marginBottom: 14, boxShadow: "var(--shadow-sm)"
              }}>
                  <Icon name={m.icon} size={24} stroke={2.4} />
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 4 }}>{m.title}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>{m.desc}</div>
                {mode === m.id &&
              <div style={{
                position: "absolute", top: 14, right: 14,
                width: 22, height: 22, borderRadius: "50%",
                background: m.color, color: "white",
                display: "grid", placeItems: "center"
              }}>
                    <Icon name="check" size={12} stroke={3} />
                  </div>
              }
              </button>
            )}
          </div>

          {mode === "words" &&
          <div style={{ marginTop: 22 }}>
              <div className="stat-label" style={{ marginBottom: 8 }}>Length</div>
              <div style={{ display: "flex", gap: 10 }}>
                {variants.words.map((v) =>
              <button key={v} onClick={() => setVariant(v)} className="pill"
              style={{
                padding: "10px 20px", fontSize: 15, cursor: "pointer", border: "none",
                background: variant === v ? "var(--ink)" : "var(--surface)",
                color: variant === v ? "white" : "var(--ink)",
                boxShadow: variant === v ? "none" : "var(--shadow-sm)"
              }}>
                    {v} words
                  </button>
              )}
              </div>
            </div>
          }

          <div style={{ marginTop: 32 }}>
            <button className="btn primary lg" onClick={start} style={{ paddingLeft: 30, paddingRight: 30 }}>
              <Icon name="play" size={20} />
              Start Run
              <span className="pill" style={{
                background: "rgba(255,255,255,0.22)", color: "white", fontSize: 12,
                marginLeft: 6, padding: "4px 10px"
              }}>↵</span>
            </button>
          </div>
        </div>

        {/* Side card — last runs */}
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow">Recent</div>
          <h3 className="section">Last few runs</h3>
          {last3.length === 0 &&
          <div style={{ color: "var(--ink-soft)", padding: "20px 0" }}>No runs yet — start your first one!</div>
          }
          {last3.map((r) =>
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: "2px dashed var(--bg-2)"
          }}>
              <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--bg-2)", display: "grid", placeItems: "center",
              color: "var(--primary)"
            }}>
                <Icon name={iconForMode(r.mode)} size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.modeLabel}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{relTime(r.timestamp)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{r.wpm}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: 0.5 }}>{r.accuracy}% acc</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <button className="btn ghost sm" onClick={() => onNav("dashboard")} style={{ flex: 1 }}>
              <Icon name="chart" size={14} /> See progress
            </button>
          </div>

          <div style={{
            marginTop: 16,
            background: "var(--bg-2)",
            borderRadius: 18,
            padding: 16,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <div style={{ fontSize: 28 }} className="bounce">🏆</div>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>
              <b>{player.stats.bestWpm} WPM</b> personal best<br />
              <span style={{ color: "var(--ink-soft)" }}>Tap Race to challenge your ghost</span>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

function iconForMode(mode) {
  if (mode.startsWith("words-") || mode === "words") return "type";
  if (mode === "quote") return "quote";
  if (mode === "code") return "code";
  if (mode === "race") return "ghost";
  return "type";
}
function relTime(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

Object.assign(window, { Home, iconForMode, relTime });