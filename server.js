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
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "dc6zaTOxFJmzC";
const ROOM_NAME = "main";
const messageHistory = [];

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/gifs", async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  if (!query) {
    res.json({ results: [] });
    return;
  }
  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "12");
    url.searchParams.set("rating", "pg");
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: "GIF search failed." });
      return;
    }
    const data = await response.json();
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
    res.json({ results });
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

const addMessageToHistory = (message) => {
  messageHistory.push(message);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }
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

    socket.emit("auth_ok", { username });
    socket.emit("history", messageHistory);

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
    const text = sanitizeMessage(payload?.text);
    if (!text) {
      return;
    }
    const message = {
      id: randomUUID(),
      user: socket.data.username,
      text,
      timestamp: new Date().toISOString(),
    };
    addMessageToHistory(message);
    io.emit("message", message);
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
  });
});

server.listen(PORT, () => {
  console.log(`Messenger running on port ${PORT}`);
});
