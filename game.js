'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#42a5f5', // J - pale blue
  '#ffb74d', // L - orange
  '#90a4ae', // Nut - metal grey
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Nut (reto)
];

const NUT = 8;

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const startScreen = document.getElementById('start-screen');
const startRecordsEl = document.getElementById('start-records');
const startPlayBtn = document.getElementById('start-play-btn');
const startResetBtn = document.getElementById('start-reset-btn');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const overlayRecordsEl = document.getElementById('overlay-records');

const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');

const THEME_STORAGE_KEY = 'tetris-theme';
const START_LEVEL_STORAGE_KEY = 'tetris-start-level';
const RECORDS_STORAGE_KEY = 'tetris-records';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let gridLineColor = '#22222e';
let startLevel;
let menuOpen = false;
let inputLocked = false;
let combo = 0;
let maxCombo = 0;
let records = loadRecords();
let pendingQualifies = false;

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  gridLineColor = getComputedStyle(document.body).getPropertyValue('--grid-line').trim();
  themeToggleBtn.textContent = theme === 'light' ? '☀' : '🌙';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  const activeTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(activeTheme === 'light' ? 'dark' : 'light');
});

function applyStartLevel(lvl) {
  startLevel = lvl;
  startLevelSelect.value = String(lvl);
  localStorage.setItem(START_LEVEL_STORAGE_KEY, String(lvl));
}

function initStartLevel() {
  const saved = parseInt(localStorage.getItem(START_LEVEL_STORAGE_KEY), 10);
  applyStartLevel(Number.isInteger(saved) && saved >= 1 && saved <= 15 ? saved : 1);
}

startLevelSelect.addEventListener('change', () => {
  applyStartLevel(parseInt(startLevelSelect.value, 10));
});

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return { scores: [], bestCombo: 0, maxLines: 0 };
    const parsed = JSON.parse(raw);
    const scores = Array.isArray(parsed.scores)
      ? parsed.scores
          .filter(s => s && typeof s === 'object' && Number.isFinite(s.score))
          .map(s => ({
            name: typeof s.name === 'string' && s.name ? s.name : 'Jugador',
            score: s.score,
            lines: Number.isFinite(s.lines) ? s.lines : 0,
            level: Number.isFinite(s.level) ? s.level : 1,
            date: typeof s.date === 'string' ? s.date : '',
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];
    return {
      scores,
      bestCombo: Number.isFinite(parsed.bestCombo) ? parsed.bestCombo : 0,
      maxLines: Number.isFinite(parsed.maxLines) ? parsed.maxLines : 0,
    };
  } catch (e) {
    return { scores: [], bestCombo: 0, maxLines: 0 };
  }
}

