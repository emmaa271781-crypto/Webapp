import React from 'react';
import { motion } from 'framer-motion';
import './ConnectionQuality.css';

function ConnectionQuality({ connectionState, quality = 'good' }) {
  const getQualityColor = () => {
    if (connectionState === 'connected') {
      if (quality === 'excellent') return '#22c55e';
      if (quality === 'good') return '#3b82f6';
      if (quality === 'fair') return '#f59e0b';
      return '#ef4444';
    }
    return '#9ca3af';
  };

  const getQualityText = () => {
    if (connectionState === 'connected') {
      if (quality === 'excellent') return 'Excellent';
      if (quality === 'good') return 'Good';
      if (quality === 'fair') return 'Fair';
      return 'Poor';
    }
    if (connectionState === 'connecting') return 'Connecting...';
    if (connectionState === 'error') return 'Error';
    return 'Disconnected';
  };

  return (
    <motion.div
      className="connection-quality"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="quality-indicator"
        style={{ backgroundColor: getQualityColor() }}
        animate={connectionState === 'connected' ? {
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="quality-text">{getQualityText()}</span>
    </motion.div>
  );
}

export default ConnectionQuality;
