import { describe, it, expect } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from '../src/achievements/definitions';
import type { AchievementContext } from '../src/achievements/types';

function emptyContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
return {
stats: { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0, whiteWinRate: 0, blackWinRate: 0, avgMoveCount: 0, avgDurationSeconds: 0, currentWinStreak: 0, longestWinStreak: 0, byMode: {} },
puzzleStats: { totalAttempts: 0, solvedCount: 0, successRate: 0, currentStreak: 0, bestStreak: 0, byTheme: {} },
puzzleAttempts: [], games: [], openingProgress: [],
...overrides,
};
}

describe('Başarım tanımları', () => {
it("her tanımın benzersiz id'si var", () => {
const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
expect(new Set(ids).size).toBe(ids.length);
});

it('first_win, gerçek galibiyet sayısına göre ilerler', () => {
const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === 'first_win')!;
expect(def.progress(emptyContext())).toBe(0);
expect(def.progress(emptyContext({ stats: { ...emptyContext().stats, wins: 1 } }))).toBe(1);
});

it('flawless_10, hatasız çözülen puzzle sayısını doğru sayar', () => {
const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === 'flawless_10')!;
const ctx = emptyContext({
puzzleAttempts: [
{ id: '1', puzzleId: 'a', date: 0, solved: true, mistakeCount: 0, ratingBefore: 1200, ratingAfter: 1210, themes: [] },
{ id: '2', puzzleId: 'b', date: 0, solved: true, mistakeCount: 1, ratingBefore: 1200, ratingAfter: 1205, themes: [] },
],
});
expect(def.progress(ctx)).toBe(1);
});

it("variant_win_ achievement'ları yalnızca implemented varyantlar için var", () => {
const variantAchievements = ACHIEVEMENT_DEFINITIONS.filter((d) => d.id.startsWith('variant_win_'));
expect(variantAchievements.length).toBeGreaterThanOrEqual(5); // invisible, chaos, jackpot, treasure, freeze
});
});
