// ---------------------------------------------------------------------------
// Socket.io client
// ---------------------------------------------------------------------------
const socket = io();

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const lobbyEl = document.getElementById("lobby");
const roomViewEl = document.getElementById("room-view");
const roomLobbyEl = document.getElementById("room-lobby");
const roomGameEl = document.getElementById("room-game");
const usernameInput = document.getElementById("username-input");
const roomCodeInput = document.getElementById("room-code-input");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const lobbyErrorEl = document.getElementById("lobby-error");
const soundToggleBtn = document.getElementById("sound-toggle-btn");

// Lobby room header
const roomCodeEl = document.getElementById("room-code");
const inviteBtn = document.getElementById("invite-btn");
const playerCountEl = document.getElementById("player-count");
const playerListEl = document.getElementById("player-list");
const startGameBtn = document.getElementById("start-game-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const roundsSelectEl = document.getElementById("rounds-select");
const roundsDisplayEl = document.getElementById("rounds-display");
const startErrorEl = document.getElementById("start-error");
const drawingTimeSelectEl = document.getElementById("drawing-time-select");
const drawingTimeDisplayEl = document.getElementById("drawing-time-display");
const hintCountSelectEl = document.getElementById("hint-count-select");
const hintCountDisplayEl = document.getElementById("hint-count-display");

// Game sidebar
const gameSidebar = document.getElementById("game-sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const sidebarRoomCode = document.getElementById("sidebar-room-code");
const sidebarInviteBtn = document.getElementById("sidebar-invite-btn");
const sidebarPlayerCount = document.getElementById("sidebar-player-count");
const sidebarPlayerList = document.getElementById("sidebar-player-list");
const sidebarLeaveBtn = document.getElementById("sidebar-leave-btn");

// Game center
const gameRoundEl = document.getElementById("game-round");
const gameWordDisplayEl = document.getElementById("game-word-display");
const gameTimerEl = document.getElementById("game-timer");
const gameDrawerEl = document.getElementById("game-drawer");
const gameWordBannerEl = document.getElementById("game-word-banner");
const gameTimerFillEl = document.getElementById("game-timer-fill");

// Reactions
const reactThumbsUpBtn = document.getElementById("react-thumbsup");
const reactHeartBtn = document.getElementById("react-heart");
const reactionThumbsUpCountEl = document.getElementById("reaction-thumbsup-count");
const reactionHeartCountEl = document.getElementById("reaction-heart-count");

// Drawing (game view)
const canvas = document.getElementById("drawing-canvas");
const ctx = canvas.getContext("2d");
const shapePreviewCanvas = document.getElementById("shape-preview-canvas");
const shapePreviewCtx = shapePreviewCanvas.getContext("2d");
const colorPaletteGameEl = document.getElementById("color-palette-game");
const colorInput = document.createElement("input");
const brushSizeInput = document.getElementById("brush-size-input-game");
const eraserBtn = document.getElementById("eraser-btn-game");
const clearCanvasBtn = document.getElementById("clear-canvas-btn-game");
const undoBtn = document.getElementById("undo-btn-game");
const fillBtn = document.getElementById("fill-btn-game");
const colorIndicator = document.getElementById("color-indicator");
const brushSizeDownBtn = document.getElementById("brush-size-down");
const brushSizeUpBtn = document.getElementById("brush-size-up");
const colorsToggle = document.getElementById("colors-toggle");
const colorsPanel = document.getElementById("colors-panel");
const shapesToggle = document.getElementById("shapes-toggle");
const shapesPanel = document.getElementById("shapes-panel");
const sizeToggle = document.getElementById("size-toggle");
const sizePanel = document.getElementById("size-panel");

// Mobile game header + controls
const mobileRoundInfoEl = document.getElementById("mobile-round-info");
const mobileTimerEl = document.getElementById("mobile-timer");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileSoundBtn = document.getElementById("mobile-sound-btn");
const mobileGuessRow = document.getElementById("mobile-guess-row");
const mobileGuessInput = document.getElementById("mobile-guess-input");
const mobileGuessSend = document.getElementById("mobile-guess-send");
const mobileHintsEl = document.getElementById("mobile-hints");
const mobileCategoryEl = document.getElementById("mobile-category");
const mobilePlayerListEl = document.getElementById("mobile-player-list");
const mobilePlayerCountEl = document.getElementById("mobile-player-count");
const mobileSheetRoomCodeEl = document.getElementById("mobile-sheet-room-code");
const mobileDrawTimeEl = document.getElementById("mobile-draw-time");
const mobileHintCountEl = document.getElementById("mobile-hint-count");
const mobileRoundsEl = document.getElementById("mobile-rounds");
const mobileLeaveBtn = document.getElementById("mobile-leave-btn");
const mobileInviteBtn = document.getElementById("mobile-invite-btn");

// Mobile bottom sheet
const mobileSheetEl = document.getElementById("game-chat");
const mobileSheetBackdrop = document.getElementById("mobile-sheet-backdrop");
const sheetCloseBtn = document.getElementById("sheet-close-btn");
const sheetTabBtns = document.querySelectorAll(".sheet-tab");

// Chat (two instances)
const chatMessagesLobbyEl = document.getElementById("chat-messages-lobby");
const chatInputLobbyEl = document.getElementById("chat-input-lobby");
const chatSendBtnLobbyEl = document.getElementById("chat-send-btn-lobby");
const chatMessagesGameEl = document.getElementById("chat-messages-game");
const chatInputGameEl = document.getElementById("chat-input-game");
const chatSendBtnGameEl = document.getElementById("chat-send-btn-game");

// Scoreboard
const scoreboardModalEl = document.getElementById("scoreboard-modal");
const winnerTextEl = document.getElementById("winner-text");
const scoreboardListEl = document.getElementById("scoreboard-list");
const playAgainBtn = document.getElementById("play-again-btn");
const waitingTextEl = document.getElementById("waiting-text");

// ---------------------------------------------------------------------------
// Game state (mirrored from the server)
// ---------------------------------------------------------------------------
let currentGameStatus = "LOBBY";
let prevGameStatus = "LOBBY";
let currentDrawerId = null;
let roomPlayerCount = 0;
let amLeader = false;
let myWord = null;
let wordLength = 0;
let turnDuration = 60;
let choosingPhase = false;
let wordOptions = [];
let currentDrawerName = null;
let hasReactedThisTurn = false;
let revealedLetters = [];
let maxHints = 2;
let currentCategory = null;

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const PALETTE_COLORS = [
  "#000000", "#ffffff", "#e74c3c", "#e67e22", "#f1c40f",
  "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#e91e63",
  "#795548", "#95a5a6",
];

colorInput.type = "color";
colorInput.value = "#000000";
colorInput.style.display = "none";
document.body.appendChild(colorInput);

let eraserActive = false;
let fillActive = false;

function updateColorIndicator() {
  colorIndicator.style.background = colorInput.value;
}

function setColor(color) {
  colorInput.value = color;
  eraserActive = false;
  fillActive = false;
  fillBtn.classList.remove("active");
  currentShape = "freehand";
  eraserBtn.classList.remove("active");
  updateColorIndicator();
  updateShapeButtons();
  colorPaletteGameEl.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === color);
  });
}

function setEraser() {
  eraserActive = true;
  fillActive = false;
  fillBtn.classList.remove("active");
  eraserBtn.classList.add("active");
  currentShape = "freehand";
  colorPaletteGameEl.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
  colorInput.value = "#ffffff";
  updateColorIndicator();
  updateShapeButtons();
}

function setFill() {
  if (fillActive) {
    fillActive = false;
    fillBtn.classList.remove("active");
    return;
  }
  fillActive = true;
  eraserActive = false;
  currentShape = "freehand";
  eraserBtn.classList.remove("active");
  fillBtn.classList.add("active");
  updateShapeButtons();
}

