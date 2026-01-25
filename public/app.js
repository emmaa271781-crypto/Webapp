const socket = io();

const messagesList = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const chatPanel = document.getElementById("chat-panel");
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
const fileToggle = document.getElementById("file-toggle");
const fileInput = document.getElementById("file-input");
const uploadError = document.getElementById("upload-error");
const callStartButton = document.getElementById("call-start");
const callShareButton = document.getElementById("call-share");
const callEndButton = document.getElementById("call-end");
const callPanel = document.getElementById("call-panel");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const soundToggle = document.getElementById("sound-toggle");
const notifyToggle = document.getElementById("notify-toggle");
const replyBanner = document.getElementById("reply-banner");
const replyText = document.getElementById("reply-text");
const replyCancel = document.getElementById("reply-cancel");

let currentUser = "";
let peerConnection = null;
let localStream = null;
let screenStream = null;
let remoteStream = null;
let isInCall = false;
let isSharingScreen = false;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const baseTitle = document.title;
let unreadCount = 0;
let soundEnabled = false;
let notifyEnabled = false;
let replyTarget = null;
const messagesById = new Map();
const reactionEmojis = ["👍", "😂", "❤️", "🎉", "😮"];

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

const updateTitle = () => {
  document.title = unreadCount ? `(${unreadCount}) ${baseTitle}` : baseTitle;
};

const resetUnread = () => {
  unreadCount = 0;
  updateTitle();
};

const updateSoundButton = () => {
  soundToggle.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
};

const updateNotifyButton = () => {
  notifyToggle.textContent = notifyEnabled ? "🔔 Notify: On" : "🔔 Notify";
};

const saveSetting = (key, value) => {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch (error) {
    // Ignore storage failures.
  }
};

const loadSetting = (key) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch (error) {
    return false;
  }
};

const playSound = () => {
  if (!soundEnabled) {
    return;
  }
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
    oscillator.onended = () => {
      context.close();
    };
  } catch (error) {
    // Ignore sound failures.
  }
};

const notifyTab = (message) => {
  if (document.hidden) {
    unreadCount += 1;
    updateTitle();
    playSound();
    if (notifyEnabled && "Notification" in window) {
      if (Notification.permission === "granted") {
        const title = message.user
          ? `New message from ${message.user}`
          : "New message";
        const body = message.preview || "Open the tab to view.";
        const notification = new Notification(title, { body });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    }
  }
};

const isGifUrl = (value) => {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) {
    return false;
  }
  return /\.gif(\?|#|$)/i.test(text);
};

const getMessagePreview = (message) => {
  if (message?.type === "file" && message.file) {
    const label = message.file.kind === "video" ? "video" : "image";
    return `[${label}] ${message.file.name || "attachment"}`;
  }
  const text = String(message?.text || "").trim();
  if (isGifUrl(text)) {
    return "[gif]";
  }
  return text.slice(0, 120);
};

const scrollToBottom = () => {
  if (!chatPanel) {
    return;
  }
  chatPanel.scrollTop = chatPanel.scrollHeight;
};

const getReactionUsers = (message, emoji) => {
  const reactions = message?.reactions || {};
  const users = reactions[emoji];
  return Array.isArray(users) ? users : [];
};

const refreshReactionBar = (bar, message) => {
  const reactions = message?.reactions || {};
  bar.querySelectorAll(".reaction-button").forEach((button) => {
    const emoji = button.dataset.emoji;
    const users = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const count = users.length;
    const countEl = button.querySelector(".reaction-count");
    if (countEl) {
      countEl.textContent = count ? String(count) : "";
    }
    button.classList.toggle("active", users.includes(currentUser));
  });
};

const buildReactionBar = (message) => {
  const bar = document.createElement("div");
  bar.className = "reaction-bar";
  reactionEmojis.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reaction-button";
    button.dataset.emoji = emoji;
    const count = document.createElement("span");
    count.className = "reaction-count";
    button.append(emoji, " ");
    button.appendChild(count);
    button.addEventListener("click", () => {
      if (!currentUser) {
        setJoinError("Enter name and password to join.");
        openOverlay();
        return;
      }
      socket.emit("react", { messageId: message.id, emoji });
    });
    bar.appendChild(button);
  });
  refreshReactionBar(bar, message);
  return bar;
};

const updateMessageReactions = (messageId, reactions) => {
  const message = messagesById.get(messageId);
  if (!message) {
    return;
  }
  message.reactions = reactions || {};
  const item = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!item) {
    return;
  }
  const bar = item.querySelector(".reaction-bar");
  if (bar) {
    refreshReactionBar(bar, message);
  }
};

const setReplyTarget = (message) => {
  if (!message?.id) {
    return;
  }
  replyTarget = {
    id: message.id,
    user: message.user || "Unknown",
    text: getMessagePreview(message),
  };
  replyText.textContent = `Replying to ${replyTarget.user}: ${replyTarget.text}`;
  replyBanner.classList.add("show");
};

