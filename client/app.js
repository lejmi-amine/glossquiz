/* global io */
const SOCKET_URL = window.GLOSSQUIZ_SOCKET_URL || window.location.origin;

const CATEGORIES = [
  "makeup",
  "logos_fashion",
  "accessories",
  "skincare",
  "nails",
  "logos_tech",
  "wildcard",
];
const state = {
  socket: null,
  roomId: null,
  playerId: null,
  playerName: "",
  opponentName: "",
  players: { player1: null, player2: null },
  currentQuestion: null,
  selectedAnswer: null,
  timeLeft: 15,
  hallOfFame: [],
  disconnectInterval: null,
};

const $ = (id) => document.getElementById(id);
const screens = {
  home: $("home-screen"),
  lobby: $("lobby-screen"),
  question: $("question-screen"),
  results: $("results-screen"),
  hof: $("hof-screen"),
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i += 1)
    id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function getRoomIdFromPath() {
  const match = location.pathname.match(/^\/room\/([A-Za-z0-9]{8})/);
  return match ? match[1] : null;
}

function savedKey(roomId) {
  return `glossquiz:${roomId}`;
}

function saveSession() {
  if (!state.roomId || !state.playerId) return;
  localStorage.setItem(
    savedKey(state.roomId),
    JSON.stringify({ playerId: state.playerId, name: state.playerName }),
  );
}

function getSavedSession(roomId) {
  try {
    return JSON.parse(localStorage.getItem(savedKey(roomId)) || "{}");
  } catch {
    return {};
  }
}

function connectSocket() {
  if (state.socket) return state.socket;
  state.socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    query: { roomId: state.roomId || "" },
  });
  bindSocketEvents();
  return state.socket;
}

function bindSocketEvents() {
  const socket = state.socket;

  socket.on("connect_error", () => {
    showToast("Could not connect to the GlossQuiz server.");
  });

  socket.on("error", ({ message }) => {
    showToast(message || "Something went wrong.");
    if (/full|invalid room/i.test(message || "")) goHome(message);
  });

  socket.on("room_joined", (payload) => {
    state.roomId = payload.roomId;
    state.playerId = payload.playerId;
    state.playerName = payload.playerName;
    state.hallOfFame = payload.hallOfFame || state.hallOfFame;
    saveSession();
    $("name-form").classList.add("hidden");
    $("lobby-after-name").classList.remove("hidden");
    $("share-link").value = `${location.origin}/room/${state.roomId}`;
    applyServerState(payload.state);
  });

  socket.on("opponent_joined", ({ opponentName }) => {
    state.opponentName = opponentName;
    $("waiting-text").textContent =
      `✓ ${opponentName} has joined! Ready to play.`;
    $("start-game-btn").disabled = state.playerId !== 1 ? true : false;
    if (state.playerId === 2)
      $("player2-waiting").textContent =
        `Waiting for ${state.players.player1?.name || "Player 1"} to start the game...`;
  });

  socket.on("options_updated", () => showToast("Game options updated."));

  socket.on("game_start", (payload) => {
    state.players = payload.players || state.players;
    hideDisconnectModal();
    updateScoreBar();
    showScreen("question");
  });

  socket.on("question", (payload) => {
    state.currentQuestion = payload;
    state.selectedAnswer = null;
    if (payload.scores) state.players = payload.scores;
    renderQuestion(payload);
    updateScoreBar();
    showScreen("question");
  });

  socket.on("tick", ({ timeLeft }) => {
    state.timeLeft = timeLeft;
    updateTimer(timeLeft, state.currentQuestion?.timeLimit || 15);
  });

  socket.on("both_answered", (payload) => revealAnswer(payload));
  socket.on("time_up", (payload) => revealAnswer(payload));

  socket.on("streak_bonus", (payload) => {
    if (payload.scores) state.players = payload.scores;
    updateScoreBar();
    const mine = Number(payload.playerId) === Number(state.playerId);
    showFloating(
      `<span class="streak-pop">🔥 ${payload.streakCount} in a row! +${payload.bonusPoints} ${mine ? "for you" : "for opponent"}</span>`,
    );
  });

  socket.on("next_question", () => {
    $("lock-status").textContent = "Next glam question incoming...";
  });

  socket.on("game_over", (payload) => {
    hideDisconnectModal();
    if (payload.opponentLeft) {
      showOpponentLeft();
      return;
    }
    if (payload.hallOfFame) {
      state.hallOfFame = payload.hallOfFame;
      localStorage.setItem(
        "glossquiz:hallOfFame",
        JSON.stringify(state.hallOfFame),
      );
    }
    renderResults(payload);
  });

  socket.on("player_disconnected", ({ playerName }) => {
    showDisconnectModal(playerName, 30);
  });

  socket.on("opponent_reconnected", ({ players }) => {
    hideDisconnectModal();
    state.players = players;
    updateScoreBar();
    showToast("Opponent reconnected. Game resumed!");
  });

  socket.on("hall_of_fame", ({ hallOfFame }) => {
    state.hallOfFame = mergeHallOfFame(hallOfFame || []);
    renderHallOfFame();
  });
}