function floodFill(startX, startY, fillColorHex) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  const fillRGB = hexToRgb(fillColorHex);
  if (!fillRGB) return;

  const idx = (startY * w + startX) * 4;
  const startR = data[idx];
  const startG = data[idx + 1];
  const startB = data[idx + 2];
  const startA = data[idx + 3];

  if (startR === fillRGB.r && startG === fillRGB.g && startB === fillRGB.b && startA === 255) return;

  const tolerance = 30;
  function matchesStart(i) {
    return Math.abs(data[i] - startR) <= tolerance &&
           Math.abs(data[i + 1] - startG) <= tolerance &&
           Math.abs(data[i + 2] - startB) <= tolerance &&
           Math.abs(data[i + 3] - startA) <= tolerance;
  }

  const stack = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const pi = cy * w + cx;
    if (visited[pi]) continue;
    const ci = pi * 4;
    if (!matchesStart(ci)) continue;

    visited[pi] = 1;
    data[ci] = fillRGB.r;
    data[ci + 1] = fillRGB.g;
    data[ci + 2] = fillRGB.b;
    data[ci + 3] = 255;

    stack.push([cx + 1, cy]);
    stack.push([cx - 1, cy]);
    stack.push([cx, cy + 1]);
    stack.push([cx, cy - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

PALETTE_COLORS.forEach((color) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "swatch" + (color === "#000000" ? " active" : "");
  btn.dataset.color = color;
  btn.style.background = color;
  btn.title = color;
  btn.addEventListener("click", () => setColor(color));
  colorPaletteGameEl.appendChild(btn);
});

updateColorIndicator();

eraserBtn.addEventListener("click", setEraser);
fillBtn.addEventListener("click", setFill);

// ---------------------------------------------------------------------------
// Shape tools
// ---------------------------------------------------------------------------
let currentShape = "freehand";
const shapeBtns = document.querySelectorAll(".shape-btn");

function updateShapeButtons() {
  shapeBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.shape === currentShape);
  });
}

function updateToolbarState() {
  const isDrawer = amCurrentDrawer();
  const pointerEvents = isDrawer ? "" : "none";
  const opacity = isDrawer ? "1" : "0.35";
  colorPaletteGameEl.style.pointerEvents = pointerEvents;
  colorPaletteGameEl.style.opacity = opacity;
  eraserBtn.style.pointerEvents = pointerEvents;
  eraserBtn.style.opacity = opacity;
  fillBtn.style.pointerEvents = pointerEvents;
  fillBtn.style.opacity = opacity;
  clearCanvasBtn.style.pointerEvents = pointerEvents;
  clearCanvasBtn.style.opacity = opacity;
  undoBtn.style.pointerEvents = pointerEvents;
  undoBtn.style.opacity = opacity;
  colorsToggle.style.pointerEvents = pointerEvents;
  colorsToggle.style.opacity = opacity;
  shapesToggle.style.pointerEvents = pointerEvents;
  shapesToggle.style.opacity = opacity;
  sizeToggle.style.pointerEvents = pointerEvents;
  sizeToggle.style.opacity = opacity;
  brushSizeInput.style.pointerEvents = pointerEvents;
  brushSizeInput.style.opacity = opacity;
  brushSizeDownBtn.style.pointerEvents = pointerEvents;
  brushSizeDownBtn.style.opacity = opacity;
  brushSizeUpBtn.style.pointerEvents = pointerEvents;
  brushSizeUpBtn.style.opacity = opacity;
  colorPaletteGameEl.querySelectorAll(".swatch").forEach((s) => {
    s.style.pointerEvents = pointerEvents;
  });
  shapeBtns.forEach((b) => {
    b.style.pointerEvents = pointerEvents;
    b.style.opacity = opacity;
  });
}

shapeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentShape = btn.dataset.shape;
    eraserActive = false;
    fillActive = false;
    fillBtn.classList.remove("active");
    eraserBtn.classList.remove("active");
    colorPaletteGameEl.querySelectorAll(".swatch").forEach((s) => {
      s.classList.toggle("active", s.dataset.color === colorInput.value);
    });
    updateShapeButtons();
    closeAllDropdowns();
  });
});

// Dropdown toggles
function closeAllDropdowns() {
  colorsPanel.classList.remove("open");
  shapesPanel.classList.remove("open");
  sizePanel.classList.remove("open");
  colorsToggle.classList.remove("active");
  shapesToggle.classList.remove("active");
  sizeToggle.classList.remove("active");
}

// ---------------------------------------------------------------------------
// Mobile compact toolbar — popover panels
// ---------------------------------------------------------------------------
function isMobileToolbarLayout() {
  return window.matchMedia("(max-width: 719px), (max-width: 820px) and (orientation: portrait)").matches;
}

function positionMobilePopup(panelEl) {
  if (!isMobileToolbarLayout()) {
    panelEl.style.position = "";
    panelEl.style.top = "";
    panelEl.style.left = "";
    panelEl.style.maxHeight = "";
    panelEl.style.overflowY = "";
    return;
  }
  const toolbarEl = document.querySelector(".canvas-toolbar");
  if (!toolbarEl) return;
  const tr = toolbarEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const gap = 6;
  const maxHeight = Math.max(140, Math.round(vh * 0.42));

  panelEl.style.position = "fixed";
  panelEl.style.top = "0px";
  panelEl.style.left = "0px";
  panelEl.style.maxHeight = maxHeight + "px";
  panelEl.style.overflowY = "auto";

  const pw = panelEl.offsetWidth;
  const ph = Math.min(panelEl.offsetHeight, maxHeight);

  let top = tr.bottom + gap;
  if (top + ph > vh - gap) {
    top = tr.top - gap - ph;
    if (top < gap) top = gap;
  }
  let left = Math.round(tr.left + tr.width / 2 - pw / 2);
  left = Math.max(gap, Math.min(left, vw - pw - gap));

  panelEl.style.top = top + "px";
  panelEl.style.left = left + "px";
}

function repositionMobilePopups() {
  const openPanel = document.querySelector(".tool-dropdown-panel.open");
  if (openPanel) positionMobilePopup(openPanel);
}

colorsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = colorsPanel.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    colorsPanel.classList.add("open");
    colorsToggle.classList.add("active");
    positionMobilePopup(colorsPanel);
  }
});

shapesToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = shapesPanel.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    shapesPanel.classList.add("open");
    shapesToggle.classList.add("active");
    positionMobilePopup(shapesPanel);
  }
});

sizeToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = sizePanel.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    sizePanel.classList.add("open");
    sizeToggle.classList.add("active");
    positionMobilePopup(sizePanel);
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".tool-dropdown")) {
    closeAllDropdowns();
  }
});

