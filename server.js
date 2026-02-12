const path = require("path");
const http = require("http");
const { randomUUID } = require("crypto");
const express = require("express");
const webPush = require("web-push");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const GAME_PORT = process.env.GAME_PORT || 2567;

// Initialize Colyseus game server
let gameServer = null;
try {
  const { gameServer: gs } = require("./server-games");
  gameServer = gs;
} catch (err) {
  console.warn("⚠️  Game server not available:", err.message);
}
const MAX_HISTORY = 100;
const REQUIRED_PASSWORD = process.env.CHAT_PASSWORD || "0327";
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";
const GIF_LIMIT = 12;
const MAX_FILE_CHARS = 4_500_000;
const ROOM_NAME = "main";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const hasVapidKeys = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
const TURN_URL = process.env.TURN_URL || "";
const TURN_USERNAME = process.env.TURN_USERNAME || "";
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || "";
const messageHistory = [];
const connectedUsers = new Map();
const typingUsers = new Map();
const pushSubscriptions = new Map();
const callState = {
  callerId: null,
  calleeId: null,
  sessionId: null,
};
const callPeers = new Map();
const GAME_ROOM = "game";
const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;
const GAME_PADDLE_HEIGHT = 90;
const GAME_PADDLE_WIDTH = 14;
const GAME_PADDLE_SPEED = 6;
const GAME_BALL_RADIUS = 8;
const GAME_BALL_SPEED = 240;
const gameState = {
  players: new Map(),
  scores: { left: 0, right: 0 },
  ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: GAME_BALL_SPEED, vy: GAME_BALL_SPEED * 0.7 },
  lastTick: Date.now(),
  active: false,
};
const gameInputs = new Map();
let gameLoop = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const resetBall = (direction = 1) => {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  gameState.ball.x = GAME_WIDTH / 2;
  gameState.ball.y = GAME_HEIGHT / 2;
  gameState.ball.vx = Math.cos(angle) * GAME_BALL_SPEED * direction;
  gameState.ball.vy = Math.sin(angle) * GAME_BALL_SPEED;
};

const getGameSnapshot = () => ({
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scores: gameState.scores,
  ball: gameState.ball,
  players: Array.from(gameState.players.values()),
});

const startGameLoop = () => {
  if (gameLoop) {
    return;
  }
  gameState.active = true;
  gameState.lastTick = Date.now();
  gameLoop = setInterval(() => {
    const now = Date.now();
    const delta = Math.min((now - gameState.lastTick) / 1000, 0.05);
    gameState.lastTick = now;

    const leftPlayer = Array.from(gameState.players.values()).find((player) => player.side === "left");
    const rightPlayer = Array.from(gameState.players.values()).find((player) => player.side === "right");

    for (const player of gameState.players.values()) {
      const input = gameInputs.get(player.id) || 0;
      if (input !== 0) {
        player.y = clamp(
          player.y + input * GAME_PADDLE_SPEED * (delta * 60),
          GAME_PADDLE_HEIGHT / 2,
          GAME_HEIGHT - GAME_PADDLE_HEIGHT / 2
        );
      }
    }

    const ball = gameState.ball;
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.y - GAME_BALL_RADIUS <= 0 || ball.y + GAME_BALL_RADIUS >= GAME_HEIGHT) {
      ball.vy *= -1;
      ball.y = clamp(ball.y, GAME_BALL_RADIUS, GAME_HEIGHT - GAME_BALL_RADIUS);
    }

    if (leftPlayer) {
      const leftX = 40;
      const withinY =
        ball.y >= leftPlayer.y - GAME_PADDLE_HEIGHT / 2 &&
        ball.y <= leftPlayer.y + GAME_PADDLE_HEIGHT / 2;
      if (ball.x - GAME_BALL_RADIUS <= leftX + GAME_PADDLE_WIDTH / 2 && withinY && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.02;
      }
    }

    if (rightPlayer) {
      const rightX = GAME_WIDTH - 40;
      const withinY =
        ball.y >= rightPlayer.y - GAME_PADDLE_HEIGHT / 2 &&
        ball.y <= rightPlayer.y + GAME_PADDLE_HEIGHT / 2;
      if (ball.x + GAME_BALL_RADIUS >= rightX - GAME_PADDLE_WIDTH / 2 && withinY && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.02;
      }
    }

    if (ball.x < -GAME_BALL_RADIUS) {
      gameState.scores.right += 1;
      resetBall(1);
    } else if (ball.x > GAME_WIDTH + GAME_BALL_RADIUS) {
      gameState.scores.left += 1;
      resetBall(-1);
    }

    io.to(GAME_ROOM).emit("game_state", getGameSnapshot());
  }, 33);
};

