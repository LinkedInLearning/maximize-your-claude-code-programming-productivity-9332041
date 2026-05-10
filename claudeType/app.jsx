// Main app — orchestrator

const STORAGE_KEY = "keyquest.v1";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "fontFamily": "Nunito",
  "accent": "#FF5F8A",
  "displayWeight": 800,
  "showCombo": true,
  "shakeOnError": true,
  "confetti": true
}/*EDITMODE-END*/;

const FONT_OPTIONS = ["Nunito", "Fredoka", "Quicksand", "Bagel Fat One"];
const ACCENT_OPTIONS = ["#FF5F8A", "#4FB8E0", "#B69CFF", "#4DD9A1", "#FFCC2E"];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // First run — seed with default players
  return {
    players: defaultPlayers(),
    currentPlayerId: "p1",
    settings: {
      sfx: false, combo: true, confetti: true, strict: false,
      textSize: "md", cursor: "bar",
    },
    seenAchievements: { p1: ACHIEVEMENTS.filter(a => a.check(defaultPlayers()[0].stats)).map(a => a.id),
                        p2: ACHIEVEMENTS.filter(a => a.check(defaultPlayers()[1].stats)).map(a => a.id) },
  };
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks to root CSS vars
  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--font-ui", `"${t.fontFamily}", system-ui, sans-serif`);
    r.setProperty("--font-display", `"${t.fontFamily}", system-ui, sans-serif`);
    r.setProperty("--font-mono", `"${t.fontFamily}", ui-monospace, monospace`);
    r.setProperty("--primary", t.accent);
    document.body.style.fontFamily = `"${t.fontFamily}", system-ui, sans-serif`;
    document.body.style.setProperty("--display-weight", t.displayWeight);
    window.__tweaks = t;
  }, [t.fontFamily, t.accent, t.displayWeight, t.showCombo, t.shakeOnError, t.confetti]);

  const [state, setState] = React.useState(loadState);
  const [screen, setScreen] = React.useState("home"); // home | typing | results | dashboard | settings | playerSelect
  const [config, setConfig] = React.useState(null);
  const [lastResult, setLastResult] = React.useState(null);
  const [showPlayerSelect, setShowPlayerSelect] = React.useState(!state.players.length);

  // Persist
  React.useEffect(() => { saveState(state); }, [state]);

  const player = state.players.find(p => p.id === state.currentPlayerId) || state.players[0];

  const startRun = (cfg) => {
    let ghost = null;
    if (cfg.mode === "race") {
      ghost = { wpm: Math.max(20, Math.round(player.stats.bestWpm * 0.95)) };
    }
    setConfig({ ...cfg, ghost });
    setScreen("typing");
  };

  const onComplete = (run) => {
    const fullRun = {
      id: "r" + Date.now(),
      ...run,
      timestamp: Date.now(),
    };
    setState(prev => {
      const next = structuredClone(prev);
      const p = next.players.find(p => p.id === prev.currentPlayerId);
      // Merge stats
      p.stats.runs.push(fullRun);
      p.stats.bestWpm = Math.max(p.stats.bestWpm, fullRun.wpm);
      p.stats.bestAccuracy = Math.max(p.stats.bestAccuracy, fullRun.accuracy);
      p.stats.totalChars = (p.stats.totalChars || 0) + run.target.length;
      // Merge key misses
      Object.entries(run.keyMisses || {}).forEach(([k, v]) => {
        p.stats.keyMisses[k] = (p.stats.keyMisses[k] || 0) + v;
      });
      return next;
    });
    setLastResult(fullRun);
    setScreen("results");
  };

  const onAbort = () => {
    setConfig(null);
    setScreen("home");
  };

  // Personal best detection
  const isPB = lastResult && (() => {
    const prevRuns = player.stats.runs.filter(r => r.id !== lastResult.id);
    const prev = prevRuns.length ? Math.max(...prevRuns.map(r => r.wpm)) : 0;
    return lastResult.wpm > prev && lastResult.wpm >= 25;
  })();
  const prevBest = lastResult ? (() => {
    const prevRuns = player.stats.runs.filter(r => r.id !== lastResult.id);
    return prevRuns.length ? Math.max(...prevRuns.map(r => r.wpm)) : 0;
  })() : 0;

  // New achievements
  const newAchievements = lastResult ? (() => {
    const seen = new Set(state.seenAchievements[player.id] || []);
    const earned = ACHIEVEMENTS.filter(a => a.check(player.stats));
    const fresh = earned.filter(a => !seen.has(a.id));
    return fresh;
  })() : [];

  // After viewing results, mark achievements seen
  React.useEffect(() => {
    if (screen === "results" && newAchievements.length > 0) {
      const t = setTimeout(() => {
        setState(prev => {
          const next = structuredClone(prev);
          const seen = new Set(next.seenAchievements[player.id] || []);
          newAchievements.forEach(a => seen.add(a.id));
          next.seenAchievements[player.id] = Array.from(seen);
          return next;
        });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [screen, lastResult?.id]);

  const switchToPlayer = (id) => {
    setState(prev => ({ ...prev, currentPlayerId: id }));
    setShowPlayerSelect(false);
    setScreen("home");
  };
  const createPlayer = (data) => {
    setState(prev => {
      const next = structuredClone(prev);
      const id = "p" + Date.now();
      next.players.push({
        id, ...data,
        created: Date.now(),
        stats: { runs: [], bestWpm: 0, bestAccuracy: 0, totalChars: 0, keyMisses: {} },
      });
      next.currentPlayerId = id;
      next.seenAchievements[id] = [];
      return next;
    });
    setShowPlayerSelect(false);
    setScreen("home");
  };
  const deletePlayer = (id) => {
    setState(prev => {
      const next = structuredClone(prev);
      next.players = next.players.filter(p => p.id !== id);
      delete next.seenAchievements[id];
      if (next.currentPlayerId === id) {
        next.currentPlayerId = next.players[0]?.id;
      }
      return next;
    });
  };
  const resetStats = () => {
    setState(prev => {
      const next = structuredClone(prev);
      const p = next.players.find(p => p.id === prev.currentPlayerId);
      p.stats = { runs: [], bestWpm: 0, bestAccuracy: 0, totalChars: 0, keyMisses: {} };
      next.seenAchievements[p.id] = [];
      return next;
    });
  };
  const updateSettings = (patch) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...patch }}));
  };

  // Render
  if (showPlayerSelect || !player) {
    return (
      <div className="app">
        <div className="topbar">
          <div className="brand"><div className="brand-mark"><span>K</span></div><div>KEYQUEST</div></div>
        </div>
        <div className="main">
          <PlayerSelect
            players={state.players}
            currentPlayerId={state.currentPlayerId}
            onPick={switchToPlayer}
            onCreate={createPlayer}
            onDelete={deletePlayer}
            onClose={state.players.length > 0 ? () => setShowPlayerSelect(false) : null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-screen-label={screen} data-shake={t.shakeOnError ? "on" : "off"} data-combo={t.showCombo ? "on" : "off"} data-confetti={t.confetti ? "on" : "off"}>
      <TopBar
        screen={screen === "results" ? "home" : screen}
        onNav={(s) => { setScreen(s); }}
        player={player}
        onSwitchPlayer={() => setShowPlayerSelect(true)}
      />
      <div className="main">
        {screen === "home" && (
          <Home player={player} onStart={startRun} onNav={setScreen} />
        )}
        {screen === "typing" && (
          <TypingScreen
            player={player}
            config={config}
            ghost={config?.ghost}
            onComplete={onComplete}
            onAbort={onAbort}
          />
        )}
        {screen === "results" && lastResult && (
          <Results
            player={player}
            run={lastResult}
            isPersonalBest={isPB}
            prevBest={prevBest}
            newAchievements={newAchievements}
            onPlayAgain={() => { startRun(config); }}
            onHome={() => setScreen("home")}
            onDashboard={() => setScreen("dashboard")}
          />
        )}
        {screen === "dashboard" && (
          <Dashboard player={player} onStartRun={() => setScreen("home")} />
        )}
        {screen === "settings" && (
          <Settings
            player={player}
            settings={state.settings}
            onChange={updateSettings}
            onResetStats={resetStats}
            onSwitchPlayer={() => setShowPlayerSelect(true)}
          />
        )}
      </div>

      <TweaksPanel>
        <TweakSection label="Typography" />
        <TweakSelect label="Font family" value={t.fontFamily}
          options={FONT_OPTIONS}
          onChange={v => setTweak("fontFamily", v)} />
        <TweakSlider label="Display weight" value={t.displayWeight} min={400} max={900} step={100}
          onChange={v => setTweak("displayWeight", v)} />

        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={ACCENT_OPTIONS}
          onChange={v => setTweak("accent", v)} />

        <TweakSection label="Game feel" />
        <TweakToggle label="Combo counter" value={t.showCombo}
          onChange={v => setTweak("showCombo", v)} />
        <TweakToggle label="Shake on errors" value={t.shakeOnError}
          onChange={v => setTweak("shakeOnError", v)} />
        <TweakToggle label="Confetti on PB" value={t.confetti}
          onChange={v => setTweak("confetti", v)} />
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
