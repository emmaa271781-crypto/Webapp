// Connect Four game using boardgame.io
const ROWS = 6;
const COLS = 7;

export const ConnectFour = {
  setup: () => ({
    cells: Array(ROWS * COLS).fill(null),
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    dropToken: (G, ctx, col) => {
      const cells = [...G.cells];
      
      // Find the lowest empty cell in the column
      for (let row = ROWS - 1; row >= 0; row--) {
        const index = row * COLS + col;
        if (cells[index] === null) {
          cells[index] = ctx.currentPlayer;
          return { ...G, cells };
        }
      }
      
      return G; // Column is full
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
  // Check horizontal, vertical, and diagonal wins
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const player = cells[index];
      if (player === null) continue;

      // Check horizontal
      if (col <= COLS - 4) {
        if (
          cells[index] === player &&
          cells[index + 1] === player &&
          cells[index + 2] === player &&
          cells[index + 3] === player
        ) {
          return true;
        }
      }

      // Check vertical
      if (row <= ROWS - 4) {
        if (
          cells[index] === player &&
          cells[index + COLS] === player &&
          cells[index + COLS * 2] === player &&
          cells[index + COLS * 3] === player
        ) {
          return true;
        }
      }

      // Check diagonal (down-right)
      if (row <= ROWS - 4 && col <= COLS - 4) {
        if (
          cells[index] === player &&
          cells[index + COLS + 1] === player &&
          cells[index + COLS * 2 + 2] === player &&
          cells[index + COLS * 3 + 3] === player
        ) {
          return true;
        }
      }

      // Check diagonal (down-left)
      if (row <= ROWS - 4 && col >= 3) {
        if (
          cells[index] === player &&
          cells[index + COLS - 1] === player &&
          cells[index + COLS * 2 - 2] === player &&
          cells[index + COLS * 3 - 3] === player
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function IsDraw(cells) {
  return cells.filter((c) => c === null).length === 0;
}
