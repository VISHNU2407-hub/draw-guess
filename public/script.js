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
const categorySelectEl = document.getElementById("category-select");
const categoryDisplayEl = document.getElementById("category-display");
const roundsSelectEl = document.getElementById("rounds-select");
const roundsDisplayEl = document.getElementById("rounds-display");
const startErrorEl = document.getElementById("start-error");

// Game sidebar
const gameSidebar = document.getElementById("game-sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const sidebarRoomCode = document.getElementById("sidebar-room-code");
const sidebarInviteBtn = document.getElementById("sidebar-invite-btn");
const sidebarPlayerCount = document.getElementById("sidebar-player-count");
const sidebarPlayerList = document.getElementById("sidebar-player-list");
const sidebarCategory = document.getElementById("sidebar-category");
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
let currentDrawerId = null;
let roomPlayerCount = 0;
let amLeader = false;
let myWord = null;
let wordLength = 0;
let turnDuration = 60;
let choosingPhase = false;
let wordOptions = [];
let currentDrawerName = null;
let selectedCategory = null;

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
  colorsToggle.classList.remove("active");
  shapesToggle.classList.remove("active");
}

colorsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = colorsPanel.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    colorsPanel.classList.add("open");
    colorsToggle.classList.add("active");
  }
});

shapesToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = shapesPanel.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    shapesPanel.classList.add("open");
    shapesToggle.classList.add("active");
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".tool-dropdown")) {
    closeAllDropdowns();
  }
});

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

function isGameActive() {
  return currentGameStatus === "PLAYING" || currentGameStatus === "ROUND_END";
}

usernameInput.value = localStorage.getItem("dg-username") || "";

// ---------------------------------------------------------------------------
// Category selection
// ---------------------------------------------------------------------------
const CATEGORY_EMOJI = {
  Animals: "🐾", Food: "🍕", Objects: "📦", Places: "🏔️", Sports: "⚽",
  Movies: "🎬", Professions: "🧑🍳", Actions: "🏃", Nature: "🌿", Technology: "💻",
};

{
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a category…";
  categorySelectEl.appendChild(placeholder);
  Object.keys(CATEGORY_EMOJI).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = `${CATEGORY_EMOJI[cat]} ${cat}`;
    categorySelectEl.appendChild(opt);
  });
}

categorySelectEl.addEventListener("change", () => {
  const cat = categorySelectEl.value;
  if (!cat) return;
  socket.emit("select_category", { category: cat });
});

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
roomCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom();
});

startGameBtn.addEventListener("click", () => {
  startErrorEl.classList.add("hidden");
  socket.emit("start_game", { numRounds: Number(roundsSelectEl.value) || 5 });
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
  sidebarToggleBtn.textContent = sidebarCollapsed ? "▶" : "◀";
});

function resetRoomUI() {
  currentGameStatus = "LOBBY";
  document.body.dataset.gameStatus = "LOBBY";
  currentDrawerId = null;
  currentDrawerName = null;
  roomPlayerCount = 0;
  amLeader = false;
  myWord = null;
  wordLength = 0;
  turnDuration = 60;
  choosingPhase = false;
  wordOptions = [];
  selectedCategory = null;
  isDrawing = false;
  shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);

  scoreboardModalEl.classList.add("hidden");
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
  sidebarToggleBtn.textContent = "◀";

  // Reset reactions
  reactionThumbsUpCountEl.textContent = "0";
  reactionHeartCountEl.textContent = "0";

  clearCanvas();
  playerListEl.innerHTML = "";
  sidebarPlayerList.innerHTML = "";
  gameWordBannerEl.textContent = "Waiting for the game to start…";
  gameRoundEl.textContent = "Round —";
  gameTimerEl.textContent = "—";
  gameTimerEl.classList.remove("low");
  gameTimerFillEl.style.width = "0%";
  gameTimerFillEl.classList.remove("low");
  gameWordDisplayEl.innerHTML = "Word: -----";
  gameDrawerEl.textContent = "Drawer: —";
  categorySelectEl.classList.add("hidden");
  categoryDisplayEl.classList.remove("hidden");
  categoryDisplayEl.textContent = "🔒 No category selected yet";
  roundsSelectEl.classList.add("hidden");
  roundsDisplayEl.classList.remove("hidden");
  roundsDisplayEl.textContent = "5 Rounds";
  startErrorEl.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Switch between lobby and game views
// ---------------------------------------------------------------------------
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

  winnerTextEl.textContent =
    winners.length === 1
      ? `🏆 ${winners[0].username} wins with ${top} points!`
      : `🏆 It's a tie between ${winners.map((w) => w.username).join(" and ")} (${top} pts)!`;

  scoreboardListEl.innerHTML = "";
  sorted.forEach((p, i) => {
    const li = document.createElement("li");
    if (top > 0 && p.score === top) li.classList.add("winner");

    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = `${i + 1}.`;

    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = (top > 0 && p.score === top ? "🏆 " : "") + p.username;

    const score = document.createElement("span");
    score.className = "player-score";
    score.textContent = `${p.score || 0} pts`;

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(score);
    scoreboardListEl.appendChild(li);
  });

  playAgainBtn.classList.toggle("hidden", !amLeader);
  waitingTextEl.classList.toggle("hidden", amLeader);
  scoreboardModalEl.classList.remove("hidden");
}

