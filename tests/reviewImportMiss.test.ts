import { describe, it, expect } from 'vitest';
import { classifyMove } from '../src/engine/evaluation';
import { parseGameInput } from '../src/services/gameInputService';
import { ENGINE_PRESETS } from '../src/engine/levels';

describe('classifyMove — Miss tespiti (chess.com tarzı)', () => {
  const base = { winPercentLoss: 15, playedIsTopEngineMove: false, topMoveCriticalityGap: 0, isBookMove: false };

  it('kazanan pozisyon kazanılan olmayan hale düşerse -> miss', () => {
    const c = classifyMove({ ...base, moverWinPercentBefore: 82, moverWinPercentAfter: 64 });
    expect(c).toBe('miss');
  });

  it('kazanan pozisyon hâlâ kazanılıyorsa (90->70) miss değildir', () => {
    const c = classifyMove({ ...base, moverWinPercentBefore: 90, moverWinPercentAfter: 70 });
    expect(c).toBe('mistake');
  });

  it('kazanan pozisyon ama kayıp küçükse miss değildir (excellent)', () => {
    const c = classifyMove({ ...base, winPercentLoss: 1, moverWinPercentBefore: 90, moverWinPercentAfter: 89 });
    expect(c).toBe('excellent');
  });

  it('kazanmayan pozisyonda miss oluşmaz', () => {
    const c = classifyMove({ ...base, moverWinPercentBefore: 60, moverWinPercentAfter: 40 });
    expect(c).toBe('mistake');
  });

  it('eşik tam sınırda: 80% önce, kazanılan altına düşüş -> miss', () => {
    const c = classifyMove({ ...base, winPercentLoss: 16, moverWinPercentBefore: 80, moverWinPercentAfter: 64 });
    expect(c).toBe('miss');
  });

  it('mover alanları verilmezse miss oluşmaz (geriye dönük uyumluluk)', () => {
    const c = classifyMove({ ...base });
    expect(c).toBe('mistake'); // loss 15 -> mistake bandı
  });
});

describe('parseGameInput — PGN/FEN içe aktarma', () => {
  it('geçerli PGN\'i parse eder', () => {
    const r = parseGameInput('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    expect(r.source).toBe('pgn');
    expect(r.pgn).toContain('e4');
  });

  it('header\'lı tam PGN\'i parse eder', () => {
    const pgn = '[Event "Test"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
    const r = parseGameInput(pgn);
    expect(r.source).toBe('pgn');
    expect(r.pgn).toContain('Qxf7#');
  });

  it('geçerli FEN\'i FEN modu olarak algılar', () => {
    const r = parseGameInput('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(r.source).toBe('fen');
    expect(r.startingFen).toBeTruthy();
  });

  it('geçersiz FEN hata fırlatır', () => {
    expect(() => parseGameInput('rnbqkbnr/pppppppp/8/8/8 w KQkq - 0 1')).toThrow();
  });

  it('hamlesiz girdi hata fırlatır', () => {
    expect(() => parseGameInput('merhaba dünya')).toThrow();
    expect(() => parseGameInput('')).toThrow();
  });

  it('geçersiz hamle içeren PGN hata fırlatır', () => {
    expect(() => parseGameInput('1. e4 e5 2. Ke3')).toThrow();
  });
});

describe('ENGINE_PRESETS — kolaydan zora', () => {
  it('en kolay iki mod gerçekten çok düşük seviyededir', () => {
    const sorted = [...ENGINE_PRESETS].sort((a, b) => a.level - b.level);
    expect(sorted[0].level).toBe(0);
    expect(sorted[1].level).toBe(1);
  });
});
