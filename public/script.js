// ---------------------------------------------------------------------------
// Socket.io client
// ---------------------------------------------------------------------------
const socket = io();

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const lobbyEl = document.getElementById("lobby");
const roomViewEl = document.getElementById("room-view");
const usernameInput = document.getElementById("username-input");
const roomCodeInput = document.getElementById("room-code-input");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const lobbyErrorEl = document.getElementById("lobby-error");
const roomCodeEl = document.getElementById("room-code");
const playerCountEl = document.getElementById("player-count");
const playerListEl = document.getElementById("player-list");
const startGameBtn = document.getElementById("start-game-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const categorySelectEl = document.getElementById("category-select");
const categoryDisplayEl = document.getElementById("category-display");
const startErrorEl = document.getElementById("start-error");

// Game bar + canvas
const roundDisplayEl = document.getElementById("round-display");
const timerDisplayEl = document.getElementById("timer-display");
const wordBannerEl = document.getElementById("word-banner");
const timerFillEl = document.getElementById("timer-fill");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const canvas = document.getElementById("drawing-canvas");
const ctx = canvas.getContext("2d");
const colorPaletteEl = document.getElementById("color-palette");
const colorInput = document.createElement("input"); // hidden custom color input
const brushSizeInput = document.getElementById("brush-size-input");
const eraserBtn = document.getElementById("eraser-btn");
const clearCanvasBtn = document.getElementById("clear-canvas-btn");

// Chat
const chatMessagesEl = document.getElementById("chat-messages");
const chatInputEl = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const quickPhrasesEl = document.getElementById("quick-phrases");

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
let choosingPhase = false; // drawer is picking one of 3 words
let wordOptions = []; // the words offered to the current drawer
let currentDrawerName = null;
let selectedCategory = null;

// ---------------------------------------------------------------------------
// Color palette (skribbl-style)
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

function setColor(color) {
  colorInput.value = color;
  eraserActive = false;
  eraserBtn.classList.remove("active");
  colorPaletteEl.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === color);
  });
}

function setEraser() {
  eraserActive = true;
  eraserBtn.classList.add("active");
  colorPaletteEl.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
  colorInput.value = "#ffffff";
}

// Build the palette swatches
PALETTE_COLORS.forEach((color) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "swatch" + (color === "#000000" ? " active" : "");
  btn.dataset.color = color;
  btn.style.background = color;
  btn.title = color;
  btn.addEventListener("click", () => setColor(color));
  colorPaletteEl.appendChild(btn);
});

eraserBtn.addEventListener("click", setEraser);

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
  // The drawer can only draw after picking a word
  return currentGameStatus === "PLAYING" && socket.id === currentDrawerId && !choosingPhase;
}

// Remember the username across visits
usernameInput.value = localStorage.getItem("dg-username") || "";

// ---------------------------------------------------------------------------
// Category selection (leader only, while in the lobby)
// ---------------------------------------------------------------------------
const CATEGORY_EMOJI = {
  Animals: "🐾", Food: "🍕", Objects: "📦", Places: "🏔️", Sports: "⚽",
  Movies: "🎬", Professions: "🧑🍳", Actions: "🏃", Nature: "🌿", Technology: "💻",
};

// Build the category dropdown once (placeholder + one option per category)
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

function joinRoom() {
  const username = usernameInput.value.trim();
  const roomId = roomCodeInput.value.trim().toUpperCase();

  if (!username) {
    showLobbyError("Please enter a username first.");
    return;
  }
  if (roomId.length !== 6) {
    showLobbyError("Please enter the 6-character room code.");
    return;
  }
  clearLobbyError();
  localStorage.setItem("dg-username", username);
  socket.emit("join_room", { roomId, username });
}

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoom);

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createRoom();
});
roomCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom();
});

startGameBtn.addEventListener("click", () => {
  if (!selectedCategory) {
    startErrorEl.textContent = "Please select a category before starting.";
    startErrorEl.classList.remove("hidden");
    return;
  }
  startErrorEl.classList.add("hidden");
  socket.emit("start_game");
});

// Leave the room and return to the lobby
leaveRoomBtn.addEventListener("click", () => {
  socket.emit("leave_room");
  resetRoomUI();
});

