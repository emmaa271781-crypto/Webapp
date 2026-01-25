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
const typingIndicator = document.getElementById("typing-indicator");
const userList = document.getElementById("user-list");
const onlineCount = document.getElementById("online-count");
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
const micToggle = document.getElementById("mic-toggle");
const camToggle = document.getElementById("cam-toggle");
const voiceToggle = document.getElementById("voice-toggle");
const callEndButton = document.getElementById("call-end");
const callPanel = document.getElementById("call-panel");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const remoteAudio = document.getElementById("remote-audio");
const localPlaceholder = document.getElementById("local-placeholder");
const remotePlaceholder = document.getElementById("remote-placeholder");
const localStatus = document.getElementById("local-status");
const remoteStatus = document.getElementById("remote-status");
const callStatus = document.getElementById("call-status");
const localTile = document.getElementById("local-tile");
const remoteTile = document.getElementById("remote-tile");
const localLabel = document.getElementById("local-label");
const remoteLabel = document.getElementById("remote-label");
const localAvatar = document.getElementById("local-avatar");
const remoteAvatar = document.getElementById("remote-avatar");
const callBanner = document.getElementById("call-banner");
const callBannerText = document.getElementById("call-banner-text");
const callBannerJoin = document.getElementById("call-banner-join");
const callBannerDismiss = document.getElementById("call-banner-dismiss");
const avatarToggle = document.getElementById("avatar-toggle");
const soundToggle = document.getElementById("sound-toggle");
const notifyToggle = document.getElementById("notify-toggle");
const editBanner = document.getElementById("edit-banner");
const editText = document.getElementById("edit-text");
const editCancel = document.getElementById("edit-cancel");
const replyBanner = document.getElementById("reply-banner");
const replyText = document.getElementById("reply-text");
const replyCancel = document.getElementById("reply-cancel");
const scrollLatestButton = document.getElementById("scroll-latest");

let currentUser = "";
let peerConnection = null;
let localStream = null;
let screenStream = null;
let remoteStream = null;
let isInCall = false;
let isSharingScreen = false;
let isMicMuted = false;
let isCameraEnabled = false;
let cameraTrack = null;
let audioTransceiver = null;
let videoTransceiver = null;
let isMakingOffer = false;
let voiceIsolationEnabled = true;
let remoteHasAudio = false;
let remoteHasVideo = false;
let remotePeerId = null;
let localVad = null;
let remoteVad = null;
let callRole = null;
let bannerDismissed = false;
let callConnected = false;
let currentAvatarUrl = "";
let remoteProfile = { name: "Remote", avatar: "" };
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const baseTitle = document.title;
let unreadCount = 0;
let soundEnabled = false;
let notifyEnabled = false;
let replyTarget = null;
let editTarget = null;
let typingTimer = null;
let isTyping = false;
let pushSubscription = null;
let swRegistration = null;
const pushSupported =
  "serviceWorker" in navigator && "PushManager" in window;
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
  notifyToggle.textContent = notifyEnabled
    ? "🔔 Notify: On"
    : "🔔 Notify: Off";
};

const updateRemotePeer = (from) => {
  if (!from) {
    return;
  }
  remotePeerId = from;
  updateCallStatus();
};

