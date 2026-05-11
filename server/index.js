const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const {
  getOrCreateRoom,
  assignPlayer,
  setOptions,
  startGame,
  playerAnswer,
  handleDisconnect,
  resumeIfReconnected,
  getCurrentState,
  getHallOfFame,
} = require("./gameLogic");

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, "..", "client");
const VERCEL_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://glossquiz.vercel.app",
  process.env.CLIENT_URL,
  VERCEL_URL,
].filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  return (
    ALLOWED_ORIGINS.includes(origin) || process.env.ALLOW_ALL_ORIGINS === "true"
  );
}

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static(CLIENT_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "GlossQuiz", timestamp: new Date().toISOString() });
});

app.get("/api/hall-of-fame", (_req, res) => {
  res.json({ hallOfFame: getHallOfFame() });
});

app.get(["/room/:roomId", "/room/:roomId/*"], (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function getRoomIdFromSocket(socket, payload = {}) {
  const fromPayload = payload.roomId;
  const fromHandshake = socket.handshake.query.roomId;
  const roomId = String(fromPayload || fromHandshake || "").trim();
  return /^[A-Za-z0-9]{8}$/.test(roomId) ? roomId : null;
}

io.on("connection", (socket) => {
  socket.on("set_name", (payload = {}) => {
    const roomId = getRoomIdFromSocket(socket, payload);
    if (!roomId) {
      socket.emit("error", {
        message: "Invalid room link. Create a new game from the home screen.",
      });
      return;
    }

    const room = getOrCreateRoom(roomId, io);
    const player = assignPlayer(
      room,
      socket,
      payload.name,
      payload.savedPlayerId,
    );

    if (!player) {
      socket.emit("error", {
        message: "This room is already full. Only 2 players can join.",
      });
      return;
    }

    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerId = player.id;

    socket.emit("room_joined", {
      roomId: room.id,
      playerId: player.id,
      playerName: player.name,
      waitingForOpponent: !(room.players[1] && room.players[2]),
      state: getCurrentState(room, player.id),
      hallOfFame: getHallOfFame(),
    });

    const opponent = room.players[player.id === 1 ? 2 : 1];
    if (opponent) {
      socket.emit("opponent_joined", { opponentName: opponent.name });
      socket.to(room.id).emit("opponent_joined", { opponentName: player.name });
    }

    resumeIfReconnected(room);
  });

  socket.on("set_options", (payload = {}) => {
    const { roomId, playerId } = socket.data || {};
    const room = roomId ? getOrCreateRoom(roomId, io) : null;
    if (!room) return;
    const result = setOptions(room, playerId, payload);
    if (!result.ok) socket.emit("error", { message: result.message });
  });

  socket.on("start_game", () => {
    const { roomId, playerId } = socket.data || {};
    const room = roomId ? getOrCreateRoom(roomId, io) : null;
    if (!room) return;
    if (Number(playerId) !== 1) {
      socket.emit("error", { message: "Only player 1 can start the game." });
      return;
    }
    startGame(room);
  });

  socket.on("answer", (payload = {}) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    const room = getOrCreateRoom(roomId, io);
    playerAnswer(
      room,
      Number(playerId),
      Number(payload.questionIndex),
      payload.optionKey,
      Number(payload.timeLeft),
    );
  });

  socket.on("request_rematch", () => {
    const { roomId, playerId } = socket.data || {};
    const room = roomId ? getOrCreateRoom(roomId, io) : null;
    if (!room) return;
    if (Number(playerId) !== 1) {
      socket.emit("error", { message: "Only the host can start the rematch." });
      return;
    }
    startGame(room);
  });

  socket.on("get_hall_of_fame", () => {
    socket.emit("hall_of_fame", { hallOfFame: getHallOfFame() });
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  console.log(`GlossQuiz server running on http://localhost:${PORT}`);
});