const stopGameLoop = () => {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  gameState.active = false;
  gameState.scores = { left: 0, right: 0 };
  resetBall(1);
};

if (hasVapidKeys) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

app.use(express.json({ limit: "1mb" }));

// Serve static app from public directory
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath, {
  etag: true,
  lastModified: true,
  index: false, // Don't auto-serve index.html from static
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html") || filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

// Log static file serving
app.use((req, res, next) => {
  if (req.path.startsWith("/assets") || req.path.includes(".")) {
    console.log(`[STATIC] ${req.method} ${req.path} - ${res.statusCode}`);
  }
  next();
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const buildIceServers = () => {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    const urls = TURN_URL.split(",").map((url) => url.trim()).filter(Boolean);
    if (urls.length) {
      servers.push({
        urls,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      });
    }
  }
  return servers;
};

app.get("/api/ice", (req, res) => {
  res.json({ iceServers: buildIceServers() });
});

const fetchGiphy = async (query) => {
  if (!GIPHY_API_KEY) {
    return { results: [], error: "Giphy API key missing.", used: false };
  }
  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", GIPHY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(GIF_LIMIT));
  url.searchParams.set("rating", "pg");
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      results: [],
      error: data?.meta?.msg || "Giphy search failed.",
      used: true,
    };
  }
  const results = (data.data || [])
    .map((gif) => {
      const images = gif.images || {};
      const urlValue = images.fixed_height?.url || images.original?.url;
      const preview =
        images.fixed_width_small?.url ||
        images.fixed_height_small?.url ||
        urlValue;
      if (!urlValue) {
        return null;
      }
      return { id: gif.id, url: urlValue, preview };
    })
    .filter(Boolean);
  return { results, error: null, used: true };
};

app.get("/api/gifs", async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  if (!query) {
    res.json({ results: [] });
    return;
  }
  if (!GIPHY_API_KEY) {
    res.status(400).json({
      error: "GIF search not configured. Set GIPHY_API_KEY in Railway.",
    });
    return;
  }
  try {
    const giphy = await fetchGiphy(query);
    if (giphy.results.length) {
      res.json({ results: giphy.results, provider: "giphy" });
      return;
    }
    if (giphy.error) {
      res.status(502).json({ error: giphy.error });
      return;
    }
    res.json({ results: [] });
  } catch (error) {
    res.status(500).json({ error: "GIF search failed." });
  }
});

