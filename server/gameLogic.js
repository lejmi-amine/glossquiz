const questionsBank = require('./questions');

const TOTAL_QUESTIONS = 20;
const TIME_LIMIT = 15;
const REVEAL_DELAY_MS = 2500;
const RECONNECT_TIMEOUT_MS = 30000;
const ROOM_CLEANUP_MS = 5 * 60 * 1000;

const BASE_POINTS = {
  easy: 100,
  medium: 200,
  hard: 300,
};

const rooms = new Map();
let hallOfFame = [];

function randomRoomId(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < length; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function ensureUniqueRoomId() {
  let id = randomRoomId();
  while (rooms.has(id)) id = randomRoomId();
  return id;
}

function fisherYates(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sanitizeName(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  return clean || 'Glam Player';
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    connected: player.connected,
    streak: player.streak,
  };
}

function createRoom(roomId, io) {
  const id = roomId || ensureUniqueRoomId();
  const room = {
    id,
    io,
    players: {
      1: null,
      2: null,
    },
    hostId: 1,
    status: 'lobby',
    options: {
      difficulty: 'mixed',
      categories: ['makeup', 'logos_fashion', 'accessories', 'skincare', 'nails', 'logos_tech', 'wildcard'],
    },
    questions: [],
    currentQuestionIndex: -1,
    currentAnswers: {},
    timer: null,
    timeLeft: TIME_LIMIT,
    revealLocked: false,
    reconnectTimer: null,
    reconnectDeadline: null,
    cleanupTimer: null,
    categoryStats: {},
    endedAt: null,
  };
  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function getOrCreateRoom(roomId, io) {
  return rooms.get(roomId) || createRoom(roomId, io);
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  clearInterval(room.timer);
  clearTimeout(room.reconnectTimer);
  clearTimeout(room.cleanupTimer);
  rooms.delete(roomId);
}

function scheduleRoomCleanup(room) {
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => destroyRoom(room.id), ROOM_CLEANUP_MS);
}

function emitRoom(room, event, payload) {
  room.io.to(room.id).emit(event, payload);
}

function connectedPlayers(room) {
  return Object.values(room.players).filter((p) => p && p.connected);
}

function activePlayers(room) {
  return Object.values(room.players).filter(Boolean);
}

function bothPlayersPresent(room) {
  return Boolean(room.players[1] && room.players[2]);
}

function assignPlayer(room, socket, name, savedPlayerId) {
  const playerName = sanitizeName(name);
  const requestedId = Number(savedPlayerId);

  if ([1, 2].includes(requestedId) && room.players[requestedId]) {
    const existing = room.players[requestedId];
    if (!existing.connected || existing.socketId === socket.id || existing.name === playerName) {
      existing.socketId = socket.id;
      existing.connected = true;
      existing.name = playerName;
      existing.disconnectedAt = null;
      return existing;
    }
  }

  const sameNameDisconnected = [1, 2].find((slot) => room.players[slot] && !room.players[slot].connected && room.players[slot].name === playerName);
  if (sameNameDisconnected) {
    const existing = room.players[sameNameDisconnected];
    existing.socketId = socket.id;
    existing.connected = true;
    existing.disconnectedAt = null;
    return existing;
  }

  const existingSocketSlot = [1, 2].find((slot) => room.players[slot] && room.players[slot].socketId === socket.id);
  if (existingSocketSlot) {
    room.players[existingSocketSlot].name = playerName;
    return room.players[existingSocketSlot];
  }

  const emptySlot = !room.players[1] ? 1 : !room.players[2] ? 2 : null;
  if (!emptySlot) return null;

  const player = {
    id: emptySlot,
    socketId: socket.id,
    name: playerName,
    score: 0,
    streak: 0,
    connected: true,
    answerLocked: false,
    disconnectedAt: null,
  };
  room.players[emptySlot] = player;
  return player;
}

function resetPlayerForGame(player) {
  player.score = 0;
  player.streak = 0;
  player.answerLocked = false;
}

function prepareCategoryStats(room) {
  room.categoryStats = {};
  room.options.categories.forEach((cat) => {
    room.categoryStats[cat] = {
      player1: { correct: 0, total: 0 },
      player2: { correct: 0, total: 0 },
    };
  });
}

function selectQuestions(options) {
  const categories = options.categories && options.categories.length ? options.categories : ['wildcard'];
  let pool = questionsBank.filter((q) => categories.includes(q.category));
  if (options.difficulty && options.difficulty !== 'mixed') {
    pool = pool.filter((q) => q.difficulty === options.difficulty);
  }
  if (pool.length < TOTAL_QUESTIONS) {
    let fallback = questionsBank.filter((q) => categories.includes(q.category));
    if (fallback.length < TOTAL_QUESTIONS) fallback = questionsBank;
    pool = [...pool, ...fallback.filter((q) => !pool.some((p) => p.id === q.id))];
  }
  return fisherYates(pool).slice(0, TOTAL_QUESTIONS);
}

function startGame(room) {
  if (!bothPlayersPresent(room)) {
    emitRoom(room, 'error', { message: 'You need two players before starting.' });
    return false;
  }

  clearTimeout(room.cleanupTimer);
  clearTimeout(room.reconnectTimer);
  clearInterval(room.timer);
  room.reconnectDeadline = null;
  room.status = 'playing';
  room.currentQuestionIndex = -1;
  room.currentAnswers = {};
  room.revealLocked = false;
  room.questions = selectQuestions(room.options);
  resetPlayerForGame(room.players[1]);
  resetPlayerForGame(room.players[2]);
  prepareCategoryStats(room);

  emitRoom(room, 'game_start', {
    difficulty: room.options.difficulty,
    categories: room.options.categories,
    totalQuestions: TOTAL_QUESTIONS,
    players: {
      player1: publicPlayer(room.players[1]),
      player2: publicPlayer(room.players[2]),
    },
  });

  sendNextQuestion(room);
  return true;
}

function sendNextQuestion(room) {
  clearInterval(room.timer);
  room.currentQuestionIndex += 1;
  room.currentAnswers = {};
  room.revealLocked = false;

  if (room.currentQuestionIndex >= room.questions.length) {
    finishGame(room);
    return;
  }

  const q = room.questions[room.currentQuestionIndex];
  room.timeLeft = TIME_LIMIT;
  room.players[1].answerLocked = false;
  room.players[2].answerLocked = false;

  emitRoom(room, 'question', {
    questionIndex: room.currentQuestionIndex,
    total: TOTAL_QUESTIONS,
    question: q.question,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: TIME_LIMIT,
    scores: {
      player1: publicPlayer(room.players[1]),
      player2: publicPlayer(room.players[2]),
    },
  });
  emitRoom(room, 'tick', { timeLeft: room.timeLeft });

  room.timer = setInterval(() => {
    if (room.status !== 'playing') return;
    room.timeLeft -= 1;
    emitRoom(room, 'tick', { timeLeft: Math.max(room.timeLeft, 0) });
    if (room.timeLeft <= 0) revealAnswer(room, 'time_up');
  }, 1000);
}

function calculatePoints(questionDifficulty, timeLeft, correct) {
  if (!correct) return 0;
  const base = BASE_POINTS[questionDifficulty] || 100;
  return Math.max(10, Math.round(base * (Math.max(0, Math.min(TIME_LIMIT, Number(timeLeft) || 0)) / TIME_LIMIT)));
}

function playerAnswer(room, playerId, questionIndex, optionKey, timeLeft) {
  if (!room || room.status !== 'playing' || room.revealLocked) return;
  if (questionIndex !== room.currentQuestionIndex) return;
  if (![1, 2].includes(Number(playerId))) return;
  if (room.currentAnswers[playerId]) return;

  const cleanOption = String(optionKey || '').toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(cleanOption)) return;

  room.currentAnswers[playerId] = {
    answer: cleanOption,
    timeLeft: Math.max(0, Math.min(TIME_LIMIT, Number(timeLeft) || room.timeLeft)),
  };
  if (room.players[playerId]) room.players[playerId].answerLocked = true;

  if (room.currentAnswers[1] && room.currentAnswers[2]) revealAnswer(room, 'both_answered');
}