const updateVoiceButton = () => {
  voiceToggle.textContent = voiceIsolationEnabled
    ? "Voice: Clean"
    : "Voice: Normal";
  voiceToggle.classList.toggle("active", voiceIsolationEnabled);
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

const sanitizeAvatarUrl = (value) => {
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

const applyAvatar = (element, name, url) => {
  if (!element) {
    return;
  }
  const safeUrl = sanitizeAvatarUrl(url);
  if (safeUrl) {
    element.style.backgroundImage = `url("${safeUrl.replace(/"/g, "")}")`;
    element.classList.add("has-image");
    element.textContent = "";
    return;
  }
  element.style.backgroundImage = "none";
  element.classList.remove("has-image");
  const initial = name ? name.trim()[0] : "?";
  element.textContent = initial ? initial.toUpperCase() : "?";
};

const updateLocalIdentity = () => {
  if (localLabel) {
    localLabel.textContent = currentUser ? `${currentUser} (You)` : "You";
  }
  applyAvatar(localAvatar, currentUser || "You", currentAvatarUrl);
};

const updateRemoteIdentity = (payload) => {
  remoteProfile = {
    name: payload?.peerName || remoteProfile.name || "Remote",
    avatar: payload?.peerAvatar || remoteProfile.avatar || "",
  };
  if (remoteLabel) {
    remoteLabel.textContent = remoteProfile.name || "Remote";
  }
  applyAvatar(remoteAvatar, remoteProfile.name, remoteProfile.avatar);
};

const clearRemoteIdentity = () => {
  remoteProfile = { name: "Remote", avatar: "" };
  if (remoteLabel) {
    remoteLabel.textContent = "Remote";
  }
  applyAvatar(remoteAvatar, "Remote", "");
};

const ensureRemoteAudioPlayback = () => {
  if (!remoteAudio) {
    return;
  }
  remoteAudio.muted = false;
  remoteAudio.play().catch(() => {
    // Autoplay might be blocked; user gesture will unblock.
  });
};

const getAudioConstraints = () => ({
  echoCancellation: voiceIsolationEnabled,
  noiseSuppression: voiceIsolationEnabled,
  autoGainControl: voiceIsolationEnabled,
});

const applyVoiceConstraints = async () => {
  if (!localStream) {
    return;
  }
  const track = localStream.getAudioTracks()[0];
  if (!track || !track.applyConstraints) {
    return;
  }
  try {
    await track.applyConstraints(getAudioConstraints());
  } catch (error) {
    // Ignore constraint failures.
  }
};

const stopVad = (vad) => {
  if (!vad) {
    return;
  }
  if (vad.rafId) {
    cancelAnimationFrame(vad.rafId);
  }
  if (vad.ctx && vad.ctx.state !== "closed") {
    vad.ctx.close();
  }
};

const startVad = (stream, tile, getActive) => {
  if (!stream || !tile) {
    return null;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  const ctx = new AudioContextClass();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const vad = { ctx, analyser, data, rafId: null };

  const tick = () => {
    if (!getActive()) {
      tile.classList.remove("speaking");
      vad.rafId = requestAnimationFrame(tick);
      return;
    }
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const value = (data[i] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / data.length);
    if (rms > 0.08) {
      tile.classList.add("speaking");
    } else {
      tile.classList.remove("speaking");
    }
    vad.rafId = requestAnimationFrame(tick);
  };
  vad.rafId = requestAnimationFrame(tick);
  return vad;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

const registerServiceWorker = async () => {
  if (!pushSupported) {
    return null;
  }
  if (swRegistration) {
    return swRegistration;
  }
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return swRegistration;
  } catch (error) {
    return null;
  }
};

const getExistingSubscription = async () => {
  const registration = await registerServiceWorker();
  if (!registration) {
    return null;
  }
  return registration.pushManager.getSubscription();
};

const fetchVapidKey = async () => {
  const response = await fetch("/api/vapid-public-key");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || "Push notifications not configured.";
    throw new Error(message);
  }
  return data.publicKey;
};

const sendSubscription = async (subscription, username) => {
  if (!subscription?.endpoint) {
    return;
  }
  await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      username,
    }),
  });
};

const ensurePushSubscription = async (username) => {
  const existing = await getExistingSubscription();
  if (existing) {
    pushSubscription = existing;
    await sendSubscription(existing, username);
    return existing;
  }
  const publicKey = await fetchVapidKey();
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error("Service workers not supported.");
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  pushSubscription = subscription;
  await sendSubscription(subscription, username);
  return subscription;
};

const syncPushSubscription = async () => {
  if (!notifyEnabled || Notification.permission !== "granted") {
    return;
  }
  const existing = await getExistingSubscription();
  if (existing) {
    pushSubscription = existing;
    await sendSubscription(existing, currentUser);
  }
};

const unsubscribePush = async () => {
  if (!pushSubscription) {
    return;
  }
  await fetch("/api/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
  });
  await pushSubscription.unsubscribe();
  pushSubscription = null;
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

const updatePresence = (payload) => {
  if (!userList || !onlineCount) {
    return;
  }
  const users = Array.isArray(payload?.users) ? payload.users : [];
  const total =
    typeof payload?.total === "number"
      ? payload.total
      : users.reduce((sum, user) => sum + (user.count || 0), 0);
  onlineCount.textContent = `${total} online`;
  userList.innerHTML = "";
  users
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((user) => {
      const item = document.createElement("li");
      item.className = "user-item";
      if (user.name === currentUser) {
        item.classList.add("self");
      }
      const name = document.createElement("span");
      name.textContent = user.name;
      item.appendChild(name);
      if (user.count > 1) {
        const badge = document.createElement("span");
        badge.className = "user-badge";
        badge.textContent = `x${user.count}`;
        item.appendChild(badge);
      }
      userList.appendChild(item);
    });
};

