import { describe, it, expect } from 'vitest';
import {
  cpToWinProbability, mateToWinProbability, winProbabilityLoss,
  moveAccuracyFromLoss, powerMean,
} from '../src/services/accuracyService';

describe('ADIM 1 — cp → kazanma olasılığı (sigmoid)', () => {
  it('dengeli pozisyon ~%50', () => {
    expect(cpToWinProbability(0)).toBeCloseTo(50, 0);
  });
  it('+100cp belirgin üstünlük (~%60 bandı)', () => {
    const p = cpToWinProbability(100);
    expect(p).toBeGreaterThan(55);
    expect(p).toBeLessThan(70);
  });
  it('çok büyük +cp doygunluğa yaklaşır ama 100 olmaz', () => {
    const p = cpToWinProbability(2000);
    expect(p).toBeGreaterThan(98);
    expect(p).toBeLessThan(100);
  });
  it('mat: pozitif %100, negatif %0', () => {
    expect(mateToWinProbability(3)).toBe(100);
    expect(mateToWinProbability(-1)).toBe(0);
  });
});

describe('ADIM 2 — win% kaybı', () => {
  it('oynanan hamle daha iyiyse kayıp 0 (clamp)', () => {
    expect(winProbabilityLoss(60, 70)).toBe(0);
  });
  it('normal fark pozitif döner', () => {
    expect(winProbabilityLoss(80, 60)).toBeCloseTo(20, 5);
  });
});

describe('ADIM 3 — hamle doğruluğu (üstel çöküş)', () => {
  it('küçük kayıp puanı yüze yakın tutar', () => {
    expect(moveAccuracyFromLoss(1)).toBeGreaterThan(95);
  });
  it('büyük kayıp puanı hızla düşürür', () => {
    expect(moveAccuracyFromLoss(20)).toBeLessThan(45);
  });
  it('sıfır kayıp ~100', () => {
    expect(moveAccuracyFromLoss(0)).toBeCloseTo(100, 0);
  });
  it('açılış kitabı hamlesi direkt 100', () => {
    expect(moveAccuracyFromLoss(25, true)).toBe(100);
  });
  it('sonuç her zaman 0..100 arası', () => {
    expect(moveAccuracyFromLoss(100)).toBeGreaterThanOrEqual(0);
    expect(moveAccuracyFromLoss(100)).toBeLessThanOrEqual(100);
  });
});

describe('ADIM 4 — power mean', () => {
  it('tek büyük hata, aritmetik ortalamadan daha fazla cezalandırır', () => {
    const accs = [100, 100, 100, 100, 100, 100, 100, 100, 100, 20];
    const arithmetic = accs.reduce((s, a) => s + a, 0) / accs.length; // 92.0
    const pm = powerMean(accs); // varsayılan p=-0.5: küçük puanlar ağır basar
    expect(pm).toBeLessThan(arithmetic);
    expect(pm).toBeGreaterThan(60); // harmonik (71) kadar sert değil
  });
  it('tüm yüzler → 100', () => {
    expect(powerMean([100, 100, 100])).toBeCloseTo(100, 6);
  });
  it('boş liste → 0', () => {
    expect(powerMean([])).toBe(0);
  });
});

describe('Senaryo — 20 hamlelik simüle oyun', () => {
  it('tipik oyun mantıklı bantta (%70-95) puan üretir', () => {
    // Gerçekçi bir Amatör-Elo oyun simülasyonu: çoğu hamle iyi, birkaç hata.
    const losses = [0, 0.5, 0, 1, 0, 0.3, 2, 0, 0, 1.5, 0, 0.2, 0, 18, 0.8, 0, 0.4, 0, 0, 1];
    const accs = losses.map((l) => moveAccuracyFromLoss(l));
    const white = powerMean(accs.filter((_, i) => i % 2 === 0));
    const black = powerMean(accs.filter((_, i) => i % 2 === 1));
    for (const score of [white, black]) {
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(99);
    }
  });
});
