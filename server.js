const path = require("path");
const http = require("http");
const { randomUUID } = require("crypto");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 100;
const REQUIRED_PASSWORD = process.env.CHAT_PASSWORD || "0327";
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";
const TENOR_API_KEY = process.env.TENOR_API_KEY || "LIVDSRZULELA";
const GIF_LIMIT = 12;
const MAX_FILE_CHARS = 4_500_000;
const ROOM_NAME = "main";
const messageHistory = [];
const connectedUsers = new Map();
const typingUsers = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const fetchGiphy = async (query) => {
  if (!GIPHY_API_KEY) {
    return [];
  }
  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", GIPHY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(GIF_LIMIT));
  url.searchParams.set("rating", "pg");
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return (data.data || [])
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
};

const fetchTenor = async (query) => {
  const url = new URL("https://tenor.googleapis.com/v2/search");
  url.searchParams.set("key", TENOR_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(GIF_LIMIT));
  url.searchParams.set("media_filter", "gif,tinygif");
  url.searchParams.set("contentfilter", "medium");
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return (data.results || [])
    .map((gif) => {
      const media = gif.media_formats || {};
      const urlValue = media.gif?.url || media.tinygif?.url;
      const preview = media.tinygif?.url || urlValue;
      if (!urlValue) {
        return null;
      }
      return { id: gif.id, url: urlValue, preview };
    })
    .filter(Boolean);
};

app.get("/api/gifs", async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  if (!query) {
    res.json({ results: [] });
    return;
  }
  try {
    const giphyResults = await fetchGiphy(query);
    if (giphyResults.length) {
      res.json({ results: giphyResults });
      return;
    }
    const tenorResults = await fetchTenor(query);
    res.json({ results: tenorResults });
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
  socket.on("join", (payload) => {
    const username = sanitizeName(payload?.username);
    const password = String(payload?.password || "");
    if (password !== REQUIRED_PASSWORD) {
      socket.emit("auth_error", "Incorrect password.");
      return;
    }

    const previousName = socket.data.username;
    socket.data.username = username;
    socket.data.authed = true;
    socket.join(ROOM_NAME);
    connectedUsers.set(socket.id, username);
    typingUsers.delete(socket.id);

    socket.emit("auth_ok", { username });
    socket.emit("history", messageHistory);
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
    socket.to(ROOM_NAME).emit("webrtc_offer", { offer: payload.offer });
  });

  socket.on("webrtc_answer", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.answer) {
      return;
    }
    socket.to(ROOM_NAME).emit("webrtc_answer", { answer: payload.answer });
  });

  socket.on("webrtc_ice", (payload) => {
    if (!socket.data.authed) {
      return;
    }
    if (!payload?.candidate) {
      return;
    }
    socket.to(ROOM_NAME).emit("webrtc_ice", { candidate: payload.candidate });
  });

  socket.on("webrtc_hangup", () => {
    if (!socket.data.authed) {
      return;
    }
    socket.to(ROOM_NAME).emit("webrtc_hangup");
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
  });
});

server.listen(PORT, () => {
  console.log(`Messenger running on port ${PORT}`);
});
