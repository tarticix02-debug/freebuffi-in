import { StockfishEngine } from '../engine/StockfishEngine';
import { buildReplay, finalFen } from '../chess/replay';
import { toWhitePerspective, winPercentWhite, accuracyFromLoss, classifyMove, isBrilliantMove, applyMissPass, type MoveClass, type EngineSample } from '../engine/evaluation';
import { powerMean } from './accuracyService';
import { staticExchangeEval } from '../engine/see';
import { Chess, type Square } from 'chess.js';
import { identifyOpening } from './openingService';
import { uid } from '../utils/id';
import { buildMoveComment } from './coachCommentService';

// ============================================================================
// BİLEŞEN 1 — TEORİK AÇILIŞ KİTABI (BOOK MOVE)
// ECO/Polyglot benzeri SAN-önekli açılış ağacı. Oynanan hamle dizisi ağaçta
// VARSA motor skoru BEKLENMEDEN hamle "book" etiketlenir, doğruluğu 100
// yazılır ve o adımın motor analizi atlanır (döngü o adımda çalışmaz).
// Ağaç: tam varyant satırları + üretilmiş yaygın ön-ekler.
// ============================================================================
const BOOK_LINES: string[] = [
  // İspanyol (kapalı), İtalyan, İskoç, Petrov, Viyana
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O',
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Nb6',
  'e4 e5 Nf3 Nc6 d4 d6 dxe5 dxe5 Qxd1+ Kxd1',
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Be7 O-O O-O',
  'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7',
  // Vezir gambiti ailesi, Slav, Nimzo, Kraliyet Hint
  'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bg5 O-O e3 h6 Bh4 c5',
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6',
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7',
  // Fransız, Caro-Kann, Sicilya (açık + Alapin), İngiliz
  'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3',
  'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nc6',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7',
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6',
  'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',
  'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6',
];

const BOOK_TREE = new Set<string>(['']);
function addBookLine(line: string): void {
  let key = '';
  for (const part of line.split(' ')) {
    key = key ? `${key} ${part}` : part;
    BOOK_TREE.add(key);
  }
}
for (const line of BOOK_LINES) addBookLine(line);
// Yaygın ön-ekler: ilk hamleler, standart karşılıklar, 3-4. hamle seçenekleri.
for (const first of ['e4', 'd4', 'c4', 'Nf3', 'g3', 'b3', 'f4', 'Nc3']) addBookLine(first);
for (const [prefix, replies] of [
  ['e4', ['e5', 'c5', 'e6', 'c6', 'd5', 'd6', 'Nf6', 'g6']],
  ['d4', ['d5', 'Nf6', 'e6', 'f5', 'g6', 'c5', 'd6', 'b6']],
  ['c4', ['e5', 'Nf6', 'c5', 'e6', 'c6', 'g6', 'd5', 'f5']],
  ['Nf3', ['d5', 'Nf6', 'c5', 'e6', 'g6', 'd6']],
  ['g3', ['d5', 'Nf6', 'e5', 'c5', 'g6']],
] as Array<[string, string[]]>) {
  for (const r of replies) addBookLine(`${prefix} ${r}`);
}
for (const [prefix, moves] of [
  ['e4 e5', ['Nf3', 'f4', 'Nc3', 'Bc4', 'Bb5', 'd4', 'd3']],
  ['e4 c5', ['Nf3', 'Nc3', 'd4', 'c3']],
  ['e4 e6', ['d4', 'Nc3', 'Nd2', 'e5']],
  ['e4 c6', ['d4', 'Nc3', 'Nd2', 'e5']],
  ['e4 d5', ['exd5', 'Nc3', 'e5']],
  ['e4 Nf6', ['e5', 'd4', 'Nc3']],
  ['e4 d6', ['d4']],
  ['e4 g6', ['d4']],
  ['d4 d5', ['c4', 'Nf3', 'Nc3', 'Bf4', 'e3']],
  ['d4 Nf6', ['c4', 'Nf3', 'Nc3', 'Bg5', 'Bf4', 'g3', 'e3']],
  ['d4 e6', ['c4', 'Nf3', 'Nc3', 'e4']],
  ['d4 f5', ['c4', 'g3', 'Nf3']],
  ['d4 g6', ['c4', 'Nc3', 'e4', 'Nf3']],
  ['c4 e5', ['Nc3', 'g3', 'Nf3']],
  ['c4 Nf6', ['Nc3', 'd4', 'g3', 'Nf3']],
  ['Nf3 d5', ['d4', 'g3', 'c4', 'b3']],
  ['Nf3 Nf6', ['c4', 'g3', 'd4', 'Nc3', 'b3']],
] as Array<[string, string[]]>) {
  for (const m of moves) addBookLine(`${prefix} ${m}`);
}
for (const [prefix, moves] of [
  ['e4 e5 Nf3 Nc6', ['Bb5', 'Bc4', 'd4', 'Nc3', 'g3', 'd3']],
  ['e4 e5 Nf3 Nf6', ['Nxe5', 'Nc3', 'd4', 'Bc4', 'Bb5']],
  ['e4 c5 Nf3 d6', ['d4', 'Bb5', 'c3']],
  ['e4 c5 Nf3 Nc6', ['d4', 'Bb5', 'Bc4', 'Nc3']],
  ['e4 c5 Nf3 e6', ['d4']],
  ['d4 d5 c4 e6', ['Nc3', 'Nf3', 'Bf4', 'e3', 'cxd5']],
  ['d4 d5 c4 c6', ['Nf3', 'Nc3', 'e3', 'cxd5', 'Bg5']],
  ['d4 Nf6 c4 g6', ['Nc3', 'Nf3', 'g3']],
  ['d4 Nf6 c4 e6', ['Nc3', 'Nf3', 'g3', 'Bg5']],
] as Array<[string, string[]]>) {
  for (const m of moves) addBookLine(`${prefix} ${m}`);
}

