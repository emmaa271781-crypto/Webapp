import { useState, useEffect, useCallback, useRef } from 'react';

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

  const updateMessage = useCallback((messageOrId, text, deleted) => {
    // Handle both signatures: updateMessage(message) or updateMessage(id, text, deleted)
    let messageId;
    let updatedMessage;
    
    if (typeof messageOrId === 'string' || typeof messageOrId === 'number') {
      // Called as updateMessage(id, text, deleted)
      messageId = messageOrId;
      const existing = messagesById.current.get(messageId);
      if (!existing) return;
      
      if (deleted) {
        updatedMessage = { ...existing, deleted: true };
      } else if (text !== undefined) {
        updatedMessage = { ...existing, text, edited: true };
      } else {
        return;
      }
    } else {
      // Called as updateMessage(message)
      if (!messageOrId?.id) return;
      messageId = messageOrId.id;
      updatedMessage = messageOrId;
    }
    
    setMessages((prev) => {
      messagesById.current.set(messageId, updatedMessage);
      return prev.map((msg) => (msg.id === messageId ? updatedMessage : msg));
    });
  }, []);

  const updateReactions = useCallback((messageId, emoji, user, add) => {
    // Handle both signatures: updateReactions(messageId, reactions) or updateReactions(messageId, emoji, user, add)
    setMessages((prev) => {
      const message = messagesById.current.get(messageId);
      if (!message) return prev;
      
      let updated;
      if (typeof emoji === 'string' && user !== undefined) {
        // Called as updateReactions(messageId, emoji, user, add)
        const reactions = { ...(message.reactions || {}) };
        if (add) {
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(user)) {
            reactions[emoji] = [...reactions[emoji], user];
          }
        } else {
          if (reactions[emoji]) {
            reactions[emoji] = reactions[emoji].filter(u => u !== user);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          }
        }
        updated = { ...message, reactions };
      } else {
        // Called as updateReactions(messageId, reactions)
        updated = { ...message, reactions: emoji || {} };
      }
      
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
