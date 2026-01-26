import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ProfileOverlay.css';

function ProfileOverlay({ currentName, currentAvatar, onClose, onUpdate }) {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(name.trim().slice(0, 32) || currentName, avatar);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="profile-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.form
          className="profile-card"
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <h2>Set Profile</h2>
          <p>Update your name and avatar.</p>
          <input
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
          />
          <input
            type="url"
            placeholder="Avatar URL (https://...)"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          <div className="profile-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}

export default ProfileOverlay;
