// Boardgame.io server integration
const { Server } = require('boardgame.io/server');

const TicTacToeGame = {
  setup: () => ({
    cells: Array(9).fill(null),
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  moves: {
    clickCell: (G, ctx, id) => {
      if (G.cells[id] !== null) {
        return G;
      }
      const cells = [...G.cells];
      cells[id] = ctx.currentPlayer;
      return { ...G, cells };
    },
  },
  endIf: (G, ctx) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  },
};

function IsVictory(cells) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const isRowComplete = (row) => {
    const symbols = row.map((i) => cells[i]);
    return symbols[0] !== null && symbols[0] === symbols[1] && symbols[1] === symbols[2];
  };
  return positions.map(isRowComplete).some((r) => r === true);
}

function IsDraw(cells) {
  return cells.filter((c) => c === null).length === 0;
}

const CheckersGame = {
  setup: () => ({
    cells: Array(64).fill(null),
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
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

const ConnectFourGame = {
  setup: () => ({
    cells: Array(42).fill(null), // 6 rows x 7 cols
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
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
    if (IsConnectFourVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (G.cells.filter((c) => c === null).length === 0) {
      return { draw: true };
    }
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

const ChessGame = {
  setup: () => ({
    cells: Array(64).fill(null),
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
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

const server = Server({
  games: [TicTacToeGame, CheckersGame, ConnectFourGame, ChessGame],
  origins: ['*'], // Allow all origins (for development/production)
});

// Export server for integration with main server
// The server can be started separately or integrated into main server
module.exports = { server, TicTacToeGame, CheckersGame, ConnectFourGame, ChessGame };

// If run directly, start the server
if (require.main === module) {
  const PORT = process.env.BOARDGAME_PORT || 8000;
  server.run({ port: PORT }, () => {
    console.log(`🎲 Boardgame.io server running on port ${PORT}`);
  });
}
