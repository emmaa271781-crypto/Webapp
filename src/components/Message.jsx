import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
        initial={isNew ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {message.text || 'System message'}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`message ${isOwn ? 'self' : ''}`}
      initial={isNew ? { opacity: 0, y: 10, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
    >
      <MessageBubble message={message} isOwn={isOwn} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showActions ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        {showActions && (
          <MessageActions
            message={message}
            currentUser={currentUser}
            socket={socket}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export default Message;
