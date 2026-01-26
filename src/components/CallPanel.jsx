import React from 'react';
import { motion } from 'framer-motion';
import './CallPanel.css';

function CallPanel({
  currentUser,
  currentAvatar,
  remoteProfile,
  callRole,
  callConnected,
  onEnd,
}) {
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
        <span className="call-status-pill">
          {callConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
      <div className="call-grid">
        <div className="call-tile">
          <div className="call-label">You</div>
          <div className="call-media">
            <div className="call-avatar">
              {currentAvatar ? (
                <img src={currentAvatar} alt={currentUser} />
              ) : (
                <span>{currentUser?.[0]?.toUpperCase() || 'Y'}</span>
              )}
            </div>
            <div className="call-placeholder">Camera off</div>
          </div>
          <div className="call-status">Mic muted • Camera off</div>
        </div>
        <div className="call-tile">
          <div className="call-label">{remoteProfile.name}</div>
          <div className="call-media">
            <div className="call-avatar">
              {remoteProfile.avatar ? (
                <img src={remoteProfile.avatar} alt={remoteProfile.name} />
              ) : (
                <span>{remoteProfile.name?.[0]?.toUpperCase() || 'R'}</span>
              )}
            </div>
            <div className="call-placeholder">Waiting for video</div>
          </div>
          <div className="call-status">Waiting...</div>
        </div>
      </div>
      <div className="call-actions">
        <motion.button
          className="call-action-button danger"
          onClick={onEnd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Hang up
        </motion.button>
      </div>
    </motion.div>
  );
}

export default CallPanel;
