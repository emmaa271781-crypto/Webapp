import React from 'react';
import './TicTacToeBoard.css';

export function TicTacToeBoard({ G, ctx, moves, events }) {
  const playerID = ctx.playerID || '0';
  const onClick = (id) => {
    if (G.cells[id] === null && ctx.currentPlayer === playerID) {
      moves.clickCell(id);
    }
  };

  const cell = (id) => {
    const value = G.cells[id];
    let symbol = '';
    if (value === '0') symbol = 'X';
    if (value === '1') symbol = 'O';
    
    return (
      <button
        key={id}
        className={`tictactoe-cell ${value !== null ? 'filled' : ''} ${ctx.currentPlayer === playerID && value === null ? 'clickable' : ''}`}
        onClick={() => onClick(id)}
        disabled={value !== null || ctx.currentPlayer !== playerID}
      >
        {symbol}
      </button>
    );
  };

  let status = '';
  if (ctx.gameover) {
    if (ctx.gameover.winner !== undefined) {
      status = `Winner: Player ${ctx.gameover.winner === playerID ? 'You' : 'Opponent'}`;
    } else {
      status = 'Draw!';
    }
  } else {
    status = ctx.currentPlayer === playerID ? 'Your turn' : "Opponent's turn";
  }

  return (
    <div className="tictactoe-board">
      <div className="tictactoe-status">{status}</div>
      <div className="tictactoe-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((id) => cell(id))}
      </div>
    </div>
  );
}
