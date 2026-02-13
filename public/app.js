const socket = io();

const messagesList = document.getElementById("messages");
const chatScroll = document.getElementById("chat-scroll");
const jumpLatestButton = document.getElementById("jump-latest");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const statusPill = document.getElementById("connection-status");
const overlay = document.getElementById("join-overlay");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const joinError = document.getElementById("join-error");
const replyBanner = document.getElementById("reply-banner");
const replyText = document.getElementById("reply-text");
const replyCancel = document.getElementById("reply-cancel");
const editBanner = document.getElementById("edit-banner");
const editText = document.getElementById("edit-text");
const editCancel = document.getElementById("edit-cancel");
const themeToggle = document.getElementById("theme-toggle");
const attachButton = document.getElementById("attach-button");
const fileInput = document.getElementById("file-input");
const composerError = document.getElementById("composer-error");
const callStartButton = document.getElementById("call-start");
const callEndButton = document.getElementById("call-end");
const callJoinButton = document.getElementById("call-join");
const callDismissButton = document.getElementById("call-dismiss");
const callBanner = document.getElementById("call-banner");
const callBannerText = document.getElementById("call-banner-text");
const callPanel = document.getElementById("call-panel");
const callStatus = document.getElementById("call-status");
const callQuality = document.getElementById("call-quality");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const remoteAudio = document.getElementById("remote-audio");
const localPlaceholder = document.getElementById("local-placeholder");
const remotePlaceholder = document.getElementById("remote-placeholder");
const localStatus = document.getElementById("local-status");
const remoteStatus = document.getElementById("remote-status");
const toggleMicButton = document.getElementById("toggle-mic");
const toggleCamButton = document.getElementById("toggle-cam");
const toggleShareButton = document.getElementById("toggle-share");
const localLabel = document.getElementById("local-label");
const remoteLabel = document.getElementById("remote-label");

let currentUser = "";
let isInCall = false;
let callRole = null;
let remotePeerId = null;
let peer = null;
let localStream = null;
let remoteStream = null;
let isMicMuted = true;
let isCameraOn = false;
let isScreenSharing = false;
let pendingSignals = [];
let reconnectAttempts = 0;
let reconnectTimer = null;
let silentStream = null;
let restoreCameraAfterShare = false;
let audioContextReady = false;
let hasTurnServer = false;
let restartInProgress = false;
let lastStateChangeAt = 0;
let connectionWatchdog = null;
let callSessionId = null;
let iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];
const maxReconnectAttempts = 3;
let isAtBottom = true;
let replyTarget = null;
let editTargetId = null;
const emojiOptions = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

const setStatus = (label, type) => {
  statusPill.textContent = label;
  statusPill.classList.remove("status-ok", "status-offline");
  if (type) {
    statusPill.classList.add(type);
  }
};

const setCallStatus = (text) => {
  if (callStatus) {
    callStatus.textContent = text;
  }
};

const setCallQuality = (text) => {
  if (callQuality) {
    callQuality.textContent = text;
  }
};

const showCallPanel = (show) => {
  if (!callPanel) return;
  callPanel.classList.toggle("hidden", !show);
};

const showCallBanner = (show, text) => {
  if (!callBanner) return;
  callBanner.classList.toggle("hidden", !show);
  if (text && callBannerText) {
    callBannerText.textContent = text;
  }
};

const updateCallButtons = () => {
  if (callStartButton) {
    callStartButton.disabled = isInCall;
  }
  if (callEndButton) {
    callEndButton.disabled = !isInCall;
  }
  if (toggleMicButton) {
    toggleMicButton.disabled = !isInCall;
  }
  if (toggleCamButton) {
    toggleCamButton.disabled = !isInCall;
  }
  if (toggleShareButton) {
    toggleShareButton.disabled = !isInCall;
  }
};

const ensureAudioPlayback = async () => {
  if (!remoteAudio || !remoteAudio.srcObject) return;
  try {
    await remoteAudio.play();
  } catch (err) {
    // Autoplay might require a gesture; it will retry on user actions.
  }
};

