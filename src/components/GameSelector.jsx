import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameSelector.css';

const BOARDGAMES = [
  { id: 'tictactoe', name: 'Tic-Tac-Toe', icon: '⭕' },
  { id: 'checkers', name: 'Checkers', icon: '⚫' },
  { id: 'connectfour', name: 'Connect Four', icon: '🔴' },
  { id: 'chess', name: 'Chess', icon: '♟️' },
];

const REALTIME_GAMES = [
  { id: 'pong', name: 'Pong', icon: '🏓' },
];

function GameSelector({ onSelect, onClose }) {
  return (
    <motion.div
      className="game-selector-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="game-selector"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-selector-header">
          <h2>Select a Game</h2>
          <button onClick={onClose} className="game-selector-close">×</button>
        </div>

        <div className="game-selector-section">
          <h3>Turn-Based Games</h3>
          <div className="game-grid">
            {BOARDGAMES.map((game) => (
              <motion.button
                key={game.id}
                className="game-card"
                onClick={() => onSelect(game.id, 'boardgame')}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="game-icon">{game.icon}</div>
                <div className="game-name">{game.name}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="game-selector-section">
          <h3>Real-Time Games</h3>
          <div className="game-grid">
            {REALTIME_GAMES.map((game) => (
              <motion.button
                key={game.id}
                className="game-card"
                onClick={() => onSelect(game.id, 'realtime')}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="game-icon">{game.icon}</div>
                <div className="game-name">{game.name}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default GameSelector;
