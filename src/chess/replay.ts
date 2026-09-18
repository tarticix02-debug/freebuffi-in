import { Chess } from 'chess.js';

export interface ReplayStep {
  ply: number;
  side: 'w' | 'b';
  moveSan: string;
  moveUci: string;
  fenBefore: string;
}

/** PGN'i chess.js ile gerçekten oynatarak her hamleden önceki FEN'i üretir. */
export function buildReplay(pgn: string): ReplayStep[] {
  const parsed = new Chess();
  parsed.loadPgn(pgn);
  const history = parsed.history({ verbose: true });

  // PGN [FEN] header'ı (özel başlangıçlı oyunlar — motor hazırlıkları, mat bulmacaları):
  // loadPgn hamleleri o pozisyondan doğrular; replay'i standart başlangıçta kurunca
  // ilk hamlede "Invalid move" fırlatıyordu. Aynı pozisyondan oynat.
  const replay = new Chess(pgnStartFen(pgn) ?? undefined);
  const steps: ReplayStep[] = [];
  history.forEach((mv, idx) => {
    const fenBefore = replay.fen();
    const side = replay.turn();
    replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    steps.push({
      ply: idx,
      side,
      moveSan: mv.san,
      moveUci: `${mv.from}${mv.to}${mv.promotion ?? ''}`,
      fenBefore,
    });
  });
  return steps;
}

export function finalFen(pgn: string): string {
  const c = new Chess();
  c.loadPgn(pgn);
  return c.fen();
}

/** PGN'in [FEN] header'ındaki özel başlangıç pozisyonu (yoksa null). */
export function pgnStartFen(pgn: string): string | null {
  return pgn.match(/\[FEN\s+"([^"]+)"\]/)?.[1] ?? null;
}

/**
 * DEĞERLENDİRME MATEMATİĞİ — Win% ve Accuracy
 * Burada kullanılan win% dönüşüm formülü ve accuracy formülü, Lichess'in açık
 * kaynak (AGPL) yayınladığı ve blog'unda kamuya açıkladığı "Accuracy"
 * modelinin bağımsız bir yeniden implementasyonudur. Not: Ticari dağıtımdan
 * önce bu formülün lisans durumu (AGPL türev eser riski) hukuken
 * netleştirilmelidir — bkz. bölüm 8, lisans notu.
 */
