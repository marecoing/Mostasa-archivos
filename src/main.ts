import Phaser from 'phaser';
import { createGameConfig } from './game/config/GameConfig';

function hideLoadingScreen(): void {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.classList.add('hidden');
    setTimeout(() => screen.remove(), 600);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const config = createGameConfig('game-container');
  const game = new Phaser.Game(config);

  game.events.on('ready', () => {
    hideLoadingScreen();
  });
});
