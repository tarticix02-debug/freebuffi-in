import { describe, it, expect } from 'vitest';
import { isBookSequence, buildReviewJson, type GameReviewResult } from '../src/services/gameReviewService';
import { buildMoveComment, materialBalance, pieceNameTr, sanFromUci } from '../src/services/coachCommentService';
import type { MoveReview } from '../src/services/gameReviewService';

describe('Bileşen 1 — açılış kitabı (SAN önek ağacı)', () => {
  it('bilinen tam varyant satırını kitap sayar', () => {
    expect(isBookSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).toBe(true);
    expect(isBookSequence(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4'])).toBe(true);
  });
  it('ilk hamleler ve yaygın karşılıklar kitap', () => {
    expect(isBookSequence(['e4'])).toBe(true);
    expect(isBookSequence(['e4', 'c5'])).toBe(true);
    expect(isBookSequence(['d4', 'd5', 'c4'])).toBe(true);
  });
  it('teori dışı hamle dizisi kitap DEĞİL', () => {
    expect(isBookSequence(['e4', 'e5', 'Qh5'])).toBe(false);
    expect(isBookSequence(['a4', 'h5'])).toBe(false);
    expect(isBookSequence(['Nh3', 'g6'])).toBe(false);
  });
  it('kitap satırından çıkan dizide sadece önek kitaptır', () => {
    expect(isBookSequence(['e4', 'e5', 'Nf3'])).toBe(true);
    expect(isBookSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'h6'])).toBe(false);
  });
});

describe('Materyal takip algoritması', () => {
  it('başlangıç pozisyonu dengede', () => {
    expect(materialBalance('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(0);
  });
  it('beyaz vezirsiz, siyah kalesiz → beyaz -4', () => {
    // Beyaz vezir (-9), siyah a8 kale (+5)
    expect(materialBalance('1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w - - 0 1')).toBe(-4);
  });
  it('kare adı → Türkçe taş adı', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(pieceNameTr(start, 'e2')).toBe('Piyon');
    expect(pieceNameTr(start, 'g1')).toBe('At');
    expect(pieceNameTr(start, 'd8')).toBe('Vezir');
    expect(pieceNameTr(start, 'e4')).toBeNull();
  });
  it('UCI → SAN çevirisi ve yasa isev null', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(sanFromUci(start, 'e2e4')).toBe('e4');
    expect(sanFromUci(start, 'e2h5')).toBeNull();
  });
});

describe('Bileşen 4 — sanal koç yorumları (dinamik)', () => {
  const base = {
    san: 'Qd2', playedUci: 'd1d2', bestUci: 'a1a2', winPercentLoss: 25,
    moverWinPercentBefore: 60, moverWinPercentAfter: 20,
    evalAfterWhiteCp: -300, evalAfterMate: null,
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPQPPPP/RNB1KBNR b KQkq - 1 2',
    isBookMove: false,
  };
  it('kitap hamlesi: kısa oyun için başlangıç yorumu', () => {
    const c = buildMoveComment({ ...base, classification: 'book' });
    expect(c).toContain('Kitap hamlesi');
    expect(c).toContain('başlangıç');
  });
  it('kitap hamlesi: uzun oyunda farklı metin', () => {
    const c = buildMoveComment({ ...base, classification: 'book', fenBefore: 'rnbqkbnr/ppp2ppp/8/3pp3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 5' });
    expect(c).toContain('Kitap hamlesi');
    expect(c).not.toContain('başlangıç');
  });
  it('blunder + asılı taş → taş adıyla dinamik yorum', () => {
    // d2'de vezir kalıyor; SEE bağımlılığı asılı döner
    const c = buildMoveComment({ ...base, classification: 'blunder' }, { seeAtDest: () => -300 });
    expect(c).toContain('Vezir');
    expect(c).toContain('bedava');
  });
  it('blunder + kazanan pozisyonu elden verme → özel yorum', () => {
    const c = buildMoveComment({ ...base, classification: 'blunder', moverWinPercentBefore: 90, moverWinPercentAfter: 30 });
    expect(c).toContain('tamamen elden');
  });
  it('miss → kaçıran en iyi hamlenin SAN\'ını verir', () => {
    const c = buildMoveComment({ ...base, classification: 'miss', bestUci: 'g1f3' });
    expect(c).toContain('Nf3');
    expect(c).toContain('fırsatını kaçırdınız');
  });
  it('best + mat → zorlayıcı mat yorumu', () => {
    const c = buildMoveComment({ ...base, classification: 'best', evalAfterMate: 3 });
    expect(c).toContain('M3');
  });
});

