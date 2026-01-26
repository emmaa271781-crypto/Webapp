import React, { useEffect, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
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
      if (G.cells[id] !== null) return G;
      const cells = [...G.cells];
      cells[id] = ctx.currentPlayer;
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
    if (IsVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (IsDraw(G.cells)) return { draw: true };
  },
};

function IsVictory(cells) {
  const positions = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const isRowComplete = (row) => {
    const symbols = row.map((i) => cells[i]);
    return symbols[0] !== null && symbols[0] === symbols[1] && symbols[1] === symbols[2];
  };
  return positions.map(isRowComplete).some((r) => r === true);
}

function IsDraw(cells) {
  return cells.filter((c) => c === null).length === 0;
}

const Checkers = {
  setup: () => ({ cells: Array(64).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    movePiece: (G, ctx, { from, to }) => {
      const cells = [...G.cells];
      const piece = cells[from];
      if (piece === null) return G;
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
    if (IsConnectFourVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (G.cells.filter((c) => c === null).length === 0) return { draw: true };
  },
};

function IsConnectFourVictory(cells) {
  const ROWS = 6;
  const COLS = 7;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const player = cells[index];
      if (player === null) continue;
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
      const cells = [...G.cells];
      const piece = cells[from];
      if (piece === null) return G;
      cells[from] = null;
      cells[to] = piece;
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
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
    // Use local multiplayer for now (can be upgraded to server later)
    const client = Client({
      game: gameDefinition,
      board: BoardComponent,
      // For now, use local multiplayer - server integration can be added later
      // multiplayer: SocketIO({
      //   server: window.location.origin.replace(/^http/, 'ws'),
      // }),
      numPlayers: 2,
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