function applyServerState(serverState) {
  if (!serverState) return;
  state.players = serverState.players || state.players;
  updateLobbyForPlayer(serverState);
  if (serverState.status === "playing" || serverState.status === "paused") {
    if (serverState.currentQuestion) {
      renderQuestion({
        ...serverState.currentQuestion,
        scores: serverState.players,
      });
      state.currentQuestion = serverState.currentQuestion;
      updateTimer(
        serverState.timeLeft || 15,
        serverState.currentQuestion.timeLimit || 15,
      );
      showScreen("question");
    }
    if (serverState.status === "paused")
      showDisconnectModal("Opponent", serverState.reconnectSecondsLeft || 30);
  } else if (serverState.status === "lobby" || serverState.status === "ended") {
    showScreen("lobby");
  }
}

function updateLobbyForPlayer(serverState) {
  const isHost = state.playerId === 1;
  const opponent =
    state.playerId === 1
      ? serverState.players?.player2
      : serverState.players?.player1;
  const host = serverState.players?.player1;
  $("host-options").classList.toggle("hidden", !isHost);
  $("player2-waiting").classList.toggle("hidden", isHost);
  $("start-game-btn").disabled = !(isHost && opponent);
  $("waiting-card").classList.toggle("hidden", Boolean(opponent));

  if (opponent) {
    $("waiting-text").textContent =
      `✓ ${opponent.name} has joined! Ready to play.`;
  } else {
    $("waiting-text").textContent = "Waiting for opponent...";
  }
  if (!isHost) {
    $("player2-waiting").textContent =
      `Waiting for ${host?.name || "Player 1"} to start the game...`;
  }
}

function collectOptions() {
  const difficulty = $("difficulty-select").value;
  const categories = [
    ...document.querySelectorAll(
      '.category-grid input[type="checkbox"]:checked',
    ),
  ].map((input) => input.value);
  return {
    difficulty,
    categories: categories.length ? categories : CATEGORIES,
  };
}

function renderQuestion(q) {
  $("category-badge").textContent = q.category.replace("_", " ");
  $("difficulty-badge").textContent = q.difficulty;
  $("counter-badge").textContent = `Q ${q.questionIndex + 1} / ${q.total}`;
  $("question-text").textContent = q.question;
  $("lock-status").textContent = "Choose your answer.";
  $("thinking-status").textContent = "Opponent is thinking...";
  updateTimer(q.timeLimit, q.timeLimit);

  const grid = $("answers-grid");
  grid.innerHTML = "";
  Object.entries(q.options).forEach(([key, value]) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.type = "button";
    btn.dataset.option = key;
    btn.innerHTML = `<strong>${key}</strong>${escapeHtml(value)}`;
    btn.addEventListener("click", () => submitAnswer(key));
    grid.appendChild(btn);
  });
}

