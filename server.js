// Load optional .env overrides for local development (no-op in production,
// where the platform injects real env vars).
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { CATEGORY_NAMES, pickWordsFromCategories } = require("./words");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0"; // listen on all interfaces (required for Render)

// CORS: same-origin by default (the app serves its own frontend).
// To allow additional origins, set CORS_ORIGIN to a comma-separated list,
// e.g. CORS_ORIGIN=https://example.com,https://app.example.com
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : false; // false = same-origin only (secure default)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN },
});

// Trust Render's proxy so socket.io / websockets work behind it
app.set("trust proxy", 1);

// Serve the frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check for uptime monitors / Render
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Unknown routes -> serve index.html for browser requests (SPA-style),
// JSON 404 for everything else.
app.use((req, res) => {
  if (req.method === "GET" && req.accepts("html")) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  res.status(404).json({ error: "Not found" });
});

// Log uncaught errors server-side, then exit so the process manager
// (Render) restarts a clean instance instead of running in a broken state.
process.on("uncaughtException", (err) => {
  console.error("[ERROR] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[ERROR] Unhandled rejection:", reason);
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
const MAX_PLAYERS = 9;
const MIN_PLAYERS_TO_START = 2;
const TURN_DURATION = Number(process.env.TURN_DURATION) || 60; // seconds per turn
const TOTAL_ROUNDS = Number(process.env.TOTAL_ROUNDS) || 3; // rounds per game
const WORD_OPTIONS_COUNT = 3; // words offered to the drawer each turn
const WORD_CHOICE_TIME = Number(process.env.WORD_CHOICE_TIME) || 15; // seconds to pick a word

// Game settings validation
const VALID_DRAW_TIMES = [30, 45, 60, 90, 120];
const VALID_HINT_COUNTS = [0, 1, 2, 3];
const DEFAULT_DRAW_TIME = 60;
const DEFAULT_HINT_COUNT = 2;

// Scoring
const GUESS_POINTS = 100; // base points for a correct guess
const GUESS_TIME_BONUS_PER_SECOND = 2; // extra points per second remaining
const DRAWER_POINTS_PER_GUESS = 50; // points the drawer earns per correct guess
const MAX_CHAT_LOG = 200; // chat entries kept per room
const MAX_MESSAGE_LENGTH = 200;

// Words live in words.js (server-only, per-category, never sent to clients)

/** @type {Record<string, Room>} */
const rooms = {};

/**
 * Room shape:
 * {
 *   id: string,
 *   players: [{ socketId, username, isLeader }],
 *   currentDrawer: string | null,
 *   currentWord: string | null,
 *   gameStatus: "LOBBY",
 *   turnTimer: number,
 *   correctGuesses: Set
 * }
 */
function createRoom(roomId) {
  return {
    id: roomId,
    players: [],
    currentDrawer: null,
    currentWord: null,
    currentCategory: null,
    wordOptionCategories: {},
    gameStatus: "LOBBY",
    turnTimer: 0,
    correctGuesses: new Set(),
    strokeLog: [], // recent stroke entries, replayed to late joiners
    round: 0, // current round number (0 = not started)
    numRounds: TOTAL_ROUNDS, // rounds per game (leader can change before start)
    turnOrder: [], // snapshot of player socketIds for the current round
    turnIndex: 0, // index into turnOrder
    chatLog: [], // recent chat entries, replayed to late joiners
    categoryIndex: 0, // cycling index into CATEGORY_NAMES for word selection
    usedWords: new Set(), // every word ever offered this game (offered = used)
    wordOptions: [], // the words currently offered to the drawer
    phase: "idle", // "idle" | "choosing" | "drawing"
    reactions: { thumbsup: 0, heart: 0 }, // reaction counters
    reactionsByPlayer: {}, // { socketId: "thumbsup" | "heart" } — one reaction per user per turn
    roundAutoStartTimer: null, // interval ID for auto-starting next round
    gameOverTimer: null, // timeout ID for auto-restarting after game over
    drawingTime: DEFAULT_DRAW_TIME, // host-configurable drawing duration
    hintCount: DEFAULT_HINT_COUNT, // host-configurable hints per round
    hintsRevealed: 0, // how many hints revealed this turn
    revealedLetters: [], // [{index, letter}] revealed this turn
  };
}

function maxScore(players) {
  return players.reduce((m, p) => Math.max(m, p.score), 0);
}

// ---------------------------------------------------------------------------
// Room code generation: exactly 6 chars, uppercase letters + numbers, unique
// ---------------------------------------------------------------------------
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRoomCode() {
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  } while (rooms[code]); // keep generating until unique among active rooms
  return code;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function isValidUsername(username) {
  return (
    typeof username === "string" &&
    username.trim().length > 0 &&
    username.trim().length <= 20
  );
}

// Serialize a room into a plain, client-safe object
function getRoomSnapshot(room) {
  return {
    id: room.id,
    players: room.players.map((p) => ({
      socketId: p.socketId,
      username: p.username,
      isLeader: p.isLeader,
      score: p.score || 0,
    })),
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS,
    currentDrawer: room.currentDrawer,
    gameStatus: room.gameStatus,
    turnTimer: room.turnTimer,
    round: room.round,
    totalRounds: room.numRounds || TOTAL_ROUNDS,
    correctGuessers: Array.from(room.correctGuesses),
    phase: room.phase, // "idle" | "choosing" | "drawing" (so late joiners see the right banner)
    wordLength: room.currentWord ? room.currentWord.length : 0,
    category: room.currentCategory || null,
    drawingTime: room.drawingTime || DEFAULT_DRAW_TIME,
    hintCount: room.hintCount !== undefined ? room.hintCount : DEFAULT_HINT_COUNT,
    revealedLetters: room.revealedLetters || [],
    hintsUsed: (room.revealedLetters || []).length,
    maxHints: room.hintCount !== undefined ? room.hintCount : DEFAULT_HINT_COUNT,
  };
}

function broadcastRoom(roomId) {
  const room = rooms[roomId];
  if (room) {
    io.to(roomId).emit("room_updated", getRoomSnapshot(room));
  }
}

// ---------------------------------------------------------------------------
// Drawing / strokes
// ---------------------------------------------------------------------------
const MAX_STROKE_LOG = 5000; // entries kept per room for late-joiner replay

function isValidPoint(p) {
  return (
    p &&
    typeof p.x === "number" &&
    isFinite(p.x) &&
    typeof p.y === "number" &&
    isFinite(p.y)
  );
}

function logStroke(roomId, entry) {
  const room = rooms[roomId];
  if (!room) return;
  room.strokeLog.push(entry);
  if (room.strokeLog.length > MAX_STROKE_LOG) {
    room.strokeLog.splice(0, room.strokeLog.length - MAX_STROKE_LOG);
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
function normalizeWord(s) {
  return s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function addChatEntry(roomId, entry) {
  const room = rooms[roomId];
  if (!room) return;
  room.chatLog.push(entry);
  if (room.chatLog.length > MAX_CHAT_LOG) {
    room.chatLog.splice(0, room.chatLog.length - MAX_CHAT_LOG);
  }
  io.to(roomId).emit("chat_message", entry);
}

function systemMessage(roomId, message) {
  addChatEntry(roomId, { system: true, message });
}

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------
function revealHint(roomId) {
  const room = rooms[roomId];
  if (!room || !room.currentWord) return;

  const word = room.currentWord;
  const revealedIndices = new Set(room.revealedLetters.map((r) => r.index));
  const unrevealed = [];

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch !== " " && ch !== "_" && !/[^a-zA-Z0-9]/.test(ch) && !revealedIndices.has(i)) {
      unrevealed.push(i);
    }
  }

  if (unrevealed.length === 0) return;

  const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  const letter = word[randomIndex];
  room.revealedLetters.push({ index: randomIndex, letter });

  io.to(roomId).emit("hint_revealed", {
    index: randomIndex,
    letter,
    hintsUsed: room.revealedLetters.length,
    totalHints: room.hintCount,
  });

  console.log(`[HINT] Room ${roomId}: revealed "${letter}" at position ${randomIndex} (${room.revealedLetters.length}/${room.hintCount})`);
}

// ---------------------------------------------------------------------------
// Game / turn system
// ---------------------------------------------------------------------------
// Starts a game (or the next round) — caller must validate status + player count
function startGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.gameStatus !== "LOBBY" && room.gameStatus !== "ROUND_END" && room.gameStatus !== "GAME_OVER") return;
  if (room.players.length < MIN_PLAYERS_TO_START) return;

  const wasLobby = room.gameStatus === "LOBBY";
  const wasGameOver = room.gameStatus === "GAME_OVER";
  room.gameStatus = "PLAYING";

  // Cancel any pending auto-start timer
  if (room.roundAutoStartTimer) {
    clearInterval(room.roundAutoStartTimer);
    room.roundAutoStartTimer = null;
  }

  // A completely new game resets scores, the round counter, and the used-words pool
  if (wasGameOver) {
    room.players.forEach((p) => {
      p.score = 0;
    });
    room.round = 1;
  } else {
    room.round = room.round ? room.round + 1 : 1;
  }
  if (wasLobby || wasGameOver) {
    room.usedWords = new Set();
    room.categoryIndex = 0;
  }

  room.turnOrder = room.players.map((p) => p.socketId);
  room.turnIndex = 0;
  room.currentWord = null;
  room.currentCategory = null;
  room.wordOptionCategories = {};
  room.wordOptions = [];
  room.phase = "idle";
  room.correctGuesses = new Set();
  room.reactions = { thumbsup: 0, heart: 0 };

  systemMessage(roomId, `Game started! Round ${room.round} — ${room.players.length} players.`);
  console.log(`[GAME] Game started in room ${roomId} — round ${room.round} (${room.players.length} players)`);
  startTurn(roomId);
}

function startTurn(roomId) {
  const room = rooms[roomId];
  if (!room || room.gameStatus !== "PLAYING") return;

  // Skip any players who left mid-game
  while (
    room.turnIndex < room.turnOrder.length &&
    !room.players.some((p) => p.socketId === room.turnOrder[room.turnIndex])
  ) {
    room.turnIndex++;
  }

  if (room.turnIndex >= room.turnOrder.length) {
    endRound(roomId);
    return;
  }

  const drawerId = room.turnOrder[room.turnIndex];
  const drawer = room.players.find((p) => p.socketId === drawerId);
  if (!drawer) {
    room.turnIndex++;
    startTurn(roomId);
    return;
  }

  // Pick up to 3 distinct unused words, one from each of 3 different categories
  let options = pickWordsFromCategories(room.usedWords, WORD_OPTIONS_COUNT, room.categoryIndex);
  if (options.length === 0) {
    // All category pools ran out mid-game. Refill so the game can always finish.
    room.usedWords = new Set();
    room.categoryIndex = 0;
    options = pickWordsFromCategories(room.usedWords, WORD_OPTIONS_COUNT, room.categoryIndex);
  }
  if (options.length === 0) {
    finishGame(roomId, "out_of_words");
    return;
  }

  // Record which category each offered word came from (exact: options[i] is
  // drawn from CATEGORY_NAMES[(categoryIndex + i) % len]).
  room.wordOptionCategories = {};
  options.forEach((w, i) => {
    room.wordOptionCategories[w] = CATEGORY_NAMES[(room.categoryIndex + i) % CATEGORY_NAMES.length];
  });

  // Advance category index for the next turn so different categories are used
  room.categoryIndex = (room.categoryIndex + WORD_OPTIONS_COUNT) % CATEGORY_NAMES.length;

  // Offered words count as used, even if the drawer does not pick them
  options.forEach((w) => room.usedWords.add(w));

  room.currentDrawer = drawerId;
  room.currentWord = null;
  room.currentCategory = null;
  room.wordOptions = options;
  room.phase = "choosing";
  room.turnTimer = WORD_CHOICE_TIME;
  room.correctGuesses = new Set();
  room.strokeLog = []; // fresh canvas each turn
  room.reactions = { thumbsup: 0, heart: 0 };
  room.reactionsByPlayer = {};
  room.hintsRevealed = 0;
  room.revealedLetters = [];

  io.to(roomId).emit("clear_canvas");
  io.to(roomId).emit("turn_started", {
    round: room.round,
    drawerId,
    drawerName: drawer.username,
    choosing: true,
    choiceTime: WORD_CHOICE_TIME,
  });
  io.to(drawerId).emit("word_options", { options });
  systemMessage(roomId, `${drawer.username} is choosing a word...`);
  broadcastRoom(roomId);

  console.log(`[TURN] Round ${room.round}: ${drawer.username} choosing in room ${roomId} (${options.length} options)`);
}

// Confirm the drawer's word choice and begin the drawing phase
function confirmWord(roomId, word) {
  const room = rooms[roomId];
  if (!room || room.gameStatus !== "PLAYING" || room.phase !== "choosing") return;
  if (!room.wordOptions.includes(word)) return;

  const drawer = room.players.find((p) => p.socketId === room.currentDrawer);
  room.currentWord = word;
  room.currentCategory = (room.wordOptionCategories || {})[word] || null;
  room.phase = "drawing";
  room.turnTimer = room.drawingTime || TURN_DURATION;

  io.to(roomId).emit("word_chosen", { wordLength: word.length, turnDuration: room.drawingTime || TURN_DURATION, hintCount: room.hintCount || DEFAULT_HINT_COUNT, category: room.currentCategory });
  io.to(room.currentDrawer).emit("your_word", { word });
  systemMessage(roomId, `${drawer ? drawer.username : "The drawer"} is drawing — ${word.length} letters.`);
  broadcastRoom(roomId);
  console.log(`[TURN] ${drawer ? drawer.username : "?"} picked "${word}" in room ${roomId}`);
}

function endTurn(roomId, reason) {
  const room = rooms[roomId];
  if (!room || room.gameStatus !== "PLAYING") return;

  const drawer = room.players.find((p) => p.socketId === room.currentDrawer);
  const word = room.currentWord;

  io.to(roomId).emit("turn_ended", {
    drawerId: room.currentDrawer,
    drawerName: drawer ? drawer.username : null,
    reason,
    // The word is only revealed when the turn runs out of time — never at the
    // moment someone guesses correctly.
    word: reason === "time_up" ? word : null,
  });

  if (reason === "time_up") {
    systemMessage(roomId, `Time's up! The word was ${word}`);
  } else if (reason === "all_guessed") {
    systemMessage(roomId, `Everyone guessed it!`);
  } else if (reason === "left") {
    systemMessage(roomId, `${drawer ? drawer.username : "The drawer"} left.`);
  }

  room.currentDrawer = null;
  room.currentWord = null;
  room.currentCategory = null;
  room.wordOptions = [];
  room.phase = "idle";
  room.turnTimer = 0;
  room.turnIndex++;
  broadcastRoom(roomId);

  if (room.turnIndex >= room.turnOrder.length) {
    endRound(roomId);
  } else {
    startTurn(roomId);
  }
}

function finishGame(roomId, reason) {
  const room = rooms[roomId];
  if (!room) return;

  room.gameStatus = "GAME_OVER";
  room.currentDrawer = null;
  room.currentWord = null;
  room.currentCategory = null;
  room.wordOptions = [];
  room.phase = "idle";
  room.turnTimer = 0;

  const top = maxScore(room.players);
  const winners = room.players.filter((p) => p.score === top).map((p) => p.username);
  const winnerText =
    winners.length === 1
      ? `${winners[0]} wins with ${top} points!`
      : `It's a tie between ${winners.join(" and ")} with ${top} points!`;
  const scores = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({ username: p.username, score: p.score }));

  io.to(roomId).emit("game_over", { winners, winnerText, scores });
  io.to(roomId).emit("clear_canvas");

  if (reason === "out_of_words") {
    systemMessage(roomId, `Ran out of words — game over!`);
    console.log(`[GAME] Game over in room ${roomId}: out of words`);
  } else {
    systemMessage(roomId, `Game over! ${winnerText}`);
    console.log(`[GAME] Game over in room ${roomId}: ${winnerText}`);
  }
  broadcastRoom(roomId);

  // Auto-restart new game after showing scoreboard
  checkGameOverAutoRestart(roomId);
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.currentDrawer = null;
  room.currentWord = null;
  room.currentCategory = null;
  room.wordOptions = [];
  room.phase = "idle";
  room.turnTimer = 0;

  // Final round — the game is over, announce the winner(s)
  if (room.round >= (room.numRounds || TOTAL_ROUNDS)) {
    finishGame(roomId, "final_round");
    return;
  }

  room.gameStatus = "ROUND_END";
  io.to(roomId).emit("round_ended", { round: room.round });
  io.to(roomId).emit("clear_canvas");
    systemMessage(roomId, `Round ${room.round} complete!`);
  broadcastRoom(roomId);
  console.log(`[ROUND] Round ${room.round} complete in room ${roomId}`);

  // Auto-start next round after a 5-second countdown
  const nextRound = room.round + 1;
  let countdown = 5;
  io.to(roomId).emit("round_starting", { nextRound, countdown });

  const timer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      room.roundAutoStartTimer = null;
      // Only auto-start if still in ROUND_END (host might have manually started or players left)
      if (room.gameStatus === "ROUND_END") {
        startGame(roomId);
      }
    } else {
      io.to(roomId).emit("round_starting", { nextRound, countdown });
    }
  }, 1000);

  room.roundAutoStartTimer = timer;
  console.log(`[ROUND] Next round starting in 5s in room ${roomId}`);
}

