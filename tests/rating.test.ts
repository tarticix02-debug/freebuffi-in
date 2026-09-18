import { describe, it, expect } from 'vitest';  
import { computeNewRating, expectedScore } from '../src/services/ratingService';  
import { levelToElo } from '../src/engine/levels';
  
describe('Rating servisi', () => {  
  it('eşit rating\'lerde beklenen skor 0.5 olur', () => {  
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 2);  
  });  
  
  it('galibiyet rating\'i artırır', () => {  
    const newR = computeNewRating(1200, 1200, 'win');  
    expect(newR).toBeGreaterThan(1200);  
  });  
  
  it('mağlubiyet rating\'i azaltır', () => {  
    const newR = computeNewRating(1200, 1200, 'loss');  
    expect(newR).toBeLessThan(1200);  
  });  
  
  it('güçlü rakibe karşı beraberlik rating\'i artırır', () => {  
    const newR = computeNewRating(1200, 1800, 'draw');  
    expect(newR).toBeGreaterThan(1200);  
  });  
  
  it('seviye 20 motoru gerçek Elo tavanıyla puanlanır', () => {  
    expect(levelToElo(20)).toBeGreaterThan(2500);  
  });  
});
