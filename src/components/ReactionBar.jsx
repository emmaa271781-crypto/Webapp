import React from 'react';
import { motion } from 'framer-motion';
import './ReactionBar.css';

const REACTION_EMOJIS = ['👍', '😂', '❤️', '🎉', '😮'];

function ReactionBar({ message, socket, currentUser }) {
  const reactions = message?.reactions || {};

  const handleReaction = (emoji) => {
    if (!socket || !currentUser || !message?.id) return;
    socket.emit('react', { messageId: message.id, emoji });
  };

  return (
    <div className="reaction-bar">
      {REACTION_EMOJIS.map((emoji) => {
        const users = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
        const count = users.length;
        const isActive = users.includes(currentUser);

        return (
          <motion.button
            key={emoji}
            className={`reaction-button ${isActive ? 'active' : ''}`}
            onClick={() => handleReaction(emoji)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

export default ReactionBar;
