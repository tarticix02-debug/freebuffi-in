import type { MoveReview } from '../../services/gameReviewService';
import { MoveClassIcon, CLASS_LABELS, type MoveClassKey } from './MoveClassIcon';

export function MoveReviewRow({ move, selected, onClick }: { move: MoveReview; selected: boolean; onClick: () => void }) {
  const kind = move.classification as MoveClassKey;
  return (
    <button className={`move-row ${selected ? 'move-row--selected' : ''}`} onClick={onClick}>
      <span className="move-row__ply">{Math.floor(move.ply / 2) + 1}{move.side === 'w' ? '.' : '...'}</span>
      <span className="move-row__san">{move.san}</span>
      <span className="move-row__icon" title={CLASS_LABELS[kind]}>
        <MoveClassIcon kind={kind} size={20} />
      </span>
      {!['brilliant', 'best', 'great', 'book'].includes(move.classification) && move.bestUci && (
        <span className="move-row__best">Önerilen: {move.bestUci}</span>
      )}
    </button>
  );
}
