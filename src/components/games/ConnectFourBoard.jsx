import React, { useState } from 'react';
import './ConnectFourBoard.css';

const ROWS = 6;
const COLS = 7;

export function ConnectFourBoard({ G, ctx, moves, events, playerID }) {
  // Defensive checks for undefined props
  if (!G || !G.cells || !ctx || !moves) {
    return (
      <div className="connectfour-board">
        <div className="connectfour-status">Loading game...</div>
      </div>
    );
  }

  const currentPlayerID = playerID || ctx.playerID || '0';
  const onClick = (col) => {
    if (ctx.currentPlayer === currentPlayerID) {
      moves.dropToken(col);
    }
  };

  const renderCell = (row, col) => {
    const index = row * COLS + col;
    const value = G.cells && G.cells[index] !== undefined ? G.cells[index] : null;
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
  if (ctx.gameover && typeof ctx.gameover === 'object') {
    if (ctx.gameover.winner !== undefined) {
      status = `Winner: Player ${ctx.gameover.winner === currentPlayerID ? 'You' : 'Opponent'}`;
    } else {
      status = 'Draw!';
    }
  } else {
    status = ctx.currentPlayer === currentPlayerID ? 'Your turn - Click a column' : "Opponent's turn";
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
            disabled={ctx.currentPlayer !== currentPlayerID}
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
