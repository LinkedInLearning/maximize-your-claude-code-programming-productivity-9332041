(() => {
  "use strict";

  const STORAGE_KEY = "typingapp.results";
  const PLAYER_KEY = "typingapp.player";
  const MIN_WPM = 60;
  const CARET_RATIO = 0.5; // matches .caret-marker left: 50%
  const STRIP_PADDING_PX = 24; // matches .strip padding: 0 24px
  const MAX_LOOKAHEAD_CHARS = 6; // clamp: scroll never more than N chars ahead of caret
  const LIVE_WPM_WINDOW_MS = 5000;

  // DOM
  const viewport = document.getElementById("viewport");
  const strip = document.getElementById("strip");
  const wpmEl = document.getElementById("wpm");
  const accEl = document.getElementById("acc");
  const passageNumEl = document.getElementById("passage-num");
  const restartBtn = document.getElementById("restart");
  const nextBtn = document.getElementById("next");
  const exportBtn = document.getElementById("export");
  const modal = document.getElementById("results-modal");
  const rWpm = document.getElementById("r-wpm");
  const rAcc = document.getElementById("r-acc");
  const rTime = document.getElementById("r-time");
  const rNext = document.getElementById("r-next");
  const rClose = document.getElementById("r-close");

  // State
  let player = null; // {id, name}
  let currentPassage = null; // {id, text}
  let passage = "";
  let chars = [];
  let charWidthPx = 14;
  let caretIndex = 0;
  let correctChars = 0;
  let totalKeystrokes = 0;
  let errorPositions = new Set();
  let keystrokeLog = [];
  let startTimeMs = 0;
  let finished = false;
  let lastFrameMs = 0;
  let scrollOffsetPx = 0;
  let rafId = 0;

  function measureCharWidth() {
    const probe = document.createElement("span");
    probe.textContent = "M".repeat(50);
    probe.style.visibility = "hidden";
    probe.style.position = "absolute";
    probe.className = "ch";
    strip.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 50;
    strip.removeChild(probe);
    if (w > 0) charWidthPx = w;
  }

  async function ensurePlayer() {
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.id && p.name) return p;
      }
    } catch {}
    let name = null;
    while (!name) {
      name = (window.prompt("Enter your arcade name (1-32 chars):") || "").trim();
    }
    const created = await window.API.registerUser(name);
    localStorage.setItem(PLAYER_KEY, JSON.stringify(created));
    return created;
  }

  function renderPassage(text) {
    cancelAnimationFrame(rafId);
    passage = text;
    caretIndex = 0;
    correctChars = 0;
    totalKeystrokes = 0;
    errorPositions = new Set();
    keystrokeLog = [];
    startTimeMs = 0;
    finished = false;
    scrollOffsetPx = 0;
    lastFrameMs = 0;

    strip.innerHTML = "";
    chars = [];
    for (let i = 0; i < passage.length; i++) {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = passage[i];
      strip.appendChild(span);
      chars.push(span);
    }
    if (chars[0]) chars[0].classList.add("cur");

    wpmEl.textContent = "0";
    accEl.textContent = "100%";

    measureCharWidth();
    scrollOffsetPx = STRIP_PADDING_PX - viewport.clientWidth * CARET_RATIO;
    strip.style.transform = `translate(${-scrollOffsetPx}px, -50%)`;

    viewport.focus();
    rafId = requestAnimationFrame(tick);
  }

  async function loadNextPassage() {
    const p = await window.API.fetchNextPassage(player.id);
    currentPassage = p;
    passageNumEl.textContent = String(p.id);
    renderPassage(p.text);
  }

  function restartCurrent() {
    if (!currentPassage) return;
    renderPassage(currentPassage.text);
  }

  function elapsedMs() {
    return startTimeMs ? performance.now() - startTimeMs : 0;
  }

  function overallWpm() {
    const ms = elapsedMs();
    if (ms < 250) return 0;
    return (correctChars / 5) / (ms / 60000);
  }

  function liveWpm() {
    const now = performance.now();
    while (keystrokeLog.length && now - keystrokeLog[0].t > LIVE_WPM_WINDOW_MS) {
      keystrokeLog.shift();
    }
    if (keystrokeLog.length < 3) return overallWpm();
    const correct = keystrokeLog.filter((k) => k.correct).length;
    const windowMin = (now - keystrokeLog[0].t) / 60000;
    if (windowMin <= 0) return overallWpm();
    return (correct / 5) / windowMin;
  }

  function accuracy() {
    if (totalKeystrokes === 0) return 1;
    return correctChars / totalKeystrokes;
  }

  function updateStats() {
    wpmEl.textContent = String(Math.round(overallWpm()));
    accEl.textContent = `${Math.round(accuracy() * 100)}%`;
  }

  function tick(t) {
    if (finished) return;
    if (!lastFrameMs) lastFrameMs = t;
    const dt = Math.min(0.05, (t - lastFrameMs) / 1000);
    lastFrameMs = t;

    if (startTimeMs > 0) {
      const targetWpm = Math.max(MIN_WPM, liveWpm());
      const charsPerSec = (targetWpm * 5) / 60;
      const pxPerSec = charsPerSec * charWidthPx;
      scrollOffsetPx += pxPerSec * dt;

      const caretCenteredOffset = STRIP_PADDING_PX + caretIndex * charWidthPx - viewport.clientWidth * CARET_RATIO;
      const maxAllowed = caretCenteredOffset + MAX_LOOKAHEAD_CHARS * charWidthPx;
      const minAllowed = STRIP_PADDING_PX - viewport.clientWidth * CARET_RATIO;
      if (scrollOffsetPx > maxAllowed) scrollOffsetPx = maxAllowed;
      if (scrollOffsetPx < minAllowed) scrollOffsetPx = minAllowed;

      strip.style.transform = `translate(${-scrollOffsetPx}px, -50%)`;
    }

    updateStats();
    rafId = requestAnimationFrame(tick);
  }

  function handleKey(e) {
    if (finished) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement !== viewport) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (caretIndex === 0) return;
      caretIndex--;
      const prev = chars[caretIndex];
      if (errorPositions.has(caretIndex)) {
        errorPositions.delete(caretIndex);
      } else {
        correctChars = Math.max(0, correctChars - 1);
      }
      prev.classList.remove("done", "err");
      const oldCur = strip.querySelector(".ch.cur");
      if (oldCur) oldCur.classList.remove("cur");
      prev.classList.add("cur");
      return;
    }

    if (e.key.length !== 1) return;
    e.preventDefault();

    if (caretIndex >= passage.length) return;
    if (!startTimeMs) startTimeMs = performance.now();

    const expected = passage[caretIndex];
    const span = chars[caretIndex];
    const correct = e.key === expected;

    span.classList.remove("cur");
    totalKeystrokes++;
    keystrokeLog.push({ t: performance.now(), correct });

    if (correct) {
      span.classList.add("done");
      correctChars++;
    } else {
      span.classList.add("err");
      errorPositions.add(caretIndex);
    }

    caretIndex++;

    if (caretIndex < passage.length) {
      chars[caretIndex].classList.add("cur");
    } else {
      finishPassage();
    }
  }

  function finishPassage() {
    finished = true;
    cancelAnimationFrame(rafId);
    const ms = elapsedMs();
    const wpm = (correctChars / 5) / (ms / 60000);
    const acc = accuracy();

    const result = {
      timestamp: new Date().toISOString(),
      passageId: currentPassage ? currentPassage.id : null,
      wpm: Math.round(wpm * 10) / 10,
      accuracy: Math.round(acc * 1000) / 1000,
      durationMs: Math.round(ms),
    };
    saveResult(result);

    rWpm.textContent = String(Math.round(wpm));
    rAcc.textContent = `${Math.round(acc * 100)}%`;
    rTime.textContent = `${(ms / 1000).toFixed(1)}s`;
    modal.classList.remove("hidden");
  }

  function saveResult(r) {
    let existing = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
    existing.push(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  function loadResults() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function exportResults() {
    const results = loadResults();
    const lines = [
      "Scroll Typer — Results Export",
      `Generated: ${new Date().toISOString()}`,
      `Total runs: ${results.length}`,
      "",
      "timestamp\tpassage\twpm\taccuracy\tduration_s",
    ];
    for (const r of results) {
      lines.push(
        `${r.timestamp}\t${r.passageId}\t${r.wpm}\t${(r.accuracy * 100).toFixed(1)}%\t${(r.durationMs / 1000).toFixed(1)}`
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typing-results-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Wire events
  window.addEventListener("keydown", handleKey);
  viewport.addEventListener("click", () => viewport.focus());
  restartBtn.addEventListener("click", restartCurrent);
  nextBtn.addEventListener("click", () => loadNextPassage().catch(reportError));
  exportBtn.addEventListener("click", exportResults);
  rNext.addEventListener("click", () => {
    modal.classList.add("hidden");
    loadNextPassage().catch(reportError);
  });
  rClose.addEventListener("click", () => modal.classList.add("hidden"));

  function reportError(err) {
    console.error(err);
    alert("API error — is the backend running on http://127.0.0.1:8000?\n\n" + err.message);
  }

  // Boot
  (async () => {
    try {
      player = await ensurePlayer();
      await loadNextPassage();
    } catch (err) {
      reportError(err);
    }
  })();
})();
