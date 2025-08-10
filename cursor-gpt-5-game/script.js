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
<<<<<<< HEAD
let redoStack = []; // stack of { aId, bId }
=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c

// --- DOM ---
const boardEl = document.getElementById("board");
const boardWrapperEl = document.getElementById("board-wrapper");
const newGameBtn = document.getElementById("newGameBtn");
const undoBtn = document.getElementById("undoBtn");
const hintBtn = document.getElementById("hintBtn");
<<<<<<< HEAD
const redoBtn = document.getElementById("redoBtn");
=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
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

function generateFortressPositions() {
  // A winged/stepped shape totaling 144 tiles:
  // z=0: 90, z=1: 40, z=2: 14
  const positions = [];
  // z=0 stepped base
  const z0Rows = [
    { y: 0, x0: 0, x1: 13 }, // 14
    { y: 1, x0: 0, x1: 13 }, // 14
    { y: 2, x0: 0, x1: 13 }, // 14
    { y: 3, x0: 0, x1: 13 }, // 14
    { y: 4, x0: 1, x1: 12 }, // 12
    { y: 5, x0: 1, x1: 12 }, // 12
    { y: 6, x0: 2, x1: 11 }, // 10
  ];
  for (const r of z0Rows) {
    for (let x = r.x0; x <= r.x1; x += 1) positions.push({ x, y: r.y, z: 0 });
  }
  // z=1 inner rectangle (4 rows of 10 each)
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 2; x <= 11; x += 1) positions.push({ x, y, z: 1 });
  }
  // z=2 center block (2 rows of 7 each)
  for (let y = 2; y <= 3; y += 1) {
    for (let x = 4; x <= 10; x += 1) positions.push({ x, y, z: 2 });
  }
  return positions;
}

<<<<<<< HEAD
function generateFishPositions() {
  const positions = [];
  // z=0 (base): 14x7 rectangle with a "tail"
  // Main body
  for (let y = 0; y <= 6; y += 1) {
    for (let x = 0; x <= 13; x += 1) {
      positions.push({ x, y, z: 0 });
    }
  }
  // Tail part (extends from y=2 to y=4, x=14)
  for (let y = 2; y <= 4; y += 1) {
    positions.push({ x: 14, y, z: 0 });
  }

  // z=1: 12x5 rectangle
  for (let y = 1; y <= 5; y += 1) {
    for (let x = 1; x <= 12; x += 1) {
      positions.push({ x, y, z: 1 });
    }
  }

  // z=2: 10x3 rectangle
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 11; x += 1) {
      positions.push({ x, y, z: 2 });
    }
  }

  // z=3: 8x1 rectangle
  for (let x = 3; x <= 10; x += 1) {
    positions.push({ x, y: 3, z: 3 });
  }
  return positions;
}

function generateButterflyPositions() {
  const positions = [];
  // z=0 (base): Two wings of 5x6 each, separated by a gap, plus a 3x2 center block
  // Left wing
  for (let y = 0; y <= 5; y += 1) {
    for (let x = 0; x <= 4; x += 1) {
      positions.push({ x, y, z: 0 });
    }
  }
  // Right wing
  for (let y = 0; y <= 5; y += 1) {
    for (let x = 9; x <= 13; x += 1) {
      positions.push({ x, y, z: 0 });
    }
  }
  // Center body base
  for (let y = 2; y <= 3; y += 1) {
    for (let x = 6; x <= 7; x += 1) {
      positions.push({ x, y, z: 0 });
    }
  }

  // z=1: Two wings of 3x4 each, plus a 1x2 center block
  // Left wing
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      positions.push({ x, y, z: 1 });
    }
  }
  // Right wing
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 10; x <= 12; x += 1) {
      positions.push({ x, y, z: 1 });
    }
  }
  // Center body
  for (let y = 2; y <= 3; y += 1) {
    positions.push({ x: 6, y, z: 1 });
  }

  // z=2: Two 1x2 blocks
  // Left
  for (let y = 2; y <= 3; y += 1) {
    positions.push({ x: 2, y, z: 2 });
  }
  // Right
  for (let y = 2; y <= 3; y += 1) {
    positions.push({ x: 11, y, z: 2 });
  }

  // z=3: Single tile in center
  positions.push({ x: 6, y: 2, z: 3 });
  return positions;
}