function buildRevealPayload(room) {
  const q = room.questions[room.currentQuestionIndex];
  const payload = {
    correct: q.correct,
    correctOption: q.options[q.correct],
    player1: null,
    player2: null,
    scores: {},
  };

  [1, 2].forEach((id) => {
    const player = room.players[id];
    const answerObj = room.currentAnswers[id] || { answer: null, timeLeft: 0 };
    const isCorrect = answerObj.answer === q.correct;
    const points = calculatePoints(q.difficulty, answerObj.timeLeft, isCorrect);

    if (!room.categoryStats[q.category]) {
      room.categoryStats[q.category] = {
        player1: { correct: 0, total: 0 },
        player2: { correct: 0, total: 0 },
      };
    }
    room.categoryStats[q.category][`player${id}`].total += 1;
    if (isCorrect) room.categoryStats[q.category][`player${id}`].correct += 1;

    player.score += points;
    player.streak = isCorrect ? player.streak + 1 : 0;

    payload[`player${id}`] = {
      answer: answerObj.answer,
      points,
      streak: player.streak,
      score: player.score,
      correct: isCorrect,
    };
    payload.scores[`player${id}`] = publicPlayer(player);
  });

  return payload;
}

function revealAnswer(room, eventName) {
  if (room.revealLocked) return;
  room.revealLocked = true;
  clearInterval(room.timer);

  const payload = buildRevealPayload(room);
  emitRoom(room, eventName, payload);

  [1, 2].forEach((id) => {
    const p = room.players[id];
    if (p && p.streak > 0 && p.streak % 3 === 0) {
      p.score += 150;
      payload[`player${id}`].score = p.score;
      payload.scores[`player${id}`] = publicPlayer(p);
      emitRoom(room, 'streak_bonus', {
        playerId: id,
        bonusPoints: 150,
        streakCount: p.streak,
        scores: payload.scores,
      });
    }
  });

  setTimeout(() => {
    if (room.status !== 'playing') return;
    emitRoom(room, 'next_question');
    sendNextQuestion(room);
  }, REVEAL_DELAY_MS);
}

