import type { QuestTemplate } from './types';
import { VARIANT_REGISTRY } from '../variants/registry';

const IMPLEMENTED_VARIANT_IDS = Object.values(VARIANT_REGISTRY)
.filter((v) => v.status === 'implemented')
.map((v) => v.id);

/**

Her şablon, gerçek storage kayıtlarını filtreleyerek ilerleme hesaplar.

Sabit/rastgele bir "tamamlandı" durumu YOKTUR.
*/
export const QUEST_TEMPLATES: QuestTemplate[] = [
{ id: 'play_3_games', description: '3 oyun oynayın', target: 3,
progress: (c) => c.gamesToday.length },
{ id: 'win_2_games', description: '2 oyun kazanın', target: 2,
progress: (c) => c.gamesToday.filter((g) => g.result === 'win').length },
{ id: 'play_2_vs_computer', description: 'Bilgisayara karşı 2 oyun oynayın', target: 2,
progress: (c) => c.gamesToday.filter((g) => g.mode === 'vs-computer').length },
{ id: 'win_1_variant', description: 'Bir varyant modunda kazanın', target: 1,
progress: (c) => c.gamesToday.filter((g) => IMPLEMENTED_VARIANT_IDS.includes(g.mode) && g.result === 'win').length },
{ id: 'solve_5_puzzles', description: '5 puzzle çözün', target: 5,
progress: (c) => c.puzzleAttemptsToday.filter((a) => a.solved).length },
{ id: 'solve_3_flawless', description: 'Hatasız 3 puzzle çözün', target: 3,
progress: (c) => c.puzzleAttemptsToday.filter((a) => a.solved && a.mistakeCount === 0).length },
{ id: 'train_1_opening', description: 'Bir açılış antrenman oturumu tamamlayın', target: 1,
progress: (c) => c.openingSessionsToday.length },
{ id: 'no_draw_3', description: 'Berabere kalmadan 3 oyun tamamlayın', target: 3,
progress: (c) => c.gamesToday.filter((g) => g.result !== 'draw').length },
];
