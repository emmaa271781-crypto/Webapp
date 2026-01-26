import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import './GameCanvas.css';

function GameCanvas({ gameType = 'pong', onGameEnd, socket, currentUser }) {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  const [opponentName, setOpponentName] = useState('');
  const gameDataRef = useRef({ ball: { x: 400, y: 300 }, paddle1: 300, paddle2: 300 });

  // Socket.IO game sync
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleGameJoin = (data) => {
      console.log('[Game] Joined game:', data);
      setIsPlayer1(data.isPlayer1 || false);
      setGameState(data.gameState || 'waiting');
      if (data.opponentName) {
        setOpponentName(data.opponentName);
      }
    };

    const handleGameState = (data) => {
      if (data.ball) {
        gameDataRef.current.ball = data.ball;
      }
      if (data.paddle1 !== undefined) {
        gameDataRef.current.paddle1 = data.paddle1;
      }
      if (data.paddle2 !== undefined) {
        gameDataRef.current.paddle2 = data.paddle2;
      }
    };

    const handleGameStart = () => {
      setGameState('playing');
    };

    const handleGameEnd = () => {
      setGameState('finished');
    };

    socket.on('game_joined', handleGameJoin);
    socket.on('game_state', handleGameState);
    socket.on('game_start', handleGameStart);
    socket.on('game_end', handleGameEnd);

    // Join game
    socket.emit('game_join', { gameType, playerName: currentUser });

    return () => {
      socket.off('game_joined', handleGameJoin);
      socket.off('game_state', handleGameState);
      socket.off('game_start', handleGameStart);
      socket.off('game_end', handleGameEnd);
      socket.emit('game_leave');
    };
  }, [socket, currentUser, gameType]);

  useEffect(() => {
    if (!gameRef.current || !socket) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: {
        preload: function() {
          this.load.image('ball', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        },
        create: function() {
          // Simple Pong game
          this.ball = this.add.circle(400, 300, 10, 0x4ade80);
          this.physics.add.existing(this.ball);
          this.ball.body.setVelocity(200, 200);
          this.ball.body.setCollideWorldBounds(true);
          this.ball.body.setBounce(1, 1);

          // Paddles
          this.paddle1 = this.add.rectangle(50, 300, 20, 100, 0x34d399);
          this.physics.add.existing(this.paddle1);
          this.paddle1.body.setImmovable(true);

          this.paddle2 = this.add.rectangle(750, 300, 20, 100, 0x34d399);
          this.physics.add.existing(this.paddle2);
          this.paddle2.body.setImmovable(true);

          // Controls - only control your paddle
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys('W,S');

          // Collision
          this.physics.add.collider(this.ball, this.paddle1);
          this.physics.add.collider(this.ball, this.paddle2);

          // Sync interval
          this.syncInterval = setInterval(() => {
            if (socket && gameState === 'playing') {
              socket.emit('game_move', {
                paddle: isPlayer1 ? 'paddle1' : 'paddle2',
                y: isPlayer1 ? this.paddle1.y : this.paddle2.y,
              });
            }
          }, 50);
        },
        update: function() {
          // Only control your own paddle
          const myPaddle = isPlayer1 ? this.paddle1 : this.paddle2;
          const otherPaddle = isPlayer1 ? this.paddle2 : this.paddle1;

          // Move your paddle
          if (this.cursors.up.isDown || this.wasd.W.isDown) {
            myPaddle.y -= 5;
          } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            myPaddle.y += 5;
          }

          // Sync opponent paddle from server
          if (isPlayer1) {
            this.paddle2.y = Phaser.Math.Clamp(gameDataRef.current.paddle2, 50, 550);
          } else {
            this.paddle1.y = Phaser.Math.Clamp(gameDataRef.current.paddle1, 50, 550);
          }

          // Sync ball position from server (authoritative)
          if (gameDataRef.current.ball) {
            this.ball.x = gameDataRef.current.ball.x;
            this.ball.y = gameDataRef.current.ball.y;
            if (gameDataRef.current.ball.vx && gameDataRef.current.ball.vy) {
              this.ball.body.setVelocity(gameDataRef.current.ball.vx, gameDataRef.current.ball.vy);
            }
          }

          // Keep paddles in bounds
          myPaddle.y = Phaser.Math.Clamp(myPaddle.y, 50, 550);
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
  }, [gameType, socket, isPlayer1, gameState]);

  return (
    <div className="game-canvas-container">
      <div className="game-header">
        <div className="game-status">
          {gameState === 'waiting' && <span>Waiting for opponent...</span>}
          {gameState === 'playing' && (
            <span>
              {isPlayer1 ? 'You (Left)' : opponentName || 'Opponent (Left)'} vs {isPlayer1 ? opponentName || 'Opponent (Right)' : 'You (Right)'}
            </span>
          )}
          {gameState === 'finished' && <span>Game Finished</span>}
        </div>
        <button onClick={onGameEnd} className="game-close-btn">
          Close Game
        </button>
      </div>
      <div ref={gameRef} className="game-canvas" />
      <div className="game-controls">
        <div className="game-instructions">
          {gameState === 'playing' && (
            <p>Use Arrow Keys or W/S to move your paddle</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameCanvas;