function finishGame(room) {
  clearInterval(room.timer);
  room.status = 'ended';
  room.endedAt = Date.now();

  const p1 = room.players[1];
  const p2 = room.players[2];
  let winner = null;
  if (p1.score > p2.score) winner = { playerId: 1, playerName: p1.name, score: p1.score };
  if (p2.score > p1.score) winner = { playerId: 2, playerName: p2.name, score: p2.score };

  [p1, p2].forEach((p) => {
    hallOfFame.push({
      player: p.name,
      score: p.score,
      difficulty: room.options.difficulty,
      date: new Date().toISOString(),
    });
  });
  hallOfFame = hallOfFame.sort((a, b) => b.score - a.score).slice(0, 10);

  emitRoom(room, 'game_over', {
    winner,
    scores: {
      player1: publicPlayer(p1),
      player2: publicPlayer(p2),
    },
    categoryStats: room.categoryStats,
    hallOfFame,
  });

  scheduleRoomCleanup(room);
}

function setOptions(room, playerId, options) {
  if (Number(playerId) !== 1) {
    return { ok: false, message: 'Only the host can change game options.' };
  }
  if (room.status !== 'lobby' && room.status !== 'ended') {
    return { ok: false, message: 'Options can only be changed before a game starts.' };
  }

  const allowedDifficulties = ['easy', 'medium', 'hard', 'mixed'];
  const allowedCategories = ['makeup', 'logos_fashion', 'accessories', 'skincare', 'nails', 'logos_tech', 'wildcard'];
  const difficulty = allowedDifficulties.includes(options.difficulty) ? options.difficulty : 'mixed';
  const categories = Array.isArray(options.categories)
    ? options.categories.filter((cat) => allowedCategories.includes(cat))
    : allowedCategories;

  room.options = {
    difficulty,
    categories: categories.length ? categories : allowedCategories,
  };
  emitRoom(room, 'options_updated', room.options);
  return { ok: true };
}

