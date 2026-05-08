(() => {
  "use strict";

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
  const historyBtn = document.getElementById("history");
  const leaderboardBtn = document.getElementById("leaderboard");
  const modal = document.getElementById("results-modal");
  const historyModal = document.getElementById("history-modal");
  const historyBody = document.getElementById("history-body");
  const historyClose = document.getElementById("history-close");
  const leaderboardModal = document.getElementById("leaderboard-modal");
  const leaderboardBody = document.getElementById("leaderboard-body");
  const leaderboardClose = document.getElementById("leaderboard-close");
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

    if (player && currentPassage) {
      window.API.saveResult({
        user_id: player.id,
        passage_id: currentPassage.id,
        wpm: Math.round(wpm * 10) / 10,
        accuracy: Math.round(acc * 1000) / 1000,
        duration_ms: Math.round(ms),
      }).catch(reportError);
    }

    rWpm.textContent = String(Math.round(wpm));
    rAcc.textContent = `${Math.round(acc * 100)}%`;
    rTime.textContent = `${(ms / 1000).toFixed(1)}s`;
    modal.classList.remove("hidden");
  }

  // Wire events
  window.addEventListener("keydown", handleKey);
  viewport.addEventListener("click", () => viewport.focus());
  restartBtn.addEventListener("click", restartCurrent);
  nextBtn.addEventListener("click", () => loadNextPassage().catch(reportError));
  historyBtn.addEventListener("click", () => showHistory().catch(reportError));
  leaderboardBtn.addEventListener("click", () => showLeaderboard().catch(reportError));
  historyClose.addEventListener("click", () => historyModal.classList.add("hidden"));
  leaderboardClose.addEventListener("click", () => leaderboardModal.classList.add("hidden"));

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  async function showHistory() {
    if (!player) return;
    const rows = await window.API.fetchMyResults(player.id);
    historyBody.innerHTML = "";
    if (!rows.length) {
      historyBody.innerHTML = `<tr><td class="empty" colspan="4">No runs yet — finish a passage!</td></tr>`;
    } else {
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${fmtTime(r.created_at)}</td><td>#${r.passage_id}</td><td class="num">${r.wpm.toFixed(1)}</td><td class="num">${(r.accuracy * 100).toFixed(0)}%</td>`;
        historyBody.appendChild(tr);
      }
    }
    historyModal.classList.remove("hidden");
  }

  async function showLeaderboard() {
    const rows = await window.API.fetchLeaderboard();
    leaderboardBody.innerHTML = "";
    if (!rows.length) {
      leaderboardBody.innerHTML = `<tr><td class="empty" colspan="5">No qualifying runs yet.</td></tr>`;
    } else {
      rows.forEach((r, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${i + 1}</td><td>${r.user_name}</td><td>#${r.passage_id}</td><td class="num">${r.wpm.toFixed(1)}</td><td class="num">${(r.accuracy * 100).toFixed(0)}%</td>`;
        leaderboardBody.appendChild(tr);
      });
    }
    leaderboardModal.classList.remove("hidden");
  }
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