const setTypingIndicator = (users) => {
  if (!typingIndicator) {
    return;
  }
  const others = (Array.isArray(users) ? users : []).filter(
    (name) => name && name !== currentUser
  );
  if (!others.length) {
    typingIndicator.textContent = "";
    typingIndicator.classList.remove("show");
    return;
  }
  const label =
    others.length === 1
      ? `${others[0]} is typing...`
      : `${others.slice(0, 2).join(", ")} are typing...`;
  typingIndicator.textContent = label;
  typingIndicator.classList.add("show");
};

const emitTyping = (value) => {
  if (!currentUser || !socket.connected) {
    return;
  }
  if (isTyping === value) {
    return;
  }
  isTyping = value;
  socket.emit("typing", { isTyping: value });
  if (!value) {
    clearTimeout(typingTimer);
  }
};

const scheduleTypingStop = () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    emitTyping(false);
  }, 2000);
};

const scrollToBottom = () => {
  if (!chatPanel) {
    return;
  }
  chatPanel.scrollTop = chatPanel.scrollHeight;
  if (scrollLatestButton) {
    scrollLatestButton.classList.remove("show");
  }
};

const scheduleScroll = () => {
  requestAnimationFrame(scrollToBottom);
};

const isNearBottom = () => {
  if (!chatPanel) {
    return true;
  }
  const threshold = 120;
  const distance =
    chatPanel.scrollHeight - chatPanel.scrollTop - chatPanel.clientHeight;
  return distance < threshold;
};

const handleNewMessageScroll = (shouldScroll) => {
  if (shouldScroll) {
    scheduleScroll();
    if (scrollLatestButton) {
      scrollLatestButton.classList.remove("show");
    }
  } else if (scrollLatestButton) {
    scrollLatestButton.classList.add("show");
  }
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

const setEditTarget = (message) => {
  if (!message?.id || message.type !== "text" || message.deleted) {
    return;
  }
  editTarget = {
    id: message.id,
    text: message.text || "",
  };
  clearReplyTarget();
  editText.textContent = "Editing your message";
  editBanner.classList.add("show");
  input.value = message.text || "";
  input.focus();
};

const clearEditTarget = () => {
  editTarget = null;
  editText.textContent = "";
  editBanner.classList.remove("show");
};

const renderMeta = (meta, message) => {
  meta.innerHTML = "";
  const user = document.createElement("span");
  user.className = "message-user";
  user.textContent = message.user || "Unknown";
  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatTime(message.timestamp);
  if (message.edited) {
    const edited = document.createElement("span");
    edited.className = "edited-label";
    edited.textContent = "edited";
    time.appendChild(edited);
  }
  meta.appendChild(user);
  meta.appendChild(time);
};

const renderMessageText = (message, container, shouldScroll) => {
  container.innerHTML = "";
  container.className = "message-text";
  if (message.deleted) {
    container.classList.add("deleted");
    container.textContent = "Message deleted";
    return;
  }
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
    container.appendChild(reply);
  }

  const messageType = message.type || (message.file ? "file" : "text");
  if (messageType === "file" && message.file?.url) {
    const file = message.file;
    if (file.kind === "video") {
      const video = document.createElement("video");
      video.className = "message-video";
      video.src = file.url;
      video.controls = true;
      video.playsInline = true;
      video.addEventListener("loadedmetadata", () => {
        handleNewMessageScroll(shouldScroll);
      });
      container.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.className = "message-image";
      image.src = file.url;
      image.alt = file.name || "Image";
      image.loading = "lazy";
      image.addEventListener("load", () => {
        handleNewMessageScroll(shouldScroll);
      });
      container.appendChild(image);
    }
  } else {
    const messageText = String(message.text || "");
    if (isGifUrl(messageText)) {
      const image = document.createElement("img");
      image.className = "message-gif";
      image.src = messageText;
      image.alt = "GIF";
      image.loading = "lazy";
      image.addEventListener("load", () => {
        handleNewMessageScroll(shouldScroll);
      });
      container.appendChild(image);
    } else {
      const textNode = document.createElement("span");
      textNode.textContent = messageText;
      container.appendChild(textNode);
    }
  }
};

const renderMessageActions = (message) => {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  if (!message.deleted) {
    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "reply-button";
    replyButton.textContent = "Reply";
    replyButton.addEventListener("click", () => {
      setReplyTarget(message);
    });
    actions.appendChild(replyButton);
    actions.appendChild(buildReactionBar(message));
  }
  if (message.user === currentUser && !message.deleted) {
    if (message.type === "text") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        setEditTarget(message);
      });
      actions.appendChild(editButton);
    }
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      socket.emit("delete_message", { messageId: message.id });
    });
    actions.appendChild(deleteButton);
  }
  return actions;
};

