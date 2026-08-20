# Draw & Guess

A real-time multiplayer drawing and guessing game — skribbl-style, built with Node.js, Express, Socket.io, and vanilla HTML/CSS/JS. No database, no build step, no framework.

## Features

- Create/join rooms (6-character codes, max 5 players)
- **Category selection**: the leader picks one of 10 categories before starting (Animals, Food, Objects, Places, Sports, Movies, Professions, Actions, Nature, Technology)
- **3-word choice** per turn: the drawer picks from 3 random category words (15s to choose)
- Real-time drawing (pointer/touch), color palette, brush size, eraser
- Chat with **correct-guess detection** and scoring (guesser: `100 + 2×remaining seconds`, drawer: 50 per correct guess)
- **No word repetition** during a game (every offered word counts as used; the pool resets between games)
- Turns (60s) cycle through players; rounds; scoreboard + winner announcement; Play Again
- **Server-authoritative** game state: clients cannot change scores, words, timers, or who draws
- Fully responsive: desktop 3-column layout, tablet, and mobile (canvas-first stacking, touch drawing)

## Tech Stack

- **Backend:** Node.js + Express
- **Real-time:** Socket.io (WebSocket)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, HTML5 Canvas
- **No database** — rooms live in memory only

## Project Structure

```
/
├── server.js          # Express + Socket.io server (rooms, turns, scoring, chat)
├── words.js           # Server-only category word banks + selection logic
├── package.json
├── render.yaml        # Render Blueprint (optional, zero-config deploy)
├── railway.json       # Railway config (optional, zero-config deploy)
├── Procfile           # web: npm start (used by Railway and other platforms)
├── public/
│   ├── index.html     # Lobby + room UI
│   ├── style.css
│   └── script.js      # Socket.io client + rendering
└── README.md
```

---

## Project Setup

1. **Clone / download** the project.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run locally:**

   ```bash
   npm start
   ```

4. **Open:**

   ```
   http://localhost:3000
   ```

The server listens on `0.0.0.0` and uses `process.env.PORT` (defaults to `3000`).

### Local Multiplayer Testing

1. Open `http://localhost:3000` in **two or more browser windows/tabs** (or different browsers/devices on the same network).
2. Enter different usernames in each.
3. One player **creates a room**; the others join using the 6-character room code.
4. The leader picks a **category**, then clicks **Start Game**.

## Render Deployment

