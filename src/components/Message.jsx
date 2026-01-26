import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import MessageActions from './MessageActions';
import './Message.css';

function Message({ message, currentUser, socket, isNew }) {
  const [showActions, setShowActions] = useState(false);
  const isOwn = message.user === currentUser;

  if (message.type === 'system') {
    return (
      <motion.div
        className="message system"
        initial={isNew ? { opacity: 0, y: 10, scale: 0.98 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        {message.text || 'System message'}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`message ${isOwn ? 'self' : ''}`}
      initial={isNew ? { opacity: 0, y: 20, scale: 0.9, x: isOwn ? 20 : -20 } : false}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: isOwn ? 20 : -20 }}
      transition={{ 
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
    >
      <MessageBubble message={message} isOwn={isOwn} />
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <MessageActions
              message={message}
              currentUser={currentUser}
              socket={socket}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Message;
