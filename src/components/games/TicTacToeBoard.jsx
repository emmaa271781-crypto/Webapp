import React from 'react';
import './TicTacToeBoard.css';

export function TicTacToeBoard({ G, ctx, moves, events, playerID }) {
  // Defensive checks for undefined props
  if (!G || !G.cells || !ctx || !moves) {
    return (
      <div className="tictactoe-board">
        <div className="tictactoe-status">Loading game...</div>
      </div>
    );
  }

  const currentPlayerID = playerID || ctx.playerID || '0';
  
  const onClick = (id) => {
    if (G.cells && G.cells[id] === null && ctx.currentPlayer === currentPlayerID) {
      moves.clickCell(id);
    }
  };

  const cell = (id) => {
    const value = G.cells && G.cells[id] !== undefined ? G.cells[id] : null;
    let symbol = '';
    if (value === '0') symbol = 'X';
    if (value === '1') symbol = 'O';
    
    return (
      <button
        key={id}
        className={`tictactoe-cell ${value !== null ? 'filled' : ''} ${ctx.currentPlayer === currentPlayerID && value === null ? 'clickable' : ''}`}
        onClick={() => onClick(id)}
        disabled={value !== null || ctx.currentPlayer !== currentPlayerID}
      >
        {symbol}
      </button>
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
    status = ctx.currentPlayer === currentPlayerID ? 'Your turn' : "Opponent's turn";
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
