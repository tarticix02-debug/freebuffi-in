import type { PieceSymbol, Color } from 'chess.js';

// Her iki renk de AYNI silueti kullanır (Unicode'un "siyah taş" ailesi,
// çünkü bu aile dolu/solid çizilir ve renklendirmeye daha uygundur);
// beyaz/siyah ayrımı kendi fill/stroke renklerimizle yapılır. Böylece iki
// rengin şekli birebir aynı olur, sadece tonu değişir.
const GLYPH: Record<PieceSymbol, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
};

const LABEL: Record<PieceSymbol, string> = {
  p: 'Piyon', n: 'At', b: 'Fil', r: 'Kale', q: 'Vezir', k: 'Şah',
};

export function PieceIcon({ type, color, size }: { type: PieceSymbol; color: Color; size?: number }) {
  const isWhite = color === 'w';
  const fill = isWhite ? '#faf8f2' : '#22201c';
  const stroke = isWhite ? '#2a2a28' : '#faf8f2';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size ?? '86%'}
      height={size ?? '86%'}
      role="img"
      aria-label={`${isWhite ? 'Beyaz' : 'Siyah'} ${LABEL[type]}`}
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))', display: 'block' }}
    >
      <text
        x="50"
        y="58"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="82"
        fill={fill}
        stroke={stroke}
        strokeWidth="2.5"
        paintOrder="stroke"
        style={{ fontFamily: "'Noto Sans Symbols2','Segoe UI Symbol','Arial Unicode MS',sans-serif" }}
      >
        {GLYPH[type]}
      </text>
    </svg>
  );
}
