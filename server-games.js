// Colyseus game server for multiplayer games
const { Server } = require("colyseus");
const http = require("http");
const express = require("express");

const app = express();
const server = http.createServer(app);
const gameServer = new Server({
  server,
});

// Game room for multiplayer games
class GameRoom extends require("colyseus").Room {
  onCreate(options) {
    this.setState({
      players: {},
      gameState: "waiting", // waiting, playing, finished
      currentTurn: null,
    });

    this.onMessage("join", (client, message) => {
      this.state.players[client.sessionId] = {
        id: client.sessionId,
        name: message.name || "Player",
        score: 0,
      };
      this.broadcast("player_joined", { player: this.state.players[client.sessionId] });
    });

    this.onMessage("action", (client, message) => {
      // Handle game actions
      this.broadcast("game_update", {
        playerId: client.sessionId,
        action: message.action,
        data: message.data,
      });
    });

    this.onMessage("leave", (client) => {
      delete this.state.players[client.sessionId];
      this.broadcast("player_left", { playerId: client.sessionId });
    });
  }

  onJoin(client, options) {
    console.log(`[GameRoom] Player ${client.sessionId} joined`);
  }

  onLeave(client, consented) {
    console.log(`[GameRoom] Player ${client.sessionId} left`);
  }

  onDispose() {
    console.log("[GameRoom] Room disposed");
  }
}

gameServer.define("game", GameRoom);

const GAME_PORT = process.env.GAME_PORT || 2567;

server.listen(GAME_PORT, () => {
  console.log(`🎮 Game server running on port ${GAME_PORT}`);
});

module.exports = { gameServer, app };
