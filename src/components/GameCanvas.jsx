import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import './GameCanvas.css';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 500;

function GameCanvas({ socket, currentUser, onGameEnd }) {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const objectsRef = useRef(null);
  const currentDirRef = useRef(0);
  const playerSideRef = useRef(null);

  const [playerSide, setPlayerSide] = useState(null);
  const [status, setStatus] = useState('Connecting...');
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [players, setPlayers] = useState([]);

  const canControl = playerSide === 'left' || playerSide === 'right';

  const sendInput = useCallback(
    (dir) => {
      if (!socket) return;
      if (currentDirRef.current === dir) return;
      currentDirRef.current = dir;
      socket.emit('game_input', { dir });
    },
    [socket]
  );

  useEffect(() => {
    if (!gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      parent: gameRef.current,
      backgroundColor: '#0a1418',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
      },
      scene: {
        create: function () {
          const ball = this.add.circle(BASE_WIDTH / 2, BASE_HEIGHT / 2, 8, 0x4ade80);
          const leftPaddle = this.add.rectangle(40, BASE_HEIGHT / 2, 14, 90, 0x34d399);
          const rightPaddle = this.add.rectangle(BASE_WIDTH - 40, BASE_HEIGHT / 2, 14, 90, 0x34d399);
          objectsRef.current = { ball, leftPaddle, rightPaddle };
        },
      },
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.emit('game_join', { name: currentUser });

    const handleJoined = (payload) => {
      const side = payload?.side || null;
      playerSideRef.current = side;
      setPlayerSide(side);
      if (payload?.state?.scores) {
        setScores(payload.state.scores);
      }
      setStatus(side ? `You are ${side}` : 'Spectating');
    };

    const handleState = (state) => {
      if (!state) return;
      setScores(state.scores || { left: 0, right: 0 });
      setPlayers(state.players || []);

      const leftPlayer = (state.players || []).find((p) => p.side === 'left');
      const rightPlayer = (state.players || []).find((p) => p.side === 'right');
      const side = playerSideRef.current;
      if (side === 'left' || side === 'right') {
        if (!leftPlayer || !rightPlayer) {
          setStatus('Waiting for opponent...');
        } else {
          setStatus(`You are ${side}`);
        }
      } else {
        setStatus('Spectating');
      }

      if (!objectsRef.current) return;
      const { ball, leftPaddle, rightPaddle } = objectsRef.current;
      if (state.ball) {
        ball.setPosition(state.ball.x, state.ball.y);
      }
      if (leftPlayer) {
        leftPaddle.setPosition(40, leftPlayer.y);
      }
      if (rightPlayer) {
        rightPaddle.setPosition(BASE_WIDTH - 40, rightPlayer.y);
      }
    };

    socket.on('game_joined', handleJoined);
    socket.on('game_state', handleState);

    return () => {
      socket.off('game_joined', handleJoined);
      socket.off('game_state', handleState);
      socket.emit('game_leave');
      sendInput(0);
    };
  }, [socket, currentUser, sendInput]);

  useEffect(() => {
    if (!canControl) return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        sendInput(-1);
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        sendInput(1);
      }
    };

    const handleKeyUp = (event) => {
      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key.toLowerCase() === 'w' ||
        event.key.toLowerCase() === 's'
      ) {
        sendInput(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canControl, sendInput]);

  const leftName = players.find((p) => p.side === 'left')?.name || 'Waiting';
  const rightName = players.find((p) => p.side === 'right')?.name || 'Waiting';

  return (
    <div className="game-canvas-container">
      <div className="game-header">
        <div className="game-score">
          <span>{leftName}</span>
          <strong>
            {scores.left} : {scores.right}
          </strong>
          <span>{rightName}</span>
        </div>
        <div className="game-status">{status}</div>
      </div>
      <div ref={gameRef} className="game-canvas" />
      {canControl && (
        <div className="game-mobile-controls">
          <button
            className="game-control-btn"
            onPointerDown={() => sendInput(-1)}
            onPointerUp={() => sendInput(0)}
            onPointerLeave={() => sendInput(0)}
            onPointerCancel={() => sendInput(0)}
          >
            ▲
          </button>
          <button
            className="game-control-btn"
            onPointerDown={() => sendInput(1)}
            onPointerUp={() => sendInput(0)}
            onPointerLeave={() => sendInput(0)}
            onPointerCancel={() => sendInput(0)}
          >
            ▼
          </button>
        </div>
      )}
      <div className="game-controls">
        <button onClick={onGameEnd} className="game-close-btn">
          Close Game
        </button>
      </div>
    </div>
  );
}

export default GameCanvas;
