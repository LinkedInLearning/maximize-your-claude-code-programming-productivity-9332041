const PASSAGES = {
  common: [
    "the quick brown fox jumps over the lazy dog and runs through the forest at full speed without stopping once",
    "practice makes perfect when you type every day your fingers learn where each key lives on the keyboard",
    "good typing speed comes from accuracy first focus on hitting the right keys and the speed will follow naturally",
    "the sun sets in the west and rises in the east every single day without fail no matter what the season",
    "learning to type faster is one of the best investments you can make as a programmer or writer in any field",
    "keep your eyes on the screen not on your hands trust your fingers to find the keys on their own over time",
    "a rolling stone gathers no moss but a steady typist gathers great speed through calm and consistent practice",
    "words per minute is a measure of how fast you can type accurately it takes time to build up to high speeds",
  ],
  quotes: [
    "the only way to do great work is to love what you do if you have not found it yet keep looking do not settle",
    "in the middle of every difficulty lies opportunity the secret is to keep moving forward even when it is hard",
    "it does not matter how slowly you go as long as you do not stop progress is progress no matter how small",
    "the future belongs to those who believe in the beauty of their dreams and work hard each day to achieve them",
    "success is not final failure is not fatal it is the courage to continue that counts above all else in life",
    "life is what happens when you are busy making other plans so stay present and enjoy each moment as it comes",
    "the greatest glory in living lies not in never falling but in rising every time we fall and trying again",
    "you miss one hundred percent of the shots you do not take so step up and give it your very best every time",
  ],
  code: [
    "function add(a, b) { return a + b; } const result = add(3, 7); console.log(result);",
    "const items = [1, 2, 3, 4, 5]; const doubled = items.map(x => x * 2); console.log(doubled);",
    "async function fetchData(url) { const res = await fetch(url); return res.json(); }",
    "class Stack { constructor() { this.data = []; } push(v) { this.data.push(v); } pop() { return this.data.pop(); } }",
    "const greet = name => `Hello, ${name}! Welcome back.`; console.log(greet('world'));",
    "for (let i = 0; i < 10; i++) { if (i % 2 === 0) { console.log(i + ' is even'); } }",
    "const obj = { name: 'Alice', age: 30 }; const { name, age } = obj; console.log(name, age);",
    "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }",
  ],
};

// ---- State ----
let mode = 'common';
let passage = '';
let charStates = []; // 'untyped' | 'correct' | 'wrong' | 'extra'
let cursorPos = 0;
let typedHistory = []; // per-char typed input
let startTime = null;
let timerInterval = null;
let elapsedSeconds = 0;
let totalTyped = 0;
let totalCorrect = 0;
let isRunning = false;
let isFinished = false;

// ---- DOM refs ----
const screenReady = document.getElementById('screen-ready');
const screenTyping = document.getElementById('screen-typing');
const screenResults = document.getElementById('screen-results');
const passageDisplay = document.getElementById('passage-display');
const typingPassage = document.getElementById('typing-passage');
const typingInput = document.getElementById('typing-input');
const liveWpm = document.getElementById('live-wpm');
const liveAcc = document.getElementById('live-acc');
const liveTime = document.getElementById('live-time');
const statsBar = document.getElementById('stats');
const modeButtons = document.querySelectorAll('.mode-btn');

// ---- Init ----
function pickPassage() {
  const list = PASSAGES[mode];
  return list[Math.floor(Math.random() * list.length)];
}

function buildCharSpans(text, container) {
  container.innerHTML = '';
  return text.split('').map((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? ' ' : ch;
    span.dataset.index = i;
    container.appendChild(span);
    return { ch, state: 'untyped', span };
  });
}

