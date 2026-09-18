import { CLASS_LABELS, type MoveClassKey } from '../components/review/MoveClassIcon';
import type { GameReviewResult } from './gameReviewService';

export const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Hamle sınıfı -> PGN NAG kodu ($n). Standart yazılımların (chess.js, Lichess,
 * ChessBase) anladığı en yakın karşılıklar:
 *   $1 = ! (iyi/en iyi), $2 = ? (hata), $3 = !! (brilliant),
 *   $4 = ?? (büyük hata), $6 = ?! (küçük hata)
 */
export const CLASS_NAG: Partial<Record<MoveClassKey, number>> = {
  brilliant: 3,
  best: 1,
  excellent: 1,
  mistake: 2,
  blunder: 4,
  inaccuracy: 6,
};

export interface AnnotatedPgnOptions {
  white?: string;
  black?: string;
  event?: string;
  /** YYYY.MM.DD — verilmezse bugün kullanılır. */
  date?: string;
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
}

function fmtEval(cp: number | null, mate: number | null): string {
  if (mate !== null) return `#${mate}`;
  if (cp === null) return '?';
  const v = cp / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

function pgnDate(d = new Date()): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** Son hamlede verilen mata göre sonuç; belirsizse '*'. */
function guessResult(result: GameReviewResult): '1-0' | '0-1' | '*' {
  const last = result.moves[result.moves.length - 1];
  if (last?.evalAfterMate != null) return last.evalAfterMate > 0 ? '1-0' : '0-1';
  return '*';
}

/**
 * Analiz sonucunu açıklamalı PGN'e dönüştürür:
 *  - her hamleye sınıfına uygun NAG ($1/$2/$3/$4/$6) eklenir,
 *  - her hamleye {[%cls brilliant] Brilliant | En iyi: Nf3 | Değerlendirme: +0.35 | Kayıp: 2.1%}
 *    biçiminde yorum eklenir (standart chess yazılımları yorumu metin olarak gösterir),
 *  - oyun standart dışı bir FEN'den başladıysa [SetUp]/[FEN] header'ları eklenir.
 */
export function buildAnnotatedPgn(result: GameReviewResult, opts: AnnotatedPgnOptions = {}): string {
  const gameResult = opts.result ?? guessResult(result);
  const startFen = result.moves[0]?.fenBefore ?? STANDARD_START_FEN;
  const customStart = startFen !== STANDARD_START_FEN;

  const headers: string[] = [
    `[Event "${opts.event ?? 'Ultimate Chess - Oyun Incelemesi'}"]`,
    `[Site "Ultimate Chess"]`,
    `[Date "${opts.date ?? pgnDate()}"]`,
    `[Round "-"]`,
    `[White "${opts.white ?? 'Beyaz'}"]`,
    `[Black "${opts.black ?? 'Siyah'}"]`,
    `[Result "${gameResult}"]`,
  ];
  if (customStart) headers.push(`[SetUp "1"]`, `[FEN "${startFen}"]`);

  const tokens: string[] = [];
  result.moves.forEach((m, i) => {
    const fullMove = parseInt(m.fenBefore.split(' ')[5] ?? '', 10) || Math.floor(i / 2) + 1;
    const cls = m.classification as MoveClassKey;
    const nag = CLASS_NAG[cls];
    let token = m.san;
    if (nag) token += ` $${nag}`;

    const bits = [`[%cls ${m.classification}]`, CLASS_LABELS[cls] ?? m.classification];
    if (m.bestUci && m.bestUci !== m.playedUci) bits.push(`En iyi: ${m.bestUci}`);
    bits.push(`Değerlendirme: ${fmtEval(m.evalAfterWhiteCp, m.evalAfterMate)}`);
    bits.push(`Kayıp: ${m.winPercentLoss.toFixed(1)}%`);
    token += ` {${bits.join(' | ')}}`;

    // Numara hamleyi ASLA ayırmaz: '1.' ve '1...' daima SAN ile tek token.
    if (m.side === 'w') tokens.push(`${fullMove}.${token}`);
    else if (i === 0) tokens.push(`${fullMove}...${token}`);
    else tokens.push(token);
  });
  tokens.push(gameResult);

  // 80 sütunun altında satırlara böl (PGN konvansiyonu).
  const lines: string[] = [...headers];
  let line = '';
  for (const t of tokens) {
    if (line && line.length + 1 + t.length > 80) {
      lines.push(line);
      line = t;
    } else {
      line = line ? `${line} ${t}` : t;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n') + '\n';
}
