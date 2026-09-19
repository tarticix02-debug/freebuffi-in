import { describe, it, expect } from 'vitest';
import {
  initialClock, applyMoveToClock, remainingMs, flaggedColor, timeoutWinner,
  formatClock, isTimed, countMaterial, TIME_CONTROLS, type ClockState, type TimeControl,
} from '../src/services/clockService';

const CTRL: TimeControl = { initialSeconds: 300, incrementSeconds: 5 };
const UNLIMITED: TimeControl = { initialSeconds: 0, incrementSeconds: 0 };

function clockAt(active: 'w' | 'b', ms: number, startedAt: number): ClockState {
  return { whiteMs: ms, blackMs: ms, activeColor: active, turnStartedAt: startedAt };
}

describe('clockService — kurulum', () => {
  it('başlangıç saatleri eşit ve beyazda', () => {
    const c = initialClock(CTRL, 'w');
    expect(c.whiteMs).toBe(300_000);
    expect(c.blackMs).toBe(300_000);
    expect(c.activeColor).toBe('w');
    expect(c.turnStartedAt).not.toBeNull();
  });

  it('sınırsız kontrol zamanlı sayılmaz', () => {
    expect(isTimed(UNLIMITED)).toBe(false);
    expect(isTimed(CTRL)).toBe(true);
  });

  it('TIME_CONTROLS listesi sınırsız + 3 süreli mod içerir', () => {
    expect(TIME_CONTROLS.length).toBeGreaterThanOrEqual(4);
    expect(TIME_CONTROLS[0].control.initialSeconds).toBe(0);
  });
});

describe('clockService — hamle uygulama', () => {
  it('işleyen taraftan geçen süre düşer, increment eklenir', () => {
    const start = Date.now();
    const c = clockAt('w', 300_000, start - 2000); // beyaz 2sn oynadı
    const [after, snapshot] = applyMoveToClock(c, CTRL, 'w');
    // 300sn - 2sn + 5sn = 303sn (± tolerans)
    expect(after.whiteMs).toBeGreaterThan(302_000);
    expect(after.whiteMs).toBeLessThanOrEqual(303_200);
    expect(after.blackMs).toBe(300_000);
    expect(after.activeColor).toBe('b');
    // Hamle öncesi anlık görüntü: undo iadesi için saklanan değer.
    expect(snapshot.whiteMs).toBe(300_000);
    expect(snapshot.activeColor).toBe('w');
  });

  it('sırası olmayan tarafın süresi düşmez (savunma)', () => {
    const c = clockAt('b', 300_000, Date.now());
    const [after, snapshot] = applyMoveToClock(c, CTRL, 'w'); // beyaz oynamaya çalışıyor ama sıra siyahta
    expect(after).toBe(c); // referans eşitliği: state dokunulmadı
    expect(snapshot).toBe(c);
  });

  it('sınırsız saatte hamle state değiştirmez', () => {
    const c = clockAt('w', 0, Date.now());
    const [after] = applyMoveToClock(c, UNLIMITED, 'w');
    expect(after).toBe(c);
  });

  it('süre sıfırın altına inmez', () => {
    const c = clockAt('w', 500, Date.now() - 10_000); // 10sn geçmiş ama 0.5sn var
    const [after] = applyMoveToClock(c, { initialSeconds: 300, incrementSeconds: 0 }, 'w');
    expect(after.whiteMs).toBeGreaterThanOrEqual(0);
  });
});

describe('clockService — kalan süre ve bayrak', () => {
  it('aktif tarafın süresi geriler, rakip sabit kalır', () => {
    const start = Date.now();
    const c = clockAt('b', 300_000, start - 3000);
    const rem = remainingMs(c, start);
    expect(rem.blackMs).toBeCloseTo(297_000, -2);
    expect(rem.whiteMs).toBe(300_000);
  });

  it('bayrak: süresi biten taraf tespit edilir', () => {
    const c = clockAt('w', 1500, Date.now() - 2000); // beyazın 1.5sn vardı, 2sn geçti
    expect(flaggedColor(c)).toBe('w');
  });

  it('süre varken bayrak düşmez', () => {
    const c = clockAt('w', 60_000, Date.now() - 1000);
    expect(flaggedColor(c)).toBeNull();
  });
});

describe('clockService — tek materyal yardımcısı (countMaterial)', () => {
  const EMPTY = () => [null, null, null, null, null, null, null, null];
  function boardWith(cells: { type: string; color: 'w' | 'b'; row: number; col: number }[]) {
    const board = Array.from({ length: 8 }, () => EMPTY());
    for (const c of cells) board[c.row][c.col] = { type: c.type, color: c.color } as any;
    return board;
  }

  it('materyal değerlerini toplar (piyon 1, vezir 9)', () => {
    const m = countMaterial(boardWith([
      { type: 'k', color: 'w', row: 0, col: 0 }, { type: 'q', color: 'w', row: 1, col: 0 },
      { type: 'k', color: 'b', row: 7, col: 0 }, { type: 'p', color: 'b', row: 6, col: 0 },
    ]));
    expect(m.white).toBe(9);
    expect(m.black).toBe(1);
  });

  it('nonKingOf: kral-dışı taş varlığını bildirir (offerDraw + timeoutWinner ortak tüketicisi)', () => {
    const bareKing = countMaterial(boardWith([{ type: 'k', color: 'b', row: 7, col: 0 }]));
    expect(bareKing.nonKingOf('b')).toBe(false);
    const withPawn = countMaterial(boardWith([
      { type: 'k', color: 'b', row: 7, col: 0 }, { type: 'p', color: 'b', row: 6, col: 3 },
    ]));
    expect(withPawn.nonKingOf('b')).toBe(true);
  });
});

describe('clockService — timeout kazananı (FIDE kuralı)', () => {
  const EMPTY_ROW = () => [null, null, null, null, null, null, null, null];
  function boardWith(cells: { type: string; color: 'w' | 'b'; row: number; col: number }[]) {
    const board = Array.from({ length: 8 }, () => EMPTY_ROW());
    for (const c of cells) board[c.row][c.col] = { type: c.type, color: c.color } as any;
    return board;
  }

  it('rakipte kral dışı taş varsa süre kazanılmış olur', () => {
    const board = boardWith([
      { type: 'k', color: 'b', row: 0, col: 0 },
      { type: 'p', color: 'b', row: 1, col: 3 },
    ]);
    expect(timeoutWinner('w', board)).toBe('win'); // beyaz bayrakta, siyahta piyon var → siyah kazanır
  });

  it('rakipte yalnızca kral varsa bayrak beraberliktir', () => {
    const board = boardWith([{ type: 'k', color: 'b', row: 0, col: 0 }]);
    expect(timeoutWinner('w', board)).toBe('draw');
  });
});

describe('clockService — biçimlendirme', () => {
  it('5:00 biçiminde gösterir', () => {
    expect(formatClock(300_000)).toBe('5:00');
  });

  it('20sn altında onda birler gösterilir', () => {
    expect(formatClock(12_340)).toMatch(/^0:12\.3$/);
  });

  it('0ms 0:00.0 olur', () => {
    expect(formatClock(0)).toBe('0:00.0');
  });
});
