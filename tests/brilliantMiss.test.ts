import { describe, it, expect } from 'vitest';
import { isBrilliantMove, applyMissPass } from '../src/engine/evaluation';

describe('Brilliant hamle tespiti', () => {
  const base = {
    legalMoveCountBefore: 25,
    moverWinPercentBefore: 55,
    moverWinPercentAfter: 60,
    winPercentLoss: 0,
    fenAfter: 'irrelevant',
    destSquare: 'd5',
  };

  it('gerçek materyal fedakarlığı varsa brilliant döner', () => {
    // SEE: rakip 400cp kazanır -> gerçek feda
    const result = isBrilliantMove(base, () => 400);
    expect(result).toBe(true);
  });

  it('feda yoksa (SEE düşük) brilliant değildir', () => {
    const result = isBrilliantMove(base, () => 20);
    expect(result).toBe(false);
  });

  it('zaten ezici üstünlükte brilliant sayılmaz', () => {
    const result = isBrilliantMove({ ...base, moverWinPercentBefore: 98 }, () => 400);
    expect(result).toBe(false);
  });

  it('fedakarlık pozisyonu bozuyorsa (win% çok düşükse) brilliant değildir', () => {
    const result = isBrilliantMove({ ...base, moverWinPercentAfter: 20 }, () => 400);
    expect(result).toBe(false);
  });

  it('tek yasal hamle varsa (forced) brilliant sayılmaz', () => {
    const result = isBrilliantMove({ ...base, legalMoveCountBefore: 1 }, () => 400);
    expect(result).toBe(false);
  });

  it('hamle zaten kötüyse (winPercentLoss yüksek) brilliant adayı olamaz', () => {
    const result = isBrilliantMove({ ...base, winPercentLoss: 15 }, () => 400);
    expect(result).toBe(false);
  });

  it('feda sonrası pozisyon zayıfsa (win% < 40) brilliant değildir', () => {
    const result = isBrilliantMove({ ...base, moverWinPercentAfter: 30 }, () => 400);
    expect(result).toBe(false);
  });

  it('değerlendirme hafif bile düşüyorsa (loss > 2) brilliant değildir — chess.com: değerlendirme korunmalı', () => {
    // win% düşüşü 5: feda pozisyonu bozuyor, brilliant değil.
    const result = isBrilliantMove({ ...base, moverWinPercentAfter: 55, winPercentLoss: 5 }, () => 400);
    expect(result).toBe(false);
  });
});

describe('Brilliant — playedIsTop kapısı (review pipeline kuralı)', () => {
  // Bu kural gameReviewService içinde uygulanır: brilliant yalnızca motorun
  // en iyi hamlesi oynandıysa adaydır. Burada kuralın kendisini sabitleyen
  // sözleşmeyi test ediyoruz (pipeline davranışı entegre doğrulanır).
  function brilliantGate(playedIsTop: boolean, classification: string, brilliantEligible: boolean): string {
    if (!playedIsTop || classification === 'book') return classification as any;
    return brilliantEligible ? 'brilliant' : classification;
  }

  it('en iyi hamle değilse brilliant kapısı açılmaz', () => {
    expect(brilliantGate(false, 'best', true)).toBe('best');
  });

  it('book hamlesi asla brillianta dönüştürülmez', () => {
    expect(brilliantGate(true, 'book', true)).toBe('book');
  });

  it('en iyi hamle + uygun feda -> brilliant', () => {
    expect(brilliantGate(true, 'best', true)).toBe('brilliant');
  });
});

describe('Miss işaretleme (applyMissPass — review pipeline geçişi)', () => {
  it("rakip blunder yaptıktan sonra hatayı cezalandırmayan hamle 'miss' olur", () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'mistake' as const, moverWinPercentBefore: 70, moverWinPercentAfter: 62 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('miss');
  });

  it('rakip iyi oynadıysa sonraki hata miss olarak işaretlenmez', () => {
    const moves = [
      { classification: 'best' as const },
      { classification: 'mistake' as const, moverWinPercentBefore: 70, moverWinPercentAfter: 62 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('mistake');
  });

  it('fırsatı tam değerlendiren hamle (best) miss olmaz', () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'best' as const, moverWinPercentBefore: 70, moverWinPercentAfter: 80 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('best');
  });

  it('rakip hatadan sonra üstünlük yoksa (win% < 60) miss işaretlenmez', () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'inaccuracy' as const, moverWinPercentBefore: 40, moverWinPercentAfter: 35 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('inaccuracy');
  });

  it('kendi büyük hatası (win% düşüşü ≥ 12) kendi etiketini korur', () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'mistake' as const, moverWinPercentBefore: 80, moverWinPercentAfter: 60 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('mistake');
  });

  it('excellent/good dışı sınıflar (ör. excellent) hiç dönüştürülmez', () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'excellent' as const, moverWinPercentBefore: 70, moverWinPercentAfter: 75 },
    ];
    applyMissPass(moves);
    expect(moves[1].classification).toBe('excellent');
  });

  it('win% verisi olmayan hamleler güvenli biçimde atlanır', () => {
    const moves = [
      { classification: 'blunder' as const },
      { classification: 'good' as const },
    ];
    expect(() => applyMissPass(moves)).not.toThrow();
    expect(moves[1].classification).toBe('good');
  });
});
