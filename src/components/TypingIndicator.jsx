import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TypingIndicator.css';

function TypingIndicator({ users, currentUser }) {
  const others = users.filter((name) => name && name !== currentUser);

  if (others.length === 0) return null;

  const text =
    others.length === 1
      ? `${others[0]} is typing...`
      : `${others.slice(0, 2).join(', ')} are typing...`;

  return (
    <AnimatePresence>
      <motion.div
        className="typing-indicator"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{ 
          duration: 0.3,
          ease: [0.34, 1.56, 0.64, 1]
        }}
      >
        <span className="typing-dots">
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </span>
        {text}
      </motion.div>
    </AnimatePresence>
  );
}

export default TypingIndicator;
