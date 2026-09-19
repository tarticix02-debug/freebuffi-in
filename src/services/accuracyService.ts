/**
 * CAPS tarzı Oyun Doğruluğu (Game Accuracy) — chess.com'un tersine
 * mühendislikle çıkarılmış 4 adımlı boru hattının uygulanması.
 *
 * ADIM 1  CP → kazanma olasılığı: sigmoid (lichess/stockfish standardı).
 * ADIM 2  En iyi hamle ile oynanan hamlenin win% farkı = kayıp (negatife düşmez).
 * ADIM 3  Kayıp → hamle doğruluğu: üstel çöküş; açılış kitabı hamlesi direkt 100.
 * ADIM 4  Hamle doğrulukları ARİTMETİK ortalamayla DEĞİL, POWER MEAN ile
 *         birleştirilir: p=2 (kuadratik) tek büyük hatayı dengeleyerek
 *         cezalandırır — "30 harika hamle + 1 vezir uyutma" hâlâ yüksek puan
 *         alamaz; harmonik ortalamanın aksine tek hata oyunu sıfırlamaz.
 *
 * Bu modül SAF: motor, store, DOM bilmez. Girdi: hamle başına win% kaybı.
 */

/** ADIM 1: sentipiyon → 0..100 kazanma olasılığı (sigmoid S-eğrisi). */
export function cpToWinProbability(cp: number): number {
  const winP = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return clamp(winP, 0, 100);
}

/** ADIM 1 (mat özel durumu): pozitif mat %100, negatif mat %0. */
export function mateToWinProbability(mateInForWhite: number): number {
  return mateInForWhite > 0 ? 100 : 0;
}

/** ADIM 2: best-move ile played-move win% farkı; derinlik artefaktlarına karşı 0'a sabitlenir. */
export function winProbabilityLoss(bestWinP: number, playedWinP: number): number {
  return Math.max(0, bestWinP - playedWinP);
}

/** ADIM 3: win% kaybı → 0..100 hamle doğruluğu (üstel çöküş). */
export function moveAccuracyFromLoss(winLoss: number, isBookMove: boolean = false): number {
  if (isBookMove) return 100;
  const acc = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669;
  return clamp(acc, 0, 100);
}

/**
 * ADIM 4: power mean (kuvvet ortalaması). Katsayı işareti yön belirler:
 * p > 0 büyük değerleri, p < 0 KÜÇÜK değerleri ağır basar. Doğruluk puanı
 * için istenen ikincisi olduğundan varsayılan p = -0.5 (negatif kuadratik):
 * tek blunder ortalamayı belirgin düşürür ama harmonik (p=-1) gibi oyunu
 * sıfırlamaz. Ölçüm: 9×100 + 1×20 dizisinde aritmetik 92.0, p=-0.5 → 79.2.
 * Boş liste → 0.
 */
export function powerMean(accuracies: number[], p: number = -0.5): number {
  if (!accuracies.length) return 0;
  const sum = accuracies.reduce((s, a) => s + Math.pow(a, p), 0);
  return Math.pow(sum / accuracies.length, 1 / p);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
