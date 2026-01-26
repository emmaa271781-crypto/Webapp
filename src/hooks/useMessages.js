import { useState, useEffect, useCallback } from 'react';

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const messagesById = useRef(new Map());

  const addMessage = useCallback((message) => {
    if (!message?.id) return;
    setMessages((prev) => {
      if (messagesById.current.has(message.id)) {
        return prev;
      }
      messagesById.current.set(message.id, message);
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((message) => {
    if (!message?.id) return;
    setMessages((prev) => {
      const existing = messagesById.current.get(message.id);
      if (!existing) return prev;
      messagesById.current.set(message.id, message);
      return prev.map((msg) => (msg.id === message.id ? message : msg));
    });
  }, []);

  const updateReactions = useCallback((messageId, reactions) => {
    setMessages((prev) => {
      const message = messagesById.current.get(messageId);
      if (!message) return prev;
      const updated = { ...message, reactions: reactions || {} };
      messagesById.current.set(messageId, updated);
      return prev.map((msg) => (msg.id === messageId ? updated : msg));
    });
  }, []);

  useEffect(() => {
    // Listen for history from socket
    const handleHistory = (history) => {
      if (Array.isArray(history)) {
        messagesById.current.clear();
        history.forEach((msg) => {
          if (msg?.id) {
            messagesById.current.set(msg.id, msg);
          }
        });
        setMessages(history);
      }
    };

    // This will be called from App.jsx when socket is ready
    window.addEventListener('load-history', (e) => {
      handleHistory(e.detail);
    });

    return () => {
      window.removeEventListener('load-history', handleHistory);
    };
  }, []);

  return {
    messages,
    addMessage,
    updateMessage,
    updateReactions,
  };
}
