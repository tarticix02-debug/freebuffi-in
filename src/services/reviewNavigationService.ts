import type { GameReviewResult } from './gameReviewService';

/**
 * "Önemli hamle" sınıfları — çift okla atlanacak anlar.
 * İyi taraftan yalnızca en iyi/çok iyi (brilliant, great),
 * kötü taraftan kritik olanlar (miss, mistake, blunder).
 */
const KEY_CLASSES: ReadonlySet<string> = new Set(['brilliant', 'great', 'miss', 'mistake', 'blunder']);

/** Önemli hamlelerin ply indeksleri (artan sırada). */
export function keyMomentPlies(result: GameReviewResult): number[] {
  return result.moves
    .map((m, i) => (KEY_CLASSES.has(m.classification) ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * selectedPly'den `direction` yönünde bir sonraki önemli hamlenin ply'i.
 * selectedPly -1 = başlangıç pozisyonu. Hedef yoksa null döner.
 */
export function nextKeyMoment(result: GameReviewResult, selectedPly: number, direction: 1 | -1): number | null {
  const keys = keyMomentPlies(result);
  if (direction === 1) return keys.find((p) => p > selectedPly) ?? null;
  return [...keys].reverse().find((p) => p < selectedPly) ?? null;
}