const updateMessageElement = (message) => {
  if (!message?.id) {
    return;
  }
  messagesById.set(message.id, message);
  const item = document.querySelector(`[data-message-id="${message.id}"]`);
  if (!item) {
    return;
  }
  if (message.user === currentUser) {
    item.classList.add("self");
  } else {
    item.classList.remove("self");
  }
  const meta = item.querySelector(".message-meta");
  if (meta) {
    renderMeta(meta, message);
  }
  const text = item.querySelector(".message-text");
  const shouldScroll = isNearBottom();
  if (text) {
    renderMessageText(message, text, shouldScroll);
  }
  const actions = item.querySelector(".message-actions");
  if (actions) {
    actions.remove();
  }
  if (!message.deleted) {
    item.appendChild(renderMessageActions(message));
  }
  handleNewMessageScroll(shouldScroll);
};

const setReplyTarget = (message) => {
  if (!message?.id) {
    return;
  }
  clearEditTarget();
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
  const shouldScroll = isNearBottom();
  const item = document.createElement("li");
  item.className = "message system";
  item.textContent = text;
  messagesList.appendChild(item);
  handleNewMessageScroll(shouldScroll);
};

const addChatMessage = (message) => {
  const shouldScroll = isNearBottom();
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
  renderMeta(meta, message);

  const text = document.createElement("div");
  text.className = "message-text";
  renderMessageText(message, text, shouldScroll);

  item.appendChild(meta);
  item.appendChild(text);
  if (message.id && !message.deleted) {
    item.appendChild(renderMessageActions(message));
  }
  messagesList.appendChild(item);
  handleNewMessageScroll(shouldScroll);
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
  micToggle.disabled = !isInCall;
  camToggle.disabled = !isInCall;
  voiceToggle.disabled = !isInCall;
  callStartButton.textContent = isInCall ? "In Call" : "Join Call";
  callShareButton.textContent = isSharingScreen ? "Stop share" : "Share";
  micToggle.textContent = isMicMuted ? "Mic: Off" : "Mic: On";
  camToggle.textContent = isCameraEnabled ? "Cam: On" : "Cam: Off";
  micToggle.classList.toggle("active", !isMicMuted);
  camToggle.classList.toggle("active", isCameraEnabled);
  updateVoiceButton();
  updateLocalStatus();
  updateRemoteStatus();
};

const showCallPanel = () => {
  callPanel.classList.add("show");
};

const hideCallPanel = () => {
  callPanel.classList.remove("show");
};

const updateCallStatus = () => {
  if (!callStatus) {
    return;
  }
  if (!isInCall) {
    callStatus.textContent = "Waiting";
    return;
  }
  if (!remotePeerId) {
    callStatus.textContent = "Waiting for peer";
    return;
  }
  if (callConnected || remoteHasAudio || remoteHasVideo) {
    callStatus.textContent = "Connected";
  } else {
    callStatus.textContent = "Connecting";
  }
};

const showCallBanner = (text) => {
  if (!callBanner || bannerDismissed || isInCall) {
    return;
  }
  if (callBannerText) {
    callBannerText.textContent = text || "A call is active. Join now.";
  }
  callBanner.classList.add("show");
};

const hideCallBanner = () => {
  if (!callBanner) {
    return;
  }
  callBanner.classList.remove("show");
};

const updateLocalVideoPreview = () => {
  if (isSharingScreen && screenStream) {
    localVideo.srcObject = screenStream;
    localVideo.classList.remove("hidden");
    if (localPlaceholder) {
      localPlaceholder.classList.add("hidden");
    }
    updateLocalStatus();
    return;
  }
  if (isCameraEnabled && cameraTrack && localStream) {
    localVideo.srcObject = localStream;
    localVideo.classList.remove("hidden");
    if (localPlaceholder) {
      localPlaceholder.classList.add("hidden");
    }
    updateLocalStatus();
    return;
  }
  localVideo.srcObject = null;
  localVideo.classList.add("hidden");
  if (localPlaceholder) {
    localPlaceholder.classList.remove("hidden");
  }
  updateLocalStatus();
};

const applyMicState = () => {
  if (!localStream) {
    return;
  }
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !isMicMuted;
  });
  if (isMicMuted && localTile) {
    localTile.classList.remove("speaking");
  }
};

const updateLocalStatus = () => {
  if (!localStatus) {
    return;
  }
  const micLabel = isMicMuted ? "Mic muted" : "Mic live";
  const videoLabel = isSharingScreen
    ? "Sharing screen"
    : isCameraEnabled
      ? "Camera on"
      : "Camera off";
  localStatus.textContent = `${micLabel} • ${videoLabel}`;
};

