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
const messageHistory = [];
const connectedUsers = new Map();
const typingUsers = new Map();
const pushSubscriptions = new Map();
const callState = {
  callerId: null,
  calleeId: null,
};
const callPeers = new Map();

if (hasVapidKeys) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
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

  socket.on("call_join", () => {
    if (!socket.data.authed) {
      return;
    }
    if (callPeers.has(socket.id) || callState.callerId === socket.id || callState.calleeId === socket.id) {
      socket.emit("call_joined", { role: "caller", peerId: getPeerId() });
      return;
    }
    if (!callState.callerId) {
      callState.callerId = socket.id;
      socket.emit("call_joined", { role: "caller" });
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
      });
      io.to(callState.callerId).emit("call_peer", {
        peerId: socket.id,
        peerName: calleeInfo.name,
        peerAvatar: calleeInfo.avatar,
      });
      io.to(callState.callerId).emit("call_connected", {
        peerId: socket.id,
        peerName: calleeInfo.name,
        peerAvatar: calleeInfo.avatar,
      });
      socket.emit("call_connected", {
        peerId: callState.callerId,
        peerName: callerInfo.name,
        peerAvatar: callerInfo.avatar,
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
    removeFromCall(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Messenger running on port ${PORT}`);
});