window.addEventListener("resize", repositionMobilePopups);
window.addEventListener("orientationchange", () => {
  setTimeout(repositionMobilePopups, 150);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", repositionMobilePopups);
}

// Brush size
brushSizeDownBtn.addEventListener("click", () => {
  brushSizeInput.value = Math.max(1, Number(brushSizeInput.value) - 1);
});
brushSizeUpBtn.addEventListener("click", () => {
  brushSizeInput.value = Math.min(30, Number(brushSizeInput.value) + 1);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function showLobbyError(message) {
  lobbyErrorEl.textContent = message;
  lobbyErrorEl.classList.remove("hidden");
}

function clearLobbyError() {
  lobbyErrorEl.textContent = "";
  lobbyErrorEl.classList.add("hidden");
}

function avatarLetter(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

function isInRoom() {
  return !roomViewEl.classList.contains("hidden");
}

function amCurrentDrawer() {
  return currentGameStatus === "PLAYING" && socket.id === currentDrawerId && !choosingPhase;
}

function updateChatDisabledState() {
  const isDrawer = amCurrentDrawer();
  chatInputGameEl.disabled = isDrawer;
  chatSendBtnGameEl.disabled = isDrawer;
  chatInputGameEl.placeholder = isDrawer ? "You are drawing…" : "Type your guess…";
  updateMobileUI();
}

function updateReactionState() {
  const canReact = !hasReactedThisTurn && currentGameStatus === "PLAYING" && !choosingPhase;
  reactThumbsUpBtn.disabled = !canReact;
  reactHeartBtn.disabled = !canReact;
  reactThumbsUpBtn.style.opacity = canReact ? "1" : "0.4";
  reactHeartBtn.style.opacity = canReact ? "1" : "0.4";
  reactThumbsUpBtn.style.cursor = canReact ? "pointer" : "not-allowed";
  reactHeartBtn.style.cursor = canReact ? "pointer" : "not-allowed";
}

function isGameActive() {
  return currentGameStatus === "PLAYING" || currentGameStatus === "ROUND_END";
}

// True when this client is the drawer, including during the word-choosing phase.
function isCurrentDrawer() {
  return currentGameStatus === "PLAYING" && socket.id === currentDrawerId;
}

function formatTime(sec) {
  if (typeof sec !== "number" || !isFinite(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Mobile UI helpers (no-ops on desktop where these elements are hidden)
// ---------------------------------------------------------------------------
function updateMobileHints() {
  if (!mobileHintsEl) return;
  if (currentGameStatus === "PLAYING" && wordLength > 0 && !isCurrentDrawer()) {
    const used = revealedLetters.length;
    const total = maxHints;
    let txt;
    if (total <= 0) {
      txt = "No hints";
    } else if (used >= total) {
      txt = "No hints left";
    } else {
      txt = `Hints left: ${total - used}`;
    }
    mobileHintsEl.innerHTML = `${lucideIcon("lightbulb")} ${txt}`;
    refreshIcons();
  } else {
    mobileHintsEl.innerHTML = "";
  }
}

function updateMobileCategory() {
  if (!mobileCategoryEl) return;
  if (currentCategory && currentGameStatus === "PLAYING") {
    mobileCategoryEl.textContent = `Category: ${currentCategory}`;
    mobileCategoryEl.classList.remove("hidden");
  } else {
    mobileCategoryEl.textContent = "";
    mobileCategoryEl.classList.add("hidden");
  }
}

function updateMobileMode() {
  if (!roomGameEl) return;
  const inActiveGame = currentGameStatus === "PLAYING";
  const isDrawer = isCurrentDrawer();
  roomGameEl.classList.toggle("mode-drawer", inActiveGame && isDrawer);
  roomGameEl.classList.toggle("mode-guesser", inActiveGame && !isDrawer);
  roomGameEl.classList.toggle("mode-idle", !inActiveGame);
}

function updateMobileGuessState() {
  if (!mobileGuessRow) return;
  const show = currentGameStatus === "PLAYING" && !isCurrentDrawer() && !choosingPhase;
  mobileGuessRow.classList.toggle("hidden", !show);
  if (mobileGuessInput) mobileGuessInput.disabled = !show;
  if (mobileGuessSend) mobileGuessSend.disabled = !show;
}

function updateMobileUI() {
  updateMobileMode();
  updateMobileGuessState();
}

usernameInput.value = localStorage.getItem("dg-username") || "";

// ---------------------------------------------------------------------------
// Helpers (icons)
// ---------------------------------------------------------------------------
function lucideIcon(name) {
  return `<i data-lucide="${name}"></i>`;
}

function refreshIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------
function getInviteUrl() {
  const code = roomCodeEl.textContent;
  const base = window.location.origin + window.location.pathname;
  return base + "?room=" + code;
}

function copyInvite() {
  const url = getInviteUrl();
  navigator.clipboard.writeText(url).then(() => {
    showToast("Invite link copied!");
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("Invite link copied!");
  });
}

inviteBtn.addEventListener("click", copyInvite);
sidebarInviteBtn.addEventListener("click", copyInvite);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function createRoom() {
  const username = usernameInput.value.trim();
  if (!username) {
    showLobbyError("Please enter a username first.");
    return;
  }
  clearLobbyError();
  localStorage.setItem("dg-username", username);
  socket.emit("create_room", { username });
}

function joinRoom(roomId) {
  const username = usernameInput.value.trim();
  const code = roomId || roomCodeInput.value.trim().toUpperCase();

  if (!username) {
    showLobbyError("Please enter a username first.");
    return;
  }
  if (!code || code.length !== 6) {
    showLobbyError("Please enter the 6-character room code.");
    return;
  }
  clearLobbyError();
  localStorage.setItem("dg-username", username);
  socket.emit("join_room", { roomId: code, username });
}

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", () => joinRoom());

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createRoom();
});
roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
roomCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom();
});

startGameBtn.addEventListener("click", () => {
  startErrorEl.classList.add("hidden");
  startGameBtn.disabled = true;
  socket.emit("start_game", { numRounds: Number(roundsSelectEl.value) || 5 });
});

drawingTimeSelectEl.addEventListener("change", () => {
  socket.emit("set_game_settings", { drawingTime: Number(drawingTimeSelectEl.value) });
});

hintCountSelectEl.addEventListener("change", () => {
  socket.emit("set_game_settings", { hintCount: Number(hintCountSelectEl.value) });
});

leaveRoomBtn.addEventListener("click", () => {
  socket.emit("leave_room");
  resetRoomUI();
});
sidebarLeaveBtn.addEventListener("click", () => {
  socket.emit("leave_room");
  resetRoomUI();
});

// Sidebar toggle
let sidebarCollapsed = false;
sidebarToggleBtn.addEventListener("click", () => {
  sidebarCollapsed = !sidebarCollapsed;
  gameSidebar.classList.toggle("collapsed", sidebarCollapsed);
  sidebarToggleBtn.innerHTML = sidebarCollapsed ? lucideIcon("panel-left-open") : lucideIcon("panel-left-close");
  refreshIcons();
});

// Mobile bottom sheet (Chat / Players / More)
function setSheetTab(name) {
  sheetTabBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.sheetTab === name);
  });
  document.querySelectorAll(".sheet-pane").forEach((p) => {
    p.classList.toggle("active", p.dataset.pane === name);
  });
  if (name === "chat") {
    requestAnimationFrame(() => {
      chatMessagesGameEl.scrollTop = chatMessagesGameEl.scrollHeight;
    });
  }
}

function openSheet(name) {
  if (!mobileSheetEl) return;
  mobileSheetEl.classList.remove("minimized");
  mobileSheetEl.classList.add("sheet-open");
  if (name) setSheetTab(name);
}

function closeSheet() {
  if (!mobileSheetEl) return;
  mobileSheetEl.classList.add("minimized");
  mobileSheetEl.classList.remove("sheet-open");
}

sheetTabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    openSheet(btn.dataset.sheetTab);
  });
});

if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", closeSheet);
if (mobileSheetBackdrop) mobileSheetBackdrop.addEventListener("click", closeSheet);
if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => openSheet("more"));

