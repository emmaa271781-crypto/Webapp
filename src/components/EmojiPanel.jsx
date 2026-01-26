import React from 'react';
import { motion } from 'framer-motion';
import './EmojiPanel.css';

const EMOJI_LIST = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤓', '😴', '🤔',
  '😅', '😭', '😡', '🥳', '🤯', '😇', '😈', '🙃', '😉', '🥹',
  '😮', '😱', '🤩', '😤', '😬', '👍', '👎', '👏', '🙌', '🙏',
  '🤝', '💪', '🫶', '❤️', '💙', '💚', '💜', '🧡', '💛', '🖤',
  '🔥', '✨', '🎉', '🎯', '🏆', '🎮', '🎧', '🎵', '📚', '📝',
  '🖊️', '🧠', '🚀', '🌙', '☀️', '⏰', '✅', '❌', '⚡', '🌈',
  '🍕', '🍔', '🍟', '🍿', '🍎', '🥤', '☕', '🧋', '🐱', '🐶',
  '🐼', '🐢', '🐸', '🦄',
];

function EmojiPanel({ onSelect, onClose }) {
  return (
    <motion.div
      className="emoji-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="panel-title">Pick an emoji</div>
      <div className="emoji-grid">
        {EMOJI_LIST.map((emoji) => (
          <motion.button
            key={emoji}
            type="button"
            className="emoji-button"
            onClick={() => onSelect(emoji)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default EmojiPanel;
