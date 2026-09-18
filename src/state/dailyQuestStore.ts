import { create } from 'zustand';
import type { QuestInstance } from '../quests/types';
import { getTodaysQuests, evaluateAndNotifyDailyQuests } from '../services/dailyQuestService';
import { computeDailyQuestStreak } from '../services/dailyQuestStreakService';
import { useQuestToastStore } from './questToastStore';

interface DailyQuestState {
quests: QuestInstance[];
streak: number;
loading: boolean;
init: () => Promise<void>;
refreshAndNotify: () => Promise<void>;
}

export const useDailyQuestStore = create<DailyQuestState>((set) => ({
quests: [], streak: 0, loading: true,

init: async () => {
set({ loading: true });
const [quests, streak] = await Promise.all([getTodaysQuests(), computeDailyQuestStreak()]);
set({ quests, streak, loading: false });
},

refreshAndNotify: async () => {
const newly = await evaluateAndNotifyDailyQuests();
if (newly.length) useQuestToastStore.getState().push(newly);
const [quests, streak] = await Promise.all([getTodaysQuests(), computeDailyQuestStreak()]);
set({ quests, streak });
},
}));
