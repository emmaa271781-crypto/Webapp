import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './JoinOverlay.css';

function JoinOverlay({ onJoin, initialAvatar = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(initialAvatar);

  useEffect(() => {
    const storedName = localStorage.getItem('profileName');
    const storedAvatar = localStorage.getItem('avatarUrl');
    if (storedName) setUsername(storedName);
    if (storedAvatar) setAvatar(storedAvatar);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Name required.');
      return;
    }
    if (!password.trim()) {
      setError('Password required.');
      return;
    }
    setError('');
    onJoin(username.trim().slice(0, 32), password, avatar);
  };

  return (
    <motion.div
      className="join-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.form
        className="join-card"
        onSubmit={handleSubmit}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ 
          duration: 0.4,
          ease: [0.34, 1.56, 0.64, 1],
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <h2>Join the room</h2>
        <p>Enter your name and the class password.</p>
        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={16}
          required
        />
        <input
          type="url"
          placeholder="Avatar URL (optional)"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Enter chat</button>
      </motion.form>
    </motion.div>
  );
}

export default JoinOverlay;
