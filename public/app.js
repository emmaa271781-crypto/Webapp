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
const emojiToggle = document.getElementById("emoji-toggle");
const emojiPanel = document.getElementById("emoji-panel");
const emojiGrid = document.getElementById("emoji-grid");
const gifToggle = document.getElementById("gif-toggle");
const gifPanel = document.getElementById("gif-panel");
const gifSearchInput = document.getElementById("gif-search-input");
const gifSearchButton = document.getElementById("gif-search-button");
const gifResults = document.getElementById("gif-results");
const gifError = document.getElementById("gif-error");
const callStartButton = document.getElementById("call-start");
const callShareButton = document.getElementById("call-share");
const callEndButton = document.getElementById("call-end");
const callPanel = document.getElementById("call-panel");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");

let currentUser = "";
let peerConnection = null;
let localStream = null;
let screenStream = null;
let remoteStream = null;
let isInCall = false;
let isSharingScreen = false;

const emojiList = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😎",
  "🤓",
  "😴",
  "🤔",
  "😅",
  "😭",
  "😡",
  "🥳",
  "🤯",
  "😇",
  "😈",
  "🙃",
  "😉",
  "🥹",
  "😮",
  "😱",
  "🤩",
  "😤",
  "😬",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "🤝",
  "💪",
  "🫶",
  "❤️",
  "💙",
  "💚",
  "💜",
  "🧡",
  "💛",
  "🖤",
  "🔥",
  "✨",
  "🎉",
  "🎯",
  "🏆",
  "🎮",
  "🎧",
  "🎵",
  "📚",
  "📝",
  "🖊️",
  "🧠",
  "🚀",
  "🌙",
  "☀️",
  "⏰",
  "✅",
  "❌",
  "⚡",
  "🌈",
  "🍕",
  "🍔",
  "🍟",
  "🍿",
  "🍎",
  "🥤",
  "☕",
  "🧋",
  "🐱",
  "🐶",
  "🐼",
  "🐢",
  "🐸",
  "🦄",
];

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

const updateCallButtons = () => {
  callStartButton.disabled = isInCall;
  callEndButton.disabled = !isInCall;
  callShareButton.disabled = !isInCall;
  callShareButton.textContent = isSharingScreen ? "Stop share" : "Share";
};

const showCallPanel = () => {
  callPanel.classList.add("show");
};

const hideCallPanel = () => {
  callPanel.classList.remove("show");
};

const openEmojiPanel = () => {
  emojiPanel.classList.add("show");
};

const closeEmojiPanel = () => {
  emojiPanel.classList.remove("show");
};

const openGifPanel = () => {
  gifPanel.classList.add("show");
  gifSearchInput.focus();
};

const closeGifPanel = () => {
  gifPanel.classList.remove("show");
  setGifError("");
};

const openOverlay = () => {
  overlay.classList.add("show");
  usernameInput.focus();
  closeEmojiPanel();
  closeGifPanel();
};

const closeOverlay = () => {
  overlay.classList.remove("show");
};

const buildEmojiPicker = () => {
  emojiGrid.innerHTML = "";
  emojiList.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-button";
    button.textContent = emoji;
    button.dataset.emoji = emoji;
    button.addEventListener("click", () => {
      input.value = `${input.value}${emoji}`;
      input.focus();
    });
    emojiGrid.appendChild(button);
  });
};

const sendGifUrl = (url) => {
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (!url) {
    setGifError("Select a GIF to send.");
    return;
  }
  socket.emit("message", { text: url });
  closeGifPanel();
};

const clearGifResults = () => {
  gifResults.innerHTML = "";
};

const renderGifResults = (results) => {
  clearGifResults();
  results.forEach((gif) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gif-result";
    const image = document.createElement("img");
    image.src = gif.preview || gif.url;
    image.alt = "GIF";
    image.loading = "lazy";
    button.appendChild(image);
    button.addEventListener("click", () => {
      sendGifUrl(gif.url);
    });
    gifResults.appendChild(button);
  });
};