=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
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

// --- Helpers for hint ---
function getOpenSides(tile) {
  // Assumes tile is free
  const hasLeft = !!getTileAtPosition(tile.z, tile.x - 1, tile.y);
  const hasRight = !!getTileAtPosition(tile.z, tile.x + 1, tile.y);
  return { leftOpen: !hasLeft, rightOpen: !hasRight };
}

function sideText(sides) {
  if (sides.leftOpen && sides.rightOpen) return "both sides open";
  if (sides.leftOpen) return "left side open";
  if (sides.rightOpen) return "right side open";
  return "no side open"; // shouldn't happen for a free tile
}

// --- Game logic ---
function dealNewGame() {
  stopTimer();
  elapsedSeconds = 0;
  timeEl.textContent = formatTime(0);
  movesCount = 0;
  undoStack = [];
<<<<<<< HEAD
  redoStack = []; // Clear redo stack on new game
=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
  selectedTileId = null;
  messageEl.classList.add("hidden");
  messageEl.textContent = "";

  // Choose a layout at random
<<<<<<< HEAD
  const layoutFns = [generateTurtlePositions, generateFortressPositions, generateFishPositions, generateButterflyPositions];
=======
  const layoutFns = [generateTurtlePositions, generateFortressPositions];
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
  const positions = layoutFns[Math.floor(Math.random() * layoutFns.length)]();

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

<<<<<<< HEAD
  // Clear redo stack on any new move
  redoStack = [];

=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
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
<<<<<<< HEAD
  redoStack.push({ aId: a.id, bId: b.id }); // Push undone move to redo stack
=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
  movesCount = Math.max(0, movesCount - 1);
  selectedTileId = null;
  refreshInteractiveStates();
}

<<<<<<< HEAD
function redo() {
  const last = redoStack.pop();
  if (!last) return;
  const a = tiles[last.aId];
  const b = tiles[last.bId];
  if (a) a.removed = true;
  if (b) b.removed = true;
  movesCount = movesCount + 1;
  selectedTileId = null;
  refreshInteractiveStates();
  checkWin();
}

=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
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
      const a = arr[0];
      const b = arr[1];
      // highlight two with strong style
      highlightTiles([a.id, b.id], true);
      const sa = sideText(getOpenSides(a));
      const sb = sideText(getOpenSides(b));
      messageEl.textContent = `Hint: Match ${face}. Tile A at z${a.z}, r${a.y}, c${a.x} (${sa}) and Tile B at z${b.z}, r${b.y}, c${b.x} (${sb}).`;
      messageEl.classList.remove("hidden");
      setTimeout(() => messageEl.classList.add("hidden"), 2200);
      return;
    }
  }
  messageEl.textContent = "No available matches. Try undo or start a new game.";
  messageEl.classList.remove("hidden");
  setTimeout(() => messageEl.classList.add("hidden"), 1500);
}

function highlightTiles(ids, strong = false) {
  const set = new Set(ids);
  const children = boardEl.children;
  for (let i = 0; i < children.length; i += 1) {
    const el = children[i];
    const id = Number(el.dataset.id);
    const on = set.has(id);
    el.classList.toggle("hint", on);
    el.classList.toggle("hint-strong", strong && on);
  }
  setTimeout(clearHint, 2000);
}

function clearHint() {
  const children = boardEl.children;
  for (let i = 0; i < children.length; i += 1) {
    children[i].classList.remove("hint");
    children[i].classList.remove("hint-strong");
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
<<<<<<< HEAD
redoBtn.addEventListener("click", () => redo());
=======
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c

window.addEventListener("resize", () => {
  const positions = tiles.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const boardSize = computeBoardPixelSize(positions);
  scaleBoardToFit(boardSize);
});

// --- Init ---
<<<<<<< HEAD
dealNewGame();
=======
dealNewGame();
>>>>>>> 0c1d2a863679e7e7c1601771887912c680847b3c
