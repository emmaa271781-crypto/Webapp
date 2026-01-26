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
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <span className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
        {text}
      </motion.div>
    </AnimatePresence>
  );
}

export default TypingIndicator;
