import { winPercentWhite } from '../../engine/evaluation';

/**
 * Oyun içi canlı değerlendirme çubuğu — tahtanın soluna yapışık.
 * Beyaz dolgusu height geçişiyle (0.5s ease-in-out) yumuşak akar;
 * skor etiketi avantajlı tarafın kamasında durur; flipped=true ile
 * siyaha oynarken/tahta çevrilince bar kendini tersine çevirir.
 */
export function GameEvalBar({ cpWhite, mateWhite, flipped }: {
  cpWhite: number | null;
  mateWhite: number | null;
  flipped: boolean;
}) {
  const winPct = winPercentWhite({ cpWhite, mateWhite });
  // Skor her zaman önde olana göre: beyaz öndeyse +1.5, siyah öndeyse -1.5,
  // mat yakınsa M3 / -M3 (chess.com gösterimi).
  const label = mateWhite !== null
    ? `${mateWhite > 0 ? '' : '-'}M${Math.abs(mateWhite)}`
    : `${(cpWhite ?? 0) >= 0 ? '+' : ''}${((cpWhite ?? 0) / 100).toFixed(1)}`;
  const whiteOnTop = flipped; // flipped'te beyaz alta düşer → dolgu üstten büyür

  return (
    <div className="game-eval-bar" role="img" aria-label={`Değerlendirme: ${label}`}>
      <div
        className={`game-eval-bar__white${whiteOnTop ? ' game-eval-bar__white--top' : ''}`}
        style={{ height: `${winPct}%` }}
      />
      <span className={`game-eval-bar__label${winPct >= 50 ? ' game-eval-bar__label--white' : ' game-eval-bar__label--black'}`}>
        {label}
      </span>
    </div>
  );
}
