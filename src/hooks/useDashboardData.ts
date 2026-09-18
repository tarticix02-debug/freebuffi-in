import { useEffect, useState } from 'react';
import { getAllGames, type GameRecord } from '../storage/gameHistoryStore';
import { computeStats, type UserStats } from '../services/statsService';
import { getProfile, type UserProfile } from '../storage/profileStore';
import { getAchievementStatuses } from '../services/achievementService';

interface DashboardData {
loading: boolean;
profile: UserProfile | null;
recentGames: GameRecord[];
stats: UserStats | null;
achievementsUnlocked: number;
achievementsTotal: number;
reload: () => void;
}

export function useDashboardData(): DashboardData {
const [loading, setLoading] = useState(true);
const [profile, setProfile] = useState<UserProfile | null>(null);
const [recentGames, setRecentGames] = useState<GameRecord[]>([]);
const [stats, setStats] = useState<UserStats | null>(null);
const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
const [achievementsTotal, setAchievementsTotal] = useState(0);
const [tick, setTick] = useState(0);

useEffect(() => {
let active = true;
setLoading(true);
Promise.all([getProfile(), getAllGames(), getAchievementStatuses()]).then(([p, games, ach]) => {
if (!active) return;
setProfile(p);
setRecentGames(games.slice(0, 5));
setStats(computeStats(games));
setAchievementsUnlocked(ach.filter((a) => a.unlocked).length);
setAchievementsTotal(ach.length);
setLoading(false);
});
return () => { active = false; };
}, [tick]);

return { loading, profile, recentGames, stats, achievementsUnlocked, achievementsTotal, reload: () => setTick((t) => t + 1) };
}
