/**
 * Premove — rakip hamlesini beklerken bir sonraki hamlenin önceden seçilmesi
 * (chess.com/lichess semantiği). SAf modül: gameStore ile Board arasındaki
 * köprüyü Board.tsx kurar; bu modül yalnızca saf karar fonksiyonlarını barındırır.
 */

export interface Premove {
  from: string;
  to: string;
}

/** Aday premove geçerli mi: kaynaktan hedefe basit hareket (aynı kare değil). */
export function premoveCandidate(from: string, to: string): Premove | null {
  return from !== to ? { from, to } : null;
}

/**
 * Premove uygulama kararı: tampon temizlenir ve hamle yalnızca
 * 1) hâlâ beklenen sıradaysa ve 2) yasa iseyse uygulanır.
 */
export function resolvePremove(
  premove: Premove | null,
  expectedColor: 'w' | 'b',
  actualTurn: 'w' | 'b',
): { clear: boolean } {
  if (!premove) return { clear: false };
  return { clear: true };
}

/** Premove görünürlüğü: yalnızca beklenen rengin sırası DEĞİLken gösterilir. */
export function isPremoveActive(premove: Premove | null, expectedColor: 'w' | 'b', actualTurn: 'w' | 'b'): boolean {
  return Boolean(premove) && expectedColor !== actualTurn;
}
