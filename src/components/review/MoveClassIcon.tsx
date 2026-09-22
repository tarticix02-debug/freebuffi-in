/**
 * chess.com tarzı hamle sınıflandırma görselleri.
 * Görsel dil gönderilen referans görselle birebir hizalıdır:
 *  - brilliant  : teal daire içinde çift ünlem (!!)
 *  - great      : mavi daire içinde tek ünlem (!)
 *  - best       : yeşil daire içinde taç (kraliyet hamlesi)
 *  - excellent  : açık yeşil daire içinde yıldız
 *  - good       : gri-yeşil daire içinde onay işareti
 *  - book       : kahverengi daire içinde açık kitap
 *  - inaccuracy : sarı daire içinde ?!
 *  - mistake    : turuncu daire içinde ?
 *  - miss       : kırmızı-pembe daire içinde çarpı (X)
 *  - blunder    : koyu kırmızı daire içinde kırık taş
 */

export type MoveClassKey =
  | 'brilliant' | 'great' | 'best' | 'excellent' | 'good'
  | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export const CLASS_COLORS: Record<MoveClassKey, string> = {
  brilliant: '#26c2a3',
  great: '#5c8bb0',
  best: '#81b64c',
  excellent: '#95bb4a',
  good: '#96af8b',
  book: '#a88865',
  inaccuracy: '#f7c631',
  mistake: '#ffa459',
  miss: '#fa412d',
  blunder: '#d63b24',
};

export const CLASS_LABELS: Record<MoveClassKey, string> = {
  brilliant: 'Muhteşem',
  great: 'Harika',
  best: 'En iyi',
  excellent: 'Harika',
  good: 'İyi',
  book: 'Kitap',
  inaccuracy: 'Yanlışlık',
  mistake: 'Hata',
  miss: 'Kayıp',
  blunder: 'Hata',
};

export function MoveClassIcon({ kind, size = 22 }: { kind: MoveClassKey; size?: number }) {
  const color = CLASS_COLORS[kind];
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const };

  switch (kind) {
    case 'brilliant':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <rect x="7.4" y="5" width="3.2" height="10" rx="1.6" fill="#fff" />
          <rect x="13.4" y="5" width="3.2" height="10" rx="1.6" fill="#fff" />
          <circle cx="9" cy="18.2" r="1.8" fill="#fff" />
          <circle cx="15" cy="18.2" r="1.8" fill="#fff" />
        </svg>
      );
    case 'great':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <rect x="9.8" y="4.5" width="4" height="11" rx="2" fill="#fff" />
          <circle cx="11.8" cy="18.6" r="2.1" fill="#fff" />
        </svg>
      );
    case 'best':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M5.5 8.2h13l-1.3 3.1c-.4.9-1.3 1.5-2.3 1.5H9.1c-1 0-1.9-.6-2.3-1.5z" fill="#fff" />
          <path d="M6.2 8.2l2.9-3.4c.3-.4.9-.4 1.2 0l1.7 2 1.7-2c.3-.4.9-.4 1.2 0l2.9 3.4z" fill="#fff" />
          <rect x="11.2" y="12.8" width="1.6" height="2.4" fill="#fff" />
          <rect x="8.6" y="15.2" width="6.8" height="1.7" rx="0.8" fill="#fff" />
          <rect x="7.6" y="17.1" width="8.8" height="1.7" rx="0.8" fill="#fff" />
        </svg>
      );
    case 'excellent':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M12 4.8l2 4.6 5 .5-3.8 3.3 1.1 4.9L12 15.5l-4.3 2.6 1.1-4.9L5 9.9l5-.5z" fill="#fff" />
        </svg>
      );
    case 'good':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M6.5 12.4l3.4 3.4L17.5 8" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M12 6.5c-1.6-1.2-3.7-1.6-5.5-1.2v11.4c1.8-.4 3.9 0 5.5 1.2 1.6-1.2 3.7-1.6 5.5-1.2V5.3c-1.8-.4-3.9 0-5.5 1.2z" fill="#fff" />
          <path d="M12 6.5v11.4" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'inaccuracy':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="inherit">?!</text>
        </svg>
      );
    case 'mistake':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M8.3 8.5a3.8 3.8 0 115.2 3.5c-.9.4-1.5 1-1.5 2v.5h-2.2v-.7c0-1.7.9-2.6 2-3.2 1-.5 1.5-1.1 1.5-2a2 2 0 10-4 0z" fill="#fff" />
          <circle cx="10.9" cy="17.9" r="1.5" fill="#fff" />
        </svg>
      );
    case 'miss':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path d="M7.2 7.2l9.6 9.6M16.8 7.2l-9.6 9.6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'blunder':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          {/* Kırık taş: baş gövdeden ayrık, çapraz kırık çizgili */}
          <path d="M9 4.5h5.4v2.2c0 .8-.4 1.3-1 1.7l-1 .6c.9.5 1.4 1.3 1.4 2.4 0 1.6-1.2 2.7-2.9 2.7s-2.9-1.1-2.9-2.7c0-1.1.5-1.9 1.4-2.4l-1-.6c-.6-.4-1-1-1-1.7z" fill="#fff" opacity="0.92" />
          <rect x="7" y="15.3" width="9.6" height="1.6" rx="0.8" fill="#fff" opacity="0.92" />
          <rect x="6" y="17.2" width="11.6" height="1.9" rx="0.95" fill="#fff" opacity="0.92" />
          <path d="M6.5 5.5L18 18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.5 5.5L18 18" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.4 2.4" opacity="0.55" />
        </svg>
      );
  }
}