playAgainBtn.addEventListener("click", () => {
  socket.emit("start_game");
});

// ---------------------------------------------------------------------------
// Render room state
// ---------------------------------------------------------------------------
function renderRoom(room) {
  lobbyEl.classList.add("hidden");
  roomViewEl.classList.remove("hidden");

  currentGameStatus = room.gameStatus;
  document.body.dataset.gameStatus = currentGameStatus;
  currentDrawerId = room.currentDrawer;
  roomPlayerCount = room.playerCount;
  amLeader = room.players.some((p) => p.socketId === socket.id && p.isLeader);
  selectedCategory = room.selectedCategory || null;

  choosingPhase = currentGameStatus === "PLAYING" && room.phase === "choosing";
  wordLength = room.wordLength || 0;
  const currentDrawerPlayer = room.players.find((p) => p.socketId === room.currentDrawer);
  currentDrawerName = currentDrawerPlayer ? currentDrawerPlayer.username : null;

  // Switch between lobby and game views
  if (currentGameStatus === "PLAYING") {
    switchToGameView();
  } else {
    switchToLobbyView();
  }

  // ---- Lobby header ----
  roomCodeEl.textContent = room.id;
  playerCountEl.textContent = `${room.playerCount} / ${room.maxPlayers} players`;

  const canEditCategory = amLeader && currentGameStatus === "LOBBY";
  categorySelectEl.classList.toggle("hidden", !canEditCategory);
  categoryDisplayEl.classList.toggle("hidden", canEditCategory);
  roundsSelectEl.classList.toggle("hidden", !canEditCategory);
  roundsDisplayEl.classList.toggle("hidden", canEditCategory);
  if (canEditCategory && room.totalRounds) {
    roundsSelectEl.value = room.totalRounds;
  }
  if (!canEditCategory && room.totalRounds) {
    roundsDisplayEl.textContent = `${room.totalRounds} Rounds`;
  }
  if (selectedCategory) {
    categorySelectEl.value = selectedCategory;
    categoryDisplayEl.textContent = `${CATEGORY_EMOJI[selectedCategory] || "📂"} ${selectedCategory}`;
    startErrorEl.classList.add("hidden");
  } else {
    categorySelectEl.value = "";
    categoryDisplayEl.textContent = "🔒 No category selected yet";
  }

  const canStart =
    amLeader &&
    (currentGameStatus === "LOBBY" || currentGameStatus === "ROUND_END") &&
    roomPlayerCount >= 2;
  startGameBtn.classList.toggle("hidden", !canStart);
  startGameBtn.textContent =
    currentGameStatus === "ROUND_END" ? "Start Next Round" : "Start Game";

  // ---- Game sidebar ----
  sidebarRoomCode.textContent = room.id;
  sidebarPlayerCount.textContent = `${room.playerCount} / ${room.maxPlayers}`;
  if (selectedCategory) {
    sidebarCategory.textContent = `${CATEGORY_EMOJI[selectedCategory] || "📂"} ${selectedCategory}`;
  } else {
    sidebarCategory.textContent = "🔒 None";
  }

  // Game header
  gameRoundEl.textContent = room.round
    ? `Round ${room.round} / ${room.totalRounds}`
    : "Round —";
  gameDrawerEl.textContent = currentDrawerName ? `Drawer: ${currentDrawerName}` : "Drawer: —";
  updateTimerDisplay(room.turnTimer);

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

  renderWordBanner();
}

// ---------------------------------------------------------------------------
// Word banner
// ---------------------------------------------------------------------------
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
    btn.addEventListener("click", () => socket.emit("choose_word", { word: w }));
    wrap.appendChild(btn);
  });
  gameWordBannerEl.innerHTML = "";
  gameWordBannerEl.appendChild(wrap);
}

