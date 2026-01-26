import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPanel from './EmojiPanel';
import GifPanel from './GifPanel';
import './MessageComposer.css';

function MessageComposer({ currentUser, socket }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const handleReply = (e) => {
      setReplyTarget(e.detail);
      setEditTarget(null);
      inputRef.current?.focus();
    };

    const handleEdit = (e) => {
      setEditTarget(e.detail);
      setReplyTarget(null);
      setText(e.detail.text || '');
      inputRef.current?.focus();
    };

    window.addEventListener('reply-to', handleReply);
    window.addEventListener('edit-message', handleEdit);

    return () => {
      window.removeEventListener('reply-to', handleReply);
      window.removeEventListener('edit-message', handleEdit);
    };
  }, []);

  const emitTyping = (isTyping) => {
    if (!socket || !currentUser || isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;
    socket.emit('typing', { isTyping });
  };

  const handleInput = (e) => {
    setText(e.target.value);
    emitTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentUser || !socket) return;

    const trimmedText = text.trim();
    if (!trimmedText && !editTarget) return;

    if (editTarget) {
      if (trimmedText) {
        socket.emit('edit_message', {
          messageId: editTarget.id,
          text: trimmedText,
        });
      }
      setEditTarget(null);
      setText('');
      emitTyping(false);
      return;
    }

    socket.emit('message', {
      text: trimmedText,
      replyTo: replyTarget ? { id: replyTarget.id } : null,
    });

    setText('');
    setReplyTarget(null);
    emitTyping(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !currentUser) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('message', {
        type: 'file',
        replyTo: replyTarget ? { id: replyTarget.id } : null,
        file: {
          url: reader.result,
          name: file.name,
          mime: file.type,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
        },
      });
      setReplyTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="message-composer">
      <AnimatePresence>
        {editTarget && (
          <motion.div
            className="composer-banner edit-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>Editing your message</span>
            <button type="button" onClick={() => { setEditTarget(null); setText(''); }}>
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replyTarget && (
          <motion.div
            className="composer-banner reply-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>
              Replying to {replyTarget.user}: {replyTarget.text?.slice(0, 50)}
            </span>
            <button type="button" onClick={() => setReplyTarget(null)}>
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="composer-form">
        <div className="composer-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={handleInput}
            onBlur={() => emitTyping(false)}
            maxLength={500}
            className="composer-input"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Send
          </motion.button>
        </div>

        <div className="composer-tools">
          <div className="tool-buttons">
            <motion.button
              type="button"
              className="tool-button"
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowGif(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              😊 Emoji
            </motion.button>
            <motion.button
              type="button"
              className="tool-button"
              onClick={() => {
                setShowGif(!showGif);
                setShowEmoji(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              GIF
            </motion.button>
            <motion.button
              type="button"
              className="tool-button"
              onClick={() => document.getElementById('file-input')?.click()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Attach
            </motion.button>
            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showEmoji && (
          <EmojiPanel
            onSelect={(emoji) => {
              setText((prev) => prev + emoji);
              inputRef.current?.focus();
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGif && (
          <GifPanel
            onSelect={(url) => {
              if (socket && currentUser) {
                socket.emit('message', {
                  text: url,
                  replyTo: replyTarget ? { id: replyTarget.id } : null,
                });
                setReplyTarget(null);
              }
              setShowGif(false);
            }}
            onClose={() => setShowGif(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageComposer;