function resetRoomUI() {
  currentGameStatus = "LOBBY";
  document.body.dataset.gameStatus = "LOBBY";
  currentDrawerId = null;
  currentDrawerName = null;
  roomPlayerCount = 0;
  amLeader = false;
  myWord = null;
  wordLength = 0;
  currentCategory = null;
  turnDuration = 60;
  choosingPhase = false;
  wordOptions = [];
  isDrawing = false;
  revealedLetters = [];
  maxHints = 2;
  shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);

  scoreboardModalEl.classList.add("hidden");
  const restartCountdownEl = document.getElementById("game-restart-countdown");
  if (restartCountdownEl) restartCountdownEl.remove();
  roomViewEl.classList.add("hidden");
  lobbyEl.classList.remove("hidden");

  // Reset chat
  chatMessagesLobbyEl.innerHTML = "";
  chatMessagesGameEl.innerHTML = "";

  // Reset drawing history
  resetDrawHistory();

  // Reset sidebar
  sidebarCollapsed = false;
  gameSidebar.classList.remove("collapsed");
  sidebarToggleBtn.innerHTML = lucideIcon("panel-left-close");
  refreshIcons();

  // Reset reactions
  hasReactedThisTurn = false;
  reactionThumbsUpCountEl.textContent = "0";
  reactionHeartCountEl.textContent = "0";
  updateReactionState();

  clearCanvas();
  playerListEl.innerHTML = "";
  sidebarPlayerList.innerHTML = "";
  if (mobilePlayerListEl) mobilePlayerListEl.innerHTML = "";
  if (mobileGuessRow) mobileGuessRow.classList.add("hidden");
  if (mobileHintsEl) mobileHintsEl.textContent = "";
  closeSheet();
  gameWordBannerEl.textContent = "Waiting for players to join…";
  gameRoundEl.textContent = "Round —";
  gameTimerEl.textContent = "—";
  gameTimerEl.classList.remove("low");
  gameTimerFillEl.style.width = "0%";
  gameTimerFillEl.classList.remove("low");
  gameWordDisplayEl.innerHTML = "Word: -----";
  gameDrawerEl.textContent = "Drawer: —";
  roundsSelectEl.classList.add("hidden");
  roundsDisplayEl.classList.remove("hidden");
  roundsDisplayEl.textContent = "5 Rounds";
  drawingTimeSelectEl.classList.add("hidden");
  drawingTimeDisplayEl.classList.remove("hidden");
  drawingTimeDisplayEl.textContent = "60 seconds";
  hintCountSelectEl.classList.add("hidden");
  hintCountDisplayEl.classList.remove("hidden");
  hintCountDisplayEl.textContent = "2 hints";
  startErrorEl.classList.add("hidden");
  updateToolbarState();
  refreshIcons();
}

// ---------------------------------------------------------------------------
// Switch between lobby and game views
function switchToGameView() {
  roomLobbyEl.classList.add("hidden");
  roomGameEl.classList.remove("hidden");
}

function switchToLobbyView() {
  roomGameEl.classList.add("hidden");
  roomLobbyEl.classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------
function showScoreboard(players) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = sorted.length ? sorted[0].score : 0;
  const winners = sorted.filter((p) => p.score === top);

  winnerTextEl.innerHTML =
    winners.length === 1
      ? `${lucideIcon("trophy")} ${winners[0].username} wins with ${top} points!`
      : `${lucideIcon("trophy")} It's a tie between ${winners.map((w) => w.username).join(" and ")} (${top} pts)!`;

  scoreboardListEl.innerHTML = "";
  sorted.forEach((p, i) => {
    const li = document.createElement("li");
    if (top > 0 && p.score === top) li.classList.add("winner");

    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = `${i + 1}.`;

    const name = document.createElement("span");
    name.className = "player-name";
    if (top > 0 && p.score === top) {
      name.innerHTML = `${lucideIcon("trophy")} ${p.username}`;
    } else {
      name.textContent = p.username;
    }

    const score = document.createElement("span");
    score.className = "player-score";
    score.textContent = `${p.score || 0} pts`;

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(score);
    scoreboardListEl.appendChild(li);
  });

  playAgainBtn.classList.add("hidden");
  waitingTextEl.classList.add("hidden");
  // Remove any restart countdown
  const restartEl = document.getElementById("game-restart-countdown");
  if (restartEl) restartEl.remove();
  scoreboardModalEl.classList.remove("hidden");
  refreshIcons();
}