1. Create a **Web Service** on [Render](https://render.com) and connect your repository.
2. Render auto-detects `render.yaml` — otherwise set:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Render injects `PORT` automatically — no environment variables are required.
4. After deploy, verify the health endpoint:

   ```
   https://YOUR-SERVICE.onrender.com/health
   ```

   → `{ "status": "ok" }`

5. **Test multiplayer after deployment:** open the deployed URL in two browser windows (or two phones), create a room in one, join with the code in the other, pick a category, and start the game.

> **Note:** Rooms live in memory only. On Render's **free** plan, the instance sleeps after ~15 minutes of inactivity, which drops all active rooms (players reconnect to an empty lobby). A running game keeps the instance awake. For persistent rooms across sleeps, upgrade to a paid plan or add a database-backed room store.

## Railway Deployment

1. Push this repo to GitHub and import it on [Railway](https://railway.com) (New Project → Deploy from GitHub repo).
2. Railway auto-detects `railway.json` and uses:
   - **Build:** `npm install`
   - **Start:** `npm start`
3. Railway injects `PORT` automatically — no environment variables are required.
4. After deploy, verify the health endpoint:

   ```
   https://YOUR-PROJECT.up.railway.app/health
   ```

   → `{ "status": "ok" }`

5. **Test multiplayer after deployment:** open the deployed URL in two browser windows (or two phones), create a room in one, join with the code in the other, pick a category, and start the game.

> **Note:** Rooms live in memory only. Railway apps restart when redeployed or when the service is stopped, which drops all active rooms. A `Procfile` (`web: npm start`) is included for any platform that uses it, and the `railway.json` sets a `/health` healthcheck so Railway keeps the service running.

### Optional environment variables

| Variable          | Default | Description                                        |
| ----------------- | ------- | -------------------------------------------------- |
| `PORT`            | `3000`  | HTTP port (Render sets this)                       |
| `CORS_ORIGIN`     | —       | Comma-separated extra allowed origins (same-origin by default) |
| `TURN_DURATION`   | `60`    | Seconds per drawing turn                           |
| `TOTAL_ROUNDS`    | `3`     | Rounds per game                                    |
| `WORD_CHOICE_TIME`| `15`    | Seconds the drawer has to pick a word              |

See `.env.example`. No secrets are required.

## Socket.io Events

| Direction      | Event           | Payload                                       |
| -------------- | --------------- | --------------------------------------------- |
| Client → Server| `create_room`   | `{ username }`                                |
| Client → Server| `join_room`     | `{ roomId, username }`                        |
| Client → Server| `leave_room`    | `{}` (return to lobby, socket stays connected)|
| Client → Server| `select_category`| `{ category }` (leader only, in lobby)        |
| Client → Server| `start_game`    | `{}` (leader only; category required)         |
| Client → Server| `choose_word`   | `{ word }` (drawer picks one of 3 options)    |
| Client → Server| `chat_message`  | `{ message }` (guesses checked server-side)   |
| Client → Server| `draw_start`    | `{ x, y, color, lineWidth }` (drawer only)    |
| Client → Server| `draw`          | `{ x, y }`                                    |
| Client → Server| `draw_end`      | `{}`                                          |
| Client → Server| `clear_canvas`  | `{}`                                          |
| Server → Client| `room_updated`  | Room snapshot (see below)                     |
| Server → Client| `turn_started`  | `{ round, drawerId, drawerName, choosing, choiceTime }` |
| Server → Client| `word_options`  | `{ options: [3 words] }` (drawer only)        |
| Server → Client| `word_chosen`   | `{ wordLength, turnDuration }`                 |
| Server → Client| `your_word`     | `{ word }` (drawer only)                      |
| Server → Client| `turn_timer`    | `{ remaining }` (every second)                |
| Server → Client| `turn_ended`    | `{ drawerId, drawerName, reason: "time_up" \| "left" \| "all_guessed", word? }` |
| Server → Client| `round_ended`   | `{ round }`                                   |
| Server → Client| `game_over`     | `{ winners, winnerText, scores }`             |
| Server → Client| `game_aborted`  | `{ message }`                                 |
| Server → Client| `chat_message`  | `{ socketId, username, message }` or `{ system: true, message }` |
| Server → Client| `chat_history`  | `[chat entries]` (sent on join)               |
| Server → Client| `draw_start`    | `{ socketId, x, y, color, lineWidth }`        |
| Server → Client| `draw`          | `{ socketId, x, y }`                          |
| Server → Client| `draw_end`      | `{ socketId }`                                |
| Server → Client| `clear_canvas`  | — (broadcast to room)                         |
| Server → Client| `draw_history`  | `[{ type: "start" \| "draw", ... }]` (sent on join) |
| Server → Client| `left_room`     | — (confirmation to the player who left)       |
| Server → Client| `error`         | `{ message }`                                 |

`room_updated` payload:

```js
{
  id: "ABC123",
  players: [{ socketId, username, isLeader, score }],
  playerCount: 1,
  maxPlayers: 5,
  currentDrawer: null,
  gameStatus: "LOBBY", // LOBBY | PLAYING | ROUND_END | GAME_OVER
  turnTimer: 0,
  round: 0,
  totalRounds: 3,
  correctGuessers: [],
  selectedCategory: null,
}
```

## Scoring

- **Correct guess:** `100 + 2 × seconds remaining` points to the guesser
- **Drawer bonus:** `50` points per correct guess
- Guess matching is case-insensitive and treats `_` as a space (e.g. `ICE_CREAM` matches `ice cream`)
- The turn ends early when every non-drawer has guessed; the word is only revealed when the turn times out