const updateRemoteStatus = () => {
  if (!remoteStatus) {
    return;
  }
  if (!remoteHasAudio && !remoteHasVideo) {
    remoteStatus.textContent = "Waiting for peer...";
  } else if (remoteHasAudio && remoteHasVideo) {
    remoteStatus.textContent = "Voice + Video";
  } else if (remoteHasAudio) {
    remoteStatus.textContent = "Voice connected";
  } else {
    remoteStatus.textContent = "Video connected";
  }
  if (remotePlaceholder) {
    remotePlaceholder.classList.toggle("hidden", remoteHasVideo);
  }
  remoteVideo.classList.toggle("hidden", !remoteHasVideo);
  if (remoteTile && !remoteHasAudio) {
    remoteTile.classList.remove("speaking");
  }
  updateCallStatus();
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
  emitTyping(false);
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
  emitTyping(false);
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
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      clearGifResults();
      setGifError(data?.error || "GIF search failed.");
      return;
    }
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
    emitTyping(false);
    clearReplyTarget();
  };
  reader.onerror = () => {
    setUploadError("File upload failed.");
  };
  reader.readAsDataURL(file);
};

const ensureLocalStream = async () => {
  if (localStream && localStream.getAudioTracks().length) {
    return localStream;
  }
  const audioStream = await navigator.mediaDevices.getUserMedia({
    audio: getAudioConstraints(),
    video: false,
  });
  if (!localStream) {
    localStream = new MediaStream();
  }
  audioStream.getAudioTracks().forEach((track) => {
    localStream.addTrack(track);
  });
  applyMicState();
  updateLocalVideoPreview();
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
      if (remoteAudio) {
        remoteAudio.srcObject = remoteStream;
      }
    }
    remoteStream.addTrack(event.track);
    if (event.track.kind === "audio") {
      remoteHasAudio = true;
      if (remoteVad) {
        stopVad(remoteVad);
      }
      remoteVad = startVad(
        remoteStream,
        remoteTile,
        () => remoteHasAudio
      );
      if (remoteAudio) {
        remoteAudio
          .play()
          .catch(() => {
            // Autoplay might be blocked until user interacts.
          });
      }
    }
    if (event.track.kind === "video") {
      remoteHasVideo = true;
    }
    updateRemoteStatus();
    event.track.addEventListener("mute", () => {
      if (event.track.kind === "audio") {
        remoteHasAudio = false;
      }
      if (event.track.kind === "video") {
        remoteHasVideo = false;
      }
      updateRemoteStatus();
    });
    event.track.addEventListener("unmute", () => {
      if (event.track.kind === "audio") {
        remoteHasAudio = true;
      }
      if (event.track.kind === "video") {
        remoteHasVideo = true;
      }
      updateRemoteStatus();
    });
    event.track.addEventListener("ended", () => {
      if (remoteStream) {
        remoteStream.removeTrack(event.track);
      }
      const audioTracks = remoteStream ? remoteStream.getAudioTracks() : [];
      const videoTracks = remoteStream ? remoteStream.getVideoTracks() : [];
      remoteHasAudio = audioTracks.some((track) => track.readyState === "live");
      remoteHasVideo = videoTracks.some((track) => track.readyState === "live");
      if (!remoteHasAudio && remoteVad) {
        stopVad(remoteVad);
        remoteVad = null;
      }
      updateRemoteStatus();
    });
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState;
    if (!state) {
      return;
    }
    if (state === "connected" || state === "completed") {
      callConnected = true;
      updateCallStatus();
      return;
    }
    if (state === "closed") {
      endCall(false);
      return;
    }
    if (["failed", "disconnected"].includes(state)) {
      if (!callConnected) {
        return;
      }
      endCall(false);
    }
  };

  peerConnection.onnegotiationneeded = () => {
    if (isInCall) {
      requestRenegotiate();
    }
  };

  audioTransceiver = peerConnection.addTransceiver("audio", {
    direction: "recvonly",
  });
  videoTransceiver = peerConnection.addTransceiver("video", {
    direction: "recvonly",
  });

  return peerConnection;
};

const requestRenegotiate = async () => {
  if (!peerConnection) {
    return;
  }
  if (!remotePeerId) {
    return;
  }
  if (callRole === "caller") {
    await negotiate();
    return;
  }
  socket.emit("call_negotiate", { to: remotePeerId });
};