// ---------------------------------------------------------------------------
// Render room state
function renderRoom(room) {
  lobbyEl.classList.add("hidden");
  roomViewEl.classList.remove("hidden");

  currentGameStatus = room.gameStatus;
  document.body.dataset.gameStatus = currentGameStatus;

  // When a round starts, make sure the chat/guess input is visible on mobile
  if (currentGameStatus === "PLAYING" && prevGameStatus !== "PLAYING") {
    openSheet("chat");
  }
  prevGameStatus = currentGameStatus;
  currentDrawerId = room.currentDrawer;
  roomPlayerCount = room.playerCount;
  amLeader = room.players.some((p) => p.socketId === socket.id && p.isLeader);

  choosingPhase = currentGameStatus === "PLAYING" && room.phase === "choosing";
  wordLength = room.wordLength || 0;
  maxHints = room.maxHints !== undefined ? room.maxHints : (room.hintCount !== undefined ? room.hintCount : 2);
  currentCategory = room.category || null;
  if (room.revealedLetters && room.phase === "drawing") {
    revealedLetters = room.revealedLetters;
  }
  const currentDrawerPlayer = room.players.find((p) => p.socketId === room.currentDrawer);
  currentDrawerName = currentDrawerPlayer ? currentDrawerPlayer.username : null;

  // Switch between lobby and game views
  if (currentGameStatus === "PLAYING" || currentGameStatus === "ROUND_END" || currentGameStatus === "GAME_OVER") {
    switchToGameView();
  } else {
    switchToLobbyView();
  }
  updateToolbarState();

  // ---- Lobby header ----
  roomCodeEl.textContent = room.id;
  playerCountEl.textContent = `${room.playerCount} / ${room.maxPlayers} players`;

  const canEditSettings = amLeader && currentGameStatus === "LOBBY";
  roundsSelectEl.classList.toggle("hidden", !canEditSettings);
  roundsDisplayEl.classList.toggle("hidden", canEditSettings);
  if (canEditSettings && room.totalRounds) {
    roundsSelectEl.value = room.totalRounds;
  }
  if (!canEditSettings && room.totalRounds) {
    roundsDisplayEl.textContent = `${room.totalRounds} Rounds`;
  }

  drawingTimeSelectEl.classList.toggle("hidden", !canEditSettings);
  drawingTimeDisplayEl.classList.toggle("hidden", canEditSettings);
  if (canEditSettings && room.drawingTime) {
    drawingTimeSelectEl.value = room.drawingTime;
  }
  if (!canEditSettings && room.drawingTime) {
    drawingTimeDisplayEl.textContent = `${room.drawingTime} seconds`;
  }

  hintCountSelectEl.classList.toggle("hidden", !canEditSettings);
  hintCountDisplayEl.classList.toggle("hidden", canEditSettings);
  if (canEditSettings && room.hintCount !== undefined) {
    hintCountSelectEl.value = room.hintCount;
  }
  if (!canEditSettings && room.hintCount !== undefined) {
    hintCountDisplayEl.textContent = room.hintCount === 0 ? "No hints" : `${room.hintCount} hint${room.hintCount !== 1 ? "s" : ""}`;
  }

  const canStart =
    amLeader &&
    currentGameStatus === "LOBBY" &&
    roomPlayerCount >= 2;
  startGameBtn.classList.toggle("hidden", !canStart);
  startGameBtn.textContent = "Start Game";
  startGameBtn.disabled = false;

  // ---- Game sidebar ----
  sidebarRoomCode.textContent = room.id;
  sidebarPlayerCount.textContent = `${room.playerCount} / ${room.maxPlayers}`;

  // Game header
  gameRoundEl.textContent = room.round
    ? `Round ${room.round} / ${room.totalRounds}`
    : "Round —";
  gameDrawerEl.textContent = currentDrawerName ? `Drawer: ${currentDrawerName}` : "Drawer: —";
  updateTimerDisplay(room.turnTimer);

  // Mobile game header + more pane
  if (mobileSheetRoomCodeEl) mobileSheetRoomCodeEl.textContent = room.id;
  if (mobileRoundInfoEl) mobileRoundInfoEl.textContent = room.round ? `${room.round} / ${room.totalRounds}` : "— / —";
  if (mobileTimerEl) mobileTimerEl.textContent = room.turnTimer != null ? formatTime(room.turnTimer) : "—";
  if (mobileDrawTimeEl) mobileDrawTimeEl.textContent = room.drawingTime ? `${room.drawingTime} sec` : "—";
  if (mobileHintCountEl) mobileHintCountEl.textContent = room.hintCount !== undefined ? `${room.hintCount}` : "—";
  if (mobileRoundsEl) mobileRoundsEl.textContent = room.totalRounds ? `${room.totalRounds}` : "—";

  // Scoreboard modal on game over
  if (currentGameStatus === "GAME_OVER") {
    showScoreboard(room.players);
  } else {
    scoreboardModalEl.classList.add("hidden");
  }

  // ---- Build player list (lobby) ----
  playerListEl.innerHTML = "";
  room.players.forEach((player) => {
    const li = document.createElement("li");
    li.dataset.sid = player.socketId;

    const avatar = document.createElement("span");
    avatar.className = "player-avatar";
    avatar.textContent = avatarLetter(player.username);
    avatar.style.background = avatarColor(player.username);

    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = player.username;
    if (player.socketId === socket.id) name.textContent += " (you)";

    li.appendChild(avatar);
    li.appendChild(name);

    if (player.isLeader) {
      const badge = document.createElement("span");
      badge.className = "leader-badge";
      badge.textContent = "LEADER";
      li.appendChild(badge);
    }

    if (room.correctGuessers && room.correctGuessers.includes(player.socketId)) {
      const badge = document.createElement("span");
      badge.className = "guess-badge";
      badge.textContent = "✓";
      badge.title = "Guessed correctly";
      li.appendChild(badge);
    }

    const score = document.createElement("span");
    score.className = "player-score";
    score.textContent = `${player.score || 0} pts`;
    li.appendChild(score);

    if (player.socketId === currentDrawerId) li.classList.add("drawing");

    playerListEl.appendChild(li);
  });

  // ---- Build player list (sidebar) ----
  sidebarPlayerList.innerHTML = "";
  room.players.forEach((player) => {
    const li = document.createElement("li");
    li.dataset.sid = player.socketId;

    const avatar = document.createElement("span");
    avatar.className = "player-avatar";
    avatar.textContent = avatarLetter(player.username);
    avatar.style.background = avatarColor(player.username);

    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = player.username;
    if (player.socketId === socket.id) name.textContent += " (you)";

    li.appendChild(avatar);
    li.appendChild(name);

    if (player.isLeader) {
      const badge = document.createElement("span");
      badge.className = "leader-badge";
      badge.textContent = "LEADER";
      li.appendChild(badge);
    }

    if (room.correctGuessers && room.correctGuessers.includes(player.socketId)) {
      const badge = document.createElement("span");
      badge.className = "guess-badge";
      badge.textContent = "✓";
      li.appendChild(badge);
    }

    const score = document.createElement("span");
    score.className = "player-score";
    score.textContent = `${player.score || 0} pts`;
    li.appendChild(score);

    if (player.socketId === currentDrawerId) li.classList.add("drawing");

    sidebarPlayerList.appendChild(li);
  });

  // ---- Build player list (mobile bar) ----
  if (mobilePlayerListEl) {
    mobilePlayerListEl.innerHTML = "";
    mobilePlayerCountEl.textContent = `${room.playerCount} / ${room.maxPlayers}`;
    room.players.forEach((player) => {
      const li = document.createElement("li");
      li.dataset.sid = player.socketId;
      if (player.socketId === currentDrawerId) li.classList.add("drawing");

      const avatar = document.createElement("span");
      avatar.className = "player-avatar";
      avatar.textContent = avatarLetter(player.username);
      avatar.style.background = avatarColor(player.username);

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = player.username;
      if (player.socketId === socket.id) name.textContent += " (you)";

      li.appendChild(avatar);
      li.appendChild(name);

      if (player.isLeader) {
        const badge = document.createElement("span");
        badge.className = "leader-badge";
        badge.textContent = "LEADER";
        li.appendChild(badge);
      }

      if (room.correctGuessers && room.correctGuessers.includes(player.socketId)) {
        const badge = document.createElement("span");
        badge.className = "guess-badge";
        badge.textContent = "✓";
        badge.title = "Guessed correctly";
        li.appendChild(badge);
      }

      const score = document.createElement("span");
      score.className = "player-score";
      score.textContent = `${player.score || 0} pts`;
      li.appendChild(score);

      mobilePlayerListEl.appendChild(li);
    });
  }

  renderWordBanner();
  updateChatDisabledState();
  updateMobileUI();
  refreshIcons();
}

// ---------------------------------------------------------------------------
// Word banner
function renderWordOptions() {
  if (wordOptions.length === 0) {
    gameWordBannerEl.textContent = "Pick your word!";
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "word-options";
  wordOptions.forEach((w) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-option";
    btn.textContent = w;
    btn.addEventListener("click", () => {
      document.querySelectorAll('.word-option').forEach((b) => { b.disabled = true; });
      socket.emit("choose_word", { word: w });
    });
    wrap.appendChild(btn);
  });
  gameWordBannerEl.innerHTML = "";
  gameWordBannerEl.appendChild(wrap);
}

function renderWordBanner() {
  const amDrawer = currentGameStatus === "PLAYING" && socket.id === currentDrawerId;
  const catPrefix = currentCategory
    ? `<span class="game-category-label">${currentCategory}</span> · `
    : "";

  if (choosingPhase) {
    if (amDrawer) {
      renderWordOptions();
      gameWordDisplayEl.innerHTML = "Word: <span style='color:var(--accent)'>Choose one below</span>";
    } else {
      gameWordBannerEl.textContent = `${currentDrawerName || "Someone"} is choosing a word…`;
      gameWordDisplayEl.innerHTML = "Word: -----";
    }
  } else if (currentGameStatus === "PLAYING") {
    if (amDrawer) {
      gameWordBannerEl.innerHTML = myWord
        ? `Your word: <span class="word">${myWord}</span>`
        : "Your word: …";
      gameWordDisplayEl.innerHTML = myWord
        ? `${catPrefix}Word: <span class="word">${myWord}</span>`
        : "Word: …";
    } else if (wordLength > 0) {
      let blanks = "";
      for (let i = 0; i < wordLength; i++) {
        const found = revealedLetters.find((r) => r.index === i);
        blanks += found ? found.letter : "_";
        if (i < wordLength - 1) blanks += " ";
      }
      gameWordBannerEl.innerHTML = `<span class="guess-label">Guess the word:</span> <span class="blanks">${blanks}</span>`;
      gameWordDisplayEl.innerHTML = `${catPrefix}Word: <span class="blanks">${blanks}</span>`;
    } else {
      gameWordBannerEl.textContent = "Guess the word!";
      gameWordDisplayEl.innerHTML = "Word: -----";
    }
  } else if (currentGameStatus === "ROUND_END") {
    gameWordBannerEl.textContent = "Round complete!";
    gameWordDisplayEl.innerHTML = "Word: -----";
  } else {
    gameWordBannerEl.textContent = "Waiting for the game to start…";
    gameWordDisplayEl.innerHTML = "Word: -----";
  }
  canvas.style.cursor = amCurrentDrawer() ? "crosshair" : "default";
  updateMobileHints();
  updateMobileCategory();
}

