// Browser compatibility utilities for WebRTC

export const checkWebRTCSupport = () => {
  const support = {
    webrtc: !!(
      window.RTCPeerConnection ||
      window.webkitRTCPeerConnection ||
      window.mozRTCPeerConnection
    ),
    getUserMedia: !!(
      navigator.mediaDevices?.getUserMedia ||
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia
    ),
    getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
    simplePeer: !!window.SimplePeer,
  };

  return support;
};

export const getBrowserName = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('edg')) return 'edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'opera';
  return 'unknown';
};

export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const getOptimalConstraints = (audio = true, video = false) => {
  const browser = getBrowserName();
  const mobile = isMobile();

  const baseConstraints = {
    audio: audio ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } : false,
    video: video ? {
      width: { ideal: mobile ? 640 : 1280 },
      height: { ideal: mobile ? 360 : 720 },
      frameRate: { ideal: mobile ? 15 : 30 },
    } : false,
  };

  // Safari-specific optimizations
  if (browser === 'safari') {
    if (baseConstraints.audio) {
      baseConstraints.audio.echoCancellation = true;
      baseConstraints.audio.noiseSuppression = true;
    }
    if (baseConstraints.video) {
      baseConstraints.video.facingMode = 'user';
    }
  }

  // Firefox-specific
  if (browser === 'firefox') {
    if (baseConstraints.video) {
      baseConstraints.video.width = { ideal: 1280 };
      baseConstraints.video.height = { ideal: 720 };
    }
  }

  return baseConstraints;
};

export const ensureAudioPlayback = async (audioElement) => {
  if (!audioElement) return false;
  
  try {
    audioElement.muted = false;
    await audioElement.play();
    return true;
  } catch (err) {
    console.warn('[Browser] Audio autoplay blocked, user interaction required');
    // Create a silent audio context to unlock audio
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.01);
      return false;
    } catch (e) {
      return false;
    }
  }
};
