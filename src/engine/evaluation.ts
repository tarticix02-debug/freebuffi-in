export interface EngineSample {
cpWhite: number | null;
mateWhite: number | null;
/** Motorun kendi WDL modeli (Beyaz perspektifi). Varsa lojistik formülden önce tercih edilir. */
wdlWhite?: { w: number; d: number; l: number } | null;
}

/** Motorun "sıradaki oyuncu" perspektifinden verdiği skoru Beyaz perspektifine çevirir. */
export function toWhitePerspective(sideToMove: 'w' | 'b', cp: number | null, mate: number | null): EngineSample {
if (mate !== null) {
return { cpWhite: null, mateWhite: sideToMove === 'w' ? mate : -mate };
}
return { cpWhite: sideToMove === 'w' ? (cp ?? 0) : -(cp ?? 0), mateWhite: null };
}

function clamp(v: number, min: number, max: number) {
return Math.max(min, Math.min(max, v));
}

/** Beyaz kazanma olasılığı (%): mat → satürasyon; WDL varsa W + D/2; yoksa cp→lojistik. */
export function winPercentWhite(sample: EngineSample): number {
if (sample.mateWhite !== null) return sample.mateWhite > 0 ? 100 : 0;
if (sample.wdlWhite) {
const { w, d, l } = sample.wdlWhite;
const total = w + d + l;
if (total > 0) return clamp((100 * (w + d / 2)) / total, 0, 100);
}
const cp = clamp(sample.cpWhite ?? 0, -1000, 1000);
const winP = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
return clamp(winP, 0, 100);
}

/** win% kaybından 0-100 arası doğruluk puanı. Kayıp 0 -> ~100, kayıp büyüdükçe hızla düşer. */
export function accuracyFromLoss(winPercentLoss: number): number {
const acc = 103.1668 * Math.exp(-0.04354 * winPercentLoss) - 3.1669;
return clamp(acc, 0, 100);
}

export type MoveClass = 'brilliant' | 'best' | 'great' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book' | 'miss';

const MISS_WIN_PERCENT_THRESHOLD = 80;   // kazanan pozisyon (mover perspektifinden win%)
const MISS_WIN_PERCENT_DROP = 12;        // üstünlüğü ciddi biçimde elden kaçırdı
const MISS_WIN_PERCENT_AFTER_MAX = 65;   // "kazanılan" pozisyon artık kazanılan değil
const MISS_MATE_MIN_LOSS = 2;            // eldeki mat artık verilemiyor

export function classifyMove(params: {
winPercentLoss: number;
playedIsTopEngineMove: boolean;
/** En iyi hamle ile 2. en iyi hamle arasındaki win% farkı (oynayan taraf perspektifinden). Büyükse hamle "kritik/tek doğru" demektir. */
topMoveCriticalityGap: number;
isBookMove: boolean;
/** Hamleyi oynayan tarafın hamleden önceki kazanma olasılığı (win%). */
moverWinPercentBefore?: number;
/** Hamleyi oynayan tarafın hamleden sonraki kazanma olasılığı (win%). */
moverWinPercentAfter?: number;
/** Hamleden önce oynayan tarafta zorunlu mat vardıysa pozitif mat mesafesi (mover perspektifi). */
moverMateBefore?: number | null;
}): MoveClass {
const { winPercentLoss, playedIsTopEngineMove, topMoveCriticalityGap, isBookMove, moverWinPercentBefore, moverWinPercentAfter, moverMateBefore } = params;
if (isBookMove) return 'book';
if (playedIsTopEngineMove) {
// Alternatiflerin çok daha kötü olduğu "tek doğru hamle" durumu -> Great
return topMoveCriticalityGap >= 8 ? 'great' : 'best';
}
// Chess.com: eldeki zorunlu matı kaçırmak her zaman "Miss" — düşüş büyüklüğünden bağımsız.
if ((moverMateBefore ?? 0) > 0 && winPercentLoss >= MISS_MATE_MIN_LOSS) return 'miss';
// Chess.com eşiği: 20+ win% kaybı HER ZAMAN blunder (??). Kazanan pozisyonda bile
// "miss" maskesine girmez — aksi hâlde Qd5?? gibi felaketler X olarak görünür.
if (winPercentLoss >= 20) return 'blunder';
// Pozisyonel miss: kazanılan pozisyonu (win% ≥ 80) kazanılan olmayan hale
// (win% < 65) düşürmek. Sadece süpürme değil, üstünlüğü gerçekten kaybetmek.
if (
  moverWinPercentBefore !== undefined && moverWinPercentAfter !== undefined &&
  moverWinPercentBefore >= MISS_WIN_PERCENT_THRESHOLD &&
  moverWinPercentAfter < MISS_WIN_PERCENT_AFTER_MAX &&
  moverWinPercentBefore - moverWinPercentAfter >= MISS_WIN_PERCENT_DROP
) return 'miss';
if (winPercentLoss < 2) return 'excellent';
if (winPercentLoss < 5) return 'good';
if (winPercentLoss < 10) return 'inaccuracy';
return 'mistake'; // 10-20 arası; 20+ yukarıda blunder oldu
}

