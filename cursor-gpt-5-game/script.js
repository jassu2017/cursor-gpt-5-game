"use strict";

// --- Config ---
const TILE_WIDTH_PX = 88; // keep in sync with CSS
const TILE_HEIGHT_PX = 112;
const STEP_X_PX = 56; // grid step x
const STEP_Y_PX = 40; // grid step y
const STACK_SHIFT_X_PX = 6; // per z layer
const STACK_SHIFT_Y_PX = 6; // per z layer (visual up)

// Layout: 144 tiles total
// z=0: 15 x 6 => 90 tiles
// z=1: 13 x 4 => 52 tiles
// z=2: 1 x 2  => 2 tiles

const AVENGERS_NAMES = [
  "Iron Man",
  "Captain America",
  "Thor",
  "Hulk",
  "Black Widow",
  "Hawkeye",
  "Spider-Man",
  "Black Panther",
  "Doctor Strange",
  "Scarlet Witch",
  "Vision",
  "Ant-Man",
  "Wasp",
  "Captain Marvel",
  "Falcon",
  "Winter Soldier",
  "Star-Lord",
  "Gamora",
  "Drax",
  "Rocket",
  "Groot",
  "Mantis",
  "Nebula",
  "Nick Fury",
  "War Machine",
  "Shuri",
  "Okoye",
  "Wong",
  "Valkyrie",
  "Korg",
  "Loki",
  "Heimdall",
  "Peggy Carter",
  "Quicksilver",
  "Kate Bishop",
  "Ms. Marvel",
];

// --- State ---
let tiles = []; // array of Tile
let selectedTileId = null;
let undoStack = []; // stack of { aId, bId }
let movesCount = 0;
let timerInterval = null;
let elapsedSeconds = 0;

// --- DOM ---
const boardEl = document.getElementById("board");
const boardWrapperEl = document.getElementById("board-wrapper");
const newGameBtn = document.getElementById("newGameBtn");
const undoBtn = document.getElementById("undoBtn");
const hintBtn = document.getElementById("hintBtn");
const movesEl = document.getElementById("movesCount");
const timeEl = document.getElementById("timeElapsed");
const pairsEl = document.getElementById("pairsRemaining");
const messageEl = document.getElementById("message");

// --- Types ---
/**
 * @typedef Tile
 * @property {number} id
 * @property {string} face
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {boolean} removed
 */

// --- Utility ---
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function hashStringToHue(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

function faceToColors(face) {
  const hue = hashStringToHue(face);
  const c1 = `hsl(${hue} 90% 70%)`;
  const c2 = `hsl(${(hue + 40) % 360} 80% 55%)`;
  return { c1, c2 };
}

function positionToCssLeft(x, z) {
  return x * STEP_X_PX + z * STACK_SHIFT_X_PX;
}
function positionToCssTop(y, z) {
  return y * STEP_Y_PX - z * STACK_SHIFT_Y_PX;
}

function computeBoardPixelSize(positions) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }
  const width = positionToCssLeft(maxX, maxZ) - positionToCssLeft(minX, 0) + TILE_WIDTH_PX + 20;
  const height = positionToCssTop(maxY, 0) - positionToCssTop(minY, maxZ) + TILE_HEIGHT_PX + 20;
  return { width, height };
}

function scaleBoardToFit(boardPixelSize) {
  const padding = 24;
  const availableW = Math.max(320, (boardWrapperEl.clientWidth || 320) - padding * 2);
  const availableH = Math.max(240, (boardWrapperEl.clientHeight || 500) - padding * 2);
  const scaleX = availableW / boardPixelSize.width;
  const scaleY = availableH / boardPixelSize.height;
  const scale = Math.min(1, Math.max(0.5, Math.min(scaleX, scaleY)));
  boardEl.style.transform = `scale(${scale})`;
}

