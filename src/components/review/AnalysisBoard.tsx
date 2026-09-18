import { Chess } from 'chess.js';
import { PieceIcon } from '../board/PieceIcon';
import { MoveClassBadge } from './MoveClassBadge';
import type { MoveReview } from '../../services/gameReviewService';

export function AnalysisBoard({ fen, highlightFrom, highlightTo, bestFrom, bestTo, badgeMove }: {
  fen: string;
  highlightFrom?: string;
  highlightTo?: string;
  /** Motorun önerdiği en iyi hamlenin kareleri (kesikli çerçeve ile gösterilir). */
  bestFrom?: string;
  bestTo?: string;
  /** Oynanan hamlenin sınıf ikonu, varış karesinin üstünde küçük rozet olarak gösterilir. */
  badgeMove?: MoveReview | null | undefined;
}) {
  // Geçersiz/boş FEN tüm React ağacını çökertmesin: başlangıç pozisyonuna düş.
  let board: ReturnType<Chess['board']>;
  try {
    board = new Chess(fen).board();
  } catch {
    board = new Chess().board();
  }
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="board-wrapper">
    <div className="board-grid board-grid--readonly" role="img" aria-label="Analiz pozisyonu">
      {board.map((row, ri) =>
        row.map((cell, fi) => {
          const square = `${files[fi]}${8 - ri}`;
          const isDark = (ri + fi) % 2 === 1;
          const isHighlighted = square === highlightFrom || square === highlightTo;
          const isBest = square === bestFrom || square === bestTo;
          return (
            <div
              key={square}
              className={`square ${isDark ? 'square--dark' : 'square--light'} ${isHighlighted ? 'square--last-move' : ''} ${isBest ? 'square--best-move' : ''}`}
            >
              {cell && <PieceIcon type={cell.type} color={cell.color} />}
            </div>
          );
        })
      )}
    </div>
    <MoveClassBadge move={badgeMove} />
    </div>
  );
}
