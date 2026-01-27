import React, { useEffect, useState, useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { TicTacToeBoard } from './games/TicTacToeBoard';
import { CheckersBoard } from './games/CheckersBoard';
import { ConnectFourBoard } from './games/ConnectFourBoard';
import { ChessBoard } from './games/ChessBoard';
import { TicTacToe } from '../games/TicTacToe';
import './BoardGame.css';

const Checkers = {
  setup: () => ({ cells: Array(64).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    movePiece: (G, ctx, { from, to }) => {
      if (!G || !G.cells || !Array.isArray(G.cells) || !ctx || from === undefined || to === undefined) return G;
      const cells = [...G.cells];
      const piece = cells[from];
      if (piece === null || piece === undefined) return G;
      cells[from] = null;
      cells[to] = piece;
      const row = Math.floor(to / 8);
      if ((piece === 1 && row === 0) || (piece === 2 && row === 7)) {
        cells[to] = piece + 2;
      }
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
    if (!G || !G.cells || !Array.isArray(G.cells) || !ctx) return;
    const player0Pieces = G.cells.filter((c) => c === 1 || c === 3).length;
    const player1Pieces = G.cells.filter((c) => c === 2 || c === 4).length;
    if (player0Pieces === 0) return { winner: '1' };
    if (player1Pieces === 0) return { winner: '0' };
  },
};

const ConnectFour = {
  setup: () => ({ cells: Array(42).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    dropToken: (G, ctx, col) => {
      if (!G || !G.cells || !Array.isArray(G.cells) || !ctx || col === undefined) return G;
      const cells = [...G.cells];
      const ROWS = 6;
      const COLS = 7;
      for (let row = ROWS - 1; row >= 0; row--) {
        const index = row * COLS + col;
        if (cells[index] === null) {
          cells[index] = ctx.currentPlayer;
          return { ...G, cells };
        }
      }
      return G;
    },
  },
  endIf: (G, ctx) => {
    if (!G || !G.cells || !Array.isArray(G.cells) || !ctx) return;
    if (IsConnectFourVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (G.cells.filter((c) => c === null).length === 0) return { draw: true };
  },
};

function IsConnectFourVictory(cells) {
  if (!cells || !Array.isArray(cells) || cells.length < 42) return false;
  const ROWS = 6;
  const COLS = 7;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const player = cells[index];
      if (player === null || player === undefined) continue;
      if (col <= COLS - 4 && cells[index] === player && cells[index + 1] === player && cells[index + 2] === player && cells[index + 3] === player) return true;
      if (row <= ROWS - 4 && cells[index] === player && cells[index + COLS] === player && cells[index + COLS * 2] === player && cells[index + COLS * 3] === player) return true;
      if (row <= ROWS - 4 && col <= COLS - 4 && cells[index] === player && cells[index + COLS + 1] === player && cells[index + COLS * 2 + 2] === player && cells[index + COLS * 3 + 3] === player) return true;
      if (row <= ROWS - 4 && col >= 3 && cells[index] === player && cells[index + COLS - 1] === player && cells[index + COLS * 2 - 2] === player && cells[index + COLS * 3 - 3] === player) return true;
    }
  }
  return false;
}

const Chess = {
  setup: () => ({ cells: Array(64).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    movePiece: (G, ctx, { from, to }) => {
      if (!G || !G.cells || !Array.isArray(G.cells) || !ctx || from === undefined || to === undefined) return G;
      const cells = [...G.cells];
      const piece = cells[from];
      if (piece === null || piece === undefined) return G;
      cells[from] = null;
      cells[to] = piece;
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
    if (!G || !G.cells || !Array.isArray(G.cells) || !ctx) return;
    const whiteKing = G.cells.findIndex((c) => c === 6);
    const blackKing = G.cells.findIndex((c) => c === 12);
    if (whiteKing === -1) return { winner: '1' };
    if (blackKing === -1) return { winner: '0' };
  },
};

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
  const BoardComponent = GAME_BOARDS[gameType];
  const gameDefinition = GAME_DEFINITIONS[gameType];

  if (!BoardComponent || !gameDefinition) {
    return null;
  }

  // Memoize the Client to avoid recreating on every render
  // Use local multiplayer - no server, works immediately
  const App = useMemo(() => {
    try {
      return Client({
        game: gameDefinition,
        board: BoardComponent,
        numPlayers: 2,
        debug: false,
        multiplayer: false, // Local multiplayer - no server needed
      });
    } catch (err) {
      console.error('Error creating boardgame.io client:', err);
      return null;
    }
  }, [gameDefinition, BoardComponent]);

  const gameTitle = {
    tictactoe: 'Tic-Tac-Toe',
    checkers: 'Checkers',
    connectfour: 'Connect Four',
    chess: 'Chess',
  }[gameType] || 'Game';

  if (!App) {
    return null;
  }

  return (
    <div className="boardgame-container">
      <div className="boardgame-header">
        <div className="boardgame-title">{gameTitle}</div>
        <button onClick={onGameEnd} className="boardgame-close-btn">
          Close Game
        </button>
      </div>
      <div className="boardgame-content">
        <App playerID={playerID || '0'} />
      </div>
    </div>
  );
}

export default BoardGame;
