import type { AchievementDefinition, AchievementContext } from './types';
import { VARIANT_REGISTRY } from '../variants/registry';

const IMPLEMENTED_VARIANTS = Object.values(VARIANT_REGISTRY).filter((v) => v.status === 'implemented');

function variantWinProgress(variantId: string) {
return (ctx: AchievementContext) => (ctx.games.some((g) => g.mode === variantId && g.result === 'win') ? 1 : 0);
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
{ id: 'first_win', name: 'İlk Galibiyet', description: 'İlk oyununuzu kazanın.', category: 'games', target: 1, progress: (c) => c.stats.wins },
{ id: 'games_10', name: 'Isınma Turları', description: '10 oyun tamamlayın.', category: 'games', target: 10, progress: (c) => c.stats.totalGames },
{ id: 'games_50', name: 'Kararlı Oyuncu', description: '50 oyun tamamlayın.', category: 'games', target: 50, progress: (c) => c.stats.totalGames },
{ id: 'games_100', name: 'Satranç Bağımlısı', description: '100 oyun tamamlayın.', category: 'games', target: 100, progress: (c) => c.stats.totalGames },
{ id: 'win_streak_5', name: 'Yükselen Form', description: '5 galibiyetlik seri yakalayın.', category: 'games', target: 5, progress: (c) => c.stats.longestWinStreak },
{ id: 'win_streak_10', name: 'Durdurulamaz', description: '10 galibiyetlik seri yakalayın.', category: 'games', target: 10, progress: (c) => c.stats.longestWinStreak },

{ id: 'puzzle_solver_25', name: 'Taktik Çırağı', description: '25 puzzle çözün.', category: 'puzzle', target: 25, progress: (c) => c.puzzleStats.solvedCount },
{ id: 'puzzle_solver_100', name: 'Taktik Ustası', description: '100 puzzle çözün.', category: 'puzzle', target: 100, progress: (c) => c.puzzleStats.solvedCount },
{ id: 'puzzle_streak_10', name: 'Kesintisiz Odak', description: "10 puzzle'lık çözüm serisi yakalayın.", category: 'puzzle', target: 10, progress: (c) => c.puzzleStats.bestStreak },
{ id: 'flawless_10', name: 'Kusursuzluk', description: 'Hatasız 10 puzzle çözün.', category: 'puzzle', target: 10,
progress: (c) => c.puzzleAttempts.filter((a) => a.solved && a.mistakeCount === 0).length },

...IMPLEMENTED_VARIANTS.map((v) => ({
id: `variant_win_${v.id}`,
name: `${v.name} Galibi`,
description: `${v.name} modunda bir oyun kazanın.`,
category: 'variant' as const,
target: 1,
progress: variantWinProgress(v.id),
})),
{ id: 'variant_explorer', name: 'Kaşif', description: 'En az 3 farklı varyant modunda oyun oynayın.', category: 'variant', target: 3,
progress: (c) => new Set(c.games.filter((g) => IMPLEMENTED_VARIANTS.some((v) => v.id === g.mode)).map((g) => g.mode)).size },

{ id: 'opening_scholar', name: 'Teori Öğrencisi', description: 'Bir açılış satırını hatasız tamamlayın.', category: 'opening', target: 1,
progress: (c) => (c.openingProgress.some((p) => p.timesMistakeFree >= 1) ? 1 : 0) },
{ id: 'opening_dedication', name: 'Adanmış Öğrenci', description: 'Toplamda 20 açılış antrenman oturumu tamamlayın.', category: 'opening', target: 20,
progress: (c) => c.openingProgress.reduce((s, p) => s + p.timesTrained, 0) },
];
