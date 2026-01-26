import React from 'react';
import { motion } from 'framer-motion';
import './MessageBubble.css';

const formatTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isGifUrl = (text) => {
  return /^https?:\/\/.*\.gif(\?|#|$)/i.test(text);
};

function MessageBubble({ message, isOwn }) {

  if (message.deleted) {
    return (
      <div className="message-bubble deleted">
        <div className="message-text">Message deleted</div>
      </div>
    );
  }

  return (
    <motion.div
      className={`message-bubble ${isOwn ? 'own' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="message-meta">
        <span className="message-user">{message.user || 'Unknown'}</span>
        <span className="message-time">
          {formatTime(message.timestamp)}
          {message.edited && (
            <span className="edited-label">edited</span>
          )}
        </span>
      </div>

      {message.replyTo && (
        <div className="reply-preview">
          <span className="reply-user">{message.replyTo.user}</span>
          <span className="reply-snippet">{message.replyTo.text}</span>
        </div>
      )}

      <div className="message-text">
        {message.type === 'file' && message.file ? (
          message.file.kind === 'video' ? (
            <video
              className="message-media"
              src={message.file.url}
              controls
              playsInline
            />
          ) : (
            <img
              className="message-media"
              src={message.file.url}
              alt={message.file.name || 'Image'}
              loading="lazy"
            />
          )
        ) : message.text && isGifUrl(message.text) ? (
          <img
            className="message-media message-gif"
            src={message.text}
            alt="GIF"
            loading="lazy"
          />
        ) : (
          <span>{message.text || ''}</span>
        )}
      </div>
    </motion.div>
  );
}

export default MessageBubble;
