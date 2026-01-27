// Simplified Chess game using boardgame.io
export const Chess = {
  setup: () => ({
    cells: Array(64).fill(null),
    // Simplified chess - just basic piece movement
    // 0 = empty, 1-6 = white pieces, 7-12 = black pieces
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
    // Simplified - check if king is captured
    const whiteKing = G.cells.findIndex((c) => c === 6);
    const blackKing = G.cells.findIndex((c) => c === 12);
    
    if (whiteKing === -1) {
      return { winner: '1' };
    }
    if (blackKing === -1) {
      return { winner: '0' };
    }
  },
};
