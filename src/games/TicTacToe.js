// Working TicTacToe game based on boardgame.io best practices
export const TicTacToe = {
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

  for (const pos of positions) {
    const symbols = pos.map(i => cells[i]);
    if (symbols[0] !== null && symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      return true;
    }
  }
  return false;
}

function IsDraw(cells) {
  return cells.every(cell => cell !== null);
}
