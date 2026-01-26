import React from 'react';
import { motion } from 'framer-motion';
import './TopBar.css';

function TopBar({
  currentUser,
  onProfileClick,
  soundEnabled,
  notifyEnabled,
  onSoundToggle,
  onNotifyToggle,
  isInCall,
  onCallStart,
  onCallEnd,
}) {
  return (
    <motion.header
      className="top-bar"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1>Classroom CS</h1>
      <div className="header-actions">
        <motion.span
          className="status-pill status-ok"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          Connected
        </motion.span>
        {!isInCall ? (
          <motion.button
            className="call-button"
            onClick={onCallStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Join Call
          </motion.button>
        ) : (
          <motion.button
            className="call-button danger"
            onClick={onCallEnd}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Hang up
          </motion.button>
        )}
        <motion.button
          className="header-button"
          onClick={onProfileClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Profile
        </motion.button>
        <motion.button
          className="header-button"
          onClick={onSoundToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sound: {soundEnabled ? 'On' : 'Off'}
        </motion.button>
        <motion.button
          className="header-button"
          onClick={onNotifyToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🔔 {notifyEnabled ? 'On' : 'Off'}
        </motion.button>
      </div>
    </motion.header>
  );
}

export default TopBar;
