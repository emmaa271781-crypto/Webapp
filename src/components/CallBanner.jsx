import React from 'react';
import { motion } from 'framer-motion';
import './CallBanner.css';

function CallBanner({ text, onJoin, onDismiss }) {
  return (
    <motion.div
      className="call-banner"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div>
        <div className="call-banner-title">Call in progress</div>
        <div className="call-banner-text">{text}</div>
      </div>
      <div className="call-banner-actions">
        <motion.button
          className="call-banner-button"
          onClick={onJoin}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Join Call
        </motion.button>
        <motion.button
          className="call-banner-dismiss"
          onClick={onDismiss}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
}

export default CallBanner;
