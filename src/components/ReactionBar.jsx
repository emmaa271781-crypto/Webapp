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
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 25,
              delay: REACTION_EMOJIS.indexOf(emoji) * 0.03
            }}
          >
            <motion.span
              animate={isActive ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              } : {}}
              transition={{ duration: 0.4 }}
            >
              {emoji}
            </motion.span>
            {count > 0 && (
              <motion.span 
                className="reaction-count"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {count}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default ReactionBar;