/** Hamle dizisi (SAN listesi) açılış teorisinde mi? Önek ağacında arama. */
export function isBookSequence(sanMoves: string[]): boolean {
  return BOOK_TREE.has(sanMoves.join(' '));
}

export interface MoveReview {
  ply: number;
  side: 'w' | 'b';
  san: string;
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  bestUci: string | null;
  evalAfterWhiteCp: number | null;
  evalAfterMate: number | null;
  winPercentLoss: number;
  accuracy: number;
  /** Hamleyi oynayan tarafın hamle öncesi/sonrası kazanma olasılığı (win%) — miss pası ve UI detayı için. */
  moverWinPercentBefore: number;
  moverWinPercentAfter: number;
  classification: MoveClass;
  isBookMove: boolean;
  /** Tam hamle numarası (1.e4 → 1). */
  moveNumber?: number;
  /** Sanal koç yorumu (dinamik, konuma göre). */
  comment?: string;
}

export interface GameReviewResult {
  moves: MoveReview[];
  evalHistoryWhiteCp: (number | null)[]; // N+1 nokta (başlangıç dahil)
  whiteAccuracy: number;
  blackAccuracy: number;
  openingName: string | null;
  openingEco: string | null;
  whiteClassCounts: Record<string, number>;
  blackClassCounts: Record<string, number>;
}

export interface ReviewOptions {
  depth?: number;
  /** Asenkron kuyruk ilerlemesi: her pozisyon işlendiğinde çağrılır (0..total). */
  onProgress?: (done: number, total: number) => void;
  signal?: { cancelled: boolean };
}

interface PositionSample {
  cpWhite: number | null;
  mateWhite: number | null;
  bestUci: string | null;
  secondCpWhite: number | null;
  secondMateWhite: number | null;
  wdlWhite: { w: number; d: number; l: number } | null;
  secondWdlWhite: { w: number; d: number; l: number } | null;
}

const BOOK_NEUTRAL_SAMPLE: PositionSample = {
  cpWhite: 0, mateWhite: null, bestUci: null,
  secondCpWhite: null, secondMateWhite: null, wdlWhite: null, secondWdlWhite: null,
};

/**
 * Oyun inceleme motoru — asenkron pozisyon kuyruğu.
 * Her pozisyon SIRAYLA, kendi bekleyen promise'iyle işlenir (chunk
 * processing): motor tek isteğiyle meşgulken yeni istek yığılmaz, UI
 * onProgress ile parça parça güncellenir. Kitap pozisyonları kuyruğu
 * hiç motoru meşgul etmeden geçer.
 */
