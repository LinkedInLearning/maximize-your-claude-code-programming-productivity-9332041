// Typing screen — core engine

const TypingScreen = ({ player, config, ghost, onComplete, onAbort }) => {
  // Build target text
  const target = React.useMemo(() => buildTarget(config), [config]);
  const targetChars = React.useMemo(() => Array.from(target.text), [target]);

  const [typed, setTyped] = React.useState("");
  const [errors, setErrors] = React.useState(0);
  const [keyMisses, setKeyMisses] = React.useState({});
  const [startedAt, setStartedAt] = React.useState(null);
  const [now, setNow] = React.useState(Date.now());
  const [shake, setShake] = React.useState(0);
  const [combo, setCombo] = React.useState(0);
  const containerRef = React.useRef(null);
  const completedRef = React.useRef(false);

  // tick clock
  React.useEffect(() => {
    if (!startedAt || completedRef.current) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt]);

  // Focus container
  React.useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const finish = (finalTyped, finalErrors, finalMisses) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const elapsed = (Date.now() - startedAt) / 1000;
    const correctChars = countCorrect(finalTyped, target.text);
    const wpm = Math.round((correctChars / 5) / (elapsed / 60));
    const accuracy = Math.max(0, Math.round(((finalTyped.length - finalErrors) / Math.max(1, finalTyped.length)) * 100));
    onComplete({
      mode: config.mode === "words" ? `words-${config.variant}` : config.mode,
      modeLabel: config.mode === "words" ? `${config.variant} words` : labelForMode(config.mode),
      wpm,
      accuracy,
      duration: Math.round(elapsed),
      keyMisses: finalMisses,
      target: target.text,
      typed: finalTyped,
      beatGhost: ghost ? wpm > ghost.wpm : false,
    });
  };

  const onKey = (e) => {
    if (completedRef.current) return;
    if (e.key === "Escape") { onAbort(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    let key = e.key;
    if (key === "Backspace") {
      e.preventDefault();
      if (typed.length > 0) setTyped(typed.slice(0, -1));
      return;
    }
    if (key === "Enter") key = "\n";
    if (key.length !== 1 && key !== "\n") return;
    e.preventDefault();
    if (typed.length >= target.text.length) return;

    if (!startedAt) setStartedAt(Date.now());
    const expected = target.text[typed.length];
    let newErrors = errors;
    let newMisses = keyMisses;
    if (key !== expected) {
      newErrors = errors + 1;
      const k = expected.toLowerCase();
      if (k.match(/[a-z]/)) {
        newMisses = { ...keyMisses, [k]: (keyMisses[k] || 0) + 1 };
        setKeyMisses(newMisses);
      }
      setErrors(newErrors);
      setShake(s => s + 1);
      setCombo(0);
    } else {
      setCombo(c => c + 1);
    }
    const newTyped = typed + key;
    setTyped(newTyped);
    if (newTyped.length === target.text.length) {
      // Allow ending with mismatched chars too — count them as errors
      setTimeout(() => finish(newTyped, newErrors, newMisses), 50);
    }
  };

  // Live stats
  const elapsedSec = startedAt ? (now - startedAt) / 1000 : 0;
  const correctSoFar = countCorrect(typed, target.text);
  const liveWpm = elapsedSec > 0.5 ? Math.round((correctSoFar / 5) / (elapsedSec / 60)) : 0;
  const liveAcc = typed.length > 0 ? Math.max(0, Math.round(((typed.length - errors) / typed.length) * 100)) : 100;
  const progress = (typed.length / target.text.length) * 100;

  // Ghost progress (race mode)
  let ghostProgress = null;
  if (ghost && startedAt) {
    const ghostCharsPerSec = (ghost.wpm * 5) / 60;
    const ghostChars = Math.min(target.text.length, ghostCharsPerSec * elapsedSec);
    ghostProgress = (ghostChars / target.text.length) * 100;
  }

  return (
    <div style={{ padding: "20px 0 40px", outline: "none" }}
      tabIndex={0}
      ref={containerRef}
      onKeyDown={onKey}
      onClick={() => containerRef.current?.focus()}>
      <div className="center-stack" style={{ maxWidth: 1100 }}>

        {/* Top stats row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 18, gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="icon-btn" onClick={onAbort} title="Quit (Esc)">
              <Icon name="back" size={18} />
            </button>
            <div className="pill primary"><Icon name={iconForMode(config.mode)} size={14}/> {target.label}</div>
            {ghost && <div className="pill lavender"><Icon name="ghost" size={14}/> Ghost: {ghost.wpm} WPM</div>}
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <LiveStat label="WPM" value={liveWpm} color="var(--primary)" />
            <LiveStat label="ACC" value={liveAcc + "%"} color="var(--secondary)" />
            <LiveStat label="TIME" value={fmtTime(elapsedSec)} color="var(--lavender)" />
          </div>
        </div>

        {/* Progress bar with ghost */}
        <div style={{
          height: 14, background: "var(--surface)", borderRadius: 999,
          overflow: "hidden", boxShadow: "var(--shadow-sm)",
          position: "relative", marginBottom: 24,
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--primary), var(--accent))",
            transition: "width 80ms linear",
          }} />
          {ghostProgress != null && (
            <div style={{
              position: "absolute", left: `${ghostProgress}%`, top: -2, bottom: -2,
              width: 4, background: "var(--lavender)", borderRadius: 2,
              boxShadow: "0 0 0 3px rgba(182,156,255,0.3)",
              transition: "left 100ms linear",
            }} title="Ghost"/>
          )}
        </div>

        {/* Combo indicator */}
        {combo >= 8 && (window.__tweaks?.showCombo ?? true) && (
          <div className="pop" key={Math.floor(combo/4)} style={{
            position: "absolute", right: 40, top: 110,
            fontFamily: "var(--font-display)",
            fontSize: 24,
            color: combo >= 24 ? "var(--primary)" : combo >= 16 ? "var(--accent)" : "var(--secondary)",
            transform: `rotate(${combo >= 16 ? -6 : 6}deg)`,
            textShadow: "0 4px 0 rgba(45,27,78,0.10)",
          }}>
            {combo} <span style={{ fontSize: 14 }}>combo!</span>
          </div>
        )}

        {/* Text panel */}
        <div className={"card" + (shake && (window.__tweaks?.shakeOnError ?? true) ? " shake" : "")}
          key={"shk-" + shake}
          style={{
            padding: "40px 44px",
            background: "var(--surface)",
            position: "relative",
            minHeight: target.isCode ? 320 : 280,
        }}>
          {!startedAt && (
            <div style={{
              position: "absolute", top: 18, right: 22,
              fontSize: 13, color: "var(--ink-soft)", fontWeight: 600,
            }}>
              <Icon name="bolt" size={12}/> Start typing to begin
            </div>
          )}
          {target.isCode ? (
            <CodeText target={target.text} typed={typed} />
          ) : (
            <FlowText target={target.text} typed={typed} />
          )}
          {target.author && (
            <div style={{
              marginTop: 22, fontSize: 14,
              color: "var(--ink-soft)", textAlign: "right",
              fontStyle: "italic",
            }}>— {target.author}</div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 16, textAlign: "center",
          color: "var(--ink-soft)", fontSize: 13, fontWeight: 600,
        }}>
          <kbd style={kbd}>esc</kbd> quit · <kbd style={kbd}>backspace</kbd> fix
        </div>
      </div>
    </div>
  );
};

