import React, { useState } from 'react';
import './ChessBoard.css';

export function ChessBoard({ G, ctx, moves, events, playerID }) {
  // Defensive checks for undefined props
  if (!G || !G.cells || !ctx || !moves) {
    return (
      <div className="chess-board">
        <div className="chess-status">Loading game...</div>
      </div>
    );
  }

  const currentPlayerID = playerID || ctx.playerID || '0';
  const [selectedCell, setSelectedCell] = useState(null);

  const onClick = (id) => {
    if (selectedCell === null) {
      setSelectedCell(id);
    } else {
      moves.movePiece({ from: selectedCell, to: id });
      setSelectedCell(null);
    }
  };

  const renderCell = (id) => {
    const row = Math.floor(id / 8);
    const col = id % 8;
    const isDark = (row + col) % 2 === 1;
    const piece = G.cells && G.cells[id] !== undefined ? G.cells[id] : null;
    const isSelected = selectedCell === id;

    return (
      <button
        key={id}
        className={`chess-cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
        onClick={() => onClick(id)}
        disabled={ctx.currentPlayer !== currentPlayerID}
      >
        {piece !== null && <span className="chess-piece">{piece}</span>}
      </button>
    );
  };

  let status = '';
  if (ctx.gameover && typeof ctx.gameover === 'object' && ctx.gameover.winner !== undefined) {
    status = ctx.gameover.winner === currentPlayerID ? 'You won!' : 'You lost!';
  } else {
    status = ctx.currentPlayer === currentPlayerID ? 'Your turn' : "Opponent's turn";
  }

  return (
    <div className="chess-board">
      <div className="chess-status">{status}</div>
      <div className="chess-grid">
        {Array.from({ length: 64 }, (_, i) => renderCell(i))}
      </div>
    </div>
  );
}