describe('Bileşen 5 — JSON çıktı şeması', () => {
  function mv(over: Partial<MoveReview>): MoveReview {
    return {
      ply: 0, side: 'w', san: 'e4',
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      playedUci: 'e2e4', bestUci: 'e2e4',
      evalBeforeWhiteCp: 0, evalAfterWhiteCp: 30, evalAfterMate: null,
      winPercentLoss: 0, accuracy: 99.5,
      moverWinPercentBefore: 50, moverWinPercentAfter: 51,
      classification: 'best', isBookMove: false, moveNumber: 1,
      ...over,
    };
  }
  const result: GameReviewResult = {
    moves: [
      mv({ ply: 0, classification: 'book', isBookMove: true, accuracy: 100, comment: 'Kitap hamlesi. Açılış teorisine uygun standart bir başlangıç.' }),
      mv({ ply: 1, side: 'b', san: 'c5', playedUci: 'c7c5', moveNumber: 1, classification: 'miss', comment: 'Fırsat kaçırdın.' }),
      mv({ ply: 2, san: 'Nf3', playedUci: 'g1f3', moveNumber: 2, classification: 'brilliant', comment: 'Harika!' }),
    ],
    evalHistoryWhiteCp: [0, 30, 25, 40],
    whiteAccuracy: 87.46, blackAccuracy: 64.22,
    openingName: null, openingEco: null,
    whiteClassCounts: { book: 1, brilliant: 1 },
    blackClassCounts: { miss: 1 },
  };

  it('summary + stats + move_history şemaya birebir uyar', () => {
    const j = buildReviewJson(result);
    expect(j.summary.white_accuracy).toBeCloseTo(87.5, 1);
    expect(j.summary.black_accuracy).toBeCloseTo(64.2, 1);
    expect(j.summary.stats.white.book).toBe(1);
    expect(j.summary.stats.white.brilliant).toBe(1);
    expect(j.summary.stats.white.missed_win).toBe(0);
    expect(j.summary.stats.black.missed_win).toBe(1);
    expect(j.move_history).toHaveLength(3);
    expect(j.move_history[0]).toMatchObject({
      move_number: 1, player: 'white', san: 'e4',
      classification: 'book', accuracy_score: 100,
      comment: 'Kitap hamlesi. Açılış teorisine uygun standart bir başlangıç.',
    });
    // Hamle-bazlı teknik blok (örnek şema): fen + değerlendirme + kazanma şansı + kayıp.
    expect(j.move_history[0].fen_before).toContain('rnbqkbnr');
    expect(j.move_history[0].eval_before).toBe(0);
    expect(j.move_history[0].win_percent_before).toBeCloseTo(50, 1);
    expect(j.move_history[0].centipawn_loss).toBe(-30); // fixture: eval 0 → +30 (beyaz 30cp kaybeder)
    expect(j.move_history[0].move_accuracy).toBe(100);
  });
  it('dahili miss → JSON missed_win; player siyah → black', () => {
    const j = buildReviewJson(result);
    expect(j.move_history[1].classification).toBe('missed_win');
    expect(j.move_history[1].player).toBe('black');
    expect(j.move_history[2].classification).toBe('brilliant');
  });
  it('eksiksiz olmayan kayıtlarda varsayılanlar güvenli', () => {
    const j = buildReviewJson({ ...result, whiteClassCounts: {}, blackClassCounts: {} });
    expect(j.summary.stats.white.best).toBe(0);
    expect(j.summary.stats.black.blunder).toBe(0);
  });
});
