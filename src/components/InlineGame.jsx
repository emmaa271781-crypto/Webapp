import React, { useMemo, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { TicTacToeBoard } from './games/TicTacToeBoard';
import { TicTacToe } from '../games/TicTacToe';
import './InlineGame.css';

// Inline game component that appears in chat like iMessage
export function InlineGame({ gameType, gameId, currentUser, opponent, onGameEnd }) {
  const [isPlayer0, setIsPlayer0] = useState(true);
  
  // Toggle between players for local multiplayer
  const togglePlayer = () => setIsPlayer0(!isPlayer0);
  
  // Determine player ID - allow switching for local play
  const playerID = isPlayer0 ? '0' : '1';

  const App = useMemo(() => {
    try {
      return Client({
        game: TicTacToe,
        board: TicTacToeBoard,
        numPlayers: 2,
        debug: false,
        // Local multiplayer - works immediately, no server
        multiplayer: false,
      });
    } catch (err) {
      console.error('Error creating game:', err);
      return null;
    }
  }, []);

  if (!App) {
    return null;
  }

  return (
    <div className="inline-game">
      <div className="inline-game-header">
        <span className="inline-game-title">Tic-Tac-Toe</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="inline-game-switch" 
            onClick={togglePlayer}
            title="Switch player"
          >
            {isPlayer0 ? 'Playing as X' : 'Playing as O'}
          </button>
          {onGameEnd && (
            <button className="inline-game-close" onClick={onGameEnd}>×</button>
          )}
        </div>
      </div>
      <div className="inline-game-board">
        <App playerID={playerID} />
      </div>
    </div>
  );
}