const searchGifs = async () => {
  const query = gifSearchInput.value.trim();
  if (!query) {
    setGifError("Type a search term.");
    gifSearchInput.focus();
    return;
  }
  setGifError("");
  clearGifResults();
  const loading = document.createElement("div");
  loading.className = "gif-loading";
  loading.textContent = "Searching...";
  gifResults.appendChild(loading);
  try {
    const response = await fetch(
      `/api/gifs?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("GIF search failed");
    }
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) {
      setGifError("No GIFs found.");
      clearGifResults();
      return;
    }
    renderGifResults(results);
  } catch (error) {
    clearGifResults();
    setGifError("GIF search failed. Try again.");
  }
};

const ensureLocalStream = async () => {
  if (localStream) {
    return localStream;
  }
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;
  return localStream;
};

const createPeerConnection = async () => {
  if (peerConnection) {
    return peerConnection;
  }
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc_ice", { candidate: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(event.track);
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState;
    if (state && ["failed", "disconnected", "closed"].includes(state)) {
      endCall(false);
    }
  };

  const stream = await ensureLocalStream();
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  return peerConnection;
};

const endCall = (notifyPeer) => {
  if (notifyPeer) {
    socket.emit("webrtc_hangup");
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  remoteStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  isInCall = false;
  isSharingScreen = false;
  hideCallPanel();
  updateCallButtons();
};

const startCall = async () => {
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (isInCall) {
    return;
  }
  try {
    await createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("webrtc_offer", { offer });
    isInCall = true;
    showCallPanel();
    updateCallButtons();
  } catch (error) {
    addSystemMessage("Call failed. Check permissions.");
    endCall(false);
  }
};

const stopScreenShare = () => {
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }
  const cameraTrack = localStream?.getVideoTracks?.()[0];
  if (peerConnection && cameraTrack) {
    const sender = peerConnection
      .getSenders()
      .find((item) => item.track && item.track.kind === "video");
    if (sender) {
      sender.replaceTrack(cameraTrack);
    }
  }
  if (localStream) {
    localVideo.srcObject = localStream;
  }
  isSharingScreen = false;
  updateCallButtons();
};

const toggleScreenShare = async () => {
  if (!peerConnection || !localStream) {
    return;
  }
  if (isSharingScreen) {
    stopScreenShare();
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection
      .getSenders()
      .find((item) => item.track && item.track.kind === "video");
    if (sender) {
      sender.replaceTrack(screenTrack);
    }
    screenTrack.onended = () => {
      stopScreenShare();
    };
    localVideo.srcObject = screenStream;
    isSharingScreen = true;
    updateCallButtons();
  } catch (error) {
    addSystemMessage("Screen share failed.");
  }
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

buildEmojiPicker();

emojiToggle.addEventListener("click", () => {
  if (emojiPanel.classList.contains("show")) {
    closeEmojiPanel();
    return;
  }
  closeGifPanel();
  openEmojiPanel();
});

gifToggle.addEventListener("click", () => {
  if (gifPanel.classList.contains("show")) {
    closeGifPanel();
    return;
  }
  closeEmojiPanel();
  openGifPanel();
});

gifSearchButton.addEventListener("click", () => {
  searchGifs();
});

gifSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchGifs();
  }
});

callStartButton.addEventListener("click", () => {
  startCall();
});

callShareButton.addEventListener("click", () => {
  toggleScreenShare();
});

callEndButton.addEventListener("click", () => {
  endCall(true);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
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
  endCall(false);
});

socket.on("auth_ok", (payload) => {
  currentUser = payload?.username || "";
  closeOverlay();
  setJoinError("");
  closeGifPanel();
  closeEmojiPanel();
  updateCallButtons();
});

socket.on("auth_error", (message) => {
  currentUser = "";
  setJoinError(message || "Incorrect password.");
  passwordInput.value = "";
  openOverlay();
});

socket.on("webrtc_offer", async (payload) => {
  if (peerConnection || !currentUser || !payload?.offer) {
    return;
  }
  try {
    isInCall = true;
    showCallPanel();
    updateCallButtons();
    await createPeerConnection();
    await peerConnection.setRemoteDescription(payload.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("webrtc_answer", { answer });
  } catch (error) {
    addSystemMessage("Incoming call failed.");
    endCall(true);
  }
});

socket.on("webrtc_answer", async (payload) => {
  if (!peerConnection || !payload?.answer) {
    return;
  }
  try {
    await peerConnection.setRemoteDescription(payload.answer);
  } catch (error) {
    addSystemMessage("Call setup failed.");
  }
});

socket.on("webrtc_ice", async (payload) => {
  if (!peerConnection || !payload?.candidate) {
    return;
  }
  try {
    await peerConnection.addIceCandidate(payload.candidate);
  } catch (error) {
    addSystemMessage("Call connection issue.");
  }
});

socket.on("webrtc_hangup", () => {
  endCall(false);
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

updateCallButtons();
hideCallPanel();
openOverlay();
