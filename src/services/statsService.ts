import type { GameRecord } from '../storage/gameHistoryStore';

export interface ModeStat { games: number; wins: number; losses: number; draws: number; winRate: number; }

export interface UserStats {
totalGames: number;
wins: number;
losses: number;
draws: number;
winRate: number;
whiteWinRate: number;
blackWinRate: number;
avgMoveCount: number;
avgDurationSeconds: number;
currentWinStreak: number;
longestWinStreak: number;
byMode: Record<string, ModeStat>;
}

export function computeStats(games: GameRecord[]): UserStats {
const totalGames = games.length;
if (totalGames === 0) {
return {
totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0,
whiteWinRate: 0, blackWinRate: 0, avgMoveCount: 0, avgDurationSeconds: 0,
currentWinStreak: 0, longestWinStreak: 0, byMode: {},
};
}

const wins = games.filter((g) => g.result === 'win').length;
const losses = games.filter((g) => g.result === 'loss').length;
const draws = games.filter((g) => g.result === 'draw').length;

const whiteGames = games.filter((g) => g.userColor === 'w');
const blackGames = games.filter((g) => g.userColor === 'b');
const winRateOf = (arr: GameRecord[]) =>
arr.length ? (arr.filter((g) => g.result === 'win').length / arr.length) * 100 : 0;

const avgMoveCount = games.reduce((s, g) => s + g.moveCount, 0) / totalGames;
const avgDurationSeconds = games.reduce((s, g) => s + g.durationSeconds, 0) / totalGames;

// en yeniden en eskiye sıralı geldiği varsayımıyla streak hesapla
let currentWinStreak = 0;
for (const g of games) {
if (g.result === 'win') currentWinStreak++;
else break;
}
let longest = 0, running = 0;
for (const g of [...games].reverse()) {
running = g.result === 'win' ? running + 1 : 0;
longest = Math.max(longest, running);
}

const byMode: Record<string, ModeStat> = {};
for (const g of games) {
byMode[g.mode] ??= { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
const m = byMode[g.mode];
m.games++;
if (g.result === 'win') m.wins++;
else if (g.result === 'loss') m.losses++;
else m.draws++;
}
Object.values(byMode).forEach((m) => (m.winRate = (m.wins / m.games) * 100));

return {
totalGames, wins, losses, draws,
winRate: (wins / totalGames) * 100,
whiteWinRate: winRateOf(whiteGames),
blackWinRate: winRateOf(blackGames),
avgMoveCount, avgDurationSeconds,
currentWinStreak, longestWinStreak: longest,
byMode,
};
}

export interface TimeControlStat { label: string; games: number; wins: number; losses: number; draws: number; winRate: number; }

const TIME_CONTROL_LABELS: Record<string, string> = {
  unlimited: 'Sınırsız',
  'blitz3+2': '3+2',
  'blitz5+0': '5+0',
  'rapid10+0': '10+0',
  timed: 'Süreli',
  unknown: 'Bilinmeyen',
};

/**
 * Saat modu kırılımı — TEK saf yardımcı. Kayıtlarda timeControlId yoksa
 * (eski kayıtlar) 'unknown' kovasına düşer; bilinen id'ler etiketlenir.
 * Sıra: bilinen modlar TIME_CONTROLS sırasıyla, sonra unknown.
 */
export function computeTimeControlStats(games: GameRecord[], knownOrder: { id: string; label: string }[]): Record<string, TimeControlStat> {
  const out: Record<string, TimeControlStat> = {};
  const bucketOf = (g: GameRecord): string => g.timeControlId ?? 'unknown';
  for (const g of games) {
    const id = bucketOf(g);
    out[id] ??= { label: TIME_CONTROL_LABELS[id] ?? id, games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    const m = out[id];
    m.games++;
    if (g.result === 'win') m.wins++;
    else if (g.result === 'loss') m.losses++;
    else m.draws++;
  }
  for (const m of Object.values(out)) m.winRate = m.games ? (m.wins / m.games) * 100 : 0;
  // Bilinen sıraya göre düzenle; sadece oyunu olan kovular kalır.
  const ordered: Record<string, TimeControlStat> = {};
  for (const { id, label } of knownOrder) {
    if (out[id]) { ordered[id] = { ...out[id], label }; delete out[id]; }
  }
  for (const [id, stat] of Object.entries(out)) ordered[id] = stat;
  return ordered;
}
