// Checkers game using boardgame.io
export const Checkers = {
  setup: () => ({
    cells: Array(64).fill(null),
    // Initialize checkers board (8x8)
    // 0 = empty, 1 = player 0 piece, 2 = player 1 piece, 3 = player 0 king, 4 = player 1 king
    // Top 3 rows: player 1 pieces on dark squares
    // Bottom 3 rows: player 0 pieces on dark squares
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
      
      // Promote to king if reaches opposite end
      const row = Math.floor(to / 8);
      if ((piece === 1 && row === 0) || (piece === 2 && row === 7)) {
        cells[to] = piece + 2; // Convert to king
      }
      
      return { ...G, cells };
    },
  },

  endIf: (G, ctx) => {
    const player0Pieces = G.cells.filter((c) => c === 1 || c === 3).length;
    const player1Pieces = G.cells.filter((c) => c === 2 || c === 4).length;
    
    if (player0Pieces === 0) {
      return { winner: '1' };
    }
    if (player1Pieces === 0) {
      return { winner: '0' };
    }
  },
};