const updateLocalVideo = () => {
  const hasVideo = localStream && localStream.getVideoTracks().length > 0;
  if (hasVideo && localVideo) {
    localVideo.srcObject = localStream;
    localVideo.classList.remove("hidden");
    if (localPlaceholder) localPlaceholder.classList.add("hidden");
  } else {
    if (localVideo) {
      localVideo.srcObject = null;
      localVideo.classList.add("hidden");
    }
    if (localPlaceholder) localPlaceholder.classList.remove("hidden");
  }
  if (localStatus) {
    const micLabel = isMicMuted ? "Mic muted" : "Mic on";
    const camLabel = isScreenSharing ? "Sharing screen" : isCameraOn ? "Camera on" : "Camera off";
    localStatus.textContent = `${micLabel} • ${camLabel}`;
  }
};

const updateRemoteVideo = () => {
  const hasVideo = remoteStream && remoteStream.getVideoTracks().length > 0;
  if (hasVideo && remoteVideo) {
    remoteVideo.srcObject = remoteStream;
    remoteVideo.classList.remove("hidden");
    if (remotePlaceholder) remotePlaceholder.classList.add("hidden");
  } else {
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideo.classList.add("hidden");
    }
    if (remotePlaceholder) remotePlaceholder.classList.remove("hidden");
  }
};

const loadIceServers = async () => {
  try {
    const response = await fetch("/api/ice");
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
      iceServers = data.iceServers;
      hasTurnServer = data.iceServers.some((server) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        return urls.some((url) => typeof url === "string" && url.startsWith("turn"));
      });
      if (!hasTurnServer) {
        setCallQuality("Quality: limited (no TURN)");
      }
    }
  } catch (err) {
    // Keep defaults on failure.
  }
};

const prepareAudioContext = () => {
  if (audioContextReady) return;
  audioContextReady = true;
  if (silentStream) return;
  try {
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    const track = destination.stream.getAudioTracks()[0];
    track.enabled = false;
    silentStream = destination.stream;
  } catch (err) {
    silentStream = null;
  }
};

const flushPendingSignals = () => {
  if (!socket || !remotePeerId) return;
  if (!pendingSignals.length) return;
  pendingSignals.forEach((entry) => {
    if (!callSessionId || !entry?.sessionId || entry.sessionId === callSessionId) {
      socket.emit("webrtc_signal", {
        signal: entry.signal || entry,
        to: remotePeerId,
        sessionId: callSessionId,
      });
    }
  });
  pendingSignals = [];
};

const destroyPeer = () => {
  if (peer) {
    try {
      peer.destroy();
    } catch (err) {
      // ignore
    }
  }
  peer = null;
  pendingSignals = [];
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
};

const scheduleReconnect = (reason) => {
  if (!isInCall || !remotePeerId) return;
  if (reconnectTimer || restartInProgress) return;
  if (reconnectAttempts >= maxReconnectAttempts) {
    setCallStatus("Connection failed");
    return;
  }
  restartInProgress = true;
  reconnectAttempts += 1;
  setCallStatus(`Reconnecting (${reconnectAttempts})`);
  if (callRole !== "caller") {
    destroyPeer();
    if (socket) {
      socket.emit("call_restart", { to: remotePeerId });
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!isInCall) {
        restartInProgress = false;
        return;
      }
      if (!peer) {
        ensurePeer(false);
        flushPendingSignals();
      }
      restartInProgress = false;
    }, 4000);
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!isInCall) {
      restartInProgress = false;
      return;
    }
    destroyPeer();
    if (socket) {
      socket.emit("call_restart", { to: remotePeerId });
    }
    ensurePeer(true);
    flushPendingSignals();
    restartInProgress = false;
  }, 1000 * reconnectAttempts);
};

const attachPeerListeners = (pc) => {
  if (!pc) return;
  pc.addEventListener("iceconnectionstatechange", () => {
    const state = pc.iceConnectionState;
    lastStateChangeAt = Date.now();
    if (state === "connected" || state === "completed") {
      setCallStatus("Connected");
      setCallQuality(hasTurnServer ? "Quality: good" : "Quality: limited (no TURN)");
      reconnectAttempts = 0;
      restartInProgress = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    } else if (state === "disconnected") {
      setCallStatus("Reconnecting...");
      scheduleReconnect("disconnected");
    } else if (state === "failed") {
      setCallStatus("Connection failed");
      scheduleReconnect("failed");
    }
  });
  pc.addEventListener("connectionstatechange", () => {
    const state = pc.connectionState;
    lastStateChangeAt = Date.now();
    if (state === "connected") {
      setCallStatus("Connected");
      restartInProgress = false;
    } else if (state === "disconnected") {
      setCallStatus("Reconnecting...");
    } else if (state === "failed") {
      scheduleReconnect("failed");
    }
  });
};