const sanitizeName = (value) => {
  const name = String(value || "").trim();
  if (!name) {
    return `Guest-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  return name.slice(0, 32);
};

const sanitizeMessage = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.slice(0, 500);
};

const sanitizeDisplayName = (value) => {
  const name = String(value || "").trim();
  if (!name) {
    return "";
  }
  return name.slice(0, 32);
};

const sanitizeAvatar = (value) => {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (url.startsWith("data:image/") && url.length < 300000) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) {
      return url;
    }
  } catch (error) {
    return "";
  }
  return "";
};

const getSocketInfo = (socketId) => {
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) {
    return { name: connectedUsers.get(socketId) || "Someone", avatar: "" };
  }
  return {
    name: socket.data.username || connectedUsers.get(socketId) || "Someone",
    avatar: socket.data.avatar || "",
  };
};

app.get("/api/vapid-public-key", (req, res) => {
  if (!hasVapidKeys) {
    res.status(400).json({ error: "Push notifications not configured." });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post("/api/subscribe", (req, res) => {
  if (!hasVapidKeys) {
    res.status(400).json({ error: "Push notifications not configured." });
    return;
  }
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint) {
    res.status(400).json({ error: "Missing subscription." });
    return;
  }
  const username = sanitizeDisplayName(req.body?.username);
  pushSubscriptions.set(subscription.endpoint, { subscription, username });
  res.json({ ok: true });
});

app.post("/api/unsubscribe", (req, res) => {
  const endpoint = String(req.body?.endpoint || "").trim();
  if (endpoint) {
    pushSubscriptions.delete(endpoint);
  }
  res.json({ ok: true });
});

const buildReplyPreview = (message) => {
  if (!message) {
    return null;
  }
  if (message.deleted) {
    return {
      id: message.id,
      user: message.user,
      text: "Message deleted",
    };
  }
  const preview = message.type === "file"
    ? `[${message.file?.kind || "file"}] ${message.file?.name || "attachment"}`
    : String(message.text || "").trim().slice(0, 120);
  return {
    id: message.id,
    user: message.user,
    text: preview || "message",
  };
};

const resolveReply = (payload) => {
  const replyId = String(payload?.replyTo?.id || "").trim();
  if (!replyId) {
    return null;
  }
  const original = messageHistory.find((item) => item.id === replyId);
  return buildReplyPreview(original);
};

const sanitizeFile = (file) => {
  const url = String(file?.url || "");
  if (!url.startsWith("data:")) {
    return null;
  }
  if (url.length > MAX_FILE_CHARS) {
    return null;
  }
  let mime = String(file?.mime || "").trim();
  if (!mime && url.startsWith("data:")) {
    const mimeEnd = url.indexOf(";");
    mime = mimeEnd > 5 ? url.slice(5, mimeEnd) : "";
  }
  if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
    return null;
  }
  const name = String(file?.name || "attachment").trim().slice(0, 80);
  const kind = mime.startsWith("video/") ? "video" : "image";
  return { url, name, mime, kind };
};

const addMessageToHistory = (message) => {
  messageHistory.push(message);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }
};

const isUserConnected = (username) => {
  if (!username) {
    return false;
  }
  for (const name of connectedUsers.values()) {
    if (name === username) {
      return true;
    }
  }
  return false;
};

const buildPushPreview = (message) => {
  if (message.type === "file") {
    const label = message.file?.kind || "file";
    return `[${label}] ${message.file?.name || "attachment"}`;
  }
  const text = String(message.text || "").trim();
  if (text.startsWith("http") && text.includes(".gif")) {
    return "[gif]";
  }
  return text.slice(0, 120) || "New message";
};

const sendPushNotifications = async (message) => {
  if (!hasVapidKeys || pushSubscriptions.size === 0) {
    return;
  }
  const payload = JSON.stringify({
    title: message.user ? `New message from ${message.user}` : "New message",
    body: buildPushPreview(message),
    url: "/",
  });
  const entries = Array.from(pushSubscriptions.entries());
  for (const [endpoint, entry] of entries) {
    if (entry.username && isUserConnected(entry.username)) {
      continue;
    }
    try {
      await webPush.sendNotification(entry.subscription, payload);
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        pushSubscriptions.delete(endpoint);
      }
    }
  }
};

const emitPresence = () => {
  const counts = {};
  for (const name of connectedUsers.values()) {
    counts[name] = (counts[name] || 0) + 1;
  }
  const users = Object.entries(counts).map(([name, count]) => ({
    name,
    count,
  }));
  const total = users.reduce((sum, user) => sum + user.count, 0);
  io.to(ROOM_NAME).emit("presence_update", { users, total });
};

const emitTyping = () => {
  const names = Array.from(new Set(typingUsers.values()));
  io.to(ROOM_NAME).emit("typing_update", { users: names });
};

const clearCallState = () => {
  callState.callerId = null;
  callState.calleeId = null;
  callState.sessionId = null;
  callPeers.clear();
  io.to(ROOM_NAME).emit("call_ended");
};

const removeFromCall = (socketId) => {
  const peerId = callPeers.get(socketId);
  if (peerId) {
    io.to(peerId).emit("call_peer_left", { from: socketId });
  }
  callPeers.delete(socketId);
  if (peerId) {
    callPeers.delete(peerId);
  }
  if (callState.callerId === socketId || callState.calleeId === socketId) {
    clearCallState();
  } else if (peerId &&
    (callState.callerId === peerId || callState.calleeId === peerId)) {
    clearCallState();
  }
};

const removeFromGame = (socketId) => {
  if (gameState.players.has(socketId)) {
    gameState.players.delete(socketId);
    gameInputs.delete(socketId);
  }
  if (gameState.players.size === 0) {
    stopGameLoop();
  } else {
    io.to(GAME_ROOM).emit("game_state", getGameSnapshot());
  }
};

const toggleReaction = (message, emoji, username) => {
  if (!message.reactions) {
    message.reactions = {};
  }
  const normalized = String(emoji || "").trim().slice(0, 8);
  if (!normalized) {
    return message.reactions;
  }
  const users = Array.isArray(message.reactions[normalized])
    ? message.reactions[normalized]
    : [];
  const index = users.indexOf(username);
  if (index >= 0) {
    users.splice(index, 1);
  } else {
    users.push(username);
  }
  if (users.length) {
    message.reactions[normalized] = users;
  } else {
    delete message.reactions[normalized];
  }
  return message.reactions;
};

io.on("connection", (socket) => {
  const getPeerId = () => callPeers.get(socket.id);

  socket.on("join", (payload) => {
    const username = sanitizeName(payload?.username);
    const password = String(payload?.password || "");
    if (password !== REQUIRED_PASSWORD) {
      socket.emit("auth_error", "Incorrect password.");
      return;
    }

    const previousName = socket.data.username;
    socket.data.username = username;
    socket.data.avatar = sanitizeAvatar(payload?.avatar);
    socket.data.authed = true;
    socket.join(ROOM_NAME);
    connectedUsers.set(socket.id, username);
    typingUsers.delete(socket.id);

    socket.emit("auth_ok", { username });
    socket.emit("history", messageHistory);
    if (callState.callerId) {
      const callerName = connectedUsers.get(callState.callerId) || "Someone";
      socket.emit("call_status", { active: true, user: callerName });
    }
    emitPresence();
    emitTyping();

    if (previousName && previousName !== username) {
      socket.broadcast.emit(
        "system",
        `${previousName} is now ${username}`
      );
    } else if (!previousName) {
      socket.broadcast.emit("system", `${username} joined the chat`);
    }
  });

  socket.on("game_join", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    const playerName = sanitizeName(payload?.name) || socket.data.username || "Player";
    socket.join(GAME_ROOM);

    const sides = new Set(Array.from(gameState.players.values()).map((player) => player.side));
    let side = null;
    if (!sides.has("left")) {
      side = "left";
    } else if (!sides.has("right")) {
      side = "right";
    }

    gameState.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      side,
      y: GAME_HEIGHT / 2,
    });
    gameInputs.set(socket.id, 0);

    if (!gameState.active) {
      startGameLoop();
    }

    const snapshot = getGameSnapshot();
    socket.emit("game_joined", { side, state: snapshot });
    io.to(GAME_ROOM).emit("game_state", snapshot);
  });

  socket.on("game_input", (payload) => {
    if (!gameState.players.has(socket.id)) {
      return;
    }
    const player = gameState.players.get(socket.id);
    if (!player?.side) {
      return;
    }
    const dir = clamp(Number(payload?.dir || 0), -1, 1);
    gameInputs.set(socket.id, dir);
  });

  socket.on("game_leave", () => {
    socket.leave(GAME_ROOM);
    removeFromGame(socket.id);
  });

  socket.on("call_join", () => {
    if (!socket.data.authed) {
      return;
    }
    if (callPeers.has(socket.id) || callState.callerId === socket.id || callState.calleeId === socket.id) {
      socket.emit("call_joined", { role: "caller", peerId: getPeerId(), sessionId: callState.sessionId });
      return;
    }
    if (!callState.callerId) {
      callState.callerId = socket.id;
      callState.sessionId = randomUUID();
      socket.emit("call_joined", { role: "caller", sessionId: callState.sessionId });
      socket.to(ROOM_NAME).emit("call_started", {
        user: socket.data.username,
      });
      return;
    }
    if (!callState.calleeId) {
      callState.calleeId = socket.id;
      callPeers.set(callState.callerId, socket.id);
      callPeers.set(socket.id, callState.callerId);
      const callerInfo = getSocketInfo(callState.callerId);
      const calleeInfo = getSocketInfo(socket.id);
      socket.emit("call_joined", {
        role: "callee",
        peerId: callState.callerId,
        peerName: callerInfo.name,
        peerAvatar: callerInfo.avatar,
        sessionId: callState.sessionId,
      });
      io.to(callState.callerId).emit("call_peer", {
        peerId: socket.id,
        peerName: calleeInfo.name,
        peerAvatar: calleeInfo.avatar,
        sessionId: callState.sessionId,
      });
      socket.emit("call_peer", {
        peerId: callState.callerId,
        peerName: callerInfo.name,
        peerAvatar: callerInfo.avatar,
        sessionId: callState.sessionId,
      });
      io.to(callState.callerId).emit("call_connected", {
        peerId: socket.id,
        peerName: calleeInfo.name,
        peerAvatar: calleeInfo.avatar,
        sessionId: callState.sessionId,
      });
      socket.emit("call_connected", {
        peerId: callState.callerId,
        peerName: callerInfo.name,
        peerAvatar: callerInfo.avatar,
        sessionId: callState.sessionId,
      });
      return;
    }
    socket.emit("call_busy");
  });

  socket.on("call_leave", () => {
    removeFromCall(socket.id);
  });

  socket.on("avatar_update", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    socket.data.avatar = sanitizeAvatar(payload?.avatar);
    const peerId = callPeers.get(socket.id);
    if (peerId) {
      const info = getSocketInfo(socket.id);
      io.to(peerId).emit("call_peer_update", {
        peerId: socket.id,
        peerName: info.name,
        peerAvatar: info.avatar,
      });
    }
  });

  socket.on("profile_update", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    const nextName = sanitizeName(payload?.username);
    const nextAvatar = sanitizeAvatar(payload?.avatar);
    const prevName = socket.data.username;
    if (nextName) {
      socket.data.username = nextName;
      connectedUsers.set(socket.id, nextName);
    }
    socket.data.avatar = nextAvatar;
    emitPresence();
    if (nextName && prevName && prevName !== nextName) {
      socket.to(ROOM_NAME).emit("system", `${prevName} is now ${nextName}`);
    }
    const peerId = callPeers.get(socket.id);
    if (peerId) {
      const info = getSocketInfo(socket.id);
      io.to(peerId).emit("call_peer_update", {
        peerId: socket.id,
        peerName: info.name,
        peerAvatar: info.avatar,
      });
    }
  });

  socket.on("message", (payload) => {
    if (!socket.data.authed || !socket.data.username) {
      return;
    }
    const replyTo = resolveReply(payload);
    const isFile = payload?.type === "file";
    let message = null;
    if (isFile) {
      const file = sanitizeFile(payload?.file);
      if (!file) {
        socket.emit("message_error", "Attachment rejected.");
        return;
      }
      message = {
        id: randomUUID(),
        user: socket.data.username,
        senderId: socket.id,
        type: "file",
        file,
        replyTo,
        reactions: {},
        edited: false,
        timestamp: new Date().toISOString(),
      };
    } else {
      const text = sanitizeMessage(payload?.text);
      if (!text) {
        return;
      }
      message = {
        id: randomUUID(),
        user: socket.data.username,
        senderId: socket.id,
        type: "text",
        text,
        replyTo,
        reactions: {},
        edited: false,
        timestamp: new Date().toISOString(),
      };
    }
    addMessageToHistory(message);
    io.to(ROOM_NAME).emit("message", message);
    sendPushNotifications(message);
  });

  socket.on("typing", (payload) => {
    if (!socket.data.authed || !socket.data.username) {
      return;
    }
    const isTyping = Boolean(payload?.isTyping);
    if (isTyping) {
      typingUsers.set(socket.id, socket.data.username);
    } else {
      typingUsers.delete(socket.id);
    }
    emitTyping();
  });

  socket.on("react", (payload) => {
    if (!socket.data.authed || !socket.data.username) {
      return;
    }
    const messageId = String(payload?.messageId || "").trim();
    const emoji = String(payload?.emoji || "").trim();
    if (!messageId || !emoji) {
      return;
    }
    const message = messageHistory.find((item) => item.id === messageId);
    if (!message) {
      return;
    }
    if (message.deleted) {
      return;
    }
    const reactions = toggleReaction(message, emoji, socket.data.username);
    io.to(ROOM_NAME).emit("reaction_update", {
      messageId: message.id,
      reactions,
    });
  });

  socket.on("edit_message", (payload) => {
    if (!socket.data.authed || !socket.data.username) {
      return;
    }
    const messageId = String(payload?.messageId || "").trim();
    const text = sanitizeMessage(payload?.text);
    if (!messageId || !text) {
      return;
    }
    const message = messageHistory.find((item) => item.id === messageId);
    if (!message || message.deleted) {
      return;
    }
    if (message.senderId !== socket.id) {
      return;
    }
    if (message.type !== "text") {
      return;
    }
    message.text = text;
    message.edited = true;
    message.editedAt = new Date().toISOString();
    io.to(ROOM_NAME).emit("message_update", message);
  });

  socket.on("delete_message", (payload) => {
    if (!socket.data.authed || !socket.data.username) {
      return;
    }
    const messageId = String(payload?.messageId || "").trim();
    if (!messageId) {
      return;
    }
    const message = messageHistory.find((item) => item.id === messageId);
    if (!message || message.deleted) {
      return;
    }
    if (message.senderId !== socket.id) {
      return;
    }
    message.deleted = true;
    message.text = "";
    message.type = "text";
    message.file = null;
    message.reactions = {};
    message.replyTo = null;
    message.deletedAt = new Date().toISOString();
    io.to(ROOM_NAME).emit("message_update", message);
  });

  socket.on("webrtc_offer", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.offer) {
      return;
    }
    const target = payload.to || getPeerId();
    if (!target) {
      return;
    }
    io.to(target).emit("webrtc_offer", {
      offer: payload.offer,
      from: socket.id,
    });
  });

  socket.on("webrtc_signal", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.signal) {
      return;
    }
    if (callState.sessionId && payload?.sessionId !== callState.sessionId) {
      return;
    }
    const target = payload.to || getPeerId();
    if (!target) {
      return;
    }
    io.to(target).emit("webrtc_signal", {
      signal: payload.signal,
      from: socket.id,
      sessionId: callState.sessionId,
    });
  });

  socket.on("webrtc_answer", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.answer) {
      return;
    }
    const target = payload.to || getPeerId();
    if (!target) {
      return;
    }
    io.to(target).emit("webrtc_answer", {
      answer: payload.answer,
      from: socket.id,
    });
  });

  socket.on("webrtc_ice", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.candidate) {
      return;
    }
    const target = payload.to || getPeerId();
    if (!target) {
      return;
    }
    io.to(target).emit("webrtc_ice", {
      candidate: payload.candidate,
      from: socket.id,
    });
  });

  socket.on("webrtc_hangup", () => {
    if (!socket.data.authed) {
      return;
    }
    const target = getPeerId();
    if (target) {
      io.to(target).emit("webrtc_hangup", { from: socket.id });
    }
  });

  socket.on("call_negotiate", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    const target = payload?.to || getPeerId();
    if (!target) {
      return;
    }
    io.to(target).emit("call_negotiate", { from: socket.id });
  });

  socket.on("call_restart", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    const target = payload?.to || getPeerId();
    if (!target) {
      return;
    }
    callState.sessionId = randomUUID();
    io.to(target).emit("call_restart", { from: socket.id, sessionId: callState.sessionId });
    io.to(socket.id).emit("call_restart", { from: socket.id, sessionId: callState.sessionId });
  });

  socket.on("disconnect", () => {
    if (socket.data.authed && socket.data.username) {
      socket.broadcast.emit(
        "system",
        `${socket.data.username} left the chat`
      );
    }
    connectedUsers.delete(socket.id);
    typingUsers.delete(socket.id);
    emitPresence();
    emitTyping();
    removeFromGame(socket.id);
    removeFromCall(socket.id);
  });
});

// Fallback to index.html for React app (must be after all API routes)
app.use((req, res, next) => {
  // Skip API, Socket.IO, and static asset routes
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io") || req.path.startsWith("/assets")) {
    return next();
  }
  
  // Skip if it's a file request (has extension)
  if (req.path.includes(".") && !req.path.endsWith(".html")) {
    return next();
  }
  
  const indexPath = path.join(__dirname, "public", "index.html");
  const fs = require("fs");
  
  console.log(`[SPA] Serving index.html for ${req.path}`);
  
  // Check if index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error(`[ERROR] index.html not found at ${indexPath}`);
    console.error(`[ERROR] Public directory contents:`, fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : "Directory does not exist");
    return res.status(500).json({ 
      error: "React app not built. Run 'npm run build' first.",
      path: indexPath,
      publicDir: publicPath,
      exists: fs.existsSync(publicPath)
    });
  }
  
  // Set no-cache headers to prevent browser from caching old version
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[ERROR] Failed to send index.html:`, err);
      res.status(500).json({ error: "Failed to serve React app", details: err.message });
    } else {
      console.log(`[SPA] ✅ Served index.html successfully for ${req.path}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Messenger server running on port ${PORT}`);
  console.log(`========================================`);
  
  // Check if React app is built
  const fs = require("fs");
  const indexPath = path.join(__dirname, "public", "index.html");
  const publicPath = path.join(__dirname, "public");
  
  if (!fs.existsSync(publicPath)) {
    console.warn(`⚠️  WARNING: public/ directory does not exist!`);
    console.warn(`   Run 'npm run build' to build the React app.`);
  } else {
    const files = fs.readdirSync(publicPath);
    console.log(`📁 Public directory contents:`, files);
    
    if (!fs.existsSync(indexPath)) {
      console.warn(`⚠️  WARNING: index.html not found in public/ directory!`);
      console.warn(`   Run 'npm run build' to build the React app.`);
    } else {
      // Read and check index.html content
      const indexContent = fs.readFileSync(indexPath, "utf8");
      const hasReact = indexContent.includes("react") || indexContent.includes("React") || indexContent.includes("root");
      const hasOldApp = indexContent.includes("app.js") || indexContent.includes("style.css");
      
      console.log(`✅ React app found at ${indexPath}`);
      console.log(`   File size: ${(indexContent.length / 1024).toFixed(2)} KB`);
      console.log(`   Contains React: ${hasReact ? "✅" : "❌"}`);
      console.log(`   Contains old app.js: ${hasOldApp ? "⚠️  WARNING - OLD FILES DETECTED" : "✅"}`);
      
      if (hasOldApp) {
        console.error(`   ❌ ERROR: index.html still references old app.js!`);
        console.error(`   The React build may not have completed correctly.`);
      }
      
      // Check for assets directory
      const assetsPath = path.join(publicPath, "assets");
      if (fs.existsSync(assetsPath)) {
        const assetFiles = fs.readdirSync(assetsPath);
        console.log(`   Assets directory: ${assetFiles.length} files`);
      } else {
        console.warn(`   ⚠️  No assets/ directory found - React build may be incomplete`);
      }
    }
  }
  
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🌐 Server ready (Railway will use your custom domain)`);
  console.log(`========================================`);
});