function resetRoomUI() {
  currentGameStatus = "LOBBY";
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

  scoreboardModalEl.classList.add("hidden");
  roomViewEl.classList.add("hidden");
  lobbyEl.classList.remove("hidden");

  clearCanvas();
  playerListEl.innerHTML = "";
  chatMessagesEl.innerHTML = "";
  wordBannerEl.textContent = "Waiting for the game to start…";
  roundDisplayEl.textContent = "Round —";
  timerDisplayEl.textContent = "—";
  timerDisplayEl.classList.remove("low");
  timerFillEl.style.width = "0%";
  timerFillEl.classList.remove("low");
  categorySelectEl.classList.add("hidden");
  categoryDisplayEl.classList.remove("hidden");
  categoryDisplayEl.textContent = "🔒 No category selected yet";
  startErrorEl.classList.add("hidden");
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
  // Switch to the room view
  lobbyEl.classList.add("hidden");
  roomViewEl.classList.remove("hidden");

  currentGameStatus = room.gameStatus;
  currentDrawerId = room.currentDrawer;
  roomPlayerCount = room.playerCount;
  amLeader = room.players.some((p) => p.socketId === socket.id && p.isLeader);
  selectedCategory = room.selectedCategory || null;

  // Mid-game joiners never see turn_started, so mirror the current phase from
  // the snapshot (choosing vs drawing) and derive the drawer's name from players.
  choosingPhase = currentGameStatus === "PLAYING" && room.phase === "choosing";
  wordLength = room.wordLength || 0;
  const currentDrawerPlayer = room.players.find((p) => p.socketId === room.currentDrawer);
  currentDrawerName = currentDrawerPlayer ? currentDrawerPlayer.username : null;

  // Category selector: leader sees the dropdown in the lobby; everyone sees the selection
  const canEditCategory = amLeader && currentGameStatus === "LOBBY";
  categorySelectEl.classList.toggle("hidden", !canEditCategory);
  categoryDisplayEl.classList.toggle("hidden", canEditCategory);
  if (selectedCategory) {
    categorySelectEl.value = selectedCategory;
    categoryDisplayEl.textContent = `${CATEGORY_EMOJI[selectedCategory] || "📂"} ${selectedCategory}`;
    startErrorEl.classList.add("hidden");
  } else {
    categorySelectEl.value = "";
    categoryDisplayEl.textContent = "🔒 No category selected yet";
  }

  roomCodeEl.textContent = room.id;
  playerCountEl.textContent = `${room.playerCount} / ${room.maxPlayers} players`;
  roundDisplayEl.textContent = room.round
    ? `Round ${room.round} / ${room.totalRounds}`
    : "Round —";
  updateTimerDisplay(room.turnTimer);

  // Scoreboard modal on game over
  if (currentGameStatus === "GAME_OVER") {
    showScoreboard(room.players);
  } else {
    scoreboardModalEl.classList.add("hidden");
  }

  // Clear and rebuild the player list
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
    if (player.socketId === socket.id) {
      name.textContent += " (you)";
    }

    li.appendChild(avatar);
    li.appendChild(name);

    if (player.isLeader) {
      const badge = document.createElement("span");
      badge.className = "leader-badge";
      badge.textContent = "LEADER";
      li.appendChild(badge);
    }

    // ✓ for players who already guessed correctly this turn
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

    // Highlight the current drawer
    if (player.socketId === currentDrawerId) {
      li.classList.add("drawing");
    }

    playerListEl.appendChild(li);
  });

  // Start button: leader only, in lobby or round end, with enough players
  const canStart =
    amLeader &&
    (currentGameStatus === "LOBBY" || currentGameStatus === "ROUND_END") &&
    roomPlayerCount >= 2;
  startGameBtn.classList.toggle("hidden", !canStart);
  startGameBtn.textContent =
    currentGameStatus === "ROUND_END" ? "Start Next Round" : "Start Game";

  renderWordBanner();
}

