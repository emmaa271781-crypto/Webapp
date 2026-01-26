import React, { useEffect, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { TicTacToeBoard } from './games/TicTacToeBoard';
import { CheckersBoard } from './games/CheckersBoard';
import { ConnectFourBoard } from './games/ConnectFourBoard';
import { ChessBoard } from './games/ChessBoard';
import './BoardGame.css';

// Import game definitions
import { TicTacToe } from '../games/TicTacToe';
import { Checkers } from '../games/Checkers';
import { ConnectFour } from '../games/ConnectFour';
import { Chess } from '../games/Chess';

const GAME_BOARDS = {
  tictactoe: TicTacToeBoard,
  checkers: CheckersBoard,
  connectfour: ConnectFourBoard,
  chess: ChessBoard,
};

const GAME_DEFINITIONS = {
  tictactoe: TicTacToe,
  checkers: Checkers,
  connectfour: ConnectFour,
  chess: Chess,
};

function BoardGame({ gameType, playerID, onGameEnd, currentUser }) {
  const [gameClient, setGameClient] = useState(null);
  const [matchID, setMatchID] = useState(null);

  useEffect(() => {
    if (!gameType || !playerID) return;

    // Generate match ID
    const newMatchID = `match_${gameType}_${Date.now()}`;
    setMatchID(newMatchID);

    const BoardComponent = GAME_BOARDS[gameType];
    const gameDefinition = GAME_DEFINITIONS[gameType];

    if (!BoardComponent || !gameDefinition) {
      console.error(`[BoardGame] Game type ${gameType} not found`);
      return;
    }

    // Create boardgame.io client
    const client = Client({
      game: gameDefinition,
      board: BoardComponent,
      multiplayer: SocketIO({
        server: window.location.origin.replace(/^http/, 'ws'),
      }),
      matchID: newMatchID,
      playerID: playerID,
      credentials: currentUser,
    });

    setGameClient(client);

    return () => {
      if (client) {
        client.stop();
      }
    };
  }, [gameType, playerID, currentUser]);

  if (!gameClient || !matchID) {
    return (
      <div className="boardgame-container">
        <div className="boardgame-loading">Loading game...</div>
      </div>
    );
  }

  const BoardComponent = gameClient.Board;

  return (
    <div className="boardgame-container">
      <div className="boardgame-header">
        <div className="boardgame-title">
          {gameType === 'tictactoe' && 'Tic-Tac-Toe'}
          {gameType === 'checkers' && 'Checkers'}
          {gameType === 'connectfour' && 'Connect Four'}
          {gameType === 'chess' && 'Chess'}
        </div>
        <button onClick={onGameEnd} className="boardgame-close-btn">
          Close Game
        </button>
      </div>
      <div className="boardgame-content">
        <BoardComponent />
      </div>
    </div>
  );
}

export default BoardGame;
