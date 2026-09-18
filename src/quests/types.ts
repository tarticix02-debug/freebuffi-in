import type { GameRecord } from '../storage/gameHistoryStore';
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';
import type { OpeningSessionRecord } from '../storage/openingSessionStore';

export interface DayContext {
gamesToday: GameRecord[];
puzzleAttemptsToday: PuzzleAttemptRecord[];
openingSessionsToday: OpeningSessionRecord[];
}

export interface QuestTemplate {
id: string;
description: string;
target: number;
progress: (ctx: DayContext) => number;
}

export interface QuestInstance extends QuestTemplate {
dateKey: string;
currentProgress: number;
completed: boolean;
}
