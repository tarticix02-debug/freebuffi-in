import { describe, it, expect } from 'vitest';
import { levelToElo, levelToOptions, levelToMoveTimeMs, ENGINE_PRESETS, MIN_UCI_ELO, MAX_UCI_ELO } from '../src/engine/levels';
import { computeNewRating, expectedScore } from '../src/services/ratingService';

describe('levelToElo (Stockfish 18 UCI_Elo aralığına göre)', () => {
  it('seviye 0 motorun minimum Elo değerine eşittir', () => {
    expect(levelToElo(0)).toBe(MIN_UCI_ELO);
  });

  it('seviye 17 motorun maksimum Elo değerine ulaşır', () => {
    expect(levelToElo(17)).toBe(MAX_UCI_ELO);
  });

  it('seviye 18+ tam güç demektir (tavan Elo)', () => {
    expect(levelToElo(18)).toBe(MAX_UCI_ELO);
    expect(levelToElo(20)).toBe(MAX_UCI_ELO);
  });

  it('ara seviyeler kademeli Elo üretir', () => {
    const e2 = levelToElo(2);
    const e8 = levelToElo(8);
    expect(e2).toBeGreaterThan(MIN_UCI_ELO);
    expect(e8).toBeGreaterThan(e2);
  });

  it('sınır dışı seviyeler kırpılır (clamp)', () => {
    expect(levelToElo(-5)).toBe(MIN_UCI_ELO);
    expect(levelToElo(99)).toBe(MAX_UCI_ELO);
  });
});

describe('levelToOptions (UCI opsiyon üretimi)', () => {
  it('düşük seviyede LimitStrength açık ve Elo sınırlıdır', () => {
    const o = levelToOptions(4);
    expect(o.UCI_LimitStrength).toBe(true);
    expect(o.UCI_Elo).toBe(levelToElo(4));
    expect(o.SkillLevel).toBeLessThan(20);
  });

  it('yüksek seviyede sınırlama kapalıdır', () => {
    const o = levelToOptions(20);
    expect(o.UCI_LimitStrength).toBe(false);
    expect(o.UCI_Elo).toBeUndefined();
    expect(o.SkillLevel).toBe(20);
  });
});

describe('levelToMoveTimeMs', () => {
  it('düşük seviye hızlı düşünür, yüksek seviye daha uzun', () => {
    expect(levelToMoveTimeMs(0)).toBeLessThan(levelToMoveTimeMs(20));
    expect(levelToMoveTimeMs(0)).toBeGreaterThanOrEqual(250);
  });
});

describe('ENGINE_PRESETS (UI zorluk düğmeleri)', () => {
  it('kolaydan zora sıralı 7 hazır seviye sunar', () => {
    expect(ENGINE_PRESETS.length).toBe(7);
    for (let i = 1; i < ENGINE_PRESETS.length; i++) {
      expect(ENGINE_PRESETS[i].level).toBeGreaterThan(ENGINE_PRESETS[i - 1].level);
    }
    for (const p of ENGINE_PRESETS) {
      expect(p.level).toBeGreaterThanOrEqual(0);
      expect(p.level).toBeLessThanOrEqual(20);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it('en kolay seviyeler gerçekten en düşük Elo değerine sahiptir', () => {
    const baby = ENGINE_PRESETS.find((p) => p.id === 'baby');
    expect(baby?.level).toBe(0);
    expect(levelToElo(baby!.level)).toBe(MIN_UCI_ELO);
  });
});

describe('ratingService entegrasyonu (tek kaynak)', () => {
  it('eşit güçte motor karşı maçta beklenen skor 0.5 olur', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 2);
  });

  it('güçlü motora karşı alınan galibiyet ratingi belirgin artırır', () => {
    const newR = computeNewRating(1200, levelToElo(20), 'win');
    expect(newR).toBeGreaterThan(1200 + 20);
  });
});
