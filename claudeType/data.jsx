// Game content + word lists, quotes, code snippets, mock player data

const COMMON_WORDS = (
  "the of and to a in for is on that by this with i you it not or be are from " +
  "at as your all have new more an was we will home can us about if page my has " +
  "search free but our one other do no information time they site he up may what " +
  "which their news out use any there see only so his when contact here business " +
  "who web also now help get pm view online first am been would how were me some " +
  "these click its like service than find price date back top people had list name " +
  "just over state year day into email two health world re next used go work last " +
  "most products music buy data make them should product system post her city add " +
  "policy number such please available copyright support message after best " +
  "software then jan good video well where info rights public books high school " +
  "through each links she review years order very privacy book items company read " +
  "group sex need many user said de does set under general research university " +
  "january mail full map reviews program life know games way days management part " +
  "could great united real item international center ebay must store travel comments " +
  "made development report off member details line terms before hotels send right " +
  "type because local those using results office education national car design take " +
  "posted internet address community within states area want phone dvd shipping " +
  "reserved subject between forum family long based code show even black check " +
  "special prices website index being women much sign file link open today " +
  "technology south case project same pages uk version section own found sports " +
  "house related security county package list american game similar called level " +
  "industry offers around story account plan student need market different help " +
  "small simple light around small think bring move never feel sleep dream cloud " +
  "sky river ocean mountain forest river spring summer winter autumn morning " +
  "evening warm cool fresh sweet quiet gentle bright shiny shadow whisper laugh " +
  "smile dance music garden window window candle silver golden ribbon paper letter " +
  "story chapter pencil garden meadow valley breeze sunset sunrise journey moment"
).split(/\s+/).filter(Boolean);

const QUOTES = [
  { text: "The best way to predict the future is to invent it. The future is not laid out on a track. It is something that we can decide, and to the extent that we do not violate any known laws of the universe, we can probably make it work the way that we want to.", author: "Alan Kay" },
  { text: "We cannot solve our problems with the same thinking we used when we created them. The world we have created is a product of our thinking; it cannot be changed without changing our thinking.", author: "Albert Einstein" },
  { text: "It is our choices that show what we truly are, far more than our abilities. Great wisdom is not always reflected in the things we do, but in the choices we make and the consequences we are willing to bear.", author: "J.K. Rowling" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute. Code that is hard to understand is hard to maintain, and maintenance is the bulk of the cost of any system over its lifetime.", author: "Harold Abelson" },
  { text: "The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle. As with all matters of the heart, you will know when you find it.", author: "Steve Jobs" },
  { text: "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world, embracing all there ever will be to know and understand. It is the source of every great leap forward.", author: "Albert Einstein" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts. Many of life's failures are people who did not realize how close they were to success when they gave up.", author: "Winston Churchill" },
];

const CODE_SNIPPETS = [
  { lang: "javascript", text: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log(result);` },
  { lang: "python", text: `def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True` },
  { lang: "typescript", text: `interface User {\n  id: number;\n  name: string;\n  email: string;\n}\n\nconst getUser = async (id: number): Promise<User> => {\n  const res = await fetch(\`/api/users/\${id}\`);\n  return res.json();\n};` },
  { lang: "css", text: `.button {\n  padding: 12px 24px;\n  border-radius: 999px;\n  background: var(--primary);\n  color: white;\n  font-weight: 600;\n  transition: transform 100ms ease;\n}` },
  { lang: "rust", text: `fn main() {\n    let numbers = vec![1, 2, 3, 4, 5];\n    let sum: i32 = numbers.iter().sum();\n    let avg = sum as f32 / numbers.len() as f32;\n    println!("Average: {}", avg);\n}` },
];

function generateWordTest(count) {
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
  }
  return words.join(" ");
}

function pickQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function pickCode() {
  return CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
}

// Avatar palette + glyphs (arcade roster)
const AVATAR_PALETTES = [
  { bg: "#FF5F8A", glow: "#FFB7CE" },   // coral
  { bg: "#4FB8E0", glow: "#B7E5F5" },   // sky
  { bg: "#FFCC2E", glow: "#FFE99B" },   // sun
  { bg: "#4DD9A1", glow: "#B5F0D5" },   // mint
  { bg: "#B69CFF", glow: "#DDD0FF" },   // lavender
  { bg: "#FF9450", glow: "#FFD0AE" },   // tangerine
  { bg: "#7CDCC1", glow: "#C9F0E5" },   // teal
  { bg: "#F87B9A", glow: "#FBD3DE" },   // rose
];

const AVATAR_GLYPHS = ["A","B","C","D","E","F","K","M","N","P","R","S","T","V","Z","★","♥","◆","●","▲"];

// Achievement defs
const ACHIEVEMENTS = [
  { id: "first_run", name: "First Steps", desc: "Complete your first race", icon: "🎯", check: (s) => s.runs.length >= 1 },
  { id: "wpm_40", name: "Cruisin'", desc: "Hit 40 WPM", icon: "🚗", check: (s) => s.bestWpm >= 40 },
  { id: "wpm_60", name: "Speed Demon", desc: "Hit 60 WPM", icon: "🔥", check: (s) => s.bestWpm >= 60 },
  { id: "wpm_80", name: "Lightning", desc: "Hit 80 WPM", icon: "⚡", check: (s) => s.bestWpm >= 80 },
  { id: "wpm_100", name: "Untouchable", desc: "Hit 100 WPM", icon: "👑", check: (s) => s.bestWpm >= 100 },
  { id: "acc_98", name: "Sharpshooter", desc: "Finish a run with 98%+ accuracy", icon: "🎯", check: (s) => s.runs.some(r => r.accuracy >= 98) },
  { id: "acc_100", name: "Flawless", desc: "Finish a run with 100% accuracy", icon: "💎", check: (s) => s.runs.some(r => r.accuracy === 100) },
  { id: "marathon_10", name: "Warming Up", desc: "Complete 10 runs", icon: "🏃", check: (s) => s.runs.length >= 10 },
  { id: "marathon_50", name: "Marathoner", desc: "Complete 50 runs", icon: "🏆", check: (s) => s.runs.length >= 50 },
  { id: "code_master", name: "Code Master", desc: "Beat a code snippet", icon: "💻", check: (s) => s.runs.some(r => r.mode === "code") },
  { id: "wordsmith", name: "Wordsmith", desc: "Beat a quote", icon: "📜", check: (s) => s.runs.some(r => r.mode === "quote") },
  { id: "ghostbuster", name: "Ghostbuster", desc: "Beat your ghost in race mode", icon: "👻", check: (s) => s.runs.some(r => r.mode === "race" && r.beatGhost) },
];

// Default seeded players (so the app feels alive on first load)
function defaultPlayers() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: "p1",
      name: "ARI",
      avatar: { glyph: "★", palette: AVATAR_PALETTES[0] },
      created: now - 30 * day,
      stats: seedStats(28, 52, 6, now, day),
    },
    {
      id: "p2",
      name: "JUNO",
      avatar: { glyph: "◆", palette: AVATAR_PALETTES[1] },
      created: now - 14 * day,
      stats: seedStats(15, 71, 4, now, day),
    },
  ];
}

