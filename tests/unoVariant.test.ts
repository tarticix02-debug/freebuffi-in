import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';
import { UnoVariant } from '../src/variants/uno/UnoVariant';

describe('UNO Chess varyant mantığı', () => {
  it('her oyuncu 7 kartla başlar', () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    expect(data.hands.w).toHaveLength(7);
    expect(data.hands.b).toHaveLength(7);
  });

  it('Skip kartı gerçekten rakibin turunu atlatır (aynı oyuncu tekrar oynar)', () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [{ id: 'x', color: data.topColor, value: 'skip' }];

    const result = UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'x' } }, 'w');
    expect(result.success).toBe(true);

    game.move({ from: 'e2', to: 'e4' }); // Beyaz'ın gerçek chess hamlesi
    UnoVariant.onAfterMove!(state, game);

    expect(game.raw.turn()).toBe('w'); // Siyah'ın sırası atlandı, tekrar Beyaz'da
  });

  it('Draw Two rakibin eline gerçekten 2 kart ekler', () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [{ id: 'x', color: data.topColor, value: 'draw2' }];
    const blackHandBefore = data.hands.b.length;

    UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'x' } }, 'w');
    game.move({ from: 'e2', to: 'e4' });
    UnoVariant.onAfterMove!(state, game);

    expect(data.hands.b.length).toBe(blackHandBefore + 2);
  });

  it('Wild Draw Four sonrası rakip taş alamaz', () => {
    const game = new ChessGame('4k3/8/8/3p4/8/8/8/4K2R w - - 0 1');
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [{ id: 'x', color: data.topColor, value: 'wild4' }];

    UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'x', chosenColor: 'red' } }, 'w');
    game.move({ from: 'h1', to: 'h5' });
    UnoVariant.onAfterMove!(state, game);

    // Sıra tekrar Beyaz'da (skip uygulandı), pendingForcedNonCapture Siyah üzerinde olmalı
    expect(data.pendingForcedNonCapture?.color).toBe('b');
  });

  it('Wild kartı gerçekten iki kendi taşını yer değiştirir', () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [{ id: 'x', color: 'wild', value: 'wild' }];

    const beforeA = game.raw.get('a1' as any);
    const beforeB = game.raw.get('b1' as any);

    UnoVariant.applyCustomAction!(state, game, {
      type: 'PLAY_CARD', payload: { cardId: 'x', chosenColor: 'red', swapSquares: ['a1', 'b1'] },
    }, 'w');

    expect(game.raw.get('a1' as any)?.type).toBe(beforeB!.type);
    expect(game.raw.get('b1' as any)?.type).toBe(beforeA!.type);
  });

  it("el biterse bonus hamle event'i üretir", () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [{ id: 'x', color: data.topColor, value: '5' }];

    const result = UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'x' } }, 'w');
    expect(result.events.some((e) => e.type === 'UNO_HAND_EMPTY')).toBe(true);
    expect(data.bonusMoveFor).toBe('w');
  });

  it('aynı turda ikinci kez kart oynanamaz', () => {
    const game = new ChessGame();
    const state = UnoVariant.initialize(game);
    const data = state.customData as any;
    data.hands.w = [
      { id: 'x', color: data.topColor, value: '3' },
      { id: 'y', color: data.topColor, value: '4' },
    ];
    UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'x' } }, 'w');
    const second = UnoVariant.applyCustomAction!(state, game, { type: 'PLAY_CARD', payload: { cardId: 'y' } }, 'w');
    expect(second.success).toBe(false);
  });
});
