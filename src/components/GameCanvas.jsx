import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import './GameCanvas.css';

function GameCanvas({ gameType = 'pong', onGameEnd }) {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current) return;

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
          // Create simple shapes for games
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

          // Controls
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys('W,S');

          // Collision
          this.physics.add.collider(this.ball, this.paddle1);
          this.physics.add.collider(this.ball, this.paddle2);
        },
        update: function() {
          // Paddle movement
          if (this.cursors.up.isDown || this.wasd.W.isDown) {
            this.paddle1.y -= 5;
          } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            this.paddle1.y += 5;
          }

          // AI paddle (simple)
          if (this.ball.y < this.paddle2.y) {
            this.paddle2.y -= 3;
          } else if (this.ball.y > this.paddle2.y) {
            this.paddle2.y += 3;
          }

          // Keep paddles in bounds
          this.paddle1.y = Phaser.Math.Clamp(this.paddle1.y, 50, 550);
          this.paddle2.y = Phaser.Math.Clamp(this.paddle2.y, 50, 550);
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
  }, [gameType]);

  return (
    <div className="game-canvas-container">
      <div ref={gameRef} className="game-canvas" />
      <div className="game-controls">
        <button onClick={onGameEnd} className="game-close-btn">
          Close Game
        </button>
      </div>
    </div>
  );
}

export default GameCanvas;
