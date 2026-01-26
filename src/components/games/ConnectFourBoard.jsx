import React, { useState } from 'react';
import './ConnectFourBoard.css';

const ROWS = 6;
const COLS = 7;

export function ConnectFourBoard({ G, ctx, moves, events, playerID }) {
  const onClick = (col) => {
    if (ctx.currentPlayer === playerID) {
      moves.dropToken(col);
    }
  };

  const renderCell = (row, col) => {
    const index = row * COLS + col;
    const value = G.cells[index];
    let symbol = '';
    if (value === '0') symbol = '🔴';
    if (value === '1') symbol = '🟡';

    return (
      <div key={index} className="connectfour-cell">
        {symbol && <span className="connectfour-piece">{symbol}</span>}
      </div>
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
    status = ctx.currentPlayer === playerID ? 'Your turn - Click a column' : "Opponent's turn";
  }

  return (
    <div className="connectfour-board">
      <div className="connectfour-status">{status}</div>
      <div className="connectfour-columns">
        {Array.from({ length: COLS }, (_, col) => (
          <button
            key={col}
            className="connectfour-column-btn"
            onClick={() => onClick(col)}
            disabled={ctx.currentPlayer !== playerID}
          >
            ↓
          </button>
        ))}
      </div>
      <div className="connectfour-grid">
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => renderCell(row, col))
        )}
      </div>
    </div>
  );
}