export async function analyzeGame(pgn: string, options: ReviewOptions = {}): Promise<GameReviewResult> {
  const depth = options.depth ?? 18; // chess.com paritesi: derin analiz sınır hamlelerin gerçek bedelini gösterir
  const steps = buildReplay(pgn);
  const fens = [...steps.map((s) => s.fenBefore), finalFen(pgn)];

  // bookFlags[i]: i. hamle teoride mi? (pozisyon atlama kararı buna bağlı)
  const bookFlags = steps.map((_, i) => isBookSequence(steps.slice(0, i + 1).map((s) => s.moveSan)));
  const moveIsBook = (i: number) => bookFlags[i] ?? false;

  // Canlı oyundan TAMAMEN bağımsız, ayrı bir motor instance'ı.
  const engine = new StockfishEngine();
  await engine.init();
  engine.setMultiPV(2);
  engine.setLevel(20); // Analiz her zaman tam güçle yapılır, seviye sınırlaması yoktur.

  const samples: PositionSample[] = [];

  try {
    for (let i = 0; i < fens.length; i++) {
      if (options.signal?.cancelled) throw new Error('CANCELLED');

      // Bileşen 1: pozisyon kitaptaysa motor adımı atlanır.
      // Pozisyon i, yalnızca i. VE i+1. hamle de kitaptaysa gereksizdir
      // (kitaptan çıkışın "öncesi" örneği gerçek analiz ister).
      const skipAsBook = i < bookFlags.length
        ? moveIsBook(i) && (i + 1 >= bookFlags.length || moveIsBook(i + 1))
        : moveIsBook(bookFlags.length - 1);
      if (skipAsBook) {
        samples.push({ ...BOOK_NEUTRAL_SAMPLE });
        options.onProgress?.(i + 1, fens.length);
        continue;
      }

      const sideToMove = fens[i].split(' ')[1] as 'w' | 'b';
      const result = await engine.analyzeMultiPV(fens[i], { depth }, `review-${i}-${uid()}`);
      const top = result.lines?.[0];
      const second = result.lines?.[1];

      const whiteTop = toWhitePerspective(sideToMove, top?.cp ?? result.evaluationCp, top?.mate ?? result.mate);
      const whiteSecond = second ? toWhitePerspective(sideToMove, second.cp, second.mate) : { cpWhite: null, mateWhite: null };
      // Mat edilmiş pozisyon: motor "mate 0" verir — işaretsizdir ve işaret çevrimi
      // onu hep "beyaz yenildi"e çevirir. Oysa sıradaki oyuncu mat edilmiştir:
      // sıra beyazdaysa beyaz yenilgi (-1), sıra siyahtaysa beyaz kazanır (+1).
      // Düzeltme yoksa mat EDEN tarafın son hamlesi %100 kayıp / 0 doğruluk yazar.
      const matedNow = (top?.mate ?? result.mate ?? null) === 0;
      if (matedNow) {
        whiteTop.mateWhite = sideToMove === 'w' ? -1 : 1;
        whiteTop.cpWhite = null;
      }
      samples.push({
        cpWhite: whiteTop.cpWhite,
        mateWhite: whiteTop.mateWhite,
        bestUci: top?.moveUci ?? result.bestMove,
        secondCpWhite: whiteSecond.cpWhite,
        secondMateWhite: whiteSecond.mateWhite,
        wdlWhite: matedNow
          ? (sideToMove === 'w' ? { w: 0, d: 0, l: 1 } : { w: 1, d: 0, l: 0 })
          : (top?.wdl ? (sideToMove === 'w' ? top.wdl : { w: top.wdl.l, d: top.wdl.d, l: top.wdl.w }) : null),
        secondWdlWhite: second?.wdl ? (sideToMove === 'w' ? second.wdl : { w: second.wdl.l, d: second.wdl.d, l: second.wdl.w }) : null,
      });

      options.onProgress?.(i + 1, fens.length);
    }
  } finally {
    engine.destroy(); // Worker kesinlikle temizlenir, memory leak bırakılmaz.
  }

  const moves: MoveReview[] = steps.map((step, i) => {
    const before = samples[i];
    const after = samples[i + 1];
    const isBook = moveIsBook(i);

    const evalAfterWhiteCp = after.mateWhite !== null ? mateToCp(after.mateWhite) : after.cpWhite;

    const winBefore = winPercentWhite(before);
    const winAfter = winPercentWhite(after);

    // Bileşen 1: kitap hamlesi motor skoru BEKLENMEDEN etiketlenir, kayıp 0 / doğruluk 100.
    const loss = isBook ? 0 : step.side === 'w' ? Math.max(0, winBefore - winAfter) : Math.max(0, winAfter - winBefore);
    const accuracy = isBook ? 100 : accuracyFromLoss(loss);

    const playedIsTop = !isBook && before.bestUci === step.moveUci;
    const moverWinBefore = step.side === 'w' ? winBefore : 100 - winBefore;
    const moverWinAfter = step.side === 'w' ? winAfter : 100 - winAfter;

    // Bileşen 2 — dinamik eşik girdileri: win% tabanlı kayıp, kritiklik aralığı,
    // kazanan-pozisyonkaçırma. Sabit cp eşiği kullanılmaz (bkz. classifyMove).
    let criticalityGap = 0;
    const hasSecondLine = before.secondWdlWhite !== null || before.secondCpWhite !== null || before.secondMateWhite !== null;
    if (hasSecondLine) {
      const second: EngineSample = { cpWhite: before.secondCpWhite, mateWhite: before.secondMateWhite, wdlWhite: before.secondWdlWhite };
      criticalityGap = winPercentWhite(before) - winPercentWhite(second);
      if (step.side === 'b') criticalityGap = -criticalityGap;
    } else if (before.mateWhite !== null) {
      criticalityGap = 100; // sadece mat veren tek hamle mevcut
    }

    const classification = classifyMove({
      winPercentLoss: loss,
      playedIsTopEngineMove: playedIsTop,
      topMoveCriticalityGap: Math.max(0, criticalityGap),
      isBookMove: isBook,
      moverWinPercentBefore: moverWinBefore,
      moverWinPercentAfter: moverWinAfter,
      moverMateBefore: before.mateWhite === null ? null : (step.side === 'w' ? before.mateWhite : -before.mateWhite),
    });

    const legalMoveCountBefore = new Chess(step.fenBefore).moves().length;
    const destSquare = step.moveUci.slice(2, 4) as Square;
    // chess.com kriteri: brilliant, motorun EN IYI hamlesi olan ve maddi fedakarlık
    // (materyal sayacı gerçekten düşen — SEE kanıtlı) hamledir. En iyi hamle değilse
    // ve feda pozisyonu kötüleştirmiyorsa değilse asla brilliant denmez.
    const brilliant = playedIsTop && classification !== 'book' && isBrilliantMove(
      { legalMoveCountBefore, moverWinPercentBefore: moverWinBefore, moverWinPercentAfter: moverWinAfter, winPercentLoss: loss, fenAfter: fens[i + 1], destSquare },
      () => staticExchangeEval(fens[i + 1], destSquare)
    );
    const finalClassification: MoveClass = brilliant ? 'brilliant' : classification;

    const fullmove = parseInt(step.fenBefore.split(' ')[5] ?? '', 10) || Math.floor(i / 2) + 1;

    return {
      ply: i, side: step.side, san: step.moveSan,
      fenBefore: step.fenBefore, fenAfter: fens[i + 1],
      playedUci: step.moveUci, bestUci: before.bestUci,
      evalAfterWhiteCp, evalAfterMate: after.mateWhite,
      winPercentLoss: loss, accuracy,
      moverWinPercentBefore: moverWinBefore, moverWinPercentAfter: moverWinAfter,
      classification: finalClassification,
      isBookMove: isBook,
      moveNumber: fullmove,
    };
  });

  // Chess.com tarzı ikinci miss pası: rakibin blunder/mistake'ini cezalandırmayan hamleler.
  applyMissPass(moves);

  // Bileşen 4 — SANAL KOÇ: nihai etiket (miss pası dahil) üstünden dinamik yorum.
  for (const m of moves) {
    m.comment = buildMoveComment({
      classification: m.classification, san: m.san, playedUci: m.playedUci, bestUci: m.bestUci,
      winPercentLoss: m.winPercentLoss, moverWinPercentBefore: m.moverWinPercentBefore,
      moverWinPercentAfter: m.moverWinPercentAfter, evalAfterWhiteCp: m.evalAfterWhiteCp,
      evalAfterMate: m.evalAfterMate, fenBefore: m.fenBefore, fenAfter: m.fenAfter,
      isBookMove: m.isBookMove,
    }, { seeAtDest: (fen, sq) => staticExchangeEval(fen, sq as Square) });
  }

  /**
   * CAPS ADIM 4: genel doğruluk — hamle skorlarının KUVVET ortalaması (p=2,
   * kuadratik; aritmetik değil) VE kitap hamleleri dahil edilir (kitap = 100,
   * ağırlık 1; oyun ortası/sonu ağırlığı 1 — dengelenmiş ağırlıklı ortalama).
   */
  const sideAccuracy = (side: 'w' | 'b') => {
    const sideMoves = moves.filter((m) => m.side === side);
    return powerMean(sideMoves.map((m) => m.accuracy), 2);
  };
  const opening = identifyOpening(steps.map((s) => s.moveSan));

  /** Chess.com tarzı sınıf sayımı (her taraf için). */
  function classCounts(list: MoveReview[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const m of list) counts[m.classification] = (counts[m.classification] ?? 0) + 1;
    return counts;
  }

  return {
    moves,
    evalHistoryWhiteCp: samples.map((s) => (s.mateWhite !== null ? mateToCp(s.mateWhite) : s.cpWhite)),
    whiteAccuracy: sideAccuracy('w'),
    blackAccuracy: sideAccuracy('b'),
    openingName: opening.name,
    openingEco: opening.eco,
    whiteClassCounts: classCounts(moves.filter((m) => m.side === 'w')),
    blackClassCounts: classCounts(moves.filter((m) => m.side === 'b')),
  };
}

