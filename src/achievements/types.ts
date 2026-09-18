import type { UserStats } from '../services/statsService';
import type { PuzzleStats } from '../services/puzzleStatsService';
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';
import type { GameRecord } from '../storage/gameHistoryStore';
import type { OpeningProgressRecord } from '../services/openingProgressService';

export type AchievementCategory = 'games' | 'puzzle' | 'variant' | 'opening';

export interface AchievementContext {
stats: UserStats;
puzzleStats: PuzzleStats;
puzzleAttempts: PuzzleAttemptRecord[];
games: GameRecord[];
openingProgress: OpeningProgressRecord[];
}

export interface AchievementDefinition {
id: string;
name: string;
description: string;
category: AchievementCategory;
target: number;
progress: (ctx: AchievementContext) => number;
}

export interface AchievementStatus extends AchievementDefinition {
currentProgress: number;
unlocked: boolean;
unlockedAt: number | null;
}
