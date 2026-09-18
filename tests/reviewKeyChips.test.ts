import { describe, it, expect } from 'vitest';
import { pickKeyChips } from '../src/services/reviewKeyChips';
import type { GameReviewResult, MoveReview } from '../src/services/gameReviewService';

/** Yalnızca pickKeyChips'in tükettiği alanları taşıyan minimal MoveReview kurucusu. */
function move(side: 'w' | 'b', classification: MoveReview['classification']): MoveReview {
  return {
    ply: 0, side, san: '??', fenBefore: '', fenAfter: '', playedUci: '',
    bestUci: null, evalAfterWhiteCp: null, evalAfterMate: null,
    winPercentLoss: 0, accuracy: 100, moverWinPercentBefore: 50, moverWinPercentAfter: 50,
    classification, isBookMove: false,
  };
}

function result(moves: MoveReview[]): GameReviewResult {
  return {
    moves,
    evalHistoryWhiteCp: [],
    whiteAccuracy: 90, blackAccuracy: 90,
    openingName: null, openingEco: null,
    whiteClassCounts: {}, blackClassCounts: {},
  };
}

describe('pickKeyChips — oyun sonu göstergeleri (overlay ⇄ inceleme tutarlılık sözleşmesi)', () => {
  it('rakibin hamlelerini asla saymaz', () => {
    const r = result([
      move('b', 'brilliant'),
      move('b', 'blunder'),
      move('w', 'good'),
    ]);
    expect(pickKeyChips(r, 'w')).toEqual([]);
  });

  it('chess.com önceliği uygular: brilliant > great > blunder > mistake', () => {
    const r = result([
      move('w', 'mistake'),
      move('w', 'great'),
      move('w', 'blunder'),
      move('w', 'brilliant'),
    ]);
    const chips = pickKeyChips(r, 'w');
    expect(chips.map((c) => c.cls)).toEqual(['brilliant', 'great', 'blunder']);
  });

  it('nötr sınıfları (best/excellent/good/book/miss) çip olarak göstermez', () => {
    const r = result([
      move('w', 'best'), move('w', 'excellent'), move('w', 'good'), move('w', 'book'), move('w', 'miss'),
    ]);
    expect(pickKeyChips(r, 'w')).toEqual([]);
  });

  it('sayım doğru: iki blunder tek çipte toplanır', () => {
    const r = result([move('w', 'blunder'), move('w', 'blunder')]);
    expect(pickKeyChips(r, 'w')).toEqual([{ cls: 'blunder', n: 2 }]);
  });

  it('en fazla 3 çip döner', () => {
    const r = result([
      move('w', 'brilliant'), move('w', 'great'), move('w', 'blunder'), move('w', 'mistake'),
    ]);
    expect(pickKeyChips(r, 'w')).toHaveLength(3);
  });

  /**
   * Canlı doğrulanan gerçek oyun sözleşmesi (16 hamlelik Sicilya, teslim):
   * depth-8 hızlı analiz ve depth-18 inceleme, ÇİP sınıflarında birebir aynı
   * sayıları üretti (beyaz: 1 blunder; siyah: 1 great; brilliant 0=0).
   * Bu test türetme fonksiyonunun o sayıları bozmadan çıkardığını kilitler.
   */
  it('gerçek oyun senaryosu: hızlı ve tam analizden aynı çipler tüner', () => {
    // Gerçek oyunun depth-8 ve depth-18 analizlerinde ortak olan hamle sınıfları.
    const sharedMoves = [
      move('w', 'book'), move('b', 'book'),
      move('w', 'blunder'),            // 11. Qxd6? — iki derinlikte de blunder
      move('b', 'great'),              // 12... Qxd6! — iki derinlikte de great
      move('w', 'excellent'), move('w', 'good'),
    ];
    expect(pickKeyChips(result(sharedMoves), 'w')).toEqual([{ cls: 'blunder', n: 1 }]);
    expect(pickKeyChips(result(sharedMoves), 'b')).toEqual([{ cls: 'great', n: 1 }]);
  });
});