export interface BrilliantMoveParams {
/** Hamleden önce oynayan tarafın kaç yasal hamlesi vardı (forced hamleyi elemek için). */
legalMoveCountBefore: number;
moverWinPercentBefore: number;
moverWinPercentAfter: number;
winPercentLoss: number;
fenAfter: string;
destSquare: string;
}

const BRILLIANT_SEE_SACRIFICE_THRESHOLD = 200; // en az hafif taş değerinde gerçek maddi fedakarlık
const BRILLIANT_MAX_WIN_PERCENT_BEFORE = 90; // zaten ezici üstünlükteyse "brilliant" saymaya gerek yok
const BRILLIANT_MAX_WIN_PERCENT_DROP = 15; // fedakarlık pozisyonu gerçekten bozuyorsa brilliant değildir
const BRILLIANT_MAX_WIN_PERCENT_LOSS = 2; // chess.com: değerlendirme KORUNMALI — kayıp ~2 win%'i aşarsa brilliant değil
const BRILLIANT_MIN_WIN_PERCENT_AFTER = 40; // feda sonrası bile en az hava/nakil üstünlüğü kadar iyi durmalısın

/**
 * Bir hamlenin gerçek anlamda "parlak" (brilliant) sayılıp sayılmayacağını,
 * yalnızca motor skoruna değil GERÇEK bir materyal fedakarlığına (SEE) bakarak
 * belirler. seeAtDest, `fenAfter` pozisyonunda `destSquare` karesindeki taş için
 * hesaplanan Static Exchange Evaluation değerini döner (bkz. src/engine/see.ts).
 * Test edilebilirlik için enjekte edilir; üretimde varsayılan olarak gerçek
 * staticExchangeEval çağrısını kullanır.
 */
export function isBrilliantMove(params: BrilliantMoveParams, seeAtDest: () => number): boolean {
if (params.legalMoveCountBefore <= 1) return false;
if (params.winPercentLoss > BRILLIANT_MAX_WIN_PERCENT_LOSS) return false;
if (params.moverWinPercentBefore >= BRILLIANT_MAX_WIN_PERCENT_BEFORE) return false;
if (params.moverWinPercentBefore - params.moverWinPercentAfter > BRILLIANT_MAX_WIN_PERCENT_DROP) return false;
// Feda sonrası pozisyon yine de iyi olmalı VE hamle şansı iyileştirmeli:
// kötü/etkisiz taş fidanları brilliant değildir.
if (params.moverWinPercentAfter < BRILLIANT_MIN_WIN_PERCENT_AFTER) return false;

return seeAtDest() >= BRILLIANT_SEE_SACRIFICE_THRESHOLD;
}

/**
 * Chess.com tarzı MISS işaretleme — ikinci ve tamamlarıcı kural:
 * classifyMove yalnızca kendi hatasıyla kazanma şansını elden kaçıranı (≥12 win%
 * düşüş) 'miss' der. Rakip blunder/hata yapınca bu hatayı CEZALANDIRMAYAN hamle
 * da chess.com'da 'miss'tir ('Fırsat Kaçırdın'). Bu geçiş (post-processing) o
 * işareti ekler: rakibin kötü hamlesinin hemen ardından gelen, good/inaccuracy/
 * mistake seviyesinde kalan (yani fırsatı ne tam kaçıran ne de tam değerlendiren)
 * hamle 'miss' olur.
 */
const MISS_PASS_MIN_WIN_BEFORE = 60; // rakip hata sonrası hâlâ üstünlükte olmalı
const MISS_PASS_MAX_WIN_DROP = 12;   // kendi felaketi yaşayanlar kendi etiketini korur

/** applyMissPass için gereken minimal hamle bilgisi. */
export interface MissPassMove {
classification: MoveClass;
moverWinPercentBefore?: number;
moverWinPercentAfter?: number;
}

/**
 * Diziyi yerinde (in-place) günceller: rakibin blunder/mistake'ini cezalandırmayan
 * hamleleri 'miss' olarak işaretler. accuracy/winPercentLoss'a dokunmaz — miss bir
 * yeniden skorlama değil, etiketleme pasıdır.
 */
export function applyMissPass(moves: MissPassMove[]): void {
for (let i = 1; i < moves.length; i++) {
const prev = moves[i - 1];
const curr = moves[i];
const prevBad = prev.classification === 'blunder' || prev.classification === 'mistake';
if (!prevBad) continue;
// Bu sınıflar fırsatı zaten değerlendirdi (veya kitap/parlak) — dokunma.
if (curr.classification !== 'good' && curr.classification !== 'inaccuracy' && curr.classification !== 'mistake') continue;
const { moverWinPercentBefore: before, moverWinPercentAfter: after } = curr;
if (before === undefined || after === undefined) continue;
if (before < MISS_PASS_MIN_WIN_BEFORE) continue;
if (before - after >= MISS_PASS_MAX_WIN_DROP) continue; // kendi büyük hatası — etiketi kalsın
curr.classification = 'miss';
}
}