const ensurePeer = (initiator) => {
  if (peer) return peer;
  if (!window.SimplePeer) {
    setCallStatus("Call unavailable");
    return null;
  }
  if (silentStream && silentStream.getAudioTracks) {
    const tracks = silentStream.getAudioTracks();
    if (!tracks.length || tracks.some((track) => track.readyState === "ended")) {
      silentStream = null;
    }
  }
  const streamToUse =
    localStream && localStream.getTracks().length > 0
      ? localStream
      : silentStream || undefined;

  peer = new window.SimplePeer({
    initiator: Boolean(initiator),
    trickle: true,
    stream: streamToUse,
    config: {
      iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: hasTurnServer ? "relay" : "all",
    },
    sdpTransform: (sdp) => sdp.replace(/a=extmap-allow-mixed\r\n/g, ""),
  });

  peer.on("signal", (signal) => {
    if (remotePeerId && socket) {
      socket.emit("webrtc_signal", { signal, to: remotePeerId, sessionId: callSessionId });
    } else {
      pendingSignals.push({ signal, sessionId: callSessionId });
    }
  });

  peer.on("connect", () => {
    setCallStatus("Connected");
    reconnectAttempts = 0;
    restartInProgress = false;
    lastStateChangeAt = Date.now();
  });

  peer.on("stream", (stream) => {
    remoteStream = stream;
    if (remoteAudio) {
      remoteAudio.srcObject = stream;
      remoteAudio.muted = false;
      remoteAudio.volume = 1;
      ensureAudioPlayback();
    }
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
    updateRemoteVideo();
    if (remoteStatus) {
      remoteStatus.textContent = "Connected";
    }
  });

  peer.on("track", (track, stream) => {
    remoteStream = stream;
    updateRemoteVideo();
    if (remoteAudio && track.kind === "audio") {
      remoteAudio.srcObject = stream;
      remoteAudio.muted = false;
      remoteAudio.volume = 1;
      ensureAudioPlayback();
    }
  });

  peer.on("close", () => {
    if (isInCall) {
      setCallStatus("Reconnecting...");
      lastStateChangeAt = Date.now();
      scheduleReconnect("close");
    }
  });

  peer.on("error", () => {
    if (isInCall) {
      lastStateChangeAt = Date.now();
      scheduleReconnect("error");
    }
  });

  if (peer._pc) {
    attachPeerListeners(peer._pc);
  }

  return peer;
};

const mergeTracks = (sourceStream) => {
  if (!sourceStream) return;
  if (!localStream) {
    localStream = new MediaStream();
  }
  sourceStream.getTracks().forEach((track) => {
    localStream.addTrack(track);
    if (peer && peer.addTrack) {
      try {
        peer.addTrack(track, localStream);
      } catch (err) {
        // ignore duplicate track errors
      }
    }
  });
  if (peer && peer.negotiate && callRole !== "caller") {
    setTimeout(() => {
      try {
        peer.negotiate();
      } catch (err) {
        // ignore
      }
    }, 100);
  }
  updateLocalVideo();
};

const replaceVideoTrack = (newTrack) => {
  if (!localStream) {
    localStream = new MediaStream();
  }
  const existingTrack = localStream.getVideoTracks()[0];
  if (existingTrack) {
    localStream.removeTrack(existingTrack);
    existingTrack.stop();
  }
  if (newTrack) {
    localStream.addTrack(newTrack);
  }
  if (peer && peer.replaceTrack) {
    try {
      peer.replaceTrack(existingTrack, newTrack, localStream);
    } catch (err) {
      // ignore
    }
  } else if (peer && newTrack) {
    try {
      peer.addTrack(newTrack, localStream);
    } catch (err) {
      // ignore
    }
  }
  if (peer && peer.negotiate && callRole !== "caller") {
    setTimeout(() => {
      try {
        peer.negotiate();
      } catch (err) {
        // ignore
      }
    }, 100);
  }
  updateLocalVideo();
};

