// Boardgame.io game definitions
import { TicTacToe } from './TicTacToe';
import { Checkers } from './Checkers';
import { ConnectFour } from './ConnectFour';
import { Chess } from './Chess';

export const GAMES = {
  tictactoe: {
    name: 'Tic-Tac-Toe',
    component: TicTacToe,
    minPlayers: 2,
    maxPlayers: 2,
  },
  checkers: {
    name: 'Checkers',
    component: Checkers,
    minPlayers: 2,
    maxPlayers: 2,
  },
  connectfour: {
    name: 'Connect Four',
    component: ConnectFour,
    minPlayers: 2,
    maxPlayers: 2,
  },
  chess: {
    name: 'Chess',
    component: Chess,
    minPlayers: 2,
    maxPlayers: 2,
  },
};

export { TicTacToe, Checkers, ConnectFour, Chess };