function updateTimerDisplay(seconds) {
  if (currentGameStatus === "PLAYING" && typeof seconds === "number") {
    gameTimerEl.textContent = `${seconds}s`;
    gameTimerEl.classList.toggle("low", seconds <= 10);
    if (mobileTimerEl) {
      mobileTimerEl.textContent = formatTime(seconds);
      mobileTimerEl.classList.toggle("low", seconds <= 10);
    }

    const pct = Math.max(0, Math.min(100, (seconds / turnDuration) * 100));
    gameTimerFillEl.style.width = `${pct}%`;
    gameTimerFillEl.classList.toggle("low", seconds <= 10);
  } else {
    gameTimerEl.textContent = "—";
    gameTimerEl.classList.remove("low");
    if (mobileTimerEl) {
      mobileTimerEl.textContent = "—";
      mobileTimerEl.classList.remove("low");
    }
    gameTimerFillEl.style.width = "0%";
    gameTimerFillEl.classList.remove("low");
  }
}

// ---------------------------------------------------------------------------
// Drawing (current drawer only)
// ---------------------------------------------------------------------------
let isDrawing = false;
let shapeStartX = 0;
let shapeStartY = 0;
const drawHistory = [];
let currentStrokeEntry = null;
let selfClearing = false;
let isRemoteDrawing = false;
let drawShapeAtPointerUp = "freehand";

function resetDrawHistory() {
  drawHistory.length = 0;
}

function undoLastStroke() {
  if (!amCurrentDrawer() || drawHistory.length === 0) return;
  drawHistory.pop();
  redrawCanvas();
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const entry of drawHistory) {
    if (entry.type === "stroke") {
      ctx.strokeStyle = entry.color;
      ctx.lineWidth = entry.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (entry.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(entry.points[0].x, entry.points[0].y);
        for (let i = 1; i < entry.points.length; i++) {
          ctx.lineTo(entry.points[i].x, entry.points[i].y);
        }
        ctx.stroke();
      }
    } else if (entry.type === "shape") {
      commitShape(entry.x1, entry.y1, entry.x2, entry.y2, entry.color, entry.lineWidth, entry.shape);
    } else if (entry.type === "fill") {
      floodFill(entry.x, entry.y, entry.color);
    }
  }
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function beginStroke(x, y, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function extendStroke(x, y) {
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawShapePreview(x1, y1, x2, y2, color, lineWidth, shape) {
  shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
  shapePreviewCtx.strokeStyle = color;
  shapePreviewCtx.lineWidth = lineWidth;
  shapePreviewCtx.lineCap = "round";
  shapePreviewCtx.lineJoin = "round";

  shapePreviewCtx.beginPath();
  if (shape === "line") {
    shapePreviewCtx.moveTo(x1, y1);
    shapePreviewCtx.lineTo(x2, y2);
    shapePreviewCtx.stroke();
  } else if (shape === "rect") {
    shapePreviewCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (shape === "circle") {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    shapePreviewCtx.beginPath();
    shapePreviewCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    shapePreviewCtx.stroke();
  }
}

function commitShape(x1, y1, x2, y2, color, lineWidth, shape) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  if (shape === "line") {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (shape === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (shape === "circle") {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

canvas.addEventListener("pointerdown", (e) => {
  if (!isInRoom() || !amCurrentDrawer()) return;

  if (fillActive) {
    const { x, y } = getPos(e);
    const color = colorInput.value;
    const rx = Math.round(x);
    const ry = Math.round(y);
    drawHistory.push({ type: "fill", x: rx, y: ry, color });
    floodFill(rx, ry, color);
    socket.emit("draw_start", { x: rx, y: ry, color, lineWidth: 0, shape: "fill" });
    return;
  }

  isDrawing = true;
  canvas.setPointerCapture(e.pointerId);
  drawShapeAtPointerUp = currentShape;

  const { x, y } = getPos(e);
  shapeStartX = x;
  shapeStartY = y;
  const color = colorInput.value;
  const lineWidth = Number(brushSizeInput.value);

  if (currentShape === "freehand" || eraserActive) {
    beginStroke(x, y, color, lineWidth);
    socket.emit("draw_start", { x, y, color, lineWidth });
    currentStrokeEntry = { type: "stroke", color, lineWidth, points: [{ x, y }] };
  } else {
    currentStrokeEntry = null;
  }
});

canvas.addEventListener("pointermove", (e) => {
  const { x, y } = getPos(e);
  lastPointerX = x;
  lastPointerY = y;
  if (!isDrawing) return;

  if (currentShape === "freehand" || eraserActive) {
    extendStroke(x, y);
    socket.emit("draw", { x, y });
    if (currentStrokeEntry) currentStrokeEntry.points.push({ x, y });
  } else {
    drawShapePreview(shapeStartX, shapeStartY, x, y, colorInput.value, Number(brushSizeInput.value), currentShape);
  }
});

let lastPointerX = 0;
let lastPointerY = 0;

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;

  if (drawShapeAtPointerUp !== "freehand" && !eraserActive) {
    shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
    const color = colorInput.value;
    const lineWidth = Number(brushSizeInput.value);
    commitShape(shapeStartX, shapeStartY, lastPointerX, lastPointerY, color, lineWidth, drawShapeAtPointerUp);
    drawHistory.push({ type: "shape", x1: shapeStartX, y1: shapeStartY, x2: lastPointerX, y2: lastPointerY, color, lineWidth, shape: drawShapeAtPointerUp });
    socket.emit("draw_start", {
      x: shapeStartX, y: shapeStartY, color, lineWidth,
      shape: drawShapeAtPointerUp, x2: lastPointerX, y2: lastPointerY,
    });
  } else {
    if (currentStrokeEntry) {
      drawHistory.push(currentStrokeEntry);
      currentStrokeEntry = null;
    }
    socket.emit("draw_end", {});
  }
}

canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);

clearCanvasBtn.addEventListener("click", () => {
  if (!amCurrentDrawer()) return;
  selfClearing = true;
  clearCanvas();
  resetDrawHistory();
  socket.emit("clear_canvas");
  selfClearing = false;
});

undoBtn.addEventListener("click", () => {
  undoLastStroke();
});

// ---------------------------------------------------------------------------
// Chat (unified helper — renders to whichever view is active)
// ---------------------------------------------------------------------------
const PLAYER_COLORS = [
  "#5b9bf5", "#2ecc71", "#f5a623", "#e056a0",
  "#00d1b2", "#ff6b6b", "#a78bfa", "#f97316",
  "#34d399", "#f472b6", "#60a5fa", "#fbbf24",
];
const SYSTEM_COLOR = "#a49dc7";

function getPlayerColor(username) {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = ((h << 5) - h + username.charCodeAt(i)) | 0;
  }
  return PLAYER_COLORS[Math.abs(h) % PLAYER_COLORS.length];
}

function formatChatTime() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return h + ":" + m;
}

function renderChatMessage(entry, targetEl) {
  if (!targetEl) return;
  const div = document.createElement("div");
  div.className = "chat-msg";

  if (entry.system) {
    div.classList.add("system");
    div.textContent = entry.message;
  } else {
    const isSelf = entry.socketId === socket.id;
    const color = getPlayerColor(entry.username);

    const name = document.createElement("span");
    name.className = "chat-name" + (isSelf ? " self" : "");
    name.textContent = entry.username;
    name.style.color = color;

    const text = document.createElement("span");
    text.className = "chat-text";
    text.textContent = entry.message;

    const wrapper = document.createElement("span");
    wrapper.style.display = "contents";
    wrapper.appendChild(name);
    wrapper.appendChild(text);

    const time = document.createElement("span");
    time.className = "chat-time";
    time.textContent = formatChatTime();

    div.appendChild(wrapper);
    div.appendChild(time);
  }

  targetEl.appendChild(div);
  autoScrollIfNeeded(targetEl);
}

function autoScrollIfNeeded(el) {
  const threshold = 120;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  if (atBottom) {
    el.scrollTop = el.scrollHeight;
  }
}

function sendChat(text) {
  const activeInput = isGameActive() ? chatInputGameEl : chatInputLobbyEl;
  if (activeInput.disabled) return;
  const message = (text !== undefined ? text : activeInput.value).trim();
  if (!message) return;
  if (!socket.connected) {
    showToast("Not connected — message not sent.");
    return;
  }
  socket.emit("chat_message", { message });
  activeInput.value = "";
  activeInput.focus();
}

chatSendBtnGameEl.addEventListener("click", () => sendChat());
chatSendBtnLobbyEl.addEventListener("click", () => sendChat());
chatInputGameEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
chatInputLobbyEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

// Mobile guess input (guessers only) — sends through chat so the server can
// detect correct guesses. Same rules as sendChat().
function sendMobileGuess() {
  if (!mobileGuessInput || mobileGuessInput.disabled) return;
  const message = mobileGuessInput.value.trim();
  if (!message) return;
  if (!socket.connected) {
    showToast("Not connected — message not sent.");
    return;
  }
  socket.emit("chat_message", { message });
  mobileGuessInput.value = "";
  mobileGuessInput.focus();
}

if (mobileGuessSend) mobileGuessSend.addEventListener("click", sendMobileGuess);
if (mobileGuessInput) {
  mobileGuessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMobileGuess();
  });
}

