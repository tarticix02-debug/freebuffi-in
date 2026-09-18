import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';

describe('ChessGame.forceActiveColor', () => {
  it('sırayı gerçekten değiştirir', () => {
    const game = new ChessGame();
    game.move({ from: 'e2', to: 'e4' }); // sıra artık siyah'ta
    expect(game.snapshot().turn).toBe('b');
    game.forceActiveColor('w');
    expect(game.snapshot().turn).toBe('w');
  });

  it('tahta durumunu (taş dizilimini) bozmaz', () => {
    const game = new ChessGame();
    game.move({ from: 'e2', to: 'e4' });
    const fenBefore = game.fen().split(' ')[0];
    game.forceActiveColor('w');
    const fenAfter = game.fen().split(' ')[0];
    expect(fenAfter).toBe(fenBefore);
  });
});
