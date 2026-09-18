import { winPercentWhite } from '../../engine/evaluation';

export function EvalBar({ cpWhite, mateWhite }: { cpWhite: number | null; mateWhite: number | null }) {
  const winPct = winPercentWhite({ cpWhite, mateWhite });
  const label = mateWhite !== null ? `M${Math.abs(mateWhite)}` : cpWhite !== null ? (cpWhite / 100).toFixed(1) : '0.0';
  return (
    <div className="eval-bar" aria-label={`Değerlendirme: ${label}`}>
      <div className="eval-bar__white" style={{ height: `${winPct}%` }} />
      <span className="eval-bar__label">{label}</span>
    </div>
  );
}