function seedStats(runCount, peakWpm, sessions, now, day) {
  const runs = [];
  const modes = ["words-25", "words-50", "quote", "code", "race"];
  for (let i = 0; i < runCount; i++) {
    const t = peakWpm - 18 + Math.random() * 22 - (runCount - i) * 0.4;
    const wpm = Math.max(20, Math.round(t));
    const accuracy = Math.round(86 + Math.random() * 13);
    const mode = modes[Math.floor(Math.random() * modes.length)];
    runs.push({
      id: "r" + i,
      mode,
      modeLabel: labelForMode(mode),
      wpm,
      accuracy,
      duration: 30 + Math.round(Math.random() * 70),
      timestamp: now - (runCount - i) * (day / 2) - Math.random() * day,
      beatGhost: mode === "race" && Math.random() > 0.5,
    });
  }
  // Key heat (which letters were missed)
  const keyMisses = {};
  "abcdefghijklmnopqrstuvwxyz".split("").forEach(k => {
    keyMisses[k] = Math.floor(Math.random() * 12);
  });
  // Make some keys notably worse
  ["q","z","x","p","b","y"].forEach(k => keyMisses[k] = 8 + Math.floor(Math.random() * 18));
  return {
    runs,
    bestWpm: peakWpm,
    bestAccuracy: 99,
    totalChars: runCount * 250,
    keyMisses,
  };
}

function labelForMode(mode) {
  if (mode.startsWith("words-")) return mode.split("-")[1] + " words";
  if (mode === "quote") return "Quote";
  if (mode === "code") return "Code";
  if (mode === "race") return "Race ghost";
  return mode;
}

Object.assign(window, {
  COMMON_WORDS, QUOTES, CODE_SNIPPETS,
  generateWordTest, pickQuote, pickCode,
  AVATAR_PALETTES, AVATAR_GLYPHS,
  ACHIEVEMENTS,
  defaultPlayers, labelForMode,
});
