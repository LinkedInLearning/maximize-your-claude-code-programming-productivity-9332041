const test = require("node:test");
const assert = require("node:assert/strict");
const PASSAGES = require("../passages2.js");

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "is", "it", "was", "and", "or",
  "for", "on", "at", "by", "be", "that", "this", "with", "as", "but",
  "not", "i", "you", "we", "they", "he", "she",
]);

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

function passageCountByWord() {
  const counts = new Map();
  for (const p of PASSAGES) {
    const seen = new Set(tokenize(p));
    for (const w of seen) counts.set(w, (counts.get(w) || 0) + 1);
  }
  return counts;
}

function letterFrequencies() {
  const counts = new Map();
  let total = 0;
  for (const p of PASSAGES) {
    for (const ch of p.toLowerCase()) {
      if (ch >= "a" && ch <= "z") {
        counts.set(ch, (counts.get(ch) || 0) + 1);
        total++;
      }
    }
  }
  return { counts, total };
}

test("passages2 — word repetition: no non-stopword appears in more than 40% of passages", () => {
  const limit = Math.floor(PASSAGES.length * 0.4);
  const counts = passageCountByWord();
  const offenders = [...counts.entries()]
    .filter(([w, n]) => !STOPWORDS.has(w) && n > limit)
    .map(([w, n]) => `${w}:${n}`);
  assert.deepEqual(
    offenders,
    [],
    `non-stopwords exceeding ${limit}/${PASSAGES.length} passages: ${offenders.join(", ")}`
  );
});

test("passages2 — letter distribution: all 26 letters appear at least once", () => {
  const { counts } = letterFrequencies();
  const missing = [];
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(97 + i);
    if (!counts.has(ch)) missing.push(ch);
  }
  assert.deepEqual(missing, [], `missing letters: ${missing.join(", ")}`);
});

test("passages2 — letter distribution: no single letter exceeds 18% of total letters", () => {
  const { counts, total } = letterFrequencies();
  const offenders = [...counts.entries()]
    .filter(([, n]) => n / total > 0.18)
    .map(([ch, n]) => `${ch}:${((n / total) * 100).toFixed(1)}%`);
  assert.deepEqual(offenders, [], `over-represented letters: ${offenders.join(", ")}`);
});