const clearReplyTarget = () => {
  replyTarget = null;
  replyText.textContent = "";
  replyBanner.classList.remove("show");
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
  if (message.id) {
    item.dataset.messageId = message.id;
    messagesById.set(message.id, message);
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

  const text = document.createElement("div");
  text.className = "message-text";
  const messageType = message.type || (message.file ? "file" : "text");
  if (message.replyTo) {
    const reply = document.createElement("div");
    reply.className = "reply-preview";
    const replyUser = document.createElement("span");
    replyUser.className = "reply-user";
    replyUser.textContent = message.replyTo.user || "Unknown";
    const replySnippet = document.createElement("span");
    replySnippet.className = "reply-snippet";
    replySnippet.textContent = message.replyTo.text || "";
    reply.appendChild(replyUser);
    reply.appendChild(replySnippet);
    text.appendChild(reply);
  }
  if (messageType === "file" && message.file?.url) {
    const file = message.file;
    if (file.kind === "video") {
      const video = document.createElement("video");
      video.className = "message-video";
      video.src = file.url;
      video.controls = true;
      video.playsInline = true;
      text.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.className = "message-image";
      image.src = file.url;
      image.alt = file.name || "Image";
      image.loading = "lazy";
      text.appendChild(image);
    }
  } else {
    const messageText = String(message.text || "");
    if (isGifUrl(messageText)) {
      const image = document.createElement("img");
      image.className = "message-gif";
      image.src = messageText;
      image.alt = "GIF";
      image.loading = "lazy";
      text.appendChild(image);
    } else {
      const textNode = document.createElement("span");
      textNode.textContent = messageText;
      text.appendChild(textNode);
    }
  }

  item.appendChild(meta);
  item.appendChild(text);
  if (message.id) {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "reply-button";
    replyButton.textContent = "Reply";
    replyButton.addEventListener("click", () => {
      setReplyTarget(message);
    });
    actions.appendChild(replyButton);
    actions.appendChild(buildReactionBar(message));
    item.appendChild(actions);
  }
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

const setUploadError = (message) => {
  uploadError.textContent = message;
  uploadError.style.display = message ? "block" : "none";
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
  clearGifResults();
};

const openOverlay = () => {
  overlay.classList.add("show");
  usernameInput.focus();
  closeEmojiPanel();
  closeGifPanel();
  setUploadError("");
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
  socket.emit("message", {
    text: url,
    replyTo: replyTarget ? { id: replyTarget.id } : null,
  });
  clearReplyTarget();
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

const handleFileUpload = (file) => {
  if (!file) {
    return;
  }
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  closeEmojiPanel();
  closeGifPanel();
  if (!file.type || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
    setUploadError("Only images or videos are allowed.");
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    setUploadError("File too large (max 3MB).");
    return;
  }
  setUploadError("");
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== "string") {
      setUploadError("File upload failed.");
      return;
    }
    socket.emit("message", {
      type: "file",
      replyTo: replyTarget ? { id: replyTarget.id } : null,
      file: {
        url: result,
        name: file.name,
        mime: file.type,
        kind: file.type.startsWith("video/") ? "video" : "image",
      },
    });
    clearReplyTarget();
  };
  reader.onerror = () => {
    setUploadError("File upload failed.");
  };
  reader.readAsDataURL(file);
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

replyCancel.addEventListener("click", () => {
  clearReplyTarget();
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

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  saveSetting("soundEnabled", soundEnabled);
});

notifyToggle.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    addSystemMessage("Notifications are not supported.");
    return;
  }
  if (!notifyEnabled) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      addSystemMessage("Notifications are blocked.");
      notifyEnabled = false;
      updateNotifyButton();
      saveSetting("notifyEnabled", notifyEnabled);
      return;
    }
    notifyEnabled = true;
  } else {
    notifyEnabled = false;
  }
  updateNotifyButton();
  saveSetting("notifyEnabled", notifyEnabled);
});

fileToggle.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (file) {
    handleFileUpload(file);
  }
  fileInput.value = "";
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
  socket.emit("message", {
    text,
    replyTo: replyTarget ? { id: replyTarget.id } : null,
  });
  clearReplyTarget();
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
  setUploadError("");
  clearReplyTarget();
  updateCallButtons();
});

socket.on("auth_error", (message) => {
  currentUser = "";
  setJoinError(message || "Incorrect password.");
  passwordInput.value = "";
  clearReplyTarget();
  openOverlay();
});

socket.on("message_error", (message) => {
  if (message) {
    addSystemMessage(message);
  }
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
  messagesById.clear();
  if (!messages.length) {
    addSystemMessage("No messages yet. Start the conversation!");
    return;
  }
  messages.forEach(addChatMessage);
});

socket.on("message", (message) => {
  addChatMessage(message);
  if (message.user !== currentUser) {
    notifyTab({ user: message.user, preview: getMessagePreview(message) });
  }
});

socket.on("reaction_update", (payload) => {
  if (!payload?.messageId) {
    return;
  }
  updateMessageReactions(payload.messageId, payload.reactions);
});

socket.on("system", (text) => {
  addSystemMessage(text);
});

updateCallButtons();
hideCallPanel();
soundEnabled = loadSetting("soundEnabled");
notifyEnabled = loadSetting("notifyEnabled");
updateSoundButton();
updateNotifyButton();
updateTitle();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetUnread();
  }
});
window.addEventListener("focus", () => {
  resetUnread();
});
openOverlay();
