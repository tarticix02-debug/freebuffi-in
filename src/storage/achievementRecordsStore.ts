import { dbGetAll, dbPut } from './db';

export interface AchievementRecord { id: string; unlockedAt: number; }

export async function getUnlockedAchievements(): Promise<AchievementRecord[]> {
return dbGetAll<AchievementRecord>('achievements');
}

export async function markAchievementUnlocked(id: string): Promise<AchievementRecord> {
const record: AchievementRecord = { id, unlockedAt: Date.now() };
await dbPut('achievements', record);
return record;
}
