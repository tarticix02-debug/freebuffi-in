import { describe, it, expect } from 'vitest';
import { winPercentWhite, accuracyFromLoss, classifyMove } from '../src/engine/evaluation';
import { identifyOpening } from '../src/services/openingService';

describe('değerlendirme formülleri', () => {
it('eşit pozisyonda win% ~50 olmalı', () => {
expect(winPercentWhite({ cpWhite: 0, mateWhite: null })).toBeCloseTo(50, 0);
});

it('büyük cp avantajı yüksek win% üretir', () => {
expect(winPercentWhite({ cpWhite: 800, mateWhite: null })).toBeGreaterThan(90);
});

it('mat pozisyonu 0 veya 100 döner', () => {
expect(winPercentWhite({ cpWhite: null, mateWhite: 3 })).toBe(100);
expect(winPercentWhite({ cpWhite: null, mateWhite: -2 })).toBe(0);
});

it('kayıp yoksa accuracy ~100 olmalı', () => {
expect(accuracyFromLoss(0)).toBeGreaterThan(99);
});

it('büyük win% kaybında accuracy düşük olmalı', () => {
expect(accuracyFromLoss(40)).toBeLessThan(30);
});

it('WDL: kazanma olasılığı W + D/2 (beraberlik yarım puan)', () => {
// 400W 400D 200L -> (400+200)/1000 = 60
expect(winPercentWhite({ wdlWhite: { w: 400, d: 400, l: 200 }, cpWhite: null, mateWhite: null })).toBe(60);
// WDL yoksa lojistiğe düşer (eşitlik ~50)
expect(winPercentWhite({ cpWhite: 0, mateWhite: null })).toBeCloseTo(50, 0);
// mat WDL'den önce satüre eder
expect(winPercentWhite({ wdlWhite: { w: 100, d: 0, l: 900 }, cpWhite: 0, mateWhite: 3 })).toBe(100);
});

it('top move + büyük kritiklik farkı -> great', () => {
const cls = classifyMove({ winPercentLoss: 0, playedIsTopEngineMove: true, topMoveCriticalityGap: 15, isBookMove: false });
expect(cls).toBe('great');
});

it('top move + düşük kritiklik farkı -> best', () => {
const cls = classifyMove({ winPercentLoss: 0, playedIsTopEngineMove: true, topMoveCriticalityGap: 2, isBookMove: false });
expect(cls).toBe('best');
});

it('büyük winPercentLoss -> blunder', () => {
const cls = classifyMove({ winPercentLoss: 35, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false });
expect(cls).toBe('blunder');
});

it('chess.com: 20+ kayıp kazanan pozisyonda bile blunder, miss değil', () => {
const cls = classifyMove({ winPercentLoss: 45, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false, moverWinPercentBefore: 95, moverWinPercentAfter: 50 });
expect(cls).toBe('blunder');
});

it('eldeki matı kaçırmak her zaman miss', () => {
const cls = classifyMove({ winPercentLoss: 3, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false, moverMateBefore: 2 });
expect(cls).toBe('miss');
});

it('eldeki mat hâlâ veriliyorsa miss değil', () => {
const cls = classifyMove({ winPercentLoss: 0, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false, moverMateBefore: 2 });
expect(cls).toBe('excellent');
});

it('kazanılan pozisyonu gerçekten düşürmek miss, süpürme değil', () => {
// 80 -> 64: kazanılan pozisyon artık kazanılan değil (chess.com "Missed win")
const miss = classifyMove({ winPercentLoss: 16, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false, moverWinPercentBefore: 80, moverWinPercentAfter: 64 });
expect(miss).toBe('miss');
// 70 -> 52: 18 puanlık düşüş ama pozisyon baştan kazanılan değildi -> mistake
const mid = classifyMove({ winPercentLoss: 18, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false, moverWinPercentBefore: 70, moverWinPercentAfter: 52 });
expect(mid).toBe('mistake');
});
});

describe('açılış tanıma', () => {
it('İtalyan açılışını tanır', () => {
expect(identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']).name).toBe('İtalyan Açılışı');
});

it('bilinmeyen dizide null döner', () => {
expect(identifyOpening(['a3', 'a6', 'a4']).name).toBeNull();
});
});
