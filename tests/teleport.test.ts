import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';
import { TeleportVariant } from '../src/variants/teleport/TeleportVariant';

describe('Teleport Chess', () => {
  it('ışınlanma karesine gelen taş gerçekten partner kareye taşınır', () => {
    const game = new ChessGame('4k3/8/8/8/8/8/8/4K2R w - - 0 1');
    const state = TeleportVariant.initialize(game);
    state.customData.pads = { h3: 'a3' };
    game.move({ from: 'h1', to: 'h3' });
    const events = TeleportVariant.onAfterMove!(state, game);
    expect(events[0].type).toBe('TELEPORT');
    expect(game.raw.get('h3' as any)).toBeUndefined();
    expect(game.raw.get('a3' as any)?.type).toBe('r');
  });

  it('partner karede rakip taş varsa alınır', () => {
    const game = new ChessGame('4k3/8/8/8/8/n7/8/4K2R w - - 0 1');
    const state = TeleportVariant.initialize(game);
    state.customData.pads = { h3: 'a3' };
    game.move({ from: 'h1', to: 'h3' });
    const events = TeleportVariant.onAfterMove!(state, game);
    expect(events[0].payload.captured).toBe(true);
    expect(game.raw.get('a3' as any)?.color).toBe('w');
  });

  it('partner karede kendi taşı varsa ışınlanma engellenir', () => {
    const game = new ChessGame('4k3/8/8/8/8/N7/8/4K2R w - - 0 1');
    const state = TeleportVariant.initialize(game);
    state.customData.pads = { h3: 'a3' };
    game.move({ from: 'h1', to: 'h3' });
    const events = TeleportVariant.onAfterMove!(state, game);
    expect(events[0].type).toBe('TELEPORT_BLOCKED');
    expect(game.raw.get('h3' as any)?.type).toBe('r'); // taş yerinde kaldı
  });
});
