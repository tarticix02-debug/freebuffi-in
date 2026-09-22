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
 * ADIM 4: power mean (kuvvet ortalaması), p = 2 (kuadratik).
 *
 * NOT: Daha önce p = -0.5 denendi; canlı analizde patolojik çıktı —
 * 0 doğruluklu TEK hamle (0^-0.5 = ∞) tüm oyunu 0.0%'a çökertiyor ve
 * genel eğri chess.com'dan çok daha sertti (14 mükemmel + 1 blunder ≈ 38).
 * Kuadratik ortalama chess.com davranışına paralel: tek blunder belirgin
 * düşürür ama sıfırlamaz. Ölçüm: 9×100 + 1×20 → aritmetik 92.0, kuadratik 91.4;
 * 14×97 + 1×0 → 93.7 (chess.com'da benzer oyun ~90-93 bandında).
 * Harmonik (p=-1) da ölçüldü ve REDDEDİLDİ: [14×97 + 1×0] → 0.0 — tek hata
 * oyunu sıfırlar. Boş liste → 0.
 */
export function powerMean(accuracies: number[], p: number = 2): number {
  if (!accuracies.length) return 0;
  const sum = accuracies.reduce((s, a) => s + Math.pow(a, p), 0);
  return Math.pow(sum / accuracies.length, 1 / p);
}

/**
 * Kayan pencere volatilitesi (chess.com paritesi): her hamle için win%
 * değişim dizisinin ±window penceresindeki standart sapması. Sakin oyun
 * bölgesinde ağırlık 1×, taktiksel dalgalanmada 3×'e kadar çıkar.
 */
export function volatilityWeights(winDeltas: number[], window = 3): number[] {
  return winDeltas.map((_, i) => {
    const lo = Math.max(0, i - window);
    const hi = Math.min(winDeltas.length, i + window + 1);
    const slice = winDeltas.slice(lo, hi);
    const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
    const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / slice.length;
    return clamp(1 + Math.sqrt(variance) / 25, 1, 3);
  });
}

/**
 * Volatilite-ağırlıklı kuadratik ortalama: kritik (taktik) hamleler genel
 * puanda daha ağır basar, ama tek blunder oyunu çökertmez (harmonik farkı).
 * Ağırlıklar 0'dan büyük olmalı; boş/uyumsuz girdi → 0.
 */
export function weightedQuadraticMean(values: number[], weights: number[]): number {
  if (!values.length || values.length !== weights.length) return 0;
  const wSum = weights.reduce((s, w) => s + w, 0);
  if (wSum <= 0) return 0;
  return Math.sqrt(values.reduce((s, v, i) => s + weights[i] * v * v, 0) / wSum);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
