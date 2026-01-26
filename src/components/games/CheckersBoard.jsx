import React, { useState } from 'react';
import './CheckersBoard.css';

export function CheckersBoard({ G, ctx, moves, events }) {
  const playerID = ctx.playerID || '0';
  const [selectedCell, setSelectedCell] = useState(null);

  const onClick = (id) => {
    if (selectedCell === null) {
      // Select piece
      const piece = G.cells[id];
      if (piece !== null && ((playerID === '0' && (piece === 1 || piece === 3)) || (playerID === '1' && (piece === 2 || piece === 4)))) {
        setSelectedCell(id);
      }
    } else {
      // Move piece
      if (selectedCell === id) {
        setSelectedCell(null);
      } else {
        moves.movePiece({ from: selectedCell, to: id });
        setSelectedCell(null);
      }
    }
  };

  const renderCell = (id) => {
    const row = Math.floor(id / 8);
    const col = id % 8;
    const isDark = (row + col) % 2 === 1;
    const piece = G.cells[id];
    const isSelected = selectedCell === id;

    let pieceSymbol = '';
    if (piece === 1 || piece === 3) pieceSymbol = '●'; // Player 0
    if (piece === 2 || piece === 4) pieceSymbol = '○'; // Player 1
    if (piece === 3 || piece === 4) pieceSymbol += 'K'; // King

    return (
      <button
        key={id}
        className={`checkers-cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
        onClick={() => onClick(id)}
        disabled={ctx.currentPlayer !== playerID}
      >
        {pieceSymbol && <span className="checkers-piece">{pieceSymbol}</span>}
      </button>
    );
  };

  let status = '';
  if (ctx.gameover) {
    status = ctx.gameover.winner === playerID ? 'You won!' : 'You lost!';
  } else {
    status = ctx.currentPlayer === playerID ? 'Your turn' : "Opponent's turn";
  }

  return (
    <div className="checkers-board">
      <div className="checkers-status">{status}</div>
      <div className="checkers-grid">
        {Array.from({ length: 64 }, (_, i) => renderCell(i))}
      </div>
    </div>
  );
}