const negotiate = async () => {
  if (!peerConnection) {
    return;
  }
  if (peerConnection.signalingState !== "stable") {
    return;
  }
  if (isMakingOffer) {
    return;
  }
  if (callRole !== "caller" || !remotePeerId) {
    return;
  }
  try {
    isMakingOffer = true;
    await peerConnection.setLocalDescription(
      await peerConnection.createOffer()
    );
    socket.emit("webrtc_offer", {
      offer: peerConnection.localDescription,
      to: remotePeerId,
    });
  } catch (error) {
    // Ignore negotiation errors.
  } finally {
    isMakingOffer = false;
  }
};

const attachAudioTrack = async (track) => {
  if (!audioTransceiver) {
    return;
  }
  await audioTransceiver.sender.replaceTrack(track);
  audioTransceiver.direction = "sendrecv";
  await requestRenegotiate();
};

const attachVideoTrack = async (track) => {
  if (!videoTransceiver) {
    return;
  }
  await videoTransceiver.sender.replaceTrack(track);
  videoTransceiver.direction = "sendrecv";
  await requestRenegotiate();
};

const clearVideoTrack = async () => {
  if (!videoTransceiver) {
    return;
  }
  await videoTransceiver.sender.replaceTrack(null);
  videoTransceiver.direction = "recvonly";
  await requestRenegotiate();
};

const endCall = (notifyPeer) => {
  if (notifyPeer) {
    socket.emit("call_leave");
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
  if (cameraTrack) {
    cameraTrack.stop();
    cameraTrack = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  remoteStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  audioTransceiver = null;
  videoTransceiver = null;
  isMakingOffer = false;
  remotePeerId = null;
  callRole = null;
  isInCall = false;
  isSharingScreen = false;
  isMicMuted = false;
  isCameraEnabled = false;
  remoteHasAudio = false;
  remoteHasVideo = false;
  callConnected = false;
  if (localVad) {
    stopVad(localVad);
    localVad = null;
  }
  if (remoteVad) {
    stopVad(remoteVad);
    remoteVad = null;
  }
  hideCallPanel();
  updateLocalVideoPreview();
  updateCallButtons();
};

const startCall = () => {
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (isInCall) {
    return;
  }
  socket.emit("call_join");
};

const stopScreenShare = () => {
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }
  isSharingScreen = false;
  if (isCameraEnabled && cameraTrack) {
    attachVideoTrack(cameraTrack);
  } else {
    clearVideoTrack();
  }
  updateLocalVideoPreview();
  updateCallButtons();
};

const toggleScreenShare = async () => {
  if (!peerConnection) {
    return;
  }
  if (isSharingScreen) {
    stopScreenShare();
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!localStream) {
      localStream = new MediaStream();
    }
    await attachVideoTrack(screenTrack);
    screenTrack.onended = () => {
      stopScreenShare();
    };
    isSharingScreen = true;
    updateLocalVideoPreview();
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
  currentAvatarUrl = sanitizeAvatarUrl(currentAvatarUrl);
  socket.emit("join", {
    username: name.slice(0, 32),
    password,
    avatar: currentAvatarUrl,
  });
});

replyCancel.addEventListener("click", () => {
  clearReplyTarget();
});

editCancel.addEventListener("click", () => {
  clearEditTarget();
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

input.addEventListener("input", () => {
  if (!currentUser) {
    return;
  }
  emitTyping(true);
  scheduleTypingStop();
});

input.addEventListener("blur", () => {
  emitTyping(false);
});

if (chatPanel) {
  chatPanel.addEventListener("scroll", () => {
    if (scrollLatestButton) {
      if (isNearBottom()) {
        scrollLatestButton.classList.remove("show");
      } else {
        scrollLatestButton.classList.add("show");
      }
    }
  });
}

if (scrollLatestButton) {
  scrollLatestButton.addEventListener("click", () => {
    scrollToBottom();
  });
}

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
    try {
      await ensurePushSubscription(currentUser);
      notifyEnabled = true;
    } catch (error) {
      addSystemMessage(
        error?.message || "Push notifications not configured."
      );
      notifyEnabled = false;
    }
  } else {
    notifyEnabled = false;
    await unsubscribePush();
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
  ensureRemoteAudioPlayback();
  startCall();
});

if (callBannerJoin) {
  callBannerJoin.addEventListener("click", () => {
    ensureRemoteAudioPlayback();
    startCall();
  });
}

if (callBannerDismiss) {
  callBannerDismiss.addEventListener("click", () => {
    bannerDismissed = true;
    hideCallBanner();
  });
}

