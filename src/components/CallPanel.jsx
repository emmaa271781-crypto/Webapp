import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWebRTC } from '../hooks/useWebRTC';
import './CallPanel.css';

function CallPanel({
  currentUser,
  currentAvatar,
  remoteProfile,
  callRole,
  callConnected,
  remotePeerId,
  socket,
  isInCall,
  onEnd,
}) {
  const {
    localStream,
    remoteStream,
    isMicMuted,
    isCameraEnabled,
    isScreenSharing,
    connectionState,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTC(socket, isInCall, callRole, remotePeerId, onEnd);

  useEffect(() => {
    // Ensure remote audio plays
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.play().catch(err => {
        console.warn('[CallPanel] Audio autoplay blocked:', err);
      });
    }
  }, [remoteStream]);

  const getStatusText = () => {
    if (connectionState === 'connected') return 'Connected';
    if (connectionState === 'connecting') return 'Connecting...';
    if (connectionState === 'error') return 'Connection Error';
    return 'Disconnected';
  };

  const getLocalStatus = () => {
    const parts = [];
    parts.push(isMicMuted ? 'Mic muted' : 'Mic on');
    if (isScreenSharing) {
      parts.push('Sharing screen');
    } else {
      parts.push(isCameraEnabled ? 'Camera on' : 'Camera off');
    }
    return parts.join(' • ');
  };

  const getRemoteStatus = () => {
    if (!remoteStream) return 'Waiting...';
    const hasAudio = remoteStream.getAudioTracks().some(t => t.readyState === 'live');
    const hasVideo = remoteStream.getVideoTracks().some(t => t.readyState === 'live');
    if (hasAudio && hasVideo) return 'Voice + Video';
    if (hasAudio) return 'Voice only';
    if (hasVideo) return 'Video only';
    return 'Waiting...';
  };

  return (
    <motion.div
      className="call-panel"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="call-header">
        <div className="call-title">Voice Call</div>
        <span className={`call-status-pill ${connectionState === 'connected' ? 'connected' : ''}`}>
          {getStatusText()}
        </span>
      </div>
      <div className="call-grid">
        <div className="call-tile">
          <div className="call-label">You</div>
          <div className="call-media">
            <video
              ref={localVideoRef}
              className="call-video"
              autoPlay
              playsInline
              muted
              style={{ display: (isCameraEnabled || isScreenSharing) ? 'block' : 'none' }}
            />
            <div 
              className="call-avatar"
              style={{ display: (isCameraEnabled || isScreenSharing) ? 'none' : 'flex' }}
            >
              {currentAvatar ? (
                <img src={currentAvatar} alt={currentUser} />
              ) : (
                <span>{currentUser?.[0]?.toUpperCase() || 'Y'}</span>
              )}
            </div>
            <div 
              className="call-placeholder"
              style={{ display: (isCameraEnabled || isScreenSharing) ? 'none' : 'flex' }}
            >
              {isScreenSharing ? 'Sharing screen' : 'Camera off'}
            </div>
          </div>
          <div className="call-status">{getLocalStatus()}</div>
        </div>
        <div className="call-tile">
          <div className="call-label">{remoteProfile.name}</div>
          <div className="call-media">
            <video
              ref={remoteVideoRef}
              className="call-video"
              autoPlay
              playsInline
              style={{ display: remoteStream?.getVideoTracks().some(t => t.readyState === 'live') ? 'block' : 'none' }}
            />
            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
            />
            <div 
              className="call-avatar"
              style={{ display: remoteStream?.getVideoTracks().some(t => t.readyState === 'live') ? 'none' : 'flex' }}
            >
              {remoteProfile.avatar ? (
                <img src={remoteProfile.avatar} alt={remoteProfile.name} />
              ) : (
                <span>{remoteProfile.name?.[0]?.toUpperCase() || 'R'}</span>
              )}
            </div>
            <div 
              className="call-placeholder"
              style={{ display: remoteStream?.getVideoTracks().some(t => t.readyState === 'live') ? 'none' : 'flex' }}
            >
              Waiting for video
            </div>
          </div>
          <div className="call-status">{getRemoteStatus()}</div>
        </div>
      </div>
      <div className="call-actions">
        <motion.button
          className={`call-action-button ${isMicMuted ? '' : 'active'}`}
          onClick={toggleMic}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isMicMuted ? '🎤 Mic Off' : '🎤 Mic On'}
        </motion.button>
        <motion.button
          className={`call-action-button ${isCameraEnabled ? 'active' : ''}`}
          onClick={toggleCamera}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
        </motion.button>
        <motion.button
          className={`call-action-button ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
        </motion.button>
        <motion.button
          className="call-action-button danger"
          onClick={onEnd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          📞 Hang up
        </motion.button>
      </div>
    </motion.div>
  );
}

export default CallPanel;