function saveRecords(recordsToSave) {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(recordsToSave));
  } catch (e) {
    // ignore write errors (e.g. storage full or disabled)
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderRecordsTable(container, recordsData, pendingScore) {
  const rows = recordsData.scores.map(s => ({ ...s, pending: false }));
  if (pendingScore != null) {
    const insertAt = rows.findIndex(r => pendingScore > r.score);
    const idx = insertAt === -1 ? rows.length : insertAt;
    rows.splice(idx, 0, {
      name: nameInput.value.trim() || 'Jugador',
      score: pendingScore,
      lines,
      level,
      pending: true,
    });
  }
  const topRows = rows.slice(0, 5);

  let html = '';
  if (topRows.length === 0) {
    html += '<table class="records-table"><tbody><tr><td class="records-empty">Sin récords aún</td></tr></tbody></table>';
  } else {
    html += '<table class="records-table"><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Nivel</th></tr></thead><tbody>';
    topRows.forEach((r, i) => {
      const cls = r.pending ? ' class="records-highlight"' : '';
      html += `<tr${cls}><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.score.toLocaleString()}</td><td>${r.lines}</td><td>${r.level}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  html += `<div class="records-stats"><span>Mejor combo: ${recordsData.bestCombo}</span><span>Máx. líneas: ${recordsData.maxLines}</span></div>`;
  container.innerHTML = html;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
  } else {
    combo = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawNutHole(context, x, y, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.strokeStyle = COLORS[NUT];
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x * size + size / 2, y * size + size / 2, size * 0.32, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  if (current.type === NUT) drawNutHole(ctx, current.x + 1, gy + 1, BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.type === NUT) drawNutHole(ctx, current.x + 1, current.y + 1, BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  if (next.type === NUT) drawNutHole(nextCtx, offX + 1, offY + 1, NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');

  records = loadRecords();
  let statsChanged = false;
  if (maxCombo > records.bestCombo) { records.bestCombo = maxCombo; statsChanged = true; }
  if (lines > records.maxLines) { records.maxLines = lines; statsChanged = true; }
  if (statsChanged) saveRecords(records);

  pendingQualifies = records.scores.length < 5 || score > records.scores[records.scores.length - 1].score;
  if (pendingQualifies) {
    nameInput.value = '';
    nameInput.classList.remove('hidden');
    saveScoreBtn.classList.remove('hidden');
    renderRecordsTable(overlayRecordsEl, records, score);
    nameInput.focus();
  } else {
    nameInput.classList.add('hidden');
    saveScoreBtn.classList.add('hidden');
    renderRecordsTable(overlayRecordsEl, records);
  }
}

function isControlsVisible() {
  return !pauseControls.classList.contains('hidden');
}

function showControlsSubview() {
  pauseControls.classList.remove('hidden');
  toggleControlsBtn.textContent = 'Ocultar controles';
}

function hideControlsSubview() {
  pauseControls.classList.add('hidden');
  toggleControlsBtn.textContent = 'Ver controles';
}

function lockInputForOneFrame() {
  inputLocked = true;
  requestAnimationFrame(() => { inputLocked = false; });
}

function togglePause() {
  if (gameOver) return;
  if (menuOpen) {
    // Resume
    menuOpen = false;
    paused = false;
    pauseMenu.classList.add('hidden');
    hideControlsSubview();
    lockInputForOneFrame();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    // Open pause menu
    menuOpen = true;
    paused = true;
    cancelAnimationFrame(animId);
    pauseMenu.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  combo = 0;
  maxCombo = 0;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!current) return; // game not started yet (start screen showing)
  if (e.code === 'KeyP') { e.preventDefault(); togglePause(); return; }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (menuOpen && isControlsVisible()) {
      hideControlsSubview();
    } else if (!gameOver) {
      togglePause();
    }
    return;
  }
  if (paused || gameOver || menuOpen || inputLocked) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

resumeBtn.addEventListener('click', () => {
  if (menuOpen) togglePause();
});

pauseRestartBtn.addEventListener('click', () => {
  menuOpen = false;
  pauseMenu.classList.add('hidden');
  hideControlsSubview();
  init();
});

toggleControlsBtn.addEventListener('click', () => {
  if (isControlsVisible()) {
    hideControlsSubview();
  } else {
    showControlsSubview();
  }
});

saveScoreBtn.addEventListener('click', () => {
  if (!pendingQualifies) return;
  const name = (nameInput.value.trim() || 'Jugador').slice(0, 12);
  records.scores.push({ name, score, lines, level, date: new Date().toISOString() });
  records.scores.sort((a, b) => b.score - a.score);
  records.scores = records.scores.slice(0, 5);
  saveRecords(records);
  pendingQualifies = false;
  nameInput.classList.add('hidden');
  saveScoreBtn.classList.add('hidden');
  renderRecordsTable(overlayRecordsEl, records);
  renderRecordsTable(startRecordsEl, records);
});

nameInput.addEventListener('input', () => {
  if (pendingQualifies) renderRecordsTable(overlayRecordsEl, records, score);
});

startPlayBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

startResetBtn.addEventListener('click', () => {
  records = { scores: [], bestCombo: 0, maxLines: 0 };
  saveRecords(records);
  renderRecordsTable(startRecordsEl, records);
  renderRecordsTable(overlayRecordsEl, records);
});

initTheme();
initStartLevel();
renderRecordsTable(startRecordsEl, records);