if (avatarToggle) {
  avatarToggle.addEventListener("click", () => {
    const next = window.prompt("Paste an avatar URL (https://...)", currentAvatarUrl || "");
    if (next === null) {
      return;
    }
    currentAvatarUrl = sanitizeAvatarUrl(next);
    try {
      localStorage.setItem("avatarUrl", currentAvatarUrl);
    } catch (error) {
      // Ignore storage errors.
    }
    updateLocalIdentity();
    if (currentUser) {
      socket.emit("avatar_update", { avatar: currentAvatarUrl });
    }
  });
}

callShareButton.addEventListener("click", () => {
  toggleScreenShare();
});

callEndButton.addEventListener("click", () => {
  endCall(true);
});

voiceToggle.addEventListener("click", async () => {
  if (!isInCall) {
    return;
  }
  voiceIsolationEnabled = !voiceIsolationEnabled;
  updateVoiceButton();
  saveSetting("voiceIsolationEnabled", voiceIsolationEnabled);
  await applyVoiceConstraints();
});

micToggle.addEventListener("click", () => {
  if (!isInCall) {
    return;
  }
  if (isMicMuted) {
    (async () => {
      try {
        await createPeerConnection();
        const stream = await ensureLocalStream();
        const track = stream.getAudioTracks()[0];
        if (!track) {
          throw new Error("No audio track.");
        }
        isMicMuted = false;
        track.enabled = true;
        await applyVoiceConstraints();
        await attachAudioTrack(track);
        if (localVad) {
          stopVad(localVad);
        }
        localVad = startVad(localStream, localTile, () => !isMicMuted);
        updateCallButtons();
      } catch (error) {
        addSystemMessage("Microphone access denied.");
        isMicMuted = true;
        updateCallButtons();
      }
    })();
    return;
  }
  isMicMuted = true;
  applyMicState();
  if (localVad) {
    stopVad(localVad);
    localVad = null;
  }
  updateCallButtons();
});

