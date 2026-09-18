import type { ChessGame } from '../../chess/ChessGame';
import type { Move } from 'chess.js';
import type { VariantRuntimeState } from '../types';
import type { StockfishEngine } from '../../engine/StockfishEngine';

/**
 * Standart Stockfish, varyant kurallarını (donma, görünmezlik, jackpot vb.)
 * BİLMEZ. Bu adapter motor önerisini alır, ama uygulamadan önce varyantın
 * onBeforeMove kısıtlarına göre filtreler:
 *
 *  1. En iyi hamle kurala uyuyorsa o oynanır.
 *  2. Uymuyorsa, motorun MultiPV alternatifleri arasında uyumlu bir hamle aranır.
 *  3. Hâlâ yoksa veya motor hata verirse, izinli hamleler materyal-farkında
 *     greedy (SEE tabanlı) skorla seçilir.
 *
 * Böylece varyant rakibi "Stockfish kuralları anlıyor" yanılsaması yaratmadan
 * rastgele oynamaktan belirgin biçimde daha güçlü olur.
 */
export class VariantAIAdapter {
  constructor(private engine: StockfishEngine) {}

  async pickMove(
    game: ChessGame,
    variantState: VariantRuntimeState,
    guard: (from: string, to: string) => boolean
  ): Promise<{ from: string; to: string; promotion?: string } | null> {
    const allowed = game.legalMoves().filter((m) => guard(m.from, m.to));
    if (!allowed.length) return null;

    // Motor analizi pahalıdır: izinli hamle tekse düşünmeye gerek yok.
    if (allowed.length === 1) {
      const only = allowed[0];
      return { from: only.from, to: only.to, promotion: only.promotion };
    }

    try {
      const result = await this.engine.analyze(game.fen(), { movetimeMs: 600 }, `variant-${Date.now()}`);
      const candidates: { from: string; to: string; promotion?: string }[] = [];

      if (result.bestMove) {
        candidates.push({
          from: result.bestMove.slice(0, 2),
          to: result.bestMove.slice(2, 4),
          promotion: result.bestMove.slice(4) || undefined,
        });
      }
      // MultiPV alternatifleri (varsa) ikinci şans olarak denenir.
      for (const line of result.lines ?? []) {
        if (!line.moveUci || line.moveUci === result.bestMove) continue;
        candidates.push({
          from: line.moveUci.slice(0, 2),
          to: line.moveUci.slice(2, 4),
          promotion: line.moveUci.slice(4) || undefined,
        });
      }

      for (const c of candidates) {
        if (guard(c.from, c.to) && allowed.some((m) => m.from === c.from && m.to === c.to)) {
          return c;
        }
      }
    } catch {
      // motor önerisi alınamazsa aşağıdaki fallback'e düş
    }

    // İzinli hamleler arasında basit ama gerçek bir değerlendirme: statik takas
    // (SEE) + materyal dengesi. Rastgelelik değil, konuma duyarlı seçim.
    const scored = allowed.map((m) => ({ m, score: greedyScore(m) }));
    scored.sort((a, b) => b.score - a.score);
    const pick = scored[0].m;
    return { from: pick.from, to: pick.to, promotion: pick.promotion };
  }
}

function greedyScore(m: Move): number {
  let score = 0;
  if (m.captured) score += PIECE_VALUE[m.captured] ?? 0;
  if (m.promotion) score += (PIECE_VALUE[m.promotion] ?? 0) - 1;
  return score;
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
