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

/**
 * Taş ölçümü: glif, Noto Sans Symbols2'de em kutusunun ÇOK üzerine taşar
 * (82px fontta bbox y=-9..108, viewBox 0..100). Taşan kontur (özellikle
 * beyaz stroke) karede beyaz leke/çerçeve gibi görünür — "iki taraf da
 * beyaz görünüyor" hatasının kökü buydu. Çözüm: glifi küçültüp tam ortala;
 * taşma olmayınca kontur yalnızca taş silüetinde kalır.
 */
const GLYPH_FONT_SIZE = 62;

export function PieceIcon({ type, color, size }: { type: PieceSymbol; color: Color; size?: number }) {
  const isWhite = color === 'w';
  const fill = isWhite ? '#faf8f2' : '#22201c';
  const stroke = isWhite ? '#2a2a28' : '#0c0b0a';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size ?? '88%'}
      height={size ?? '88%'}
      role="img"
      aria-label={`${isWhite ? 'Beyaz' : 'Siyah'} ${LABEL[type]}`}
      style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.4))', display: 'block', overflow: 'visible' }}
    >
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={GLYPH_FONT_SIZE}
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
        paintOrder="stroke"
        style={{ fontFamily: "'Noto Sans Symbols2','Segoe UI Symbol','Arial Unicode MS',sans-serif" }}
      >
        {GLYPH[type]}
      </text>
    </svg>
  );
}
