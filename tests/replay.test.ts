import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReplay, finalFen, pgnStartFen } from '../src/chess/replay';

describe('PGN replay', () => {
  it("her adımın FEN'i sırayla ilerler", () => {
    const chess = new Chess();
    chess.move('e4'); chess.move('e5'); chess.move('Nf3');
    const pgn = chess.pgn();
    const steps = buildReplay(pgn);
    expect(steps).toHaveLength(3);
    expect(steps[0].fenBefore).toContain('w KQkq');
    expect(steps[2].moveSan).toBe('Nf3');
    expect(finalFen(pgn)).toContain(' b ');
  });

  it('[FEN] header\'lı PGN (özel başlangıç) standart başlangıçta değil, o pozisyondan oynatılır', () => {
    // Back-rank hazırlığından tek hamle: standart başlangıçta Rc8 legal değil.
    const pgn = [
      '[Event "?"]', '[SetUp "1"]', '[FEN "6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1"]', '', '1. Rc8# *',
    ].join('\n');
    expect(pgnStartFen(pgn)).toBe('6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1');
    const steps = buildReplay(pgn);
    expect(steps).toHaveLength(1);
    expect(steps[0].moveSan).toBe('Rc8#');
    expect(steps[0].fenBefore).toContain('6k1/5ppp');
    expect(finalFen(pgn)).toContain(' b ');
  });
});