// Draw the 3 word options into the banner (drawer only)
function renderWordOptions() {
  if (wordOptions.length === 0) {
    wordBannerEl.textContent = "Pick your word!";
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
  wordBannerEl.innerHTML = "";
  wordBannerEl.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Word banner (skribbl-style)
// ---------------------------------------------------------------------------
function renderWordBanner() {
  const amDrawer = currentGameStatus === "PLAYING" && socket.id === currentDrawerId;

  if (choosingPhase) {
    // Drawer is picking a word — no drawing, no guessing yet
    if (amDrawer) {
      renderWordOptions();
    } else {
      wordBannerEl.textContent = `${currentDrawerName || "Someone"} is choosing a word…`;
    }
  } else if (currentGameStatus === "PLAYING") {
    if (amDrawer) {
      wordBannerEl.innerHTML = myWord
        ? `Your word: <span class="word">${myWord}</span>`
        : "Your word: …";
    } else if (wordLength > 0) {
      wordBannerEl.innerHTML = `<span class="guess-label">Guess the word:</span> <span class="blanks">${"_ ".repeat(wordLength).trim()}</span>`;
    } else {
      wordBannerEl.textContent = "Guess the word!";
    }
  } else if (currentGameStatus === "ROUND_END") {
    wordBannerEl.textContent = "Round complete! The leader can start the next round.";
  } else {
    wordBannerEl.textContent = "Waiting for the game to start…";
  }
  canvas.style.cursor = amCurrentDrawer() ? "crosshair" : "default";
}

function updateTimerDisplay(seconds) {
  if (currentGameStatus === "PLAYING" && typeof seconds === "number") {
    timerDisplayEl.textContent = `${seconds}s`;
    timerDisplayEl.classList.toggle("low", seconds <= 10);

    const pct = Math.max(0, Math.min(100, (seconds / turnDuration) * 100));
    timerFillEl.style.width = `${pct}%`;
    timerFillEl.classList.toggle("low", seconds <= 10);
  } else {
    timerDisplayEl.textContent = "—";
    timerDisplayEl.classList.remove("low");
    timerFillEl.style.width = "0%";
    timerFillEl.classList.remove("low");
  }
}

// ---------------------------------------------------------------------------
// Drawing (current drawer only)
// ---------------------------------------------------------------------------
let isDrawing = false;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// Start a new stroke (used for both local drawing and remote replays)
function beginStroke(x, y, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// Extend the current stroke to a new point
function extendStroke(x, y) {
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

canvas.addEventListener("pointerdown", (e) => {
  if (!isInRoom() || !amCurrentDrawer()) return;
  isDrawing = true;
  canvas.setPointerCapture(e.pointerId);

  const { x, y } = getPos(e);
  const color = colorInput.value;
  const lineWidth = Number(brushSizeInput.value);

  beginStroke(x, y, color, lineWidth);
  socket.emit("draw_start", { x, y, color, lineWidth });
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDrawing) return;
  const { x, y } = getPos(e);
  extendStroke(x, y);
  socket.emit("draw", { x, y });
});

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;
  socket.emit("draw_end", {});
}

canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);
canvas.addEventListener("pointerleave", endStroke);

clearCanvasBtn.addEventListener("click", () => {
  if (!amCurrentDrawer()) return;
  clearCanvas();
  socket.emit("clear_canvas");
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
function renderChatMessage(entry) {
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

  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function sendChat(text) {
  const message = (text !== undefined ? text : chatInputEl.value).trim();
  if (!message) return;
  socket.emit("chat_message", { message });
  chatInputEl.value = "";
  chatInputEl.focus();
}

chatSendBtn.addEventListener("click", () => sendChat());
chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

// Quick chat phrases
const QUICK_PHRASES = ["Nice!", "gg", "lol", "That's right!", "So close!", "Wow!"];
QUICK_PHRASES.forEach((phrase) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.textContent = phrase;
  chip.addEventListener("click", () => sendChat(phrase));
  quickPhrasesEl.appendChild(chip);
});

// ---------------------------------------------------------------------------
// Sounds (tiny Web Audio synth — no audio files needed)
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
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {
    // ignore audio errors
  }
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
// Confetti (CSS-only, zero assets)
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
// Socket.io events
// ---------------------------------------------------------------------------
// Connection banner + reconnection handling
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

socket.on("room_updated", (room) => {
  renderRoom(room);
});

// ---- Turn system ----
socket.on("turn_started", (data) => {
  currentDrawerId = data.drawerId;
  currentDrawerName = data.drawerName;
  myWord = null;
  choosingPhase = !!data.choosing;
  wordLength = 0;
  wordOptions = [];
  turnDuration = data.choosing ? data.choiceTime || 15 : data.turnDuration || 60;
  timerFillEl.style.width = "100%";
  timerFillEl.classList.remove("low");
  renderWordBanner();
  sounds.turn();
});

// The drawer alone receives the 3 word options to pick from
socket.on("word_options", (data) => {
  wordOptions = data.options || [];
  renderWordBanner();
});

// The drawer picked a word — the drawing phase begins
socket.on("word_chosen", (data) => {
  choosingPhase = false;
  wordOptions = [];
  wordLength = data.wordLength;
  turnDuration = data.turnDuration || 60;
  timerFillEl.style.width = "100%";
  timerFillEl.classList.remove("low");
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
    wordBannerEl.textContent = `${data.drawerName} left — next turn!`;
  } else if (data.reason === "all_guessed") {
    wordBannerEl.textContent = "Everyone guessed it!";
  } else {
    wordBannerEl.textContent = `Time's up! The word was ${data.word}`;
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
  wordBannerEl.textContent = data.message || "Game aborted.";
  renderWordBanner();
});

socket.on("game_over", () => {
  // The scoreboard is driven by room_updated (gameStatus GAME_OVER),
  // which the server broadcasts right after this event.
  myWord = null;
  wordLength = 0;
  choosingPhase = false;
  wordOptions = [];
});

// ---- Remote drawing ----
socket.on("draw_start", (data) => {
  beginStroke(data.x, data.y, data.color, data.lineWidth);
});

socket.on("draw", (data) => {
  extendStroke(data.x, data.y);
});

socket.on("draw_end", () => {
  // Nothing to do — the next draw_start begins a fresh path.
});

socket.on("clear_canvas", () => {
  clearCanvas();
});

// ---- Chat ----
socket.on("chat_message", (entry) => {
  renderChatMessage(entry);
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
  chatMessagesEl.innerHTML = "";
  history.forEach(renderChatMessage);
});

// Replay existing strokes when joining a room mid-game
socket.on("draw_history", (history) => {
  clearCanvas();
  history.forEach((entry) => {
    if (entry.type === "start") {
      beginStroke(entry.x, entry.y, entry.color, entry.lineWidth);
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
