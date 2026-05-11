// engine.jsx — pure typing-run logic
const calcWPM = (correctChars, elapsedMs) => {
  if (elapsedMs <= 0) return 0;
  return (correctChars / 5) / (elapsedMs / 60000);
};

const calcAccuracy = (correctChars, totalKeystrokes) => {
  if (totalKeystrokes === 0) return 100;
  return (correctChars / totalKeystrokes) * 100;
};

const ghostCharsAt = (bestWPM, elapsedMs) => {
  return Math.round(0.95 * bestWPM * 5 * (elapsedMs / 60000));
};

const initEngine = (target) => ({
  target,
  typed: "",
  errors: [],
  totalKeystrokes: 0,
  correctChars: 0,
  combo: 0,
  keyMisses: {},
  startedAt: null,
  finishedAt: null,
  pendingError: false
});

const applyKey = (state, key, strict) => {
  if (state.finishedAt) return state;
  if (state.target.length === 0) return state;
  const idx = state.typed.length;
  const expected = state.target[idx];
  const startedAt = state.startedAt || Date.now();
  if (key === expected && !(strict && state.pendingError)) {
    const typed = state.typed + key;
    const correctChars = state.correctChars + 1;
    const combo = state.combo + 1;
    const totalKeystrokes = state.totalKeystrokes + 1;
    const finishedAt = typed.length === state.target.length ? Date.now() : null;
    return { ...state, typed, correctChars, combo, totalKeystrokes, startedAt, finishedAt };
  }
  // wrong key
  if (strict) {
    const km = { ...state.keyMisses, [expected]: (state.keyMisses[expected] || 0) + 1 };
    return { ...state, totalKeystrokes: state.totalKeystrokes + 1, combo: 0, keyMisses: km, pendingError: true, startedAt };
  }
  const typed = state.typed + key;
  const km = { ...state.keyMisses, [expected]: (state.keyMisses[expected] || 0) + 1 };
  const errors = [...state.errors, idx];
  const finishedAt = typed.length === state.target.length ? Date.now() : null;
  return { ...state, typed, errors, totalKeystrokes: state.totalKeystrokes + 1, combo: 0, keyMisses: km, startedAt, finishedAt };
};

const applyBackspace = (state, strict) => {
  if (state.finishedAt) return state;
  if (strict && state.pendingError) {
    return { ...state, pendingError: false };
  }
  if (strict) return state;
  if (state.typed.length === 0) return state;
  const last = state.typed.length - 1;
  const wasError = state.errors.includes(last);
  const typed = state.typed.slice(0, -1);
  const errors = state.errors.filter(i => i !== last);
  const correctChars = wasError ? state.correctChars : state.correctChars - 1;
  return { ...state, typed, errors, correctChars };
};

const buildRun = (state, mode, bestWPM) => {
  const duration = (state.finishedAt - state.startedAt) / 1000;
  const wpm = calcWPM(state.correctChars, state.finishedAt - state.startedAt);
  const accuracy = calcAccuracy(state.correctChars, state.totalKeystrokes);
  const ghostTarget = bestWPM * 0.95;
  const beatGhost = mode === "ghost" && bestWPM > 0 && wpm > ghostTarget;
  return {
    mode,
    wpm: Math.round(wpm),
    accuracy: Math.round(accuracy * 10) / 10,
    duration: Math.round(duration * 10) / 10,
    timestamp: Date.now(),
    keyMisses: state.keyMisses,
    beatGhost
  };
};

window.KQ_Engine = { calcWPM, calcAccuracy, ghostCharsAt, initEngine, applyKey, applyBackspace, buildRun };
