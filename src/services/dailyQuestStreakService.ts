import { QUEST_TEMPLATES } from '../quests/templates';
import { getAllDailySelections } from '../storage/dailyQuestSelectionStore';
import { getAllGames } from '../storage/gameHistoryStore';
import { dbGetAll } from '../storage/db';
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';
import type { OpeningSessionRecord } from '../storage/openingSessionStore';
import { dateKeyOf, dateFromKey, todayKey } from '../utils/date';

export interface DayCompletionRecord {
  dateKey: string;
  allCompleted: boolean;
}

/**
 * Saf fonksiyon: verilen gün-tamamlanma kayıtlarından, bugüne (ya da bugün
 * henüz bitmemişse dünden geriye) doğru kesintisiz seriyi sayar.
 * Sistem başlamadan önceki günler için kayıt yoksa seri orada durur —
 * bu bilinçli bir tercihtir (uydurma geçmiş seri üretilmez).
 */
export function computeStreakFromRecords(records: DayCompletionRecord[], todayKeyStr: string): number {
  const map = new Map(records.map((r) => [r.dateKey, r.allCompleted]));
  let cursor = dateFromKey(todayKeyStr);

  if (map.has(todayKeyStr) && map.get(todayKeyStr) === false) {
    cursor.setDate(cursor.getDate() - 1); // bugün henüz bitmemiş olabilir, seriyi bozmadan atla
  }

  let streak = 0;
  while (true) {
    const key = dateKeyOf(cursor.getTime());
    if (!map.has(key) || map.get(key) === false) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function computeDailyQuestStreak(): Promise<number> {
  const [selections, games, puzzleAttempts, openingSessions] = await Promise.all([
    getAllDailySelections(),
    getAllGames(),
    dbGetAll<PuzzleAttemptRecord>('puzzleAttempts'),
    dbGetAll<OpeningSessionRecord>('openingSessions'),
  ]);

  const records: DayCompletionRecord[] = selections.map((sel) => {
    const key = sel.id;
    const ctx = {
      gamesToday: games.filter((g) => dateKeyOf(g.date) === key),
      puzzleAttemptsToday: puzzleAttempts.filter((a) => dateKeyOf(a.date) === key),
      openingSessionsToday: openingSessions.filter((s) => dateKeyOf(s.date) === key),
    };
    const allCompleted = sel.templateIds.every((id) => {
      const t = QUEST_TEMPLATES.find((x) => x.id === id);
      return t ? t.progress(ctx) >= t.target : false;
    });
    return { dateKey: key, allCompleted };
  });

  return computeStreakFromRecords(records, todayKey());
}
