/**
 * Tahta çizim mantığı — SAf: store/DOM bilmez. lichess semantiği:
 * - Sağ tık (sürüklemeden bırakma) → kare vurgusu; aynı kare + aynı renk tekrar → kaldır.
 * - Sağ tık sürükleme (farklı kareye bırakma) → ok; aynı from→to + aynı renk tekrar → kaldır.
 * - Farklı renk aynı kare/ok için EKLENİR (lichess çoklu renk çakışmasına izin verir).
 * - Sol tık → tüm çizimler temizlenir.
 */

export type AnnotationColor = 'green' | 'red' | 'blue' | 'yellow';

export interface SquareArrow {
  from: string;
  to: string;
  color: AnnotationColor;
}

export interface SquareHighlight {
  square: string;
  color: AnnotationColor;
}

export interface BoardAnnotations {
  arrows: SquareArrow[];
  highlights: SquareHighlight[];
}

export const EMPTY_ANNOTATIONS: BoardAnnotations = { arrows: [], highlights: [] };

/** Süsleme rengi: Alt → kırmızı, Ctrl/Meta → mavi, Shift → sarı, hiçbiri → yeşil. */
export function modifierColor(alt: boolean, ctrlOrMeta: boolean, shift: boolean): AnnotationColor {
  if (alt) return 'red';
  if (ctrlOrMeta) return 'blue';
  if (shift) return 'yellow';
  return 'green';
}

/** Kare vurgusu ekle/kaldır (aynı kare + aynı renk = toggle). Yeni durum döner, girdi değişmez. */
export function toggleHighlight(a: BoardAnnotations, square: string, color: AnnotationColor): BoardAnnotations {
  const exists = a.highlights.some((h) => h.square === square && h.color === color);
  return exists
    ? { ...a, highlights: a.highlights.filter((h) => !(h.square === square && h.color === color)) }
    : { ...a, highlights: [...a.highlights, { square, color }] };
}

/** Ok ekle/kaldır (aynı from→to + aynı renk = toggle). Yeni durum döner, girdi değişmez. */
export function toggleArrow(a: BoardAnnotations, from: string, to: string, color: AnnotationColor): BoardAnnotations {
  const exists = a.arrows.some((x) => x.from === from && x.to === to && x.color === color);
  return exists
    ? { ...a, arrows: a.arrows.filter((x) => !(x.from === from && x.to === to && x.color === color)) }
    : { ...a, arrows: [...a.arrows, { from, to, color }] };
}

/** Sol tık: tüm çizimleri temizle. */
export function clearAnnotations(): BoardAnnotations {
  return EMPTY_ANNOTATIONS;
}
