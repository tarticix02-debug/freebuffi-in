import { describe, it, expect } from 'vitest';  
import { Chess } from 'chess.js';  
import { computeOpeningPerformance } from '../src/services/openingStatsService';  
import type { GameRecord } from '../src/storage/gameHistoryStore';  
  
function fakeGame(overrides: Partial<GameRecord>): GameRecord {  
  const c = new Chess();  
  c.move('e4'); c.move('e5'); c.move('Nf3'); c.move('Nc6'); c.move('Bc4');  
  return {  
    id: 'g', date: Date.now(), mode: 'classic', opponent: 'x', userColor: 'w',  
    result: 'win', pgn: c.pgn(), finalFen: c.fen(), moveCount: 5,  
    durationSeconds: 0, ratingBefore: 1200, ratingAfter: 1216, ...overrides,  
  };  
}  
  
describe('Gerçek oyunlardan açılış istatistiği', () => {  
  it('sabit değer yok, gerçek PGN\'den hesaplanır', () => {  
    const games = [fakeGame({ result: 'win' }), fakeGame({ result: 'loss' }), fakeGame({ result: 'win' })];  
    const perf = computeOpeningPerformance(games);  
    expect(perf).toHaveLength(1);  
    expect(perf[0].name).toBe('İtalyan Açılışı');  
    expect(perf[0].games).toBe(3);  
    expect(perf[0].winRate).toBeCloseTo(66.67, 1);  
  });  
  
  it('oyun yoksa boş dizi döner', () => {  
    expect(computeOpeningPerformance([])).toEqual([]);  
  });  
});