const toggleMic = async () => {
  if (!isInCall) return;
  prepareAudioContext();
  if (isMicMuted) {
    const existing = localStream?.getAudioTracks()[0];
    if (existing) {
      existing.enabled = true;
      isMicMuted = false;
      if (toggleMicButton) toggleMicButton.classList.add("primary");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        mergeTracks(stream);
        isMicMuted = false;
        if (toggleMicButton) toggleMicButton.classList.add("primary");
      } catch (err) {
        alert("Microphone permission denied.");
      }
    }
  } else {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    isMicMuted = true;
    if (toggleMicButton) toggleMicButton.classList.remove("primary");
  }
  updateLocalVideo();
};

const enableCamera = async () => {
  prepareAudioContext();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    const videoTrack = stream.getVideoTracks()[0];
    isCameraOn = true;
    replaceVideoTrack(videoTrack);
    if (toggleCamButton) toggleCamButton.classList.add("primary");
    return true;
  } catch (err) {
    alert("Camera permission denied.");
    return false;
  }
};

const disableCamera = () => {
  isCameraOn = false;
  replaceVideoTrack(null);
  if (toggleCamButton) toggleCamButton.classList.remove("primary");
};

const toggleCamera = async () => {
  if (!isInCall) return;
  if (!isCameraOn) {
    await enableCamera();
  } else {
    isScreenSharing = false;
    if (toggleShareButton) toggleShareButton.classList.remove("primary");
    disableCamera();
  }
};

const toggleScreenShare = async () => {
  if (!isInCall) return;
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Screen sharing is not supported on this device.");
    return;
  }
  if (!isScreenSharing) {
    try {
      restoreCameraAfterShare = isCameraOn;
      if (restoreCameraAfterShare) {
        disableCamera();
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const screenTrack = stream.getVideoTracks()[0];
      replaceVideoTrack(screenTrack);
      screenTrack.onended = () => {
        isScreenSharing = false;
        if (toggleShareButton) toggleShareButton.classList.remove("primary");
        if (restoreCameraAfterShare) {
          restoreCameraAfterShare = false;
          enableCamera();
        } else {
          replaceVideoTrack(null);
        }
        updateLocalVideo();
      };
      isScreenSharing = true;
      if (toggleShareButton) toggleShareButton.classList.add("primary");
      updateLocalVideo();
    } catch (err) {
      alert("Screen share was blocked.");
    }
  } else {
    isScreenSharing = false;
    if (toggleShareButton) toggleShareButton.classList.remove("primary");
    if (restoreCameraAfterShare) {
      restoreCameraAfterShare = false;
      enableCamera();
    } else {
      replaceVideoTrack(null);
    }
    updateLocalVideo();
  }
};

const startCall = () => {
  if (!socket) return;
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  prepareAudioContext();
  loadIceServers();
  socket.emit("call_join");
  ensureAudioPlayback();
};

