import { Game } from './core/Game.js';

function bootstrap(): void {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game canvas not found');
  }
  const game = new Game(canvas);
  game.start();
  // Persist on unload.
  window.addEventListener('beforeunload', () => game.saveConfig());
  // Helpful global for debugging.
  (window as unknown as { game: Game }).game = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
