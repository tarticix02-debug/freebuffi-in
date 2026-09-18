import { Chess } from 'chess.js';
import type { PuzzleDefinition } from '../src/puzzles/types';

export interface PuzzleIssue {
  puzzleId: string;
  severity: 'invalid' | 'suspicious';
  reason: string;
}

/**
 * Bir puzzle tanımını uçtan uca doğrular:
 *  1. FEN geçerli ve legal bir pozisyon (şah sayısı, hamle sırası, taraf mat/pat DEĞİL)
 *  2. Çözümdeki her hamle bu pozisyonda gerçekten oynanabilir
 *  3. Son hamle birim temalı puzzle'da (themes=['mate']) gerçekten MAT olmalı
 *  4. Çözüm 'tek savunma' varsayımı: rakip hamlelerinden sonra puzzle devam
 *     ediyorsa rakip hamlesi o pozisyonda legal olmalıdır (compile zaten kontrol eder)
 *  5. Rating aralığı 400-2600 (makul bant)
 *  6. Tema etiketi pozisyonla çelişmemeli (promotion teması => terfi hamlesi var)
 */
export function validatePuzzle(def: PuzzleDefinition): PuzzleIssue[] {
  const issues: PuzzleIssue[] = [];
  const bad = (reason: string) => issues.push({ puzzleId: def.id, severity: 'invalid', reason });
  const warn = (reason: string) => issues.push({ puzzleId: def.id, severity: 'suspicious', reason });

  const chess = new Chess();
  try {
    chess.load(def.fen);
  } catch (e) {
    bad(`Geçersiz FEN: ${(e as Error).message}`);
    return issues;
  }

  if (chess.isCheckmate() || chess.isStalemate()) {
    bad('Başlangıç pozisyonu zaten mat/pat — çözülecek hamle yok.');
    return issues;
  }

  const sourceMoves = def.solutionSan ?? def.solutionUci;
  if (!sourceMoves || sourceMoves.length === 0) {
    bad('Çözüm tanımlı değil.');
    return issues;
  }

  for (const mv of sourceMoves) {
    const applied = def.solutionSan
      ? chess.move(mv)
      : chess.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv.slice(4) || undefined } as any);
    if (!applied) {
      bad(`Çözüm hamlesi "${mv}" bu pozisyonda oynanamıyor (hamle ${chess.history().length + 1}).`);
      return issues;
    }
  }

  const finalFen = chess.fen();
  const endsInMate = chess.isCheckmate();

  if (def.themes.includes('mate') && !endsInMate) {
    bad(`'mate' temalı ama çözüm mat ile bitmiyor (final: ${finalFen}).`);
  }

  // Birim mate puzzle'ları tek hamlede bitmelidir (mate-in-1 iddiası doğrulanır);
  // çok hamleliyse rakibin "tek savunma" seçeneği var demektir — şüpheli işaretle.
  if (def.themes.includes('mate') && sourceMoves.length > 1) {
    warn(`'mate' temalı puzzle ${sourceMoves.length} hamlelik — mate-in-N iddiası ayrıca doğrulanmalı.`);
  }

  if (def.themes.includes('promotion') && !sourceMoves.some((m) => m.includes('='))) {
    bad(`'promotion' temalı ama çözümde terfi hamlesi yok.`);
  }

  if (def.rating < 400 || def.rating > 2600) {
    warn(`Rating ${def.rating} makul bant dışında (400-2600).`);
  }

  if (!def.themes.length) warn('Tema etiketi yok.');

  return issues;
}