// ---------------------------------------------------------------------------
// Auto-restart after game over (show scoreboard for a few seconds, then restart)
// ---------------------------------------------------------------------------
function checkGameOverAutoRestart(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.gameStatus !== "GAME_OVER") return;

  let countdown = 10;
  io.to(roomId).emit("game_restarting", { countdown });

  const timer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      room.gameOverTimer = null;
      if (room.gameStatus === "GAME_OVER" && room.players.length >= MIN_PLAYERS_TO_START) {
        startGame(roomId);
      }
    } else {
      io.to(roomId).emit("game_restarting", { countdown });
    }
  }, 1000);

  room.gameOverTimer = timer;
  console.log(`[GAME] Auto-restarting in 10s in room ${roomId}`);
}

// Global 1-second timer for all active turns (choosing + drawing phases)
setInterval(() => {
  for (const roomId of Object.keys(rooms)) {
    const room = rooms[roomId];
    if (room.gameStatus !== "PLAYING") continue;

    room.turnTimer--;
    io.to(roomId).emit("turn_timer", { remaining: room.turnTimer });

    // Progressive hint reveals during drawing phase
    if (room.phase === "drawing" && room.hintCount > 0) {
      const drawTime = room.drawingTime || TURN_DURATION;
      const elapsed = drawTime - room.turnTimer;
      while (room.hintsRevealed < room.hintCount) {
        const threshold = (room.hintsRevealed + 1) * drawTime / (room.hintCount + 1);
        if (elapsed >= threshold) {
          revealHint(roomId);
          room.hintsRevealed++;
        } else {
          break;
        }
      }
    }

    if (room.turnTimer <= 0) {
      if (room.phase === "choosing") {
        // Drawer ran out of time to pick — auto-select the first option
        if (room.wordOptions.length > 0) {
          confirmWord(roomId, room.wordOptions[0]);
        } else {
          endTurn(roomId, "time_up");
        }
      } else {
        endTurn(roomId, "time_up");
      }
    }
  }
}, 1000);

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[CONNECT] Player connected: ${socket.id}`);

  // CREATE ROOM — client sends { username }
  socket.on("create_room", (data) => {
    const username = data && data.username;

    if (!isValidUsername(username)) {
      socket.emit("error", {
        message: "Please enter a valid username (1-20 characters).",
      });
      return;
    }

    if (socket.data.roomId) {
      socket.emit("error", { message: "You are already in a room." });
      return;
    }

    const roomId = generateRoomCode();
    const room = createRoom(roomId);
    room.players.push({
      socketId: socket.id,
      username: username.trim(),
      isLeader: true, // creator is the room leader
      score: 0,
    });
    rooms[roomId] = room;

    socket.data.roomId = roomId;
    socket.join(roomId);

    console.log(`[ROOM] Room created: ${roomId} by ${username.trim()} (${socket.id})`);
    socket.emit("room_updated", getRoomSnapshot(room));
  });

  // JOIN ROOM — client sends { roomId, username }
  socket.on("join_room", (data) => {
    const roomId = data && data.roomId ? String(data.roomId).trim().toUpperCase() : "";
    const username = data && data.username;

    if (!isValidUsername(username)) {
      socket.emit("error", {
        message: "Please enter a valid username (1-20 characters).",
      });
      return;
    }

    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", { message: `Room "${roomId}" does not exist.` });
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit("error", { message: "Room is full." });
      return;
    }

    if (socket.data.roomId) {
      socket.emit("error", { message: "You are already in a room." });
      return;
    }

    if (room.players.some((p) => p.username === username.trim())) {
      socket.emit("error", { message: "That username is already taken in this room." });
      return;
    }

    room.players.push({
      socketId: socket.id,
      username: username.trim(),
      isLeader: false,
      score: 0,
    });

    socket.data.roomId = roomId;
    socket.join(roomId);

    console.log(`[JOIN] ${username.trim()} (${socket.id}) joined room ${roomId}`);
    broadcastRoom(roomId);

    // Replay existing strokes + chat so late joiners catch up
    socket.emit("draw_history", room.strokeLog);
    socket.emit("chat_history", room.chatLog);
  });

  // START GAME — leader only; starts the first game from lobby
  socket.on("start_game", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || !player.isLeader) return; // leader only
    if (room.gameStatus !== "LOBBY") return; // only from lobby
    if (room.players.length < MIN_PLAYERS_TO_START) {
      socket.emit("error", { message: "Need at least 2 players to start." });
      return;
    }
    if (data && data.numRounds) {
      room.numRounds = Math.min(9, Math.max(3, Number(data.numRounds) || 5));
    }
    startGame(roomId);
  });

  // SET GAME SETTINGS — host only, lobby only
  socket.on("set_game_settings", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || !player.isLeader) return;
    if (room.gameStatus !== "LOBBY") return;

    let changed = false;

    if (data && data.drawingTime !== undefined) {
      const val = Number(data.drawingTime);
      if (VALID_DRAW_TIMES.includes(val)) {
        room.drawingTime = val;
        changed = true;
      }
    }

    if (data && data.hintCount !== undefined) {
      const val = Number(data.hintCount);
      if (VALID_HINT_COUNTS.includes(val)) {
        room.hintCount = val;
        changed = true;
      }
    }

    if (changed) {
      broadcastRoom(roomId);
      console.log(`[SETTINGS] Room ${roomId}: drawingTime=${room.drawingTime}, hintCount=${room.hintCount}`);
    }
  });

  // CHOOSE WORD — the drawer picks one of the offered options
  socket.on("choose_word", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room) return;
    if (room.gameStatus !== "PLAYING" || room.currentDrawer !== socket.id || room.phase !== "choosing") return;

    const word = data && data.word;
    if (!room.wordOptions.includes(word)) {
      socket.emit("error", { message: "That word is not an option." });
      return;
    }
    confirmWord(roomId, word);
  });

  // DRAW START — client sends { x, y, color, lineWidth } (current drawer only)
  socket.on("draw_start", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room || room.gameStatus !== "PLAYING" || room.currentDrawer !== socket.id || room.phase !== "drawing") return;
    if (
      !data ||
      !isValidPoint(data) ||
      typeof data.color !== "string" ||
      typeof data.lineWidth !== "number" ||
      !isFinite(data.lineWidth)
    ) {
      return;
    }
    // For shapes, also validate x2/y2
    if (data.shape && data.shape !== "freehand" && data.shape !== "fill") {
      if (typeof data.x2 !== "number" || !isFinite(data.x2) ||
          typeof data.y2 !== "number" || !isFinite(data.y2)) {
        return;
      }
    }
    const payload = {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      color: data.color,
      lineWidth: data.lineWidth,
    };
    // Relay shape data for non-freehand drawing tools
    if (data.shape && data.shape !== "freehand") {
      payload.shape = data.shape;
      if (data.shape !== "fill") {
        payload.x2 = data.x2;
        payload.y2 = data.y2;
      }
    }
    logStroke(roomId, { type: "start", ...payload });
    socket.broadcast.to(roomId).emit("draw_start", payload);
  });

  // DRAW — client sends { x, y } (continuation of the current stroke)
  socket.on("draw", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room || room.gameStatus !== "PLAYING" || room.currentDrawer !== socket.id || room.phase !== "drawing") return;
    if (!isValidPoint(data)) return;
    const payload = { socketId: socket.id, x: data.x, y: data.y };
    logStroke(roomId, { type: "draw", ...payload });
    socket.broadcast.to(roomId).emit("draw", payload);
  });

  // DRAW END — client sends {} (stroke finished)
  socket.on("draw_end", () => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room || room.gameStatus !== "PLAYING" || room.currentDrawer !== socket.id || room.phase !== "drawing") return;
    socket.broadcast.to(roomId).emit("draw_end", { socketId: socket.id });
  });

  // CLEAR CANVAS — client sends {} (current drawer only)
  socket.on("clear_canvas", () => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room || room.gameStatus !== "PLAYING" || room.currentDrawer !== socket.id || room.phase !== "drawing") return;
    rooms[roomId].strokeLog = [];
    console.log(`[DRAW] Canvas cleared in room ${roomId} by ${socket.id}`);
    io.to(roomId).emit("clear_canvas");
  });

  // CHAT MESSAGE — client sends { message }; may be a correct guess
  socket.on("chat_message", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room) return;

    const raw = data && typeof data.message === "string" ? data.message.trim() : "";
    if (!raw) return;
    const message = raw.slice(0, MAX_MESSAGE_LENGTH);

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    const isDrawer = room.currentDrawer === socket.id;

    // Drawer cannot send chat messages while drawing
    if (isDrawer && room.gameStatus === "PLAYING" && room.phase === "drawing") return;

    // Correct-guess detection (drawer can't guess their own word)
    if (room.gameStatus === "PLAYING" && !isDrawer && room.currentWord) {
      if (normalizeWord(message) === normalizeWord(room.currentWord)) {
        if (!room.correctGuesses.has(socket.id)) {
          room.correctGuesses.add(socket.id);

          const points = GUESS_POINTS + Math.max(0, room.turnTimer) * GUESS_TIME_BONUS_PER_SECOND;
          player.score += points;

          const drawer = room.players.find((p) => p.socketId === room.currentDrawer);
          if (drawer) {
            drawer.score += DRAWER_POINTS_PER_GUESS;
          }

          console.log(`[GUESS] ${player.username} guessed "${room.currentWord}" in room ${roomId} (+${points} pts)`);
          systemMessage(roomId, `${player.username} guessed the word! (+${points} pts)`);
          broadcastRoom(roomId); // refresh scores in the player list

          // Everyone (except the drawer) has guessed — end the turn early
          if (room.correctGuesses.size === room.players.length - 1) {
            endTurn(roomId, "all_guessed");
          }
        }
        // Repeated guess of the same word: drop silently (it would reveal the word)
        return;
      }
    }

    addChatEntry(roomId, { socketId: socket.id, username: player.username, message });
    console.log(`[CHAT] ${roomId} ${player.username}: ${message}`);
  });

  // REACTION — client sends { type: "thumbsup" | "heart" }
  socket.on("reaction", (data) => {
    const roomId = socket.data.roomId;
    const room = roomId && rooms[roomId];
    if (!room) return;
    const type = data && data.type;
    if (type !== "thumbsup" && type !== "heart") return;

    // Only allow reactions during active drawing phase
    if (room.gameStatus !== "PLAYING" || room.phase !== "drawing") return;

    if (!room.reactions) room.reactions = { thumbsup: 0, heart: 0 };
    if (!room.reactionsByPlayer) room.reactionsByPlayer = {};

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    // One reaction per user per turn — if already reacted, remove the old one
    const prev = room.reactionsByPlayer[socket.id];
    if (prev) {
      room.reactions[prev] = Math.max(0, (room.reactions[prev] || 0) - 1);
    }

    room.reactionsByPlayer[socket.id] = type;
    room.reactions[type] = (room.reactions[type] || 0) + 1;

    io.to(roomId).emit("reaction", {
      type,
      count: room.reactions[type],
      userReactions: room.reactionsByPlayer,
    });

    // Emit a chat message for the reaction
    const drawer = room.players.find((p) => p.socketId === room.currentDrawer);
    const drawerName = drawer ? drawer.username : "the drawer";
    if (type === "thumbsup") {
      systemMessage(roomId, `${player.username} liked ${drawerName}'s drawing!`);
    } else {
      systemMessage(roomId, `${player.username} loved ${drawerName}'s drawing!`);
    }
  });

  // LEAVE ROOM — client sends {} (voluntary exit, socket stays connected)
  socket.on("leave_room", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      handlePlayerLeft(roomId, socket.id, "LEAVE");
      socket.leave(roomId);
      socket.data.roomId = null;
      socket.emit("left_room");
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      handlePlayerLeft(roomId, socket.id, "DISCONNECT");
    } else {
      console.log(`[DISCONNECT] Player disconnected: ${socket.id}`);
    }
  });
});

