// app.jsx — root, router, persistence wiring
const App = () => {
  const { useState, useEffect, useRef } = React;
  const [state, setState] = useState(() => window.KQ_Storage.load());
  const [screen, setScreen] = useState(() => state.activePlayerId ? "home" : "select");
  const [config, setConfig] = useState(null);
  const [resultCtx, setResultCtx] = useState(null);
  const [runNonce, setRunNonce] = useState(0);
  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  // persist on every change
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.KQ_Storage.save(state);
  }, [state]);

  // apply per-player palette
  useEffect(() => {
    const p = window.KQ_Storage.activePlayer(state);
    if (p) {
      const pal = window.KQ_DATA.PALETTES.find(x => x.id === p.palette) || window.KQ_DATA.PALETTES[0];
      document.documentElement.style.setProperty("--c-accent", pal.primary);
      document.documentElement.style.setProperty("--c-bg-tint", pal.bg);
    }
  }, [state.activePlayerId, state.players]);

  const player = window.KQ_Storage.activePlayer(state);

  const selectPlayer = (id) => {
    setState(s => ({ ...s, activePlayerId: id }));
    setScreen("home");
  };

  const startRun = (cfg) => {
    setConfig(cfg);
    setRunNonce(n => n + 1);
    setScreen("typing");
  };

  const finishRun = (run, cfg) => {
    if (cfg.mode === "words") run.wordCount = cfg.count;
    let isPB = false;
    let newly = [];
    setState(s => window.KQ_Storage.withPlayer(s, player.id, p => {
      const prevBest = p.runs.length ? Math.max(...p.runs.map(r => r.wpm)) : 0;
      isPB = run.wpm > prevBest;
      const mergedKeyMisses = { ...p.keyMisses };
      for (const k in run.keyMisses) mergedKeyMisses[k] = (mergedKeyMisses[k] || 0) + run.keyMisses[k];
      const np = { ...p, runs: [...p.runs, run], keyMisses: mergedKeyMisses };
      newly = window.KQ_Achievements.evaluateAchievements(np, run);
      const unlocked = { ...p.unlocked };
      const ts = Date.now();
      newly.forEach(a => { unlocked[a.id] = ts; });
      return { ...np, unlocked };
    }));
    setResultCtx({ run, config: cfg, isPB, newly });
    setScreen("results");
  };

  const abortRun = () => { setConfig(null); setScreen("home"); };

  return (
    <>
      {isCoarse && screen !== "typing" && (
        <div className="coarse-hint">KeyQuest is best on a desktop keyboard.</div>
      )}
      {screen === "select" && (
        <window.KQ_PlayerSelectScreen state={state} setState={setState} onSelect={selectPlayer}/>
      )}
      {screen === "home" && player && (
        <window.KQ_HomeScreen player={player} onStart={startRun}
          onOpenDashboard={() => setScreen("dashboard")}
          onOpenSettings={() => setScreen("settings")}
          onSwitch={() => { setState(s => ({ ...s, activePlayerId: null })); setScreen("select"); }}/>
      )}
      {screen === "typing" && player && config && (
        <window.KQ_TypingScreen key={runNonce} player={player} config={config} onFinish={finishRun} onAbort={abortRun}/>
      )}
      {screen === "results" && player && resultCtx && (
        <window.KQ_ResultsScreen player={player} run={resultCtx.run} config={resultCtx.config}
          newlyUnlocked={resultCtx.newly} isPB={resultCtx.isPB}
          onAgain={() => { setRunNonce(n => n + 1); setScreen("typing"); }}
          onModes={() => setScreen("home")}
          onProgress={() => setScreen("dashboard")}/>
      )}
      {screen === "dashboard" && player && (
        <window.KQ_DashboardScreen player={player} onBack={() => setScreen("home")}/>
      )}
      {screen === "settings" && player && (
        <window.KQ_SettingsScreen player={player} setState={setState}
          onBack={() => setScreen("home")}
          onSwitch={() => { setState(s => ({ ...s, activePlayerId: null })); setScreen("select"); }}/>
      )}
      <window.KQ_TweaksPanel/>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