function renderWordBanner() {
  const amDrawer = currentGameStatus === "PLAYING" && socket.id === currentDrawerId;

  if (choosingPhase) {
    if (amDrawer) {
      renderWordOptions();
      gameWordDisplayEl.innerHTML = "Word: <span style='color:#a49dc7'>Choose one below</span>";
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
        ? `Word: <span class="word">${myWord}</span>`
        : "Word: …";
    } else if (wordLength > 0) {
      gameWordBannerEl.innerHTML = `<span class="guess-label">Guess the word:</span> <span class="blanks">${"_ ".repeat(wordLength).trim()}</span>`;
      gameWordDisplayEl.innerHTML = `Word: <span class="blanks">${"_ ".repeat(wordLength).trim()}</span>`;
    } else {
      gameWordBannerEl.textContent = "Guess the word!";
      gameWordDisplayEl.innerHTML = "Word: -----";
    }
  } else if (currentGameStatus === "ROUND_END") {
    gameWordBannerEl.textContent = "Round complete! The leader can start the next round.";
    gameWordDisplayEl.innerHTML = "Word: -----";
  } else {
    gameWordBannerEl.textContent = "Waiting for the game to start…";
    gameWordDisplayEl.innerHTML = "Word: -----";
  }
  canvas.style.cursor = amCurrentDrawer() ? "crosshair" : "default";
}

function updateTimerDisplay(seconds) {
  if (currentGameStatus === "PLAYING" && typeof seconds === "number") {
    gameTimerEl.textContent = `${seconds}s`;
    gameTimerEl.classList.toggle("low", seconds <= 10);

    const pct = Math.max(0, Math.min(100, (seconds / turnDuration) * 100));
    gameTimerFillEl.style.width = `${pct}%`;
    gameTimerFillEl.classList.toggle("low", seconds <= 10);
  } else {
    gameTimerEl.textContent = "—";
    gameTimerEl.classList.remove("low");
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

  if (currentShape !== "freehand" && !eraserActive) {
    shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
    const color = colorInput.value;
    const lineWidth = Number(brushSizeInput.value);
    commitShape(shapeStartX, shapeStartY, lastPointerX, lastPointerY, color, lineWidth, currentShape);
    drawHistory.push({ type: "shape", x1: shapeStartX, y1: shapeStartY, x2: lastPointerX, y2: lastPointerY, color, lineWidth, shape: currentShape });
    socket.emit("draw_start", {
      x: shapeStartX, y: shapeStartY, color, lineWidth,
      shape: currentShape, x2: lastPointerX, y2: lastPointerY,
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
canvas.addEventListener("pointerleave", endStroke);

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
function renderChatMessage(entry, targetEl) {
  if (!targetEl) return;
  const div = document.createElement("div");
  div.className = "chat-msg";

  if (entry.system) {
    div.classList.add("system");
    div.textContent = entry.message;
  } else {
    const name = document.createElement("span");
    name.className = "chat-name" + (entry.socketId === socket.id ? " self" : "");
    name.textContent = entry.username;

    const text = document.createElement("span");
    text.textContent = entry.message;

    div.appendChild(name);
    div.appendChild(text);
  }

  targetEl.appendChild(div);
  targetEl.scrollTop = targetEl.scrollHeight;
}

function sendChat(text) {
  const activeInput = isGameActive() ? chatInputGameEl : chatInputLobbyEl;
  const message = (text !== undefined ? text : activeInput.value).trim();
  if (!message) return;
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

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------
let reactionThumbsUp = 0;
let reactionHeart = 0;

reactThumbsUpBtn.addEventListener("click", () => {
  socket.emit("reaction", { type: "thumbsup" });
});

reactHeartBtn.addEventListener("click", () => {
  socket.emit("reaction", { type: "heart" });
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
  soundToggleBtn.textContent = soundOn ? "🔊" : "🔇";
}

soundToggleBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("dg-sound", soundOn ? "on" : "off");
  updateSoundIcon();
  if (soundOn) beep(660, 0.1, 0.05);
});

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
  choosingPhase = !!data.choosing;
  wordLength = 0;
  wordOptions = [];
  turnDuration = data.choosing ? data.choiceTime || 15 : data.turnDuration || 60;
  gameTimerFillEl.style.width = "100%";
  gameTimerFillEl.classList.remove("low");
  resetDrawHistory();
  renderWordBanner();
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
  gameTimerFillEl.style.width = "100%";
  gameTimerFillEl.classList.remove("low");
  renderWordBanner();
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
  choosingPhase = false;
  wordOptions = [];
  if (data.reason === "left") {
    gameWordBannerEl.textContent = `${data.drawerName} left — next turn!`;
  } else if (data.reason === "all_guessed") {
    gameWordBannerEl.textContent = "Everyone guessed it!";
  } else {
    gameWordBannerEl.textContent = `Time's up! The word was ${data.word}`;
  }
});

socket.on("round_ended", () => {
  myWord = null;
  wordLength = 0;
  renderWordBanner();
});

socket.on("game_aborted", (data) => {
  myWord = null;
  wordLength = 0;
  gameWordBannerEl.textContent = data.message || "Game aborted.";
  renderWordBanner();
});

socket.on("game_over", () => {
  myWord = null;
  wordLength = 0;
  choosingPhase = false;
  wordOptions = [];
});

// ---- Remote drawing ----
socket.on("draw_start", (data) => {
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
  extendStroke(data.x, data.y);
});

socket.on("draw_end", () => {});

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
