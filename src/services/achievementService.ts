import { ACHIEVEMENT_DEFINITIONS } from '../achievements/definitions';
import type { AchievementContext, AchievementStatus } from '../achievements/types';
import { getUnlockedAchievements, markAchievementUnlocked } from '../storage/achievementRecordsStore';
import { getAllGames } from '../storage/gameHistoryStore';
import { computeStats } from './statsService';
import { computePuzzleStats } from './puzzleStatsService';
import { getAllProgress } from './openingProgressService';
import { dbGetAll } from '../storage/db';
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';
import { playSound } from './soundService';
import { triggerHaptic } from './hapticService';

async function buildContext(): Promise<AchievementContext> {
const [games, puzzleAttempts, openingProgress] = await Promise.all([
getAllGames(),
dbGetAll<PuzzleAttemptRecord>('puzzleAttempts'),
getAllProgress(),
]);
return { games, puzzleAttempts, openingProgress, stats: computeStats(games), puzzleStats: computePuzzleStats(puzzleAttempts) };
}

export async function getAchievementStatuses(): Promise<AchievementStatus[]> {
const [ctx, unlockedRecords] = await Promise.all([buildContext(), getUnlockedAchievements()]);
const unlockedMap = new Map(unlockedRecords.map((r) => [r.id, r.unlockedAt]));
return ACHIEVEMENT_DEFINITIONS.map((def) => {
const currentProgress = def.progress(ctx);
const unlocked = currentProgress >= def.target || unlockedMap.has(def.id);
return { ...def, currentProgress: Math.min(currentProgress, def.target), unlocked, unlockedAt: unlockedMap.get(def.id) ?? null };
});
}

/**

Gerçek veriden hesaplanan durumu önceki kayıtlarla karşılaştırır. Yeni

açılan başarımlar için kalıcı kayıt oluşturur ve ses/haptic tetikler.

Bir oyun/puzzle/antrenman tamamlandığında çağrılmalıdır.
*/
export async function evaluateAndPersistAchievements(): Promise<AchievementStatus[]> {
const statuses = await getAchievementStatuses();
const newlyUnlocked: AchievementStatus[] = [];


for (const s of statuses) {
if (s.unlocked && s.unlockedAt === null) {
await markAchievementUnlocked(s.id);
newlyUnlocked.push({ ...s, unlockedAt: Date.now() });
}
}

if (newlyUnlocked.length > 0) {
playSound('achievement');
triggerHaptic('success');
}
return newlyUnlocked;
}
