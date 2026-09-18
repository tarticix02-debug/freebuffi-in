import type { MoveClass } from '../engine/evaluation';
import type { GameReviewResult } from './gameReviewService';

/**
 * Oyun sonu ekranının 3 göstergesi (chips) için ortak türetme.
 *
 * SÖZLEŞME: Hem overlay'in hızlı derinlik-8 analizi hem de İnceleme ekranının
 * chess.com-kalibre tam analizi aynı classifyMove/pipeline'ı kullandığı için,
 * çiplerin gösterebildiği sınıflarda (brilliant/great/blunder/mistake) iki
 * analiz TUTARLI sayılar üretmelidir. Bu fonksiyon türetmeyi tek yerde
 * toplar; regressyon testi tests/reviewKeyChips.test.ts'de bu sözleşmeyi
 * kilitler (gerçek oyunla canlı doğrulandı: 16 hamlelik Sicilya'da çip
 * "1 Büyük Hata" = incelemenin blunder sayısı).
 */

/** chess.com önceliği: brilliant > very good (great) > en ağır hata. */
const CHIP_PRIORITY = ['brilliant', 'great', 'blunder', 'mistake'] as const;
type ChipClass = (typeof CHIP_PRIORITY)[number];

export interface KeyChip {
  cls: ChipClass;
  n: number;
}

function isChipClass(cls: MoveClass): cls is ChipClass {
  return (CHIP_PRIORITY as readonly string[]).includes(cls);
}

/**
 * Analiz sonucundan insanın KENDİ kilit hamlelerini chess.com önceliğiyle
 * en fazla `max` göstergeye indirger. Rakibin hamleleri asla sayılmaz;
 * nötr sınıflar (best/excellent/good/book/miss) çiplerde gösterilmez.
 */
export function pickKeyChips(result: GameReviewResult, humanColor: 'w' | 'b', max = 3): KeyChip[] {
  const counts = new Map<ChipClass, number>();
  for (const m of result.moves) {
    if (m.side !== humanColor) continue;
    const cls = m.classification;
    if (!isChipClass(cls)) continue;
    counts.set(cls, (counts.get(cls) ?? 0) + 1);
  }
  const picks: KeyChip[] = [];
  for (const cls of CHIP_PRIORITY) {
    const n = counts.get(cls) ?? 0;
    if (n > 0 && picks.length < max) picks.push({ cls, n });
  }
  return picks;
}