// Mobile invite + leave
if (mobileInviteBtn) mobileInviteBtn.addEventListener("click", copyInvite);
if (mobileLeaveBtn) {
  mobileLeaveBtn.addEventListener("click", () => {
    socket.emit("leave_room");
    resetRoomUI();
  });
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------
let reactionThumbsUp = 0;
let reactionHeart = 0;

reactThumbsUpBtn.addEventListener("click", () => {
  if (hasReactedThisTurn) return;
  hasReactedThisTurn = true;
  socket.emit("reaction", { type: "thumbsup" });
  updateReactionState();
});

reactHeartBtn.addEventListener("click", () => {
  if (hasReactedThisTurn) return;
  hasReactedThisTurn = true;
  socket.emit("reaction", { type: "heart" });
  updateReactionState();
});

// ---------------------------------------------------------------------------
// Sounds
// ---------------------------------------------------------------------------
let audioCtx = null;
let soundOn = localStorage.getItem("dg-sound") !== "off";

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, dur = 0.12, vol = 0.05, type = "sine") {
  if (!soundOn) return;
  const c = ensureAudio();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch (e) { /* ignore */ }
}

const sounds = {
  message: () => beep(520, 0.07, 0.025),
  turn: () => beep(430, 0.1, 0.04),
  correct: () => {
    beep(660, 0.12, 0.05);
    setTimeout(() => beep(880, 0.16, 0.05), 120);
  },
  gameOver: () => {
    beep(523, 0.16, 0.06);
    setTimeout(() => beep(659, 0.16, 0.06), 160);
    setTimeout(() => beep(784, 0.28, 0.06), 320);
  },
};

function updateSoundIcon() {
  const icon = soundOn ? lucideIcon("volume-2") : lucideIcon("volume-x");
  soundToggleBtn.innerHTML = icon;
  if (mobileSoundBtn) mobileSoundBtn.innerHTML = icon;
  refreshIcons();
}

function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem("dg-sound", soundOn ? "on" : "off");
  updateSoundIcon();
  if (soundOn) beep(660, 0.1, 0.05);
}

soundToggleBtn.addEventListener("click", toggleSound);
if (mobileSoundBtn) mobileSoundBtn.addEventListener("click", toggleSound);

