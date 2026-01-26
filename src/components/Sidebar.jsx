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
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ 
                delay: index * 0.03,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              whileHover={{ x: 4, transition: { duration: 0.2 } }}
            >
              <motion.span
                animate={user.name === currentUser ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                {user.name}
              </motion.span>
              {user.count > 1 && (
                <motion.span 
                  className="user-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.03 + 0.1 }}
                >
                  x{user.count}
                </motion.span>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
