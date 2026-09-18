import { describe, it, expect } from 'vitest';
import { staticExchangeEval } from '../src/engine/see';

describe('Static Exchange Evaluation', () => {
  it('savunmasız vezir yüksek pozitif SEE verir (rakip için karlı)', () => {
    // Siyah vezir d5'te tamamen açıkta, Beyaz Fil c4'ten alabilir, hiçbir savunucu yok.
    const fen = '4k3/8/8/3q4/2B5/8/8/4K3 w - - 0 1';
    const result = staticExchangeEval(fen, 'd5');
    expect(result).toBeGreaterThan(500); // vezir değerine yakın net kazanç
  });

  it('iyi savunulan taş düşük/negatif SEE verir', () => {
    // Siyah at d5'te, Beyaz At c3 alabilir ama Siyah Piyon e6 geri alır (eşit takas, at karşılığı at)
    const fen = '4k3/8/4p3/3n4/8/2N5/8/4K3 w - - 0 1';
    const result = staticExchangeEval(fen, 'd5');
    expect(result).toBeLessThanOrEqual(0); // eşit takas ya da kayıp yok
  });

  it('saldırgan yoksa 0 döner', () => {
    const fen = '4k3/8/8/3q4/8/8/8/4K3 w - - 0 1';
    expect(staticExchangeEval(fen, 'd5')).toBe(0);
  });
});
