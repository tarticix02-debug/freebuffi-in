import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/state/gameStore';
import { getAllGames } from '../src/storage/gameHistoryStore';
import { TIME_CONTROLS, type ClockState } from '../src/services/clockService';

const BLITZ = TIME_CONTROLS.find((t) => t.id === 'blitz5+0')!.control;

function exhaustedClock(active: 'w' | 'b'): ClockState {
  // Aktif tarafın süresi bitmiş, tick zamanı da çoktan geçmiş.
  return { whiteMs: 0, blackMs: 0, activeColor: active, turnStartedAt: Date.now() - 5000 };
}

describe('gameStore süre bitişi (flag-fall)', () => {
  beforeEach(() => {
    useGameStore.getState().startClassic('w', false, 'blitz5+0');
  });

  it('süreli oyun başlatınca saat kurulur, sınırsızda kurulmaz', () => {
    expect(useGameStore.getState().clock).not.toBeNull();
    expect(useGameStore.getState().clockControl.initialSeconds).toBe(300);

    useGameStore.getState().startClassic('w', false, 'unlimited');
    expect(useGameStore.getState().clock).toBeNull();
  });

  it('bayrak düşen (beyaz) kaybeder, oyun kaydedilir', async () => {
    useGameStore.setState({ clock: exhaustedClock('w') });
    await useGameStore.getState().tickClock();

    const s = useGameStore.getState();
    expect(s.matchInProgress).toBe(false);
    expect(s.gameOverInfo?.over).toBe(true);
    expect(s.gameOverInfo?.winner).toBe('b'); // siyah süreyle kazandı
    expect(s.lastSavedGameId).not.toBeNull();

    const games = await getAllGames();
    expect(games[0].result).toBe('loss'); // kullanıcının perspektifi (beyaz oynadı)
  });

  it('rakipte yalnızca kral varsa bayrak beraberliktir', async () => {
    // Tahtadan beyaz taşılları kaldır: siyahta yalnız kral kalsın.
    const store = useGameStore.getState();
    const game = store.game;
    const board = game.board();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell && cell.color === 'b' && cell.type !== 'k') game.remove(cell.square);
    }
    useGameStore.setState({ clock: exhaustedClock('w') });
    await useGameStore.getState().tickClock();

    const s = useGameStore.getState();
    expect(s.gameOverInfo?.winner).toBeNull();
    const games = await getAllGames();
    expect(games[0].result).toBe('draw');
  });

  it('süresi biten yokken tick no-op', async () => {
    await useGameStore.getState().tickClock();
    expect(useGameStore.getState().matchInProgress).toBe(true);
    expect(useGameStore.getState().gameOverInfo).toBeNull();
  });
});