// Shared cleanup for a player leaving a room (disconnect or voluntary leave)
function handlePlayerLeft(roomId, socketId, label) {
  const room = rooms[roomId];
  if (!room) return;

  const player = room.players.find((p) => p.socketId === socketId);
  const name = player ? player.username : socketId;

  room.players = room.players.filter((p) => p.socketId !== socketId);

  // If the leader left, promote the first remaining player
  if (room.players.length > 0 && !room.players.some((p) => p.isLeader)) {
    room.players[0].isLeader = true;
    console.log(`[ROOM] ${room.players[0].username} is now the leader of ${roomId}`);
  }

  // Cancel any pending timers when a player leaves
  if (room.gameOverTimer) {
    clearInterval(room.gameOverTimer);
    room.gameOverTimer = null;
  }

  // Handle mid-game departures
  if (room.gameStatus === "PLAYING" || room.gameStatus === "ROUND_END" || room.gameStatus === "GAME_OVER") {
    if (room.players.length < MIN_PLAYERS_TO_START) {
      // Not enough players — abort the game back to the lobby
      if (room.roundAutoStartTimer) {
        clearInterval(room.roundAutoStartTimer);
        room.roundAutoStartTimer = null;
      }
      room.gameStatus = "LOBBY";
      room.round = 0;
      room.currentDrawer = null;
      room.currentWord = null;
      room.currentCategory = null;
      room.wordOptionCategories = {};
      room.turnTimer = 0;
      room.turnOrder = [];
      room.wordOptions = [];
      room.phase = "idle";
      room.players.forEach((p) => { p.score = 0; });
      io.to(roomId).emit("game_aborted", { message: "Not enough players — back to the lobby." });
      io.to(roomId).emit("clear_canvas");
      systemMessage(roomId, "Not enough players — back to the lobby.");
      console.log(`[GAME] Game aborted in room ${roomId} (not enough players)`);
    } else if (room.gameStatus === "PLAYING" && room.currentDrawer === socketId) {
      // The drawer left — move to the next turn
      endTurn(roomId, "left");
    }
  }

  console.log(`[${label}] ${name} (${socketId}) left room ${roomId}`);
  broadcastRoom(roomId);

  // Delete empty rooms
  if (room.players.length === 0) {
    delete rooms[roomId];
    console.log(`[ROOM] Room ${roomId} deleted (empty)`);
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] Server started on port ${PORT}`);
});
