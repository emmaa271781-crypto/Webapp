import React from 'react';
import { motion } from 'framer-motion';
import './GameInvite.css';

// Game invite component for iMessage-style game invites in chat
export function GameInvite({ message, currentUser, socket, onAccept, onDecline }) {
  const { gameType, from, gameId } = message.gameInvite || {};
  
  const gameIcons = {
    tictactoe: '⭕',
    checkers: '⚫',
    connectfour: '🔴',
    chess: '♟️',
  };

  const gameNames = {
    tictactoe: 'Tic-Tac-Toe',
    checkers: 'Checkers',
    connectfour: 'Connect Four',
    chess: 'Chess',
  };

  const isFromMe = from === currentUser;
  const canAccept = !isFromMe && message.status === 'pending';

  const handleAccept = () => {
    if (socket && gameId) {
      socket.emit('game_accept', { gameId, gameType });
      if (onAccept) onAccept({ gameId, gameType });
    }
  };

  const handleDecline = () => {
    if (socket && gameId) {
      socket.emit('game_decline', { gameId });
      if (onDecline) onDecline({ gameId });
    }
  };

  return (
    <motion.div
      className={`game-invite ${isFromMe ? 'sent' : 'received'}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="game-invite-content">
        <div className="game-invite-icon">{gameIcons[gameType] || '🎮'}</div>
        <div className="game-invite-text">
          <div className="game-invite-title">
            {isFromMe ? 'You sent a game invite' : `${from} wants to play`}
          </div>
          <div className="game-invite-game">{gameNames[gameType] || gameType}</div>
        </div>
      </div>
      {canAccept && (
        <div className="game-invite-actions">
          <motion.button
            className="game-invite-accept"
            onClick={handleAccept}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Accept
          </motion.button>
          <motion.button
            className="game-invite-decline"
            onClick={handleDecline}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Decline
          </motion.button>
        </div>
      )}
      {message.status === 'accepted' && (
        <div className="game-invite-status">✓ Accepted</div>
      )}
      {message.status === 'declined' && (
        <div className="game-invite-status">✗ Declined</div>
      )}
    </motion.div>
  );
}