const endCall = () => {
  if (socket) {
    socket.emit("call_leave");
    socket.emit("webrtc_hangup");
  }
  isInCall = false;
  callRole = null;
  remotePeerId = null;
  destroyPeer();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  localStream = null;
  remoteStream = null;
  isMicMuted = true;
  isCameraOn = false;
  isScreenSharing = false;
  callSessionId = null;
  updateLocalVideo();
  updateRemoteVideo();
  if (remoteStatus) remoteStatus.textContent = "Waiting for peer";
  setCallStatus("Call idle");
  setCallQuality("Quality: -");
  showCallBanner(false);
  if (remoteLabel) remoteLabel.textContent = "Remote";
  showCallPanel(false);
  updateCallButtons();
  if (connectionWatchdog) {
    clearInterval(connectionWatchdog);
    connectionWatchdog = null;
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
  if (!chatScroll) return;
  chatScroll.scrollTop = chatScroll.scrollHeight;
  updateScrollState();
};

const updateScrollState = () => {
  if (!chatScroll || !jumpLatestButton) return;
  const distance = chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight;
  isAtBottom = distance < 140;
  jumpLatestButton.classList.toggle("hidden", isAtBottom);
};

const updateReplyBanner = () => {
  if (!replyBanner) return;
  if (!replyTarget) {
    replyBanner.classList.add("hidden");
    return;
  }
  replyBanner.classList.remove("hidden");
  if (replyText) {
    replyText.textContent = `${replyTarget.user}: ${replyTarget.text || ""}`.slice(0, 80);
  }
};

const updateEditBanner = () => {
  if (!editBanner) return;
  if (!editTargetId) {
    editBanner.classList.add("hidden");
    return;
  }
  editBanner.classList.remove("hidden");
  if (editText) {
    const message = messagesById.get(editTargetId);
    editText.textContent = message?.text?.slice(0, 80) || "message";
  }
};

const clearReplyTarget = () => {
  replyTarget = null;
  updateReplyBanner();
};

const clearEditTarget = () => {
  editTargetId = null;
  updateEditBanner();
};

const showComposerError = (message) => {
  if (!composerError) return;
  composerError.textContent = message || "";
};

const addSystemMessage = (text) => {
  const item = document.createElement("li");
  item.className = "message system";
  item.textContent = text;
  messagesList.appendChild(item);
  scrollToBottom();
};

const messagesById = new Map();

const addChatMessage = (message) => {
  messagesById.set(message.id, message);
  const item = document.createElement("li");
  item.className = "message";
  item.dataset.id = message.id;
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

  item.appendChild(meta);

  if (message.replyTo) {
    const reply = document.createElement("div");
    reply.className = "reply-preview";
    reply.innerHTML = `<strong>${message.replyTo.user}</strong> ${message.replyTo.text}`;
    item.appendChild(reply);
  }

  if (message.deleted) {
    const deleted = document.createElement("p");
    deleted.className = "message-text";
    deleted.textContent = "(message deleted)";
    item.appendChild(deleted);
  } else if (message.type === "file" && message.file?.url) {
    const media = document.createElement("div");
    media.className = "message-media";
    if (message.file.kind === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.src = message.file.url;
      media.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = message.file.url;
      img.alt = message.file.name || "attachment";
      media.appendChild(img);
    }
    item.appendChild(media);
  } else {
    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = message.text;
    item.appendChild(text);
  }

  if (message.edited) {
    const edited = document.createElement("span");
    edited.className = "edited-label";
    edited.textContent = "(edited)";
    meta.appendChild(edited);
  }

  const actions = document.createElement("div");
  actions.className = "message-actions";

  if (!message.deleted) {
    const replyButton = document.createElement("button");
    replyButton.className = "action-button";
    replyButton.textContent = "Reply";
    replyButton.addEventListener("click", (event) => {
      event.stopPropagation();
      replyTarget = { id: message.id, user: message.user, text: message.text };
      updateReplyBanner();
      input.focus();
      item.classList.remove("open");
    });
    actions.appendChild(replyButton);

    if (message.senderId === socket.id) {
      const editButton = document.createElement("button");
      editButton.className = "action-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        editTargetId = message.id;
        input.value = message.text || "";
        updateEditBanner();
        input.focus();
        item.classList.remove("open");
      });
      actions.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "action-button danger";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        socket.emit("delete_message", { messageId: message.id });
        item.classList.remove("open");
      });
      actions.appendChild(deleteButton);
    }
  }

  const reactionBar = document.createElement("div");
  reactionBar.className = "reaction-bar";
  const picker = document.createElement("div");
  picker.className = "reaction-picker";

  if (!message.deleted) {
    if (message.reactions) {
      Object.entries(message.reactions).forEach(([emoji, users]) => {
        const button = document.createElement("button");
        button.className = "reaction-button";
        if (Array.isArray(users) && users.includes(currentUser)) {
          button.classList.add("active");
        }
        button.textContent = `${emoji} ${users.length}`;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          socket.emit("react", { messageId: message.id, emoji });
        });
        reactionBar.appendChild(button);
      });
    }

    emojiOptions.forEach((emoji) => {
      const button = document.createElement("button");
      button.textContent = emoji;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        socket.emit("react", { messageId: message.id, emoji });
        item.classList.remove("open");
      });
      picker.appendChild(button);
    });
  }

  item.addEventListener("click", () => {
    const alreadyOpen = item.classList.contains("open");
    document.querySelectorAll(".message.open").forEach((node) => node.classList.remove("open"));
    if (!alreadyOpen && !message.deleted) {
      item.classList.add("open");
    }
  });

  item.appendChild(actions);
  item.appendChild(reactionBar);
  item.appendChild(picker);
  messagesList.appendChild(item);
  if (isAtBottom) {
    scrollToBottom();
  } else if (jumpLatestButton) {
    jumpLatestButton.classList.remove("hidden");
  }
};

