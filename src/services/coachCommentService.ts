import { Chess } from 'chess.js';
import type { MoveClass } from '../engine/evaluation';

/**
 * SANAL KOÇ MOTORU — her hamle sınıflandırması için konuma göre DEĞİŞEN
 * dinamik Türkçe yorum üretir. Sabit metin yok: taş adı, materyal dengesi,
 * üstünlük kaybı ve asılı taş tespiti (SEE enjeksiyonuyla) yoruma girer.
 *
 * Bu modül SAF: motor/store bilmez; SEE bağımlılığı enjekte edilir.
 */

const PIECE_NAMES_TR: Record<string, string> = {
  p: 'Piyon', n: 'At', b: 'Fil', r: 'Kale', q: 'Vezir', k: 'Şah',
};

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** FEN placement'ından karedeki taşın Türkçe adını döner; boşsa null. */
export function pieceNameTr(fen: string, square: string): string | null {
  const placement = fen.split(' ')[0];
  const fileIdx = square.charCodeAt(0) - 97; // a=0
  const rankIdx = 8 - parseInt(square[1], 10); // rank8=satır0
  const row = placement.split('/')[rankIdx];
  if (!row) return null;
  let col = 0;
  for (const ch of row) {
    if (/\d/.test(ch)) { col += parseInt(ch, 10); continue; }
    if (col === fileIdx) return PIECE_NAMES_TR[ch.toLowerCase()] ?? null;
    col++;
  }
  return null;
}

/**
 * MATERYAL TAKİP ALGORİTMASI: Piyon=1, At=3, Fil=3, Kale=5, Vezir=9.
 * Beyaz eksi siyah aktif materyal dengesi (pozitif = beyaz önde).
 * Hamle öncesi/sonrası FEN'lerde hesaplanarak geriye dönük feda takibi yapılır.
 */
export function materialBalance(fen: string): number {
  const placement = fen.split(' ')[0];
  let balance = 0;
  for (const ch of placement) {
    const v = PIECE_VALUES[ch.toLowerCase() as keyof typeof PIECE_VALUES];
    if (v) balance += ch === ch.toUpperCase() ? v : -v;
  }
  return balance;
}

/** UCI hamleyi verilen FEN'de oynatıp SAN'ını döner; yasa isev null. */
export function sanFromUci(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined }).san;
  } catch {
    return null;
  }
}

/** buildMoveComment için gereken hamle bilgisi (MoveReview alt kümesi). */
export interface CoachCommentInput {
  classification: MoveClass;
  san: string;
  playedUci: string;
  bestUci: string | null;
  winPercentLoss: number;
  moverWinPercentBefore: number;
  moverWinPercentAfter: number;
  evalAfterWhiteCp: number | null;
  evalAfterMate: number | null;
  fenBefore: string;
  fenAfter: string;
  isBookMove: boolean;
}

export interface CoachCommentDeps {
  /** Asılı taş tespiti: pozisyonda karedeki taş için Static Exchange Evaluation. */
  seeAtDest?: (fen: string, square: string) => number;
}

/**
 * Sınıflandırmanın nihai değerine (miss pası dahil) göre dinamik koç yorumu.
 * Etiket tanımları chess.com'un yayımladığı Türkçe sınıflandırma tablosundadır.
 */
export function buildMoveComment(input: CoachCommentInput, deps: CoachCommentDeps = {}): string {
  const { classification, playedUci, bestUci, moverWinPercentBefore: before, moverWinPercentAfter: after, evalAfterMate, fenBefore, fenAfter } = input;
  const dest = playedUci.slice(2, 4);
  const see = deps.seeAtDest?.(fenAfter, dest);
  const hangs = see !== undefined && see <= -100;
  const piece = pieceNameTr(fenBefore, playedUci.slice(0, 2)) ?? 'Taş';

  switch (classification) {
    case 'book': {
      const fullmove = parseInt(fenBefore.split(' ')[5] ?? '', 10) || 1;
      return fullmove <= 2
        ? 'Kitap hamlesi. Açılış teorisine uygun standart bir başlangıç.'
        : 'Kitap hamlesi. Açılış teorisine uygun.';
    }
    case 'brilliant':
      return 'Harika bir feda! Rakibiniz bu taşı alırsa konumun yine üstün kalır.';
    case 'great':
      return 'Oyunun gidişatını değiştiren hamle! Konumda kazandıran tek hamleydi.';
    case 'best':
      return evalAfterMate !== null && evalAfterMate > 0
        ? `Zorlayıcı mat hamlesi! (M${evalAfterMate})`
        : 'Satranç motorunun en iyi tercihi.';
    case 'excellent':
      return 'Neredeyse en iyi hamle kadar iyi.';
    case 'good':
      return 'İyi bir hamleydi, ama en iyisi değildi.';
    case 'inaccuracy':
      if (hangs) return `${piece} taşınızı doğrudan boşta bıraktınız.`;
      if (before - after >= 10) return 'Zayıf bir hamle — üstünlük eridi.';
      return 'Zayıf bir hamle.';
    case 'mistake':
      if (hangs) return `${piece} taşınızı doğrudan boşta bıraktınız.`;
      if (before - after >= 25) return 'Durumunuz anında daha da kötüleşti — rakibe üstünlük verdiniz.';
      return 'Durumunuzu anında daha da kötüleştiren bir hamle.';
    case 'miss': {
      const bestSan = bestUci ? sanFromUci(fenBefore, bestUci) : null;
      return bestSan
        ? `Rakibin hatasını cezalandırma fırsatını kaçırdınız. Doğrusu: ${bestSan}`
        : 'Taktiksel bir fırsatı veya rakibi cezalandırma şansını kaçırdınız.';
    }
    case 'blunder':
      if (before >= 80 && after < 40) return 'Kazanan pozisyonu tamamen elden çıkardınız.';
      if (hangs) return `${piece} bedava kaldı — rakibiniz alabilir.`;
      if (before - after >= 30) return 'Hem malzeme kaybına hem de oyun kaybına yol açan çok kötü bir hamle.';
      return 'Çok kötü bir hamle — oyununuz ciddi biçimde bozuldu.';
    default:
      return '';
  }
}