function handleDisconnect(socket) {
  const { roomId, playerId } = socket.data || {};
  if (!roomId || !playerId) return;
  const room = rooms.get(roomId);
  if (!room || !room.players[playerId]) return;

  const player = room.players[playerId];
  player.connected = false;
  player.disconnectedAt = Date.now();

  const remaining = connectedPlayers(room);
  if (remaining.length === 0) {
    destroyRoom(room.id);
    return;
  }

  socket.to(room.id).emit('player_disconnected', { playerName: player.name });

  if (room.status === 'playing') {
    room.status = 'paused';
    clearInterval(room.timer);
    room.reconnectDeadline = Date.now() + RECONNECT_TIMEOUT_MS;
    clearTimeout(room.reconnectTimer);
    room.reconnectTimer = setTimeout(() => {
      const freshRoom = rooms.get(room.id);
      if (!freshRoom) return;
      const stillAway = freshRoom.players[playerId] && !freshRoom.players[playerId].connected;
      if (stillAway) {
        freshRoom.status = 'ended';
        emitRoom(freshRoom, 'game_over', {
          winner: null,
          opponentLeft: true,
          scores: {
            player1: freshRoom.players[1] ? publicPlayer(freshRoom.players[1]) : null,
            player2: freshRoom.players[2] ? publicPlayer(freshRoom.players[2]) : null,
          },
          categoryStats: freshRoom.categoryStats,
          hallOfFame,
        });
        scheduleRoomCleanup(freshRoom);
      }
    }, RECONNECT_TIMEOUT_MS);
  }
}

function resumeIfReconnected(room) {
  if (room.status !== 'paused' || !bothPlayersPresent(room)) return;
  if (!room.players[1].connected || !room.players[2].connected) return;
  clearTimeout(room.reconnectTimer);
  room.reconnectDeadline = null;
  room.status = 'playing';
  emitRoom(room, 'opponent_reconnected', {
    players: {
      player1: publicPlayer(room.players[1]),
      player2: publicPlayer(room.players[2]),
    },
  });
  emitRoom(room, 'tick', { timeLeft: room.timeLeft });
  room.timer = setInterval(() => {
    if (room.status !== 'playing') return;
    room.timeLeft -= 1;
    emitRoom(room, 'tick', { timeLeft: Math.max(room.timeLeft, 0) });
    if (room.timeLeft <= 0) revealAnswer(room, 'time_up');
  }, 1000);
}

function getCurrentState(room, playerId) {
  const base = {
    roomId: room.id,
    playerId,
    players: {
      player1: room.players[1] ? publicPlayer(room.players[1]) : null,
      player2: room.players[2] ? publicPlayer(room.players[2]) : null,
    },
    options: room.options,
    status: room.status,
    waitingForOpponent: !bothPlayersPresent(room),
  };

  if ((room.status === 'playing' || room.status === 'paused') && room.currentQuestionIndex >= 0) {
    const q = room.questions[room.currentQuestionIndex];
    return {
      ...base,
      currentQuestion: {
        questionIndex: room.currentQuestionIndex,
        total: TOTAL_QUESTIONS,
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
        timeLimit: TIME_LIMIT,
      },
      timeLeft: room.timeLeft,
      answers: room.currentAnswers,
      reconnectSecondsLeft: room.reconnectDeadline ? Math.max(0, Math.ceil((room.reconnectDeadline - Date.now()) / 1000)) : null,
    };
  }
  return base;
}

module.exports = {
  rooms,
  getRoom,
  createRoom,
  getOrCreateRoom,
  destroyRoom,
  assignPlayer,
  setOptions,
  startGame,
  playerAnswer,
  handleDisconnect,
  resumeIfReconnected,
  getCurrentState,
  getHallOfFame: () => hallOfFame,
};