// --- Layout ---
function generateTurtlePositions() {
  const positions = [];
  // z=0: 15x6 rectangle (x:0..14, y:0..5)
  for (let y = 0; y <= 5; y += 1) {
    for (let x = 0; x <= 14; x += 1) {
      positions.push({ x, y, z: 0 });
    }
  }
  // z=1: 13x4 rectangle centered (x:1..13, y:1..4)
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 1; x <= 13; x += 1) {
      positions.push({ x, y, z: 1 });
    }
  }
  // z=2: 1x2 at center column x=7, y:2..3
  for (let y = 2; y <= 3; y += 1) {
    positions.push({ x: 7, y, z: 2 });
  }
  return positions;
}

// --- Free/blocked logic ---
function getTileAtPosition(z, x, y) {
  return tiles.find((t) => !t.removed && t.z === z && t.x === x && t.y === y) || null;
}

function isTileFree(tile) {
  if (tile.removed) return false;
  // Blocked if a tile sits directly on top with same (x,y) at higher z
  for (let above = tile.z + 1; above <= 10; above += 1) {
    const topTile = getTileAtPosition(above, tile.x, tile.y);
    if (topTile) return false;
  }
  // Side freedom: at same z and same y, check immediate left and right cells
  const hasLeft = !!getTileAtPosition(tile.z, tile.x - 1, tile.y);
  const hasRight = !!getTileAtPosition(tile.z, tile.x + 1, tile.y);
  // Free if at least one side is open
  return !(hasLeft && hasRight);
}

// --- Rendering ---
function createTileElement(tile) {
  const el = document.createElement("div");
  el.className = "tile";
  el.dataset.id = String(tile.id);
  el.style.left = `${positionToCssLeft(tile.x, tile.z)}px`;
  el.style.top = `${positionToCssTop(tile.y, tile.z)}px`;
  el.style.zIndex = String(tile.z * 100 + tile.y * 2 + tile.x);

  const { c1, c2 } = faceToColors(tile.face);

  const icon = document.createElement("div");
  icon.className = "icon";
  icon.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  icon.style.border = "1px solid rgba(0,0,0,0.15)";
  icon.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 0 rgba(0,0,0,0.04)";
  icon.textContent = shortFace(tile.face);

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = tile.face;

  el.appendChild(icon);
  el.appendChild(label);

  el.addEventListener("click", () => onTileClicked(tile.id));
  return el;
}

function updateTileElementState(el, tile) {
  el.classList.toggle("removed", tile.removed);
  const free = isTileFree(tile);
  el.classList.toggle("free", free && !tile.removed);
  el.classList.toggle("blocked", !free && !tile.removed);
  el.classList.toggle("selected", selectedTileId === tile.id);
}

