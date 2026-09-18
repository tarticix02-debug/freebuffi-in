import { describe, it, expect } from 'vitest';
import { keyMomentPlies, nextKeyMoment } from '../src/services/reviewNavigationService';
import { buildAnnotatedPgn, CLASS_NAG } from '../src/services/pgnExportService';
import type { GameReviewResult, MoveReview } from '../src/services/gameReviewService';

function fakeMove(over: Partial<MoveReview> = {}): MoveReview {
  return {
    ply: 0,
    side: 'w',
    san: 'e4',
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    playedUci: 'e2e4',
    bestUci: 'e2e4',
    moverWinPercentBefore: 55,
    moverWinPercentAfter: 60,
    evalAfterWhiteCp: 30,
    evalAfterMate: null,
    winPercentLoss: 0,
    accuracy: 99,
    classification: 'best',
    isBookMove: false,
    ...over,
  };
}

function fakeResult(moves: MoveReview[]): GameReviewResult {
  return {
    moves,
    evalHistoryWhiteCp: [0, ...moves.map(() => 20)],
    whiteAccuracy: 90,
    blackAccuracy: 90,
    openingName: null,
    openingEco: null,
    whiteClassCounts: {},
    blackClassCounts: {},
  };
}

describe('önemli hamle navigasyonu', () => {
  it('yalnızca brilliant/great/miss/mistake/blunder sınıflarını anahtar olarak sayar', () => {
    const result = fakeResult([
      fakeMove({ ply: 0, classification: 'book' }),
      fakeMove({ ply: 1, side: 'b', classification: 'good' }),
      fakeMove({ ply: 2, classification: 'great' }),
      fakeMove({ ply: 3, side: 'b', classification: 'blunder' }),
      fakeMove({ ply: 4, classification: 'best' }),
      fakeMove({ ply: 5, side: 'b', classification: 'brilliant' }),
      fakeMove({ ply: 6, classification: 'excellent' }),
    ]);
    expect(keyMomentPlies(result)).toEqual([2, 3, 5]);
  });

  it('başlangıç pozisyonundan ileri atlar', () => {
    const result = fakeResult([
      fakeMove({ ply: 0, classification: 'good' }),
      fakeMove({ ply: 1, side: 'b', classification: 'mistake' }),
    ]);
    expect(nextKeyMoment(result, -1, 1)).toBe(1);
  });

  it('geri yönde seçili hamleden öncekini bulur', () => {
    const result = fakeResult([
      fakeMove({ ply: 0, classification: 'blunder' }),
      fakeMove({ ply: 1, side: 'b', classification: 'good' }),
      fakeMove({ ply: 2, classification: 'mistake' }),
    ]);
    expect(nextKeyMoment(result, 2, -1)).toBe(0);
    expect(nextKeyMoment(result, 1, 1)).toBe(2);
  });

  it('anahtar kalmadığında null döner', () => {
    const result = fakeResult([fakeMove({ ply: 0, classification: 'good' })]);
    expect(nextKeyMoment(result, -1, 1)).toBeNull();
    expect(nextKeyMoment(result, 0, -1)).toBeNull();
  });
});

describe('açıklamalı PGN dışa aktarma', () => {
  it("standart başlangıçlı oyunda FEN header eklemez ve NAG'ları yerleştirir", () => {
    const result = fakeResult([
      fakeMove({ ply: 0, side: 'w', classification: 'brilliant', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }),
      fakeMove({ ply: 1, side: 'b', classification: 'blunder', fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' }),
    ]);
    const pgn = buildAnnotatedPgn(result);
    expect(pgn).not.toContain('[FEN');
    expect(pgn).toContain('1.e4 $3 {');
    // Siyah hamlesi numaradan sonra geldigi icin '...' almaz (dogru PGN).
    expect(pgn).toContain('e4 $4 {');
    expect(pgn).toContain('$4');
    expect(pgn).toContain('[%cls brilliant]');
    expect(pgn).toContain('[Event "Ultimate Chess');
    expect(pgn.trim().endsWith('*') || pgn.includes('1-0') || pgn.includes('0-1')).toBe(true);
  });

  it("standart dışı FEN'den başlayan oyunda SetUp/FEN header ekler", () => {
    const fen = '4k3/8/8/3q4/8/8/8/4K3 w - - 0 1';
    const result = fakeResult([
      fakeMove({ ply: 0, san: 'Kd1', playedUci: 'e1d1', classification: 'book', fenBefore: fen }),
    ]);
    const pgn = buildAnnotatedPgn(result);
    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain(`[FEN "${fen}"]`);
  });

  it("siyahın başladığı oyun (FEN start, b sırası) '1... hamle' numaralanır", () => {
    // 1.e4 sonrası siyah sırası: FEN fullmove 1, side b.
    const fenBlackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const result = fakeResult([
      fakeMove({ ply: 0, side: 'b', san: 'c5', playedUci: 'c7c5', classification: 'inaccuracy', fenBefore: fenBlackToMove }),
    ]);
    const pgn = buildAnnotatedPgn(result);
    expect(pgn).toContain('1...c5');
    expect(pgn).toContain('$6');
  });

  it('NAG tablosu chess.com sınıflarını standart kodlara eşler', () => {
    expect(CLASS_NAG.brilliant).toBe(3);
    expect(CLASS_NAG.blunder).toBe(4);
    expect(CLASS_NAG.mistake).toBe(2);
    expect(CLASS_NAG.best).toBe(1);
    expect(CLASS_NAG.good).toBeUndefined();
  });
});