updateSoundIcon();

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------
function confetti(count = 40) {
  const colors = ["#ff6b6b", "#f7b731", "#2ecc71", "#3498db", "#9b59b6", "#e91e63", "#f1c40f", "#7d6ff0"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + "s";
    piece.style.setProperty("--drift", Math.random() * 160 - 80 + "px");
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

// ---------------------------------------------------------------------------
// Canvas responsive sizing
// ---------------------------------------------------------------------------
const canvasStageEl = document.getElementById("canvas-stage");

function fitCanvasToStage() {
  if (!isInRoom() || !canvasStageEl) return;
  const availW = canvasStageEl.clientWidth;
  const availH = canvasStageEl.clientHeight;
  if (availW <= 0 || availH <= 0) return;

  const RATIO = 800 / 500;
  let cssW = availW;
  let cssH = cssW / RATIO;
  if (cssH > availH) {
    cssH = availH;
    cssW = cssH * RATIO;
  }
  canvas.style.width = Math.floor(cssW) + "px";
  canvas.style.height = Math.floor(cssH) + "px";
  shapePreviewCanvas.style.width = canvas.style.width;
  shapePreviewCanvas.style.height = canvas.style.height;
}

if (canvasStageEl) {
  const stageObserver = new ResizeObserver(() => fitCanvasToStage());
  stageObserver.observe(canvasStageEl);
}
window.addEventListener("resize", fitCanvasToStage);
window.addEventListener("orientationchange", () => {
  setTimeout(fitCanvasToStage, 150);
});

// ---------------------------------------------------------------------------
// Visual viewport / keyboard handling — keeps the game inside the visible area
// so the canvas never disappears when the on-screen keyboard opens.
// ---------------------------------------------------------------------------
function syncViewportHeight() {
  const vv = window.visualViewport;
  if (!vv) return;
  const avail = Math.max(220, Math.round(vv.height - (vv.offsetTop || 0)));
  document.documentElement.style.setProperty("--app-height", avail + "px");
  const keyboardOpen = window.innerHeight - avail > 60;
  document.body.classList.toggle("keyboard-open", keyboardOpen);
  fitCanvasToStage();
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncViewportHeight);
  window.visualViewport.addEventListener("scroll", syncViewportHeight);
}
window.addEventListener("resize", syncViewportHeight);
syncViewportHeight();

// ---------------------------------------------------------------------------
// Connection banner + reconnection
// ---------------------------------------------------------------------------
const connBannerEl = document.createElement("div");
connBannerEl.id = "conn-banner";
connBannerEl.className = "conn-banner hidden";
document.body.appendChild(connBannerEl);

let wasInRoom = false;
let lostConnection = false;

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setConnectionBanner(message, visible) {
  connBannerEl.textContent = message;
  connBannerEl.classList.toggle("hidden", !visible);
}

socket.on("connect", () => {
  setConnectionBanner("", false);

  // Handle ?room= parameter on initial connect
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");
  if (roomParam && roomParam.length === 6 && !isInRoom()) {
    const savedUsername = localStorage.getItem("dg-username") || "";
    if (savedUsername) {
      usernameInput.value = savedUsername;
      joinRoom(roomParam);
    } else {
      // Prompt user to enter username, pre-fill the room code
      roomCodeInput.value = roomParam.toUpperCase();
      lobbyErrorEl.textContent = "Enter a username and join the room.";
      lobbyErrorEl.classList.remove("hidden");
      usernameInput.focus();
    }
    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
  }

  if (lostConnection) {
    lostConnection = false;
    if (wasInRoom) {
      wasInRoom = false;
      resetRoomUI();
      showToast("Reconnected — you were removed from the room.");
    } else {
      showToast("Reconnected.");
    }
  }
});

socket.on("disconnect", () => {
  if (isInRoom()) wasInRoom = true;
  lostConnection = true;
  setConnectionBanner("Connection lost — reconnecting…", true);
});

socket.io.on("reconnect_failed", () => {
  setConnectionBanner("Could not reconnect. Please refresh the page.", true);
});

// ---------------------------------------------------------------------------
// Socket.io events — game
// ---------------------------------------------------------------------------
socket.on("room_updated", (room) => {
  renderRoom(room);
});

socket.on("turn_started", (data) => {
  currentDrawerId = data.drawerId;
  currentDrawerName = data.drawerName;
  myWord = null;
  currentCategory = null;
  choosingPhase = !!data.choosing;
  wordLength = 0;
  wordOptions = [];
  hasReactedThisTurn = false;
  revealedLetters = [];
  turnDuration = data.choosing ? data.choiceTime || 15 : data.turnDuration || 60;
  gameTimerFillEl.style.width = "100%";
  gameTimerFillEl.classList.remove("low");
  updateTimerDisplay(turnDuration);
  resetDrawHistory();
  renderWordBanner();
  updateChatDisabledState();
  updateReactionState();
  updateToolbarState();
  sounds.turn();
});

socket.on("word_options", (data) => {
  wordOptions = data.options || [];
  renderWordBanner();
});

socket.on("word_chosen", (data) => {
  choosingPhase = false;
  wordOptions = [];
  wordLength = data.wordLength;
  turnDuration = data.turnDuration || 60;
  maxHints = data.hintCount !== undefined ? data.hintCount : 2;
  currentCategory = data.category || null;
  revealedLetters = [];
  gameTimerFillEl.style.width = "100%";
  gameTimerFillEl.classList.remove("low");
  updateTimerDisplay(turnDuration);
  renderWordBanner();
  updateChatDisabledState();
  updateReactionState();
  updateToolbarState();
});

socket.on("your_word", (data) => {
  myWord = data.word;
  renderWordBanner();
});

socket.on("turn_timer", (data) => {
  updateTimerDisplay(data.remaining);
});

socket.on("turn_ended", (data) => {
  myWord = null;
  currentCategory = null;
  choosingPhase = false;
  wordOptions = [];
  hasReactedThisTurn = false;
  revealedLetters = [];
  updateChatDisabledState();
  updateReactionState();
  updateToolbarState();
  if (data.reason === "left") {
    gameWordBannerEl.textContent = `${data.drawerName} left — next turn!`;
  } else if (data.reason === "all_guessed") {
    gameWordBannerEl.textContent = "Everyone guessed it!";
  } else {
    gameWordBannerEl.textContent = `Time's up! The word was ${data.word}`;
  }
});

socket.on("hint_revealed", (data) => {
  revealedLetters.push({ index: data.index, letter: data.letter });
  renderWordBanner();
});

socket.on("round_ended", () => {
  myWord = null;
  wordLength = 0;
  currentCategory = null;
  hasReactedThisTurn = false;
  revealedLetters = [];
  updateChatDisabledState();
  updateReactionState();
  renderWordBanner();
});

socket.on("round_starting", (data) => {
  const nextRound = data.nextRound;
  const countdown = data.countdown;
  gameWordBannerEl.innerHTML = `Round ${nextRound} starting in <span class="word">${countdown}</span>…`;
  gameWordDisplayEl.innerHTML = `Round ${nextRound}`;
});

socket.on("game_aborted", (data) => {
  myWord = null;
  wordLength = 0;
  currentCategory = null;
  hasReactedThisTurn = false;
  revealedLetters = [];
  updateChatDisabledState();
  updateReactionState();
  gameWordBannerEl.textContent = data.message || "Game aborted.";
  renderWordBanner();
});

socket.on("game_over", () => {
  myWord = null;
  wordLength = 0;
  currentCategory = null;
  choosingPhase = false;
  wordOptions = [];
  hasReactedThisTurn = false;
  revealedLetters = [];
  updateChatDisabledState();
  updateReactionState();
  updateToolbarState();
});

socket.on("game_restarting", (data) => {
  const countdown = data.countdown;
  let restartEl = document.getElementById("game-restart-countdown");
  if (!restartEl) {
    restartEl = document.createElement("p");
    restartEl.id = "game-restart-countdown";
    restartEl.style.cssText = "color:var(--muted);font-size:0.85rem;margin-top:0.5rem;";
    winnerTextEl.parentNode.insertBefore(restartEl, winnerTextEl.nextSibling);
  }
  restartEl.textContent = `New game starting in ${countdown}s…`;
});

// ---- Remote drawing ----
socket.on("draw_start", (data) => {
  isRemoteDrawing = true;
  if (data.shape === "fill") {
    floodFill(Math.round(data.x), Math.round(data.y), data.color);
  } else if (data.shape && data.shape !== "freehand") {
    // Remote shape
    commitShape(data.x, data.y, data.x2, data.y2, data.color, data.lineWidth, data.shape);
  } else {
    beginStroke(data.x, data.y, data.color, data.lineWidth);
  }
});

socket.on("draw", (data) => {
  if (!isRemoteDrawing) return;
  extendStroke(data.x, data.y);
});

socket.on("draw_end", () => { isRemoteDrawing = false; });

socket.on("clear_canvas", () => {
  clearCanvas();
  if (!selfClearing) resetDrawHistory();
});

// ---- Chat ----
socket.on("chat_message", (entry) => {
  renderChatMessage(entry, chatMessagesLobbyEl);
  renderChatMessage(entry, chatMessagesGameEl);
  if (entry.system) {
    if (/guessed the word!/.test(entry.message)) {
      sounds.correct();
      confetti(30);
    } else if (/Game over!/.test(entry.message)) {
      sounds.gameOver();
      confetti(70);
    }
  } else {
    sounds.message();
  }
});

socket.on("chat_history", (history) => {
  chatMessagesLobbyEl.innerHTML = "";
  chatMessagesGameEl.innerHTML = "";
  history.forEach((entry) => {
    renderChatMessage(entry, chatMessagesLobbyEl);
    renderChatMessage(entry, chatMessagesGameEl);
  });
  chatMessagesLobbyEl.scrollTop = chatMessagesLobbyEl.scrollHeight;
  chatMessagesGameEl.scrollTop = chatMessagesGameEl.scrollHeight;
});

// ---- Reactions ----
socket.on("reaction", (data) => {
  if (data.type === "thumbsup") {
    reactionThumbsUp = (data.count || 0);
    reactionThumbsUpCountEl.textContent = reactionThumbsUp;
  } else if (data.type === "heart") {
    reactionHeart = (data.count || 0);
    reactionHeartCountEl.textContent = reactionHeart;
  }
  // If the current user already reacted (tracked server-side), lock the buttons
  if (data.userReactions && data.userReactions[socket.id]) {
    hasReactedThisTurn = true;
    updateReactionState();
  }
});

// Replay existing strokes
socket.on("draw_history", (history) => {
  clearCanvas();
  history.forEach((entry) => {
    if (entry.type === "start") {
      if (entry.shape === "fill") {
        floodFill(Math.round(entry.x), Math.round(entry.y), entry.color);
      } else if (entry.shape && entry.shape !== "freehand") {
        commitShape(entry.x, entry.y, entry.x2, entry.y2, entry.color, entry.lineWidth, entry.shape);
      } else {
        beginStroke(entry.x, entry.y, entry.color, entry.lineWidth);
      }
    } else if (entry.type === "draw") {
      extendStroke(entry.x, entry.y);
    }
  });
});

socket.on("left_room", () => {
  resetRoomUI();
});

socket.on("error", (data) => {
  const message = data && data.message ? data.message : "Something went wrong.";
  if (isInRoom()) {
    showToast(message);
  } else {
    showLobbyError(message);
  }
});
