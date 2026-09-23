import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/state/gameStore';
import { getAllGames } from '../src/storage/gameHistoryStore';

describe('gameStore teslim olma (resign)', () => {
  beforeEach(() => {
    useGameStore.getState().startClassic('w', false);
  });

  it('teslim, oyunu kayıp olarak bitirir ve kaydeder', async () => {
    const store = useGameStore.getState();
    store.game.move({ from: 'e2', to: 'e4' });
    await useGameStore.getState().resignGame();

    const s = useGameStore.getState();
    expect(s.gameOverInfo?.over).toBe(true);
    expect(s.gameOverInfo?.result).toContain('Teslim');
    expect(s.matchInProgress).toBe(false);

    const games = await getAllGames();
    expect(games.length).toBeGreaterThan(0);
    expect(games[0].result).toBe('loss');
    expect(games[0].moveCount).toBe(1);
  });

  it('devam eden maç yokken teslim etkisizdir', async () => {
    useGameStore.setState({ matchInProgress: false, gameOverInfo: null });
    await useGameStore.getState().resignGame();
    expect(useGameStore.getState().gameOverInfo).toBeNull();
  });
});

describe('gameStore geri alma (undo)', () => {
  beforeEach(() => {
    useGameStore.getState().startClassic('w', false);
  });

  it('yerel iki oyuncuda iki hamleyi geri alır', async () => {
    const store = useGameStore.getState();
    store.game.move({ from: 'e2', to: 'e4' });
    store.game.move({ from: 'e7', to: 'e5' });
    expect(useGameStore.getState().canUndo()).toBe(true);

    await useGameStore.getState().undoLastMove();

    const s = useGameStore.getState();
    expect(s.game.history().length).toBe(0);
    expect(s.lastMove).toBeNull();
  });

  it('geçmiş boşken geri alınamaz', () => {
    expect(useGameStore.getState().canUndo()).toBe(false);
  });

  it('maç bitince geri alma kilitlenir', async () => {
    const store = useGameStore.getState();
    store.game.move({ from: 'e2', to: 'e4' });
    await useGameStore.getState().resignGame();
    expect(useGameStore.getState().canUndo()).toBe(false);
  });
});

describe('varyant ekstra hamle (Treasure bonus bayrağı)', () => {
  it('bonusMoveFor bayrağı sırayı gerçekten hamle sahibine çevirir ve tüketilir', async () => {
    useGameStore.getState().startClassic('w', false);
    const store = useGameStore.getState();
    // Beyaz piyon sandık karesine ulaşır; varyant state'i elle kuruyoruz.
    useGameStore.setState({
      variantState: {
        variantId: 'treasure', moveCounter: 1,
        customData: { chests: [], extraTurnFor: 'w' },
        activeEvents: [], log: [],
      },
    });
    await useGameStore.getState().playMove('a2' as any, 'a4' as any);

    const s = useGameStore.getState();
    // chess.js sırayı siyaha çevirirdi; ekstra hamle beyaza geri çevrilmiş olmalı.
    expect(s.game.raw.turn()).toBe('w');
    // Bayrak tüketildi: ikinci hamlede tekrar ekstra hamle vermez.
    expect(s.variantState?.customData['extraTurnFor']).toBeUndefined();
    expect(s.variantState?.customData['bonusMoveFor']).toBeUndefined();
  });
});
