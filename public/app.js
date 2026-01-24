const socket = io();

const messagesList = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const statusPill = document.getElementById("connection-status");
const overlay = document.getElementById("join-overlay");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const joinError = document.getElementById("join-error");
const gifToggle = document.getElementById("gif-toggle");
const gifPanel = document.getElementById("gif-panel");
const gifInput = document.getElementById("gif-input");
const gifSend = document.getElementById("gif-send");
const gifError = document.getElementById("gif-error");
const emojiButtons = document.querySelectorAll(".emoji-button");

let currentUser = "";

const setStatus = (label, type) => {
  statusPill.textContent = label;
  statusPill.classList.remove("status-ok", "status-offline");
  if (type) {
    statusPill.classList.add(type);
  }
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isGifUrl = (value) => {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) {
    return false;
  }
  return /\.gif(\?|#|$)/i.test(text);
};

const scrollToBottom = () => {
  messagesList.scrollTop = messagesList.scrollHeight;
};

const addSystemMessage = (text) => {
  const item = document.createElement("li");
  item.className = "message system";
  item.textContent = text;
  messagesList.appendChild(item);
  scrollToBottom();
};

const addChatMessage = (message) => {
  const item = document.createElement("li");
  item.className = "message";
  if (message.user === currentUser) {
    item.classList.add("self");
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const user = document.createElement("span");
  user.className = "message-user";
  user.textContent = message.user;

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatTime(message.timestamp);

  meta.appendChild(user);
  meta.appendChild(time);

  const text = document.createElement("p");
  text.className = "message-text";
  const messageText = String(message.text || "");
  if (isGifUrl(messageText)) {
    const image = document.createElement("img");
    image.className = "message-gif";
    image.src = messageText;
    image.alt = "GIF";
    image.loading = "lazy";
    text.appendChild(image);
  } else {
    text.textContent = messageText;
  }

  item.appendChild(meta);
  item.appendChild(text);
  messagesList.appendChild(item);
  scrollToBottom();
};

const setJoinError = (message) => {
  joinError.textContent = message;
  joinError.style.display = message ? "block" : "none";
};

const setGifError = (message) => {
  gifError.textContent = message;
  gifError.style.display = message ? "block" : "none";
};

const openOverlay = () => {
  overlay.classList.add("show");
  usernameInput.focus();
};

const closeOverlay = () => {
  overlay.classList.remove("show");
};

const openGifPanel = () => {
  gifPanel.classList.add("show");
  gifInput.focus();
};

const closeGifPanel = () => {
  gifPanel.classList.remove("show");
  setGifError("");
};

const sendGif = () => {
  const url = gifInput.value.trim();
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (!url) {
    setGifError("Paste a GIF URL.");
    gifInput.focus();
    return;
  }
  if (!isGifUrl(url)) {
    setGifError("GIF URL must end with .gif");
    gifInput.focus();
    return;
  }
  setGifError("");
  socket.emit("message", { text: url });
  gifInput.value = "";
  closeGifPanel();
};

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!name) {
    setJoinError("Name required.");
    usernameInput.focus();
    return;
  }
  if (!password) {
    setJoinError("Password required.");
    passwordInput.focus();
    return;
  }
  setJoinError("");
  socket.emit("join", { username: name.slice(0, 32), password });
});

emojiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const emoji = button.dataset.emoji || button.textContent;
    input.value = `${input.value}${emoji}`;
    input.focus();
  });
});

gifToggle.addEventListener("click", () => {
  if (gifPanel.classList.contains("show")) {
    closeGifPanel();
    return;
  }
  openGifPanel();
});

gifSend.addEventListener("click", () => {
  sendGif();
});

gifInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendGif();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (document.activeElement === gifInput) {
    sendGif();
    return;
  }
  const text = input.value.trim();
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (!text) {
    return;
  }
  socket.emit("message", { text });
  input.value = "";
  input.focus();
});

socket.on("connect", () => {
  setStatus("Connected", "status-ok");
});

socket.on("disconnect", () => {
  setStatus("Offline", "status-offline");
});

socket.on("auth_ok", (payload) => {
  currentUser = payload?.username || "";
  closeOverlay();
  setJoinError("");
  closeGifPanel();
});

socket.on("auth_error", (message) => {
  currentUser = "";
  setJoinError(message || "Incorrect password.");
  passwordInput.value = "";
  openOverlay();
});

socket.on("history", (messages) => {
  messagesList.innerHTML = "";
  if (!messages.length) {
    addSystemMessage("No messages yet. Start the conversation!");
    return;
  }
  messages.forEach(addChatMessage);
});

socket.on("message", (message) => {
  addChatMessage(message);
});

socket.on("system", (text) => {
  addSystemMessage(text);
});

openOverlay();
