# GlossQuiz ✦

GlossQuiz is a complete real-time 2-player multiplayer quiz web app with a Node.js + Express + Socket.io backend and a vanilla HTML/CSS/JS frontend.

It includes private 8-character room links, synchronized 15-second server-side timers, player reconnect handling, streak bonuses, rematches, Hall of Fame, responsive glam styling, and 175 built-in questions across 7 categories.

## Project structure

```txt
glossquiz/
├── server/
│   ├── index.js
│   ├── questions.js
│   ├── gameLogic.js
│   └── package.json
├── client/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── vercel.json
├── package.json
└── README.md
```

## Local development

```bash
cd server
npm install
node index.js
```

Then open:

```txt
http://localhost:3000
```

Create a game, copy the generated `/room/[roomId]` link, and open it in a second browser/device to join as Player 2.

## Deploy backend to Railway

1. Push this project to GitHub.
2. Go to Railway and create a new project.
3. Choose **Deploy from GitHub repo**.
4. Set the Railway root directory to:

```txt
/server
```

5. Add this environment variable:

```txt
PORT=3000
```

6. Railway gives you a backend URL, for example:

```txt
https://glossquiz-production.up.railway.app
```

7. In `client/app.js`, set the first line to your Railway backend URL:

```js
const SOCKET_URL =
  window.GLOSSQUIZ_SOCKET_URL || "https://glossquiz-production.up.railway.app";
```

## Deploy frontend to Vercel

1. Go to Vercel and create a new project.
2. Import the same GitHub repository.
3. Set the Vercel root directory to:

```txt
/client
```

4. No build command is needed.
5. No output directory is needed.
6. Vercel gives you a frontend URL, for example:

```txt
https://glossquiz.vercel.app
```

The included `client/vercel.json` rewrites `/room/[roomId]` to `index.html`, so shared room links work correctly on Vercel.

## CORS setup

In `server/index.js`, Socket.io CORS already allows:

```txt
http://localhost:3000
http://localhost:5173
http://127.0.0.1:3000
http://127.0.0.1:5173
https://glossquiz.vercel.app
```

For your real Vercel domain, either replace `https://glossquiz.vercel.app` in `server/index.js`, or set this Railway environment variable:

```txt
CLIENT_URL=https://your-real-vercel-url.vercel.app
```

## Deploy both backend and frontend on Railway as one app

The Express server serves the `client` folder automatically. You can deploy only the backend on Railway and use Railway as the full app host.

Use root directory:

```txt
/server
```

Then open the Railway URL directly. The client is now configured to default to the current host, so you usually do not need to change `client/app.js` for same-origin deployment.

If you deploy the frontend and backend separately, set this in `client/app.js` or via `window.GLOSSQUIZ_SOCKET_URL` in your HTML:

```js
const SOCKET_URL = window.GLOSSQUIZ_SOCKET_URL || window.location.origin;
```

If your backend is on a separate domain, set `CLIENT_URL` in the backend environment to your frontend URL so CORS works correctly.

## Game rules

- 2 players maximum per room.
- 20 shuffled questions per game.
- Timer is controlled by the server, not the browser.
- Easy questions: 100 base points.
- Medium questions: 200 base points.
- Hard questions: 300 base points.
- Correct answer points are multiplied by `timeLeft / 15`.
- Minimum score for a correct answer is 10 points.
- Wrong answers give 0 points.
- Every 3 correct answers in a row gives a +150 streak bonus.
- If a player disconnects mid-game, the game pauses for 30 seconds.
- If both players disconnect, the room is destroyed.
- Finished rooms are cleaned from memory after 5 minutes.

## Socket events implemented

Server to client:

- `room_joined`
- `opponent_joined`
- `game_start`
- `question`
- `tick`
- `both_answered`
- `time_up`
- `streak_bonus`
- `next_question`
- `game_over`
- `player_disconnected`
- `error`

Client to server:

- `set_name`
- `set_options`
- `start_game`
- `answer`
- `request_rematch`

The app also implements small helper events for production usability:

- `get_hall_of_fame`
- `hall_of_fame`
- `options_updated`
- `opponent_reconnected`

## Notes

Hall of Fame is stored in server memory and mirrored to `localStorage` in the browser as a backup. Server memory resets when the Railway app restarts. For permanent global scores, replace the in-memory Hall of Fame array with a database such as PostgreSQL, Redis, or MongoDB.
