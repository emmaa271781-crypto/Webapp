import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReactionBar from './ReactionBar';
import './MessageActions.css';

function MessageActions({ message, currentUser, socket }) {
  const [showReactions, setShowReactions] = useState(false);

  const handleReply = () => {
    // Emit reply event - will be handled by MessageComposer
    window.dispatchEvent(new CustomEvent('reply-to', { detail: message }));
  };

  const handleEdit = () => {
    if (message.user === currentUser && message.type === 'text' && !message.deleted) {
      window.dispatchEvent(new CustomEvent('edit-message', { detail: message }));
    }
  };

  const handleDelete = () => {
    if (message.user === currentUser && socket) {
      socket.emit('delete_message', { messageId: message.id });
    }
  };

  if (message.deleted) return null;

  return (
    <motion.div
      className="message-actions"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.button
        className="action-button reply-button"
        onClick={handleReply}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Reply
      </motion.button>
      <ReactionBar message={message} socket={socket} currentUser={currentUser} />
      {message.user === currentUser && message.type === 'text' && (
        <motion.button
          className="action-button edit-button"
          onClick={handleEdit}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Edit
        </motion.button>
      )}
      {message.user === currentUser && (
        <motion.button
          className="action-button delete-button"
          onClick={handleDelete}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Delete
        </motion.button>
      )}
    </motion.div>
  );
}

export default MessageActions;
