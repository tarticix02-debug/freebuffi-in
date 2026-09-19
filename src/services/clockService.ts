/**
 * Oyun saati matematiği — SAF fonksiyonlar, store'dan bağımsız.
 * chess.com/lichess kuralı: süresi dolan taraf bayrakta (flag) kaybeder;
 * rakibin materyali yetersizse bile (tek kral vs kral+yavaş piyon) süre
 * kazanımı tercih edilir; yalnızca KRAL kalan tarafa karşı bayrak beraberliktir.
 */

export interface TimeControl {
  /** Başlangıç süresi (saniye). 0 = sınırsız. */
  initialSeconds: number;
  /** Hamle başına ek süre (saniye). */
  incrementSeconds: number;
}

export interface ClockState {
  /** Her iki tarafın kalan süresi (milisaniye). */
  whiteMs: number;
  blackMs: number;
  /** Şu an saati işleyen taraf. */
  activeColor: 'w' | 'b';
  /** activeColor'ın son hamlesinin başlangıç zamanı (performance.now tabanlı). */
  turnStartedAt: number | null;
}

export const TIME_CONTROLS: { id: string; label: string; control: TimeControl }[] = [
  { id: 'unlimited', label: 'Sınırsız', control: { initialSeconds: 0, incrementSeconds: 0 } },
  { id: 'blitz3+2', label: '3+2', control: { initialSeconds: 180, incrementSeconds: 2 } },
  { id: 'blitz5+0', label: '5+0', control: { initialSeconds: 300, incrementSeconds: 0 } },
  { id: 'rapid10+0', label: '10+0', control: { initialSeconds: 600, incrementSeconds: 0 } },
];

export function isTimed(control: TimeControl): boolean {
  return control.initialSeconds > 0;
}

/** Yeni bir saat kur: başlangıç süreleri eşit, ilk sıra beyazda. */
export function initialClock(control: TimeControl, firstTurn: 'w' | 'b'): ClockState {
  const ms = control.initialSeconds * 1000;
  return { whiteMs: ms, blackMs: ms, activeColor: firstTurn, turnStartedAt: Date.now() };
}

/**
 * Hamle tamamlandığında saati güncelle: işleyen taraftan geçen süre düşer,
 * increment eklenir, sıra rakibe geçer. Sınırsız saatte state değişmez.
 * Döndürülen ikinci değer: hamle ÖNCESİ saat anlık görüntüsü — chess.com
 * semantiğinde geri alma, oynayan tarafın süresini bununla geri yükler.
 */
export function applyMoveToClock(clock: ClockState, control: TimeControl, mover: 'w' | 'b'): [ClockState, ClockState] {
  if (!isTimed(control)) return [clock, clock];
  if (clock.activeColor !== mover) return [clock, clock]; // savunma: sırası olmayan düşmez
  const snapshot: ClockState = { ...clock, turnStartedAt: null };
  const elapsed = clock.turnStartedAt !== null ? Date.now() - clock.turnStartedAt : 0;
  const moverMs = Math.max(0, (mover === 'w' ? clock.whiteMs : clock.blackMs) - elapsed)
    + control.incrementSeconds * 1000;
  return [{
    whiteMs: mover === 'w' ? moverMs : clock.whiteMs,
    blackMs: mover === 'b' ? moverMs : clock.blackMs,
    activeColor: mover === 'w' ? 'b' : 'w',
    turnStartedAt: Date.now(),
  }, snapshot];
}

/**
 * Geri alma: chess.com semantiği — oynanan hamlelerin süresi iade edilir.
 * Verilen anlık görüntüler (her biri hamle ÖNCESİ saat) sondan geriye uygulanır;
 * tek görüntü = tek hamlenin iadesi. Sıra, görüntüdeki tarafa döner.
 */
export function restoreClockFromSnapshots(current: ClockState | null, snapshots: ClockState[]): ClockState | null {
  if (!snapshots.length) return current;
  const s = snapshots[snapshots.length - 1];
  return { ...s, turnStartedAt: Date.now() };
}

/** Görüntülenebilir anlık kalan süre (tick için). */
export function remainingMs(clock: ClockState, at: number = Date.now()): { whiteMs: number; blackMs: number } {
  if (clock.turnStartedAt === null) return { whiteMs: clock.whiteMs, blackMs: clock.blackMs };
  const elapsed = at - clock.turnStartedAt;
  return {
    whiteMs: clock.activeColor === 'w' ? Math.max(0, clock.whiteMs - elapsed) : clock.whiteMs,
    blackMs: clock.activeColor === 'b' ? Math.max(0, clock.blackMs - elapsed) : clock.blackMs,
  };
}

/**
 * Bayrak düştü mü? Döndürür: null = hayır; 'w'/'b' = bayrakta olan (kaybeden).
 * Rakipte yalnızca kral varsa bayrak beraberliktir (neticede yine 'flag'
 * bitişi; kazanan kararını verir).
 */
export function flaggedColor(clock: ClockState, at: number = Date.now()): 'w' | 'b' | null {
  const { whiteMs, blackMs } = remainingMs(clock, at);
  if (whiteMs <= 0) return 'w';
  if (blackMs <= 0) return 'b';
  return null;
}

/**
 * Tahta materyali — TEK yardımcı: her iki kavram (beraberlik önerisindeki
 * üstünlük ölçüsü ile bayrak bitişindeki kral-dışı tarama) bunu tüketir.
 */
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function countMaterial(board: ({ type: string; color: 'w' | 'b' } | null)[][]): { white: number; black: number; nonKingOf: (c: 'w' | 'b') => boolean } {
  let white = 0, black = 0;
  let whiteNonKing = false, blackNonKing = false;
  for (const row of board) for (const cell of row) {
    if (!cell) continue;
    const v = PIECE_VALUES[cell.type] ?? 0;
    if (cell.color === 'w') { white += v; if (cell.type !== 'k') whiteNonKing = true; }
    else { black += v; if (cell.type !== 'k') blackNonKing = true; }
  }
  return { white, black, nonKingOf: (c) => (c === 'w' ? whiteNonKing : blackNonKing) };
}

/**
 * Bayrak düşen tarafın RAKİBİNİN kazanmaya hakkı var mı?
 * Rakipte kral dışı taş yoksa süre kazanımı beraberliktir (FIDE kuralı).
 */
export function timeoutWinner(flagged: 'w' | 'b', board: ({ type: string; color: 'w' | 'b' } | null)[][]): 'win' | 'draw' {
  return countMaterial(board).nonKingOf(flagged === 'w' ? 'b' : 'w') ? 'win' : 'draw';
}

/** mm:ss.d biçimi; 20sn altında onda birler gösterilir (chess.com davranışı). */
export function formatClock(ms: number): string {
  const totalSeconds = ms / 1000;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds - m * 60;
  if (ms < 20_000) {
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  }
  return `${m}:${Math.floor(s).toString().padStart(2, '0')}`;
}
