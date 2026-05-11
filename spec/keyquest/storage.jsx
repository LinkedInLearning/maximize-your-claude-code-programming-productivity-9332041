// storage.jsx — single source of truth for keyquest.v1
const KQ_KEY = "keyquest.v1";

const defaultSettings = () => ({
  sfx: true,
  comboVisible: true,
  confetti: true,
  strict: false,
  textSize: "M",
  cursor: "bar"
});

const emptyState = () => ({
  schemaVersion: 1,
  activePlayerId: null,
  players: [],
  corruptRecovered: false
});

const load = () => {
  const raw = localStorage.getItem(KQ_KEY);
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.players)) throw new Error("bad shape");
    if (parsed.schemaVersion !== 1) throw new Error("unknown schemaVersion");
    parsed.players.forEach(p => {
      if (typeof p.avatar !== "string") p.avatar = (p.avatar && typeof p.avatar.glyph === "string") ? p.avatar.glyph : "🦊";
      if (typeof p.palette !== "string") p.palette = "coral";
      if (typeof p.name !== "string") p.name = "Player";
      p.settings = { ...defaultSettings(), ...(p.settings || {}) };
      p.runs = Array.isArray(p.runs) ? p.runs : [];
      p.keyMisses = p.keyMisses || {};
      p.unlocked = p.unlocked || {};
    });
    return parsed;
  } catch (e) {
    console.warn("[KeyQuest] corrupt localStorage blob — resetting", e);
    return { ...emptyState(), corruptRecovered: true };
  }
};

const save = (state) => {
  const { corruptRecovered, ...persisted } = state;
  localStorage.setItem(KQ_KEY, JSON.stringify(persisted));
};

const newPlayer = ({ name, avatar, palette }) => ({
  id: "p_" + Math.random().toString(36).slice(2, 10),
  name,
  avatar,
  palette,
  createdAt: Date.now(),
  settings: defaultSettings(),
  runs: [],
  keyMisses: {},
  unlocked: {}
});

const withPlayer = (state, playerId, fn) => ({
  ...state,
  players: state.players.map(p => p.id === playerId ? fn(p) : p)
});

const activePlayer = (state) => state.players.find(p => p.id === state.activePlayerId) || null;

window.KQ_Storage = { KQ_KEY, load, save, newPlayer, withPlayer, activePlayer, defaultSettings, emptyState };
