// Tic-Tac-Toe game using boardgame.io
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
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
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
