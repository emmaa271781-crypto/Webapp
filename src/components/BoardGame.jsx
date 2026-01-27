import React, { useEffect, useState, useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { TicTacToeBoard } from './games/TicTacToeBoard';
import { CheckersBoard } from './games/CheckersBoard';
import { ConnectFourBoard } from './games/ConnectFourBoard';
import { ChessBoard } from './games/ChessBoard';
import './BoardGame.css';

// Import game definitions - convert to CommonJS compatible format
const TicTacToe = {
  setup: () => ({ cells: Array(9).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    clickCell: (G, ctx, id) => {
      if (!G || !G.cells || !Array.isArray(G.cells) || !ctx || id === undefined) return G;
      if (G.cells[id] !== null) return G;
      const cells = [...G.cells];
      cells[id] = ctx.currentPlayer;
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
    if (!G || !G.cells || !ctx) return;
    if (IsVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (IsDraw(G.cells)) return { draw: true };
  },
};

function IsVictory(cells) {
  if (!cells || !Array.isArray(cells) || cells.length < 9) return false;
  const positions = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const isRowComplete = (row) => {
    if (!row || !Array.isArray(row) || row.length < 3) return false;
    const symbols = row.map((i) => cells[i]).filter(s => s !== undefined);
    if (symbols.length < 3) return false;
    return symbols[0] !== null && symbols[0] === symbols[1] && symbols[1] === symbols[2];
  };
  return positions.map(isRowComplete).some((r) => r === true);
}

function IsDraw(cells) {
  if (!cells || !Array.isArray(cells)) return false;
  return cells.filter((c) => c === null).length === 0;
}

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
    return (
      <div className="boardgame-container">
        <div className="boardgame-loading">Game type not found: {gameType}</div>
        <button onClick={onGameEnd} className="boardgame-close-btn">
          Close
        </button>
      </div>
    );
  }

  // Memoize the Client to avoid recreating on every render
  const App = useMemo(() => {
    try {
      return Client({
        game: gameDefinition,
        board: BoardComponent,
        numPlayers: 2,
        debug: false,
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
    return (
      <div className="boardgame-container">
        <div className="boardgame-loading">Error initializing game</div>
        <button onClick={onGameEnd} className="boardgame-close-btn">
          Close
        </button>
      </div>
    );
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
