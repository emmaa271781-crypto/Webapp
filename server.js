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
const messageHistory = [];

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
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
  socket.emit("history", messageHistory);

  socket.on("join", (payload) => {
    const username = sanitizeName(payload?.username);
    socket.data.username = username;
    socket.broadcast.emit("system", `${username} joined the chat`);
  });

  socket.on("message", (payload) => {
    if (!socket.data.username) {
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

  socket.on("disconnect", () => {
    if (socket.data.username) {
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