// ============================================================================
// BİLEŞEN 5 — JSON ÇIKTI ŞEMASI (chess.com game-report paritesi)
// ============================================================================
export interface ReviewStatsJson {
  brilliant: number;
  great: number;
  best: number;
  excellent: number;
  good: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  missed_win: number;
}

export interface ReviewJsonMove {
  move_number: number;
  player: 'white' | 'black';
  san: string;
  classification: string;
  accuracy_score: number;
  comment: string;
}

export interface GameReviewJson {
  summary: {
    white_accuracy: number;
    black_accuracy: number;
    stats: {
      white: ReviewStatsJson;
      black: ReviewStatsJson;
    };
  };
  move_history: ReviewJsonMove[];
}

function statsToJson(counts: Record<string, number>): ReviewStatsJson {
  return {
    brilliant: counts.brilliant ?? 0,
    great: counts.great ?? 0,
    best: counts.best ?? 0,
    excellent: counts.excellent ?? 0,
    good: counts.good ?? 0,
    book: counts.book ?? 0,
    inaccuracy: counts.inaccuracy ?? 0,
    mistake: counts.mistake ?? 0,
    blunder: counts.blunder ?? 0,
    missed_win: counts.miss ?? 0, // dahili 'miss' = chess.com 'missed_win'
  };
}

/** Analiz sonucunu şemaya birebir uyan JSON modeline çevirir. */
export function buildReviewJson(result: GameReviewResult): GameReviewJson {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    summary: {
      white_accuracy: r1(result.whiteAccuracy),
      black_accuracy: r1(result.blackAccuracy),
      stats: {
        white: statsToJson(result.whiteClassCounts),
        black: statsToJson(result.blackClassCounts),
      },
    },
    move_history: result.moves.map((m) => ({
      move_number: m.moveNumber ?? Math.floor(m.ply / 2) + 1,
      player: m.side === 'w' ? 'white' : 'black',
      san: m.san,
      classification: m.classification === 'miss' ? 'missed_win' : m.classification,
      accuracy_score: r1(m.accuracy),
      comment: m.comment ?? '',
    })),
  };
}

function mateToCp(mateWhite: number): number {
  const magnitude = 10000 - Math.min(999, Math.abs(mateWhite)) * 10;
  return mateWhite > 0 ? magnitude : -magnitude;
}