const kbd = {
  display: "inline-block",
  padding: "2px 8px",
  background: "var(--surface)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  boxShadow: "var(--shadow-sm)",
  margin: "0 4px",
};

const LiveStat = ({ label, value, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{
      fontFamily: "var(--font-display)", fontSize: 32, color, lineHeight: 1,
    }}>{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

// Flow text (words / quotes) — character-by-character coloring
const FlowText = ({ target, typed }) => {
  const els = [];
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    const t = typed[i];
    let cls = "";
    let bg = "transparent";
    let color = "var(--ink-faint)";
    if (i < typed.length) {
      if (t === ch) { color = "var(--ink)"; }
      else { color = "white"; bg = "var(--tomato)"; }
    }
    const isCursor = i === typed.length;
    els.push(
      <span key={i} style={{
        background: bg, color,
        position: "relative",
        borderRadius: 3,
        padding: ch === " " ? "0 1px" : 0,
      }}>
        {isCursor && (
          <span style={{
            position: "absolute", left: -2, top: 0, bottom: 0,
            width: 3, background: "var(--primary)",
            animation: "caret-blink 1s steps(2) infinite",
            borderRadius: 2,
          }}/>
        )}
        {ch === " " ? "\u00A0" : ch}
      </span>
    );
  }
  // trailing cursor when at end
  return (
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: 28, lineHeight: 1.6,
      letterSpacing: 0.5,
      wordBreak: "break-word",
    }}>
      <style>{`@keyframes caret-blink { 50% { opacity: 0; } }`}</style>
      {els}
    </div>
  );
};

const CodeText = ({ target, typed }) => {
  const els = [];
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    const t = typed[i];
    let bg = "transparent";
    let color = "var(--ink-faint)";
    if (i < typed.length) {
      if (t === ch) { color = "var(--ink)"; }
      else {
        color = "white";
        bg = "var(--tomato)";
      }
    }
    const isCursor = i === typed.length;
    if (ch === "\n") {
      els.push(
        <span key={i} style={{ position: "relative" }}>
          {isCursor && <span style={{
            display: "inline-block", width: 3, height: "1em",
            background: "var(--primary)", verticalAlign: "middle",
            marginLeft: -2, animation: "caret-blink 1s steps(2) infinite",
          }}/>}
          {"\n"}
        </span>
      );
      continue;
    }
    els.push(
      <span key={i} style={{
        background: bg, color, borderRadius: 3, position: "relative",
        whiteSpace: "pre",
      }}>
        {isCursor && (
          <span style={{
            position: "absolute", left: -2, top: 0, bottom: 0,
            width: 3, background: "var(--primary)",
            animation: "caret-blink 1s steps(2) infinite",
            borderRadius: 2,
          }}/>
        )}
        {ch}
      </span>
    );
  }
  return (
    <pre style={{
      fontFamily: "var(--font-mono)",
      fontSize: 18, lineHeight: 1.7,
      margin: 0, whiteSpace: "pre-wrap",
      background: "var(--bg)", padding: 22,
      borderRadius: 14,
    }}>
      <style>{`@keyframes caret-blink { 50% { opacity: 0; } }`}</style>
      {els}
    </pre>
  );
};

function buildTarget(config) {
  if (config.mode === "words") {
    return { text: generateWordTest(config.variant), label: `${config.variant} words` };
  }
  if (config.mode === "quote") {
    const q = pickQuote();
    return { text: q.text, author: q.author, label: "Quote" };
  }
  if (config.mode === "code") {
    const c = pickCode();
    return { text: c.text, label: c.lang.toUpperCase(), isCode: true };
  }
  if (config.mode === "race") {
    return { text: generateWordTest(40), label: "Ghost race" };
  }
  return { text: "the quick brown fox jumps over the lazy dog", label: "Words" };
}

function countCorrect(typed, target) {
  let n = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) n++;
  }
  return n;
}

function fmtTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

Object.assign(window, { TypingScreen, fmtTime });
