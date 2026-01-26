import React from 'react';
import { motion } from 'framer-motion';
import './Sidebar.css';

function Sidebar({ users, total, currentUser }) {
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="sidebar-section">
        <div className="sidebar-title">Online</div>
        <div className="online-count">{total} online</div>
        <ul className="user-list">
          {sortedUsers.map((user, index) => (
            <motion.li
              key={user.name}
              className={`user-item ${user.name === currentUser ? 'self' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <span>{user.name}</span>
              {user.count > 1 && (
                <span className="user-badge">x{user.count}</span>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
