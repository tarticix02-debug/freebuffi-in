import { StockfishEngine } from '../engine/StockfishEngine';
import { buildReplay, finalFen } from '../chess/replay';
import { toWhitePerspective, winPercentWhite, accuracyFromLoss, classifyMove, isBrilliantMove, applyMissPass, type MoveClass, type EngineSample } from '../engine/evaluation';
import { powerMean } from './accuracyService';
import { staticExchangeEval } from '../engine/see';
import { Chess, type Square } from 'chess.js';
import { identifyOpening } from './openingService';
import { uid } from '../utils/id';

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

export async function analyzeGame(pgn: string, options: ReviewOptions = {}): Promise<GameReviewResult> {
const depth = options.depth ?? 18; // chess.com paritesi: derin analiz sınır hamlelerin gerçek bedelini gösterir
const steps = buildReplay(pgn);
const fens = [...steps.map((s) => s.fenBefore), finalFen(pgn)];

// Canlı oyundan TAMAMEN bağımsız, ayrı bir motor instance'ı.
const engine = new StockfishEngine();
await engine.init();
engine.setMultiPV(2);
engine.setLevel(20); // Analiz her zaman tam güçle yapılır, seviye sınırlaması yoktur.

const samples: PositionSample[] = [];

try {
for (let i = 0; i < fens.length; i++) {
if (options.signal?.cancelled) throw new Error('CANCELLED');

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

const evalAfterWhiteCp = after.mateWhite !== null ? mateToCp(after.mateWhite) : after.cpWhite;

const winBefore = winPercentWhite(before);  
const winAfter = winPercentWhite(after);  

const loss = step.side === 'w' ? Math.max(0, winBefore - winAfter) : Math.max(0, winAfter - winBefore);  
const accuracy = accuracyFromLoss(loss);  

const bookInfo = identifyOpening(steps.slice(0, i + 1).map((s) => s.moveSan));
const playedIsTop = before.bestUci === step.moveUci;
const moverWinBefore = step.side === 'w' ? winBefore : 100 - winBefore;
const moverWinAfter = step.side === 'w' ? winAfter : 100 - winAfter;

let criticalityGap = 0;
const hasSecondLine = before.secondWdlWhite !== null || before.secondCpWhite !== null || before.secondMateWhite !== null;
if (hasSecondLine) {
  // winPercentWhite WDL'i lojistiğe tercih eder — tek hesap yolu.
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
  isBookMove: bookInfo.matchedFullLine,
  moverWinPercentBefore: moverWinBefore,
  moverWinPercentAfter: moverWinAfter,
  moverMateBefore: before.mateWhite === null ? null : (step.side === 'w' ? before.mateWhite : -before.mateWhite),
});

const legalMoveCountBefore = new Chess(step.fenBefore).moves().length;
const destSquare = step.moveUci.slice(2, 4) as Square;
// chess.com kriteri: brilliant, motorun EN IYI hamlesi olan ve maddi fedakarlık
// iceren hamledir. En iyi hamle değilse asla brilliant denmez (random oyunlarda
// sahte brilliant üreten temel neden buydu).
const brilliant = playedIsTop && classification !== 'book' && isBrilliantMove(
  { legalMoveCountBefore, moverWinPercentBefore: moverWinBefore, moverWinPercentAfter: moverWinAfter, winPercentLoss: loss, fenAfter: fens[i + 1], destSquare },
  () => staticExchangeEval(fens[i + 1], destSquare)
);
const finalClassification: MoveClass = brilliant ? 'brilliant' : classification;

return {  
  ply: i, side: step.side, san: step.moveSan,  
  fenBefore: step.fenBefore, fenAfter: fens[i + 1],  
  playedUci: step.moveUci, bestUci: before.bestUci,  
  evalAfterWhiteCp, evalAfterMate: after.mateWhite,  
  winPercentLoss: loss, accuracy, 
  moverWinPercentBefore: moverWinBefore, moverWinPercentAfter: moverWinAfter, 
  classification: finalClassification,  
  isBookMove: bookInfo.matchedFullLine,  
};

});

// Chess.com tarzı ikinci miss pası: rakibin blunder/mistake'ini cezalandırmayan hamleler.
applyMissPass(moves);

const avg = (arr: MoveReview[]) => (arr.length ? arr.reduce((s, m) => s + m.accuracy, 0) / arr.length : 0);
/** CAPS ADIM 4: hamle doğrulukları power mean (p=2, kuadratik) ile birleştirilir — aritmetik ortalama tek hatayı şişirir, harmonik ise sıfırlar. */
const powerMeanAcc = (arr: MoveReview[]) => powerMean(arr.map((m) => m.accuracy));
const opening = identifyOpening(steps.map((s) => s.moveSan));

/** Chess.com tarzı sınıf sayımı (her taraf için). */
function classCounts(moves: MoveReview[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of moves) counts[m.classification] = (counts[m.classification] ?? 0) + 1;
  return counts;
}

return {
moves,
evalHistoryWhiteCp: samples.map((s) => (s.mateWhite !== null ? mateToCp(s.mateWhite) : s.cpWhite)),
whiteAccuracy: powerMeanAcc(moves.filter((m) => m.side === 'w')),
blackAccuracy: powerMeanAcc(moves.filter((m) => m.side === 'b')),
openingName: opening.name,
openingEco: opening.eco,
whiteClassCounts: classCounts(moves.filter((m) => m.side === 'w')),
blackClassCounts: classCounts(moves.filter((m) => m.side === 'b')),
};
}

function mateToCp(mateWhite: number): number {
const magnitude = 10000 - Math.min(999, Math.abs(mateWhite)) * 10;
return mateWhite > 0 ? magnitude : -magnitude;
}
