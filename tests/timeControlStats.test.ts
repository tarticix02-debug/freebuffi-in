import { describe, it, expect, beforeEach } from 'vitest';
import { computeTimeControlStats } from '../src/services/statsService';
import { saveGame, getAllGames } from '../src/storage/gameHistoryStore';
import { TIME_CONTROLS } from '../src/services/clockService';
import type { GameRecord } from '../src/storage/gameHistoryStore';

const KNOWN = TIME_CONTROLS.map(({ id, label }) => ({ id, label }));

function rec(over: Partial<GameRecord>): GameRecord {
  return {
    id: 'r' + Math.random().toString(36).slice(2),
    date: Date.now(), mode: 'classic', opponent: 'Test', userColor: 'w',
    result: 'win', pgn: '', finalFen: '', moveCount: 2, durationSeconds: 60,
    ratingBefore: 1200, ratingAfter: 1210, ...over,
  };
}

describe('computeTimeControlStats (saf helper)', () => {
  it('boş liste → boş kırılım', () => {
    expect(computeTimeControlStats([], KNOWN)).toEqual({});
  });

  it('kazanma/kayip/beraberlik sayar ve winRate hesaplar', () => {
    const games = [
      rec({ timeControlId: 'blitz5+0', result: 'win' }),
      rec({ timeControlId: 'blitz5+0', result: 'loss' }),
      rec({ timeControlId: 'blitz5+0', result: 'draw' }),
    ];
    const s = computeTimeControlStats(games, KNOWN);
    expect(s['blitz5+0']).toMatchObject({ label: '5+0', games: 3, wins: 1, losses: 1, draws: 1 });
    expect(s['blitz5+0'].winRate).toBeCloseTo(33.3, 0);
  });

  it('timeControlId olmayan eski kayıt → unknown kovası', () => {
    const games = [rec({}), rec({})];
    const s = computeTimeControlStats(games, KNOWN);
    expect(s['unknown'].games).toBe(2);
    expect(s['unknown'].label).toBe('Bilinmeyen');
  });

  it('bilinen id etiketle, bilinmeyen id ham etiket, sıra TIME_CONTROLS ile', () => {
    const games = [
      rec({ timeControlId: 'rapid10+0' }),
      rec({ timeControlId: 'unlimited' }),
      rec({ timeControlId: 'mega-blitz' }), // kayıtlı ama listede yok
    ];
    const s = computeTimeControlStats(games, KNOWN);
    const keys = Object.keys(s);
    expect(keys.indexOf('unlimited')).toBeLessThan(keys.indexOf('rapid10+0'));
    expect(s['rapid10+0'].label).toBe('10+0');
    expect(s['mega-blitz'].label).toBe('mega-blitz'); // özel id düz metin olarak gösterilir
  });
});

describe('store entegrasyonu — saveGame timeControlId taşıyor', () => {
  beforeEach(async () => {
    const { dbDelete } = await import('../src/storage/db');
    const all = await getAllGames();
    for (const g of all) await dbDelete('games', g.id);
  });

  it('kaydedilen oyun kırılımda görünür', async () => {
    await saveGame(rec({ timeControlId: 'blitz3+2', result: 'win' }));
    const games = await getAllGames();
    expect(games[0].timeControlId).toBe('blitz3+2');
    const s = computeTimeControlStats(games, KNOWN);
    expect(s['blitz3+2'].games).toBe(1);
    expect(s['blitz3+2'].wins).toBe(1);
  });
});
