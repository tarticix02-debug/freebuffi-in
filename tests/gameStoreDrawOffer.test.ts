import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/state/gameStore';
import { getAllGames } from '../src/storage/gameHistoryStore';

describe('gameStore beraberlik önerisi (offerDraw)', () => {
  beforeEach(() => {
    useGameStore.getState().startClassic('w', false);
  });

  it('yerel oyunda öner anında beraberlikle biter ve kaydedilir', async () => {
    const store = useGameStore.getState();
    store.game.move({ from: 'e2', to: 'e4' });
    store.game.move({ from: 'e7', to: 'e5' });
    await useGameStore.getState().offerDraw();

    const s = useGameStore.getState();
    expect(s.gameOverInfo?.over).toBe(true);
    expect(s.gameOverInfo?.winner).toBeNull();
    expect(s.gameOverInfo?.endReason).toBe('draw');
    expect(s.matchInProgress).toBe(false);

    const games = await getAllGames();
    expect(games[0].result).toBe('draw');
  });

  it('devam eden maç yokken öner etkisizdir', async () => {
    useGameStore.setState({ matchInProgress: false, gameOverInfo: null });
    await useGameStore.getState().offerDraw();
    expect(useGameStore.getState().gameOverInfo).toBeNull();
  });

  it('bitmiş bir tahtada (mat) öner yeni bir şey yapmaz', async () => {
    const store = useGameStore.getState();
    // Scholar's mate: 1.e4 e5 2.Bc4 Bc5 3.Qh5 Nf6?? 4.Qxf7#
    await store.playMove('e2', 'e4');
    await store.playMove('e7', 'e5');
    await store.playMove('f1', 'c4');
    await store.playMove('f8', 'c5');
    await store.playMove('d1', 'h5');
    await store.playMove('g8', 'f6');
    await store.playMove('h5', 'f7');
    expect(useGameStore.getState().gameOverInfo?.endReason).toBe('checkmate');
    await useGameStore.getState().offerDraw();
    // Mat bitişi bozulmaz, offerDraw sessizce döner.
    expect(useGameStore.getState().gameOverInfo?.endReason).toBe('checkmate');
  });
});
