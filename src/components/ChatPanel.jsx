import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import './ChatPanel.css';

function ChatPanel({ messages, currentUser, typingUsers, socket }) {
  const messagesEndRef = useRef(null);
  const chatPanelRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    if (!chatPanelRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatPanelRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const panel = chatPanelRef.current;
    if (panel) {
      panel.addEventListener('scroll', handleScroll);
      return () => panel.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="chat-panel" ref={chatPanelRef}>
      <div className="chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <Message
              key={message.id || index}
              message={message}
              currentUser={currentUser}
              socket={socket}
              isNew={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <TypingIndicator users={typingUsers} currentUser={currentUser} />
      {showScrollButton && (
        <motion.button
          className="scroll-latest"
          onClick={scrollToBottom}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          New messages ↓
        </motion.button>
      )}
    </div>
  );
}

export default ChatPanel;