const upsertMessage = (message) => {
  if (!message?.id) return;
  messagesById.set(message.id, message);
  const existing = messagesList.querySelector(`.message[data-id="${message.id}"]`);
  if (existing) {
    existing.remove();
  }
  addChatMessage(message);
};

const setJoinError = (message) => {
  joinError.textContent = message;
  joinError.style.display = message ? "block" : "none";
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!currentUser) {
    setJoinError("Enter name and password to join.");
    openOverlay();
    return;
  }
  if (editTargetId) {
    if (text) {
      socket.emit("edit_message", { messageId: editTargetId, text });
      clearEditTarget();
    }
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
  clearReplyTarget();
  input.value = "";
  input.focus();
});

if (replyCancel) {
  replyCancel.addEventListener("click", clearReplyTarget);
}
if (editCancel) {
  editCancel.addEventListener("click", clearEditTarget);
}
if (jumpLatestButton) {
  jumpLatestButton.addEventListener("click", () => {
    scrollToBottom();
    updateScrollState();
  });
}
if (chatScroll) {
  chatScroll.addEventListener("scroll", updateScrollState);
}

if (attachButton && fileInput) {
  attachButton.addEventListener("click", () => {
    fileInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showComposerError("Only images or videos are allowed.");
      fileInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (!url.startsWith("data:") || url.length > 4_500_000) {
        showComposerError("Attachment too large.");
        fileInput.value = "";
        return;
      }
      socket.emit("message", {
        type: "file",
        file: {
          url,
          name: file.name || "attachment",
          mime: file.type,
          kind: file.type.startsWith("video/") ? "video" : "image",
        },
        replyTo: replyTarget ? { id: replyTarget.id } : null,
      });
      clearReplyTarget();
      fileInput.value = "";
      showComposerError("");
    };
    reader.readAsDataURL(file);
  });
}

if (input) {
  input.addEventListener("input", () => showComposerError(""));
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".message")) {
    document.querySelectorAll(".message.open").forEach((node) => node.classList.remove("open"));
  }
});

if (callStartButton) {
  callStartButton.addEventListener("click", startCall);
}
if (callEndButton) {
  callEndButton.addEventListener("click", endCall);
}
if (callJoinButton) {
  callJoinButton.addEventListener("click", () => {
    showCallBanner(false);
    prepareAudioContext();
    startCall();
  });
}
if (callDismissButton) {
  callDismissButton.addEventListener("click", () => showCallBanner(false));
}
if (toggleMicButton) {
  toggleMicButton.addEventListener("click", toggleMic);
}
if (toggleCamButton) {
  toggleCamButton.addEventListener("click", toggleCamera);
}
if (toggleShareButton) {
  toggleShareButton.addEventListener("click", toggleScreenShare);
}

if (toggleShareButton && !navigator.mediaDevices?.getDisplayMedia) {
  toggleShareButton.disabled = true;
  toggleShareButton.title = "Screen sharing not supported on this device.";
}

window.addEventListener("beforeunload", () => {
  if (socket && isInCall) {
    socket.emit("call_leave");
  }
});

loadIceServers();
updateCallButtons();

socket.on("connect", () => {
  setStatus("Connected", "status-ok");
});

socket.on("disconnect", () => {
  setStatus("Offline", "status-offline");
  if (isInCall) {
    setCallStatus("Disconnected");
  }
});

const applyTheme = (theme) => {
  if (theme === "dark") {
    document.body.classList.add("theme-dark");
    if (themeToggle) themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("theme-dark");
    if (themeToggle) themeToggle.textContent = "Dark mode";
  }
};

const readStoredTheme = () => {
  try {
    return localStorage.getItem("theme");
  } catch (err) {
    return null;
  }
};

const writeStoredTheme = (value) => {
  try {
    localStorage.setItem("theme", value);
  } catch (err) {
    // ignore
  }
};

const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = readStoredTheme() || (prefersDark ? "dark" : "light");
applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
    writeStoredTheme(nextTheme);
    applyTheme(nextTheme);
  });
}

socket.on("auth_ok", (payload) => {
  currentUser = payload?.username || "";
  if (localLabel) {
    localLabel.textContent = currentUser || "You";
  }
  closeOverlay();
  setJoinError("");
  if (messagesById.size) {
    messagesById.forEach((message) => upsertMessage(message));
  }
});

