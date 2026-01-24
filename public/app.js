const socket = io();

const messagesList = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const statusPill = document.getElementById("connection-status");
const overlay = document.getElementById("join-overlay");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const changeNameButton = document.getElementById("change-name");

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
  text.textContent = message.text;

  item.appendChild(meta);
  item.appendChild(text);
  messagesList.appendChild(item);
  scrollToBottom();
};

const openOverlay = () => {
  overlay.classList.add("show");
  usernameInput.focus();
};

const closeOverlay = () => {
  overlay.classList.remove("show");
};

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }
  currentUser = name.slice(0, 32);
  socket.emit("join", { username: currentUser });
  closeOverlay();
});

changeNameButton.addEventListener("click", () => {
  openOverlay();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!currentUser) {
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
