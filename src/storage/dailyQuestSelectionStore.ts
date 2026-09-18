import { dbGetAll, dbPut } from './db';

interface DailySelectionRecord { id: string; templateIds: string[]; }

export async function getOrCreateDailySelection(dateKey: string, pool: string[], count = 3): Promise<string[]> {
const all = await dbGetAll<DailySelectionRecord>('quests');
const existing = all.find((r) => r.id === dateKey);
if (existing) return existing.templateIds;

const shuffled = [...pool].sort(() => Math.random() - 0.5);
const chosen = shuffled.slice(0, Math.min(count, pool.length));
await dbPut('quests', { id: dateKey, templateIds: chosen });
return chosen;
}

export async function getAllDailySelections(): Promise<DailySelectionRecord[]> {
return dbGetAll<DailySelectionRecord>('quests');
}