socket.on("auth_error", (message) => {
  currentUser = "";
  setJoinError(message || "Incorrect password.");
  passwordInput.value = "";
  openOverlay();
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
  updateScrollState();
});

socket.on("message", (message) => {
  addChatMessage(message);
});

socket.on("message_update", (message) => {
  upsertMessage(message);
});

socket.on("reaction_update", (payload) => {
  const message = messagesById.get(payload?.messageId);
  if (!message) return;
  message.reactions = payload.reactions || {};
  upsertMessage(message);
});

socket.on("system", (text) => {
  addSystemMessage(text);
});

socket.on("call_started", (payload) => {
  if (isInCall) return;
  const name = payload?.user || "Someone";
  showCallBanner(true, `${name} started a call.`);
});

socket.on("call_status", (payload) => {
  if (isInCall) return;
  if (payload?.active) {
    const name = payload?.user || "Someone";
    showCallBanner(true, `${name} started a call.`);
  }
});

socket.on("call_busy", () => {
  alert("Call is busy. Try again later.");
});

socket.on("call_joined", (payload) => {
  isInCall = true;
  restartInProgress = false;
  callRole = payload?.role || "caller";
  remotePeerId = payload?.peerId || null;
  callSessionId = payload?.sessionId || callSessionId;
  showCallPanel(true);
  showCallBanner(false);
  lastStateChangeAt = Date.now();
  if (remoteLabel) {
    remoteLabel.textContent = payload?.peerName || "Remote";
  }
  setCallStatus(remotePeerId ? "Connecting..." : "Waiting for peer");
  if (remoteStatus) {
    remoteStatus.textContent = remotePeerId ? "Connecting..." : "Waiting for peer";
  }
  updateCallButtons();
  if (remotePeerId) {
    ensurePeer(callRole === "caller");
    flushPendingSignals();
  }
  ensureAudioPlayback();
  if (!connectionWatchdog) {
    connectionWatchdog = setInterval(() => {
      if (!isInCall || !remotePeerId) return;
      if (Date.now() - lastStateChangeAt > 15000) {
        scheduleReconnect("timeout");
      }
    }, 5000);
  }
});

socket.on("call_peer", (payload) => {
  remotePeerId = payload?.peerId || remotePeerId;
  restartInProgress = false;
  lastStateChangeAt = Date.now();
  callSessionId = payload?.sessionId || callSessionId;
  if (remoteLabel) {
    remoteLabel.textContent = payload?.peerName || "Remote";
  }
  if (remoteStatus) {
    remoteStatus.textContent = "Connecting...";
  }
  setCallStatus("Connecting...");
  if (isInCall) {
    ensurePeer(callRole === "caller");
    flushPendingSignals();
  }
});

socket.on("call_connected", (payload) => {
  remotePeerId = payload?.peerId || remotePeerId;
  restartInProgress = false;
  lastStateChangeAt = Date.now();
  callSessionId = payload?.sessionId || callSessionId;
  if (remoteLabel) {
    remoteLabel.textContent = payload?.peerName || "Remote";
  }
  if (remoteStatus) {
    remoteStatus.textContent = "Connected";
  }
  setCallStatus("Connected");
});

socket.on("call_peer_left", () => {
  endCall();
});

socket.on("call_ended", () => {
  if (!isInCall) {
    showCallBanner(false);
  }
});

socket.on("call_restart", (payload) => {
  if (!isInCall) return;
  restartInProgress = false;
  if (payload?.sessionId) {
    callSessionId = payload.sessionId;
    pendingSignals = [];
  }
  destroyPeer();
  ensurePeer(callRole === "caller");
  flushPendingSignals();
});

socket.on("webrtc_signal", (payload) => {
  if (!payload?.signal) return;
  if (payload?.sessionId) {
    if (!callSessionId) {
      callSessionId = payload.sessionId;
    } else if (payload.sessionId !== callSessionId) {
      return;
    }
  }
  if (!peer) {
    pendingSignals.push({ signal: payload.signal, sessionId: payload.sessionId || callSessionId });
    if (isInCall && remotePeerId) {
      ensurePeer(callRole === "caller");
    }
    return;
  }
  try {
    peer.signal(payload.signal);
  } catch (err) {
    // ignore bad signal
  }
});

socket.on("webrtc_hangup", () => {
  endCall();
});

openOverlay();