function submitAnswer(optionKey) {
  if (!state.currentQuestion || state.selectedAnswer) return;
  state.selectedAnswer = optionKey;
  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === optionKey) btn.classList.add("selected");
    else btn.classList.add("dimmed");
  });
  $("lock-status").textContent = "✓ Locked in";
  $("thinking-status").textContent = "Opponent is thinking...";
  state.socket.emit("answer", {
    questionIndex: state.currentQuestion.questionIndex,
    optionKey,
    timeLeft: state.timeLeft,
  });
}

function revealAnswer(payload) {
  if (payload.scores) state.players = payload.scores;
  updateScoreBar();
  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("selected", "dimmed");
    if (btn.dataset.option === payload.correct) btn.classList.add("correct");
    else btn.classList.add("wrong", "dimmed");
  });
  const me = payload[`player${state.playerId}`];
  const other = payload[`player${state.playerId === 1 ? 2 : 1}`];
  $("lock-status").textContent = me?.correct
    ? `Correct! +${me.points} pts`
    : `Answer: ${payload.correctOption}`;
  $("thinking-status").textContent = other?.correct
    ? `Opponent +${other.points} pts`
    : "Opponent missed it";
  showFloating(`+${me?.points || 0} pts`);
}

function updateTimer(timeLeft, total) {
  const percent = Math.max(
    0,
    Math.min(100, (Number(timeLeft) / Number(total)) * 100),
  );
  $("timer-fill").style.width = `${percent}%`;
}

function updateScoreBar() {
  const p1 = state.players.player1;
  const p2 = state.players.player2;
  $("p1-score").textContent = `${p1?.name || "Player 1"} · ${p1?.score || 0}`;
  $("p2-score").textContent = `${p2?.name || "Player 2"} · ${p2?.score || 0}`;
}

function renderResults(payload) {
  state.players = payload.scores || state.players;
  const p1 = state.players.player1;
  const p2 = state.players.player2;
  if (!payload.winner) $("winner-title").textContent = `It's a tie! 👑👑`;
  else $("winner-title").textContent = `👑 ${payload.winner.playerName} wins!`;

  $("final-p1").innerHTML = `${escapeHtml(p1.name)}<span>${p1.score}</span>`;
  $("final-p2").innerHTML = `${escapeHtml(p2.name)}<span>${p2.score}</span>`;

  const tbody = $("category-table").querySelector("tbody");
  tbody.innerHTML = "";
  Object.entries(payload.categoryStats || {}).forEach(([category, stats]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(category.replace("_", " "))}</td><td>${stats.player1.correct}/${stats.player1.total}</td><td>${stats.player2.correct}/${stats.player2.total}</td>`;
    tbody.appendChild(tr);
  });

  showScreen("results");
  startConfetti(!payload.winner ? 180 : 120);
}

function renderHallOfFame() {
  const tbody = $("hof-table").querySelector("tbody");
  tbody.innerHTML = "";
  const rows = mergeHallOfFame(state.hallOfFame);
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">No legends yet. Play a match first ✨</td></tr>';
    return;
  }
  rows.slice(0, 10).forEach((item, index) => {
    const trophy =
      index === 0 ? "🏆 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${trophy}${index + 1}</td><td>${escapeHtml(item.player)}</td><td>${item.score}</td><td>${escapeHtml(item.difficulty)}</td><td>${formatDate(item.date)}</td>`;
    tbody.appendChild(tr);
  });
}

function mergeHallOfFame(serverRows) {
  let localRows = [];
  try {
    localRows = JSON.parse(
      localStorage.getItem("glossquiz:hallOfFame") || "[]",
    );
  } catch {
    localRows = [];
  }
  const merged = [...serverRows, ...localRows]
    .filter((row) => row && row.player && Number.isFinite(Number(row.score)))
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 10);
  localStorage.setItem("glossquiz:hallOfFame", JSON.stringify(merged));
  return merged;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return "Today";
  }
}