camToggle.addEventListener("click", async () => {
  if (!isInCall) {
    return;
  }
  if (isCameraEnabled) {
    if (cameraTrack && localStream) {
      localStream.removeTrack(cameraTrack);
    }
    if (cameraTrack) {
      cameraTrack.stop();
      cameraTrack = null;
    }
    isCameraEnabled = false;
    if (!isSharingScreen) {
      await clearVideoTrack();
    }
    updateLocalVideoPreview();
    updateCallButtons();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    cameraTrack = stream.getVideoTracks()[0];
    if (!localStream) {
      localStream = new MediaStream();
    }
    localStream.addTrack(cameraTrack);
    isCameraEnabled = true;
    if (peerConnection && !isSharingScreen) {
      await attachVideoTrack(cameraTrack);
    }
    cameraTrack.onended = () => {
      if (!isCameraEnabled) {
        return;
      }
      isCameraEnabled = false;
      cameraTrack = null;
      if (!isSharingScreen) {
        clearVideoTrack();
      }
      updateLocalVideoPreview();
      updateCallButtons();
    };
    updateLocalVideoPreview();
    updateCallButtons();
  } catch (error) {
    addSystemMessage("Camera access denied.");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (editTarget) {
    if (!text) {
      return;
    }
    socket.emit("edit_message", { messageId: editTarget.id, text });
    clearEditTarget();
    emitTyping(false);
    input.value = "";
    input.focus();
    return;
  }
  if (!text) {
    return;
  }
  socket.emit("message", {
    text,
    replyTo: replyTarget ? { id: replyTarget.id } : null,
  });
  emitTyping(false);
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
  emitTyping(false);
  setTypingIndicator([]);
});

socket.on("auth_ok", (payload) => {
  currentUser = payload?.username || "";
  closeOverlay();
  setJoinError("");
  closeGifPanel();
  closeEmojiPanel();
  setUploadError("");
  clearReplyTarget();
  clearEditTarget();
  updateCallButtons();
  updateLocalIdentity();
  if (notifyEnabled) {
    syncPushSubscription();
  }
});

socket.on("auth_error", (message) => {
  currentUser = "";
  setJoinError(message || "Incorrect password.");
  passwordInput.value = "";
  clearReplyTarget();
  clearEditTarget();
  openOverlay();
});

socket.on("message_error", (message) => {
  if (message) {
    addSystemMessage(message);
  }
});

socket.on("webrtc_offer", async (payload) => {
  if (!currentUser || !payload?.offer) {
    return;
  }
  try {
    updateRemotePeer(payload.from);
    if (callRole === "caller") {
      return;
    }
    await createPeerConnection();
    await peerConnection.setRemoteDescription(payload.offer);
    if (payload.offer.type === "offer") {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("webrtc_answer", {
        answer: peerConnection.localDescription,
        to: payload.from,
      });
    }
    if (!isInCall) {
      isInCall = true;
      isMicMuted = true;
      isCameraEnabled = false;
      callRole = "callee";
    }
    showCallPanel();
    updateLocalVideoPreview();
    updateCallButtons();
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
    if (callRole !== "caller") {
      return;
    }
    updateRemotePeer(payload.from);
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
    updateRemotePeer(payload.from);
    await peerConnection.addIceCandidate(payload.candidate);
  } catch (error) {
    addSystemMessage("Call connection issue.");
  }
});

socket.on("webrtc_hangup", () => {
  endCall(false);
});

socket.on("call_joined", async (payload) => {
  callRole = payload?.role || "caller";
  updateRemotePeer(payload?.peerId);
  updateRemoteIdentity(payload);
  if (isInCall) {
    return;
  }
  isInCall = true;
  callConnected = false;
  isMicMuted = true;
  isCameraEnabled = false;
  try {
    await createPeerConnection();
  } catch (error) {
    addSystemMessage("Call setup failed.");
    endCall(false);
    return;
  }
  hideCallBanner();
  showCallPanel();
  updateLocalVideoPreview();
  updateCallButtons();
  updateCallStatus();
  if (callRole === "caller" && remotePeerId) {
    await negotiate();
  }
});

socket.on("call_peer", async (payload) => {
  updateRemotePeer(payload?.peerId);
  updateRemoteIdentity(payload);
  callConnected = false;
  updateCallStatus();
  if (callRole === "caller") {
    await negotiate();
  }
});

socket.on("call_started", (payload) => {
  const name = payload?.user || "Someone";
  bannerDismissed = false;
  showCallBanner(`${name} started a call. Click Join Call to connect.`);
});

socket.on("call_connected", (payload) => {
  updateRemoteIdentity(payload);
  callConnected = true;
  updateCallStatus();
});

socket.on("call_peer_update", (payload) => {
  updateRemoteIdentity(payload);
});

socket.on("call_status", (payload) => {
  if (payload?.active) {
    const name = payload?.user || "Someone";
    showCallBanner(`${name} started a call. Click Join Call to connect.`);
  }
});

socket.on("call_busy", () => {
  addSystemMessage("Call is full. Try again later.");
});

socket.on("call_peer_left", () => {
  endCall(false);
  clearRemoteIdentity();
});

socket.on("call_ended", () => {
  if (!isInCall) {
    hideCallBanner();
  }
});

socket.on("call_negotiate", async () => {
  if (callRole === "caller") {
    await negotiate();
  }
});

socket.on("history", (messages) => {
  messagesList.innerHTML = "";
  messagesById.clear();
  if (!messages.length) {
    addSystemMessage("No messages yet. Start the conversation!");
    return;
  }
  messages.forEach(addChatMessage);
  scrollToBottom();
  resetUnread();
});

socket.on("message", (message) => {
  addChatMessage(message);
  if (message.user !== currentUser) {
    notifyTab({ user: message.user, preview: getMessagePreview(message) });
  }
});

socket.on("message_update", (message) => {
  updateMessageElement(message);
});

socket.on("reaction_update", (payload) => {
  if (!payload?.messageId) {
    return;
  }
  updateMessageReactions(payload.messageId, payload.reactions);
});

socket.on("presence_update", (payload) => {
  updatePresence(payload);
});

socket.on("typing_update", (payload) => {
  setTypingIndicator(payload?.users || []);
});

socket.on("system", (text) => {
  addSystemMessage(text);
});

updateCallButtons();
hideCallPanel();
soundEnabled = loadSetting("soundEnabled");
notifyEnabled = loadSetting("notifyEnabled");
try {
  currentAvatarUrl = sanitizeAvatarUrl(localStorage.getItem("avatarUrl"));
} catch (error) {
  currentAvatarUrl = "";
}
try {
  const storedVoice = localStorage.getItem("voiceIsolationEnabled");
  voiceIsolationEnabled = storedVoice === null ? true : storedVoice === "true";
} catch (error) {
  voiceIsolationEnabled = true;
}
if (notifyEnabled && Notification.permission !== "granted") {
  notifyEnabled = false;
  saveSetting("notifyEnabled", notifyEnabled);
}
updateSoundButton();
updateNotifyButton();
updateVoiceButton();
updateTitle();
updateLocalIdentity();
if (pushSupported) {
  registerServiceWorker();
}
if (notifyEnabled) {
  syncPushSubscription();
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetUnread();
  }
});
window.addEventListener("focus", () => {
  resetUnread();
});
openOverlay();
