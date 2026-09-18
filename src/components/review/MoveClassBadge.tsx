import type { MoveReview } from '../../services/gameReviewService';
import { MoveClassIcon, CLASS_COLORS, type MoveClassKey } from './MoveClassIcon';

/**
 * İnceleme tahtasındaki sınıflandırma rozeti: oynanan hamlenin varış
 * karesinin üstünde, sınıf rengiyle küçük ikon rozeti (chess.com tarzı).
 */
export function MoveClassBadge({ move }: { move?: MoveReview | null }) {
  if (!move) return null;
  const kind = move.classification as MoveClassKey;
  const to = move.playedUci.slice(2, 4);
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const fileIdx = files.indexOf(to[0]);
  const rank = Number(to[1]);
  if (fileIdx < 0 || rank < 1 || rank > 8) return null;
  const left = (fileIdx / 8) * 100;
  const top = ((8 - rank) / 8) * 100;
  return (
    <span
      className="move-class-badge"
      style={{ left: `calc(${left}% + 12.5% - 2px)`, top: `calc(${top}% + 4px)`, backgroundColor: CLASS_COLORS[kind] ?? 'var(--accent)' }}
      title={move.san}
    >
      <MoveClassIcon kind={kind} size={12} />
    </span>
  );
}