function shortFace(face) {
  // Create 2-3 letter code from face, e.g., "IM" for Iron Man
  const words = face.split(/\s|-/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  const firsts = words.map((w) => w[0]).slice(0, 3).join("").toUpperCase();
  return firsts;
}

function renderAll() {
  boardEl.innerHTML = "";
  for (const tile of tiles) {
    const el = createTileElement(tile);
    updateTileElementState(el, tile);
    boardEl.appendChild(el);
  }
  pairsEl.textContent = String(Math.floor(tiles.filter((t) => !t.removed).length / 2));
  movesEl.textContent = String(movesCount);
}

function refreshInteractiveStates() {
  const children = boardEl.children;
  for (let i = 0; i < children.length; i += 1) {
    const el = children[i];
    const id = Number(el.dataset.id);
    const tile = tiles[id];
    updateTileElementState(el, tile);
  }
  pairsEl.textContent = String(Math.floor(tiles.filter((t) => !t.removed).length / 2));
  movesEl.textContent = String(movesCount);
}

// --- Game logic ---
function dealNewGame() {
  stopTimer();
  elapsedSeconds = 0;
  timeEl.textContent = formatTime(0);
  movesCount = 0;
  undoStack = [];
  selectedTileId = null;
  messageEl.classList.add("hidden");
  messageEl.textContent = "";

  const positions = generateTurtlePositions();

  // Build a deck of 36 faces x 4 copies = 144
  const faces = [];
  for (const name of AVENGERS_NAMES) {
    for (let c = 0; c < 4; c += 1) faces.push(name);
  }
  if (faces.length !== positions.length) {
    console.warn("Deck size and positions size mismatch", faces.length, positions.length);
  }
  shuffleInPlace(faces);

  tiles = positions.map((pos, idx) => ({
    id: idx,
    face: faces[idx % faces.length],
    x: pos.x,
    y: pos.y,
    z: pos.z,
    removed: false,
  }));

  // Size and scale board
  const boardSize = computeBoardPixelSize(positions);
  boardEl.style.width = `${boardSize.width}px`;
  boardEl.style.height = `${boardSize.height}px`;
  scaleBoardToFit(boardSize);

  renderAll();
}

function ensureTimerStarted() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    timeEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function onTileClicked(tileId) {
  const tile = tiles[tileId];
  if (!tile || tile.removed) return;
  if (!isTileFree(tile)) return;

  ensureTimerStarted();

  if (selectedTileId == null) {
    selectedTileId = tileId;
    refreshInteractiveStates();
    return;
  }

  if (selectedTileId === tileId) {
    selectedTileId = null;
    refreshInteractiveStates();
    return;
  }

  const prev = tiles[selectedTileId];
  if (!prev || prev.removed) {
    selectedTileId = tileId;
    refreshInteractiveStates();
    return;
  }

  if (prev.face === tile.face) {
    // match
    prev.removed = true;
    tile.removed = true;
    undoStack.push({ aId: prev.id, bId: tile.id });
    selectedTileId = null;
    movesCount += 1;
    refreshInteractiveStates();
    checkWin();
  } else {
    // switch selection
    selectedTileId = tileId;
    refreshInteractiveStates();
  }
}

function checkWin() {
  const remaining = tiles.some((t) => !t.removed);
  if (!remaining) {
    stopTimer();
    messageEl.textContent = `You saved the universe in ${formatTime(elapsedSeconds)} with ${movesCount} moves!`;
    messageEl.classList.remove("hidden");
  }
}

function undo() {
  const last = undoStack.pop();
  if (!last) return;
  const a = tiles[last.aId];
  const b = tiles[last.bId];
  if (a) a.removed = false;
  if (b) b.removed = false;
  movesCount = Math.max(0, movesCount - 1);
  selectedTileId = null;
  refreshInteractiveStates();
}

function hint() {
  clearHint();
  const freeTiles = tiles.filter((t) => !t.removed && isTileFree(t));
  const map = new Map();
  for (const t of freeTiles) {
    const arr = map.get(t.face) || [];
    arr.push(t);
    map.set(t.face, arr);
  }
  for (const [face, arr] of map.entries()) {
    if (arr.length >= 2) {
      // highlight two
      highlightTiles([arr[0].id, arr[1].id]);
      return;
    }
  }
  flashMessage("No available matches. Try undo or start a new game.");
}

function highlightTiles(ids) {
  const set = new Set(ids);
  const children = boardEl.children;
  for (let i = 0; i < children.length; i += 1) {
    const el = children[i];
    const id = Number(el.dataset.id);
    el.classList.toggle("hint", set.has(id));
  }
  setTimeout(clearHint, 1500);
}

function clearHint() {
  const children = boardEl.children;
  for (let i = 0; i < children.length; i += 1) {
    children[i].classList.remove("hint");
  }
}

function flashMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
  setTimeout(() => messageEl.classList.add("hidden"), 1200);
}

// --- Events ---
newGameBtn.addEventListener("click", () => dealNewGame());
undoBtn.addEventListener("click", () => undo());
hintBtn.addEventListener("click", () => hint());

window.addEventListener("resize", () => {
  const positions = tiles.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const boardSize = computeBoardPixelSize(positions);
  scaleBoardToFit(boardSize);
});

// --- Init ---
dealNewGame();