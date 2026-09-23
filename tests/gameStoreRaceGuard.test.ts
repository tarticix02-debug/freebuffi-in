import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/state/gameStore';
import { useEngineStore } from '../src/state/engineStore';
import { ChessGame } from '../src/chess/ChessGame';

// MockWorker'lı motor: yavaş cevap verir (races test etmek için).
class SlowMockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  listeners: ((e: MessageEvent) => void)[] = [];
  postMessage(cmd: string) {
    if (cmd.startsWith('go')) {
      // cevabı 30ms geciktir
      setTimeout(() => this.emit('bestmove e7e5'), 30);
    }
  }
  addEventListener(_t: string, fn: (e: MessageEvent) => void) { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent) => void) { this.listeners = this.listeners.filter((l) => l !== fn); }
  emit(data: string) { this.listeners.forEach((l) => l({ data } as MessageEvent)); }
  terminate() {}
}
// @ts-expect-error test ortamında Worker'ı mockluyoruz
global.Worker = SlowMockWorker;

describe('eşleşme yarışı koruması (race guard)', () => {
  it('yeni maç başlatınca havada kalan eski motor cevabı tahtayı bozmaz', async () => {
    // 1) Bilgisayara karşı maç başlat (oyun motorundan hamle bekleyecek).
    useGameStore.getState().startClassic('b', true);
    expect(useGameStore.getState().game.history().length).toBe(0);

    // 2) Motor cevabı gelmeden yeni bir maç başlat.
    await new Promise((r) => setTimeout(r, 5));
    const freshGame = new ChessGame();
    useGameStore.setState({ game: freshGame });
    useGameStore.getState().startClassic('b', true);

    // 3) Eski motor cevabının gecikmesi dolunca tahtanın hâlâ temiz olduğunu doğrula.
    await new Promise((r) => setTimeout(r, 60));
    const s = useGameStore.getState();
    expect(s.game).toBe(useGameStore.getState().game);
    expect(s.game.history().length).toBe(0); // e7e5 sızmadı
  });

  it('resign sonrası gelen motor cevabı işlenmez', async () => {
    useGameStore.getState().startClassic('b', true);
    await new Promise((r) => setTimeout(r, 5));
    await useGameStore.getState().resignGame();

    await new Promise((r) => setTimeout(r, 60));
    const s = useGameStore.getState();
    // Teslim sonrası tahta değişmemeli ve maç bitmiş kalmalı.
    expect(s.matchInProgress).toBe(false);
    expect(s.game.history().length).toBe(0);
    expect(s.gameOverInfo?.result).toContain('Teslim');
  });
});

// engineStore'un testte gerçek Worker aramasını engellemek için referans.
void useEngineStore;