function showScreen(screen) {
  [screenReady, screenTyping, screenResults].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function loadReady() {
  isRunning = false;
  isFinished = false;
  passage = pickPassage();
  charStates = buildCharSpans(passage, passageDisplay);
  statsBar.classList.add('hidden');
  showScreen(screenReady);
}

function startGame() {
  passage = pickPassage();
  charStates = buildCharSpans(passage, typingPassage);
  cursorPos = 0;
  typedHistory = [];
  totalTyped = 0;
  totalCorrect = 0;
  startTime = null;
  elapsedSeconds = 0;
  isRunning = true;
  isFinished = false;

  updateCursor();
  statsBar.classList.remove('hidden');
  liveWpm.textContent = '0';
  liveAcc.textContent = '100';
  liveTime.textContent = '0';

  showScreen(screenTyping);
  typingInput.value = '';
  typingInput.focus();
}

// ---- Cursor ----
function updateCursor() {
  charStates.forEach(({ span }, i) => {
    span.classList.remove('cursor');
  });
  if (cursorPos < charStates.length) {
    charStates[cursorPos].span.classList.add('cursor');
  }

  // Scroll cursor into view
  if (cursorPos < charStates.length) {
    charStates[cursorPos].span.scrollIntoView({ block: 'nearest' });
  }
}

// ---- Typing logic ----
typingInput.addEventListener('input', handleInput);
typingInput.addEventListener('keydown', handleKeydown);

function handleKeydown(e) {
  if (!isRunning || isFinished) return;

  if (e.key === 'Backspace') {
    e.preventDefault();
    if (cursorPos > 0) {
      cursorPos--;
      const c = charStates[cursorPos];
      c.state = 'untyped';
      c.span.className = 'char';
      typedHistory.pop();
    }
    updateCursor();
    return;
  }
}

function handleInput(e) {
  if (!isRunning || isFinished) return;

  const val = typingInput.value;
  if (!val) return;

  // Start timer on first keystroke
  if (!startTime) {
    startTime = Date.now();
    timerInterval = setInterval(tickTimer, 200);
  }

  // Process each character typed (usually 1 at a time)
  for (const ch of val) {
    if (cursorPos >= charStates.length) break;

    const expected = charStates[cursorPos].ch;
    const correct = ch === expected;

    charStates[cursorPos].state = correct ? 'correct' : 'wrong';
    charStates[cursorPos].span.className = 'char ' + (correct ? 'correct' : (expected === ' ' ? 'wrong-space' : 'wrong'));

    typedHistory.push(ch);
    totalTyped++;
    if (correct) totalCorrect++;
    cursorPos++;
  }

  typingInput.value = '';
  updateCursor();
  updateLiveStats();

  if (cursorPos >= charStates.length) {
    finishGame();
  }
}

// ---- Timer ----
function tickTimer() {
  if (!startTime) return;
  elapsedSeconds = (Date.now() - startTime) / 1000;
  liveTime.textContent = Math.floor(elapsedSeconds);
  updateLiveStats();
}

// ---- Stats ----
function calcWpm(chars, seconds) {
  if (seconds < 0.5) return 0;
  return Math.round((chars / 5) / (seconds / 60));
}

function updateLiveStats() {
  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  liveWpm.textContent = calcWpm(totalCorrect, elapsed);
  liveAcc.textContent = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;
}

// ---- Finish ----
function finishGame() {
  isFinished = true;
  isRunning = false;
  clearInterval(timerInterval);

  elapsedSeconds = (Date.now() - startTime) / 1000;
  const wpm = calcWpm(totalCorrect, elapsedSeconds);
  const acc = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;
  const time = elapsedSeconds.toFixed(1) + 's';
  const chars = `${totalCorrect}/${totalTyped}`;

  document.getElementById('result-wpm').textContent = wpm;
  document.getElementById('result-acc').textContent = acc + '%';
  document.getElementById('result-time').textContent = time;
  document.getElementById('result-chars').textContent = chars;

  statsBar.classList.add('hidden');
  showScreen(screenResults);
}

// ---- Buttons ----
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-new').addEventListener('click', loadReady);

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    loadReady();
  });
});

// Click on ready passage to start
passageDisplay.addEventListener('click', startGame);

// ---- Global keyboard shortcuts ----
document.addEventListener('keydown', e => {
  if (screenTyping.classList.contains('active')) {
    // Keep focus on input
    if (document.activeElement !== typingInput) typingInput.focus();
    return;
  }

  if (screenResults.classList.contains('active')) {
    if (e.key === 'Tab') { e.preventDefault(); startGame(); }
    if (e.key === 'Enter') { e.preventDefault(); loadReady(); }
    return;
  }

  if (screenReady.classList.contains('active')) {
    if (e.key === 'Enter') { e.preventDefault(); startGame(); }
  }
});

// ---- Boot ----
loadReady();