function showFloating(html) {
  const el = document.createElement("div");
  el.className = "points-pop";
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function showDisconnectModal(name, seconds) {
  clearInterval(state.disconnectInterval);
  const modal = $("disconnect-modal");
  $("disconnect-title").textContent = `${name || "Opponent"} disconnected.`;
  $("disconnect-text").textContent = "Waiting 30 seconds to reconnect...";
  $("disconnect-count").textContent = seconds;
  $("modal-home-btn").classList.add("hidden");
  modal.classList.remove("hidden");
  let left = seconds;
  state.disconnectInterval = setInterval(() => {
    left -= 1;
    $("disconnect-count").textContent = Math.max(0, left);
    if (left <= 0) clearInterval(state.disconnectInterval);
  }, 1000);
}

function hideDisconnectModal() {
  clearInterval(state.disconnectInterval);
  $("disconnect-modal").classList.add("hidden");
}

function showOpponentLeft() {
  clearInterval(state.disconnectInterval);
  const modal = $("disconnect-modal");
  $("disconnect-title").textContent = "Game ended — opponent left.";
  $("disconnect-text").textContent =
    "You can return home and create a new game.";
  $("disconnect-count").textContent = "✦";
  $("modal-home-btn").classList.remove("hidden");
  modal.classList.remove("hidden");
}

function startConfetti(count) {
  const canvas = $("confetti-canvas");
  const ctx = canvas.getContext("2d");
  const colors = ["#D4537E", "#E8C96A", "#FBEAF0", "#fff"];
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize, { once: true });

  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: 4 + Math.random() * 7,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: -1 + Math.random() * 2,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.08 + Math.random() * 0.16,
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.7);
      ctx.restore();
    });
    particles = particles.filter((p) => p.y < canvas.height + 30);
    if (particles.length) animationId = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  cancelAnimationFrame(animationId);
  frame();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function goHome(errorMessage) {
  history.pushState({}, "", "/");
  state.roomId = null;
  state.playerId = null;
  state.currentQuestion = null;
  hideDisconnectModal();
  showScreen("home");
  if (errorMessage) {
    $("home-error").textContent = errorMessage;
    $("home-error").classList.remove("hidden");
  }
}

function initRoom(roomId) {
  state.roomId = roomId;
  const saved = getSavedSession(roomId);
  if (saved.name) $("name-input").value = saved.name;
  $("share-link").value = `${location.origin}/room/${roomId}`;
  showScreen("lobby");
}

function boot() {
  const roomId = getRoomIdFromPath();
  if (roomId) initRoom(roomId);
  else showScreen("home");

  $("create-game-btn").addEventListener("click", () => {
    const id = generateRoomId();
    history.pushState({}, "", `/room/${id}`);
    initRoom(id);
  });

  document
    .querySelectorAll("[data-home]")
    .forEach((btn) => btn.addEventListener("click", () => goHome()));
  $("modal-home-btn").addEventListener("click", () => goHome());

  $("hall-btn").addEventListener("click", () => {
    showScreen("hof");
    state.hallOfFame = mergeHallOfFame([]);
    renderHallOfFame();
    connectSocket();
    state.socket.emit("get_hall_of_fame");
  });

  $("name-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("name-input").value.trim();
    if (!name) return;
    const saved = getSavedSession(state.roomId);
    connectSocket();
    state.socket.emit("set_name", {
      roomId: state.roomId,
      name,
      savedPlayerId: saved.playerId,
    });
  });

  $("copy-link-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("share-link").value);
      showToast("Room link copied ✨");
    } catch {
      $("share-link").select();
      document.execCommand("copy");
      showToast("Room link copied ✨");
    }
  });

  $("difficulty-select").addEventListener("change", () =>
    state.socket?.emit("set_options", collectOptions()),
  );
  document.querySelectorAll(".category-grid input").forEach((input) => {
    input.addEventListener("change", () =>
      state.socket?.emit("set_options", collectOptions()),
    );
  });
  $("start-game-btn").addEventListener("click", () => {
    state.socket.emit("set_options", collectOptions());
    state.socket.emit("start_game");
  });
  $("play-again-btn").addEventListener("click", () =>
    state.socket?.emit("request_rematch"),
  );

  window.addEventListener("popstate", () => {
    const nextRoomId = getRoomIdFromPath();
    if (nextRoomId) initRoom(nextRoomId);
    else goHome();
  });
}

document.addEventListener("DOMContentLoaded", boot);
