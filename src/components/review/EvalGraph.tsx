import { winPercentWhite } from '../../engine/evaluation';

interface Props {
evalHistoryWhiteCp: (number | null)[];
selectedPly: number;
onSelect: (ply: number) => void;
}

export function EvalGraph({ evalHistoryWhiteCp, selectedPly, onSelect }: Props) {
const w = 600, h = 120;
const n = evalHistoryWhiteCp.length;
const points = evalHistoryWhiteCp.map((cp, i) => {
const x = (i / Math.max(1, n - 1)) * w;
const winPct = winPercentWhite({ cpWhite: cp, mateWhite: null });
return { x, y: h - (winPct / 100) * h, ply: i - 1 };
});
const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

return (
<svg
viewBox={`0 0 ${w} ${h}`}
className="eval-graph"
role="img"
aria-label="Değerlendirme grafiği"
onClick={(e) => {
const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
const relX = ((e.clientX - rect.left) / rect.width) * w;
const nearest = points.reduce((a, b) => (Math.abs(b.x - relX) < Math.abs(a.x - relX) ? b : a));
onSelect(nearest.ply);
}}
>
<line x1="0" y1={h / 2} x2={w} y2={h / 2} className="eval-graph__mid" />
<path d={path} className="eval-graph__line" fill="none" />
{points.map((p) => (
<circle key={p.ply} cx={p.x} cy={p.y} r={p.ply === selectedPly ? 5 : 0} className="eval-graph__dot" />
))}
</svg>
);
}
