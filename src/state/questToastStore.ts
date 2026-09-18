import { create } from 'zustand';
import type { QuestInstance } from '../quests/types';

interface QuestToastState {
queue: QuestInstance[];
push: (items: QuestInstance[]) => void;
shift: () => void;
}

export const useQuestToastStore = create<QuestToastState>((set, get) => ({
queue: [],
push: (items) => set({ queue: [...get().queue, ...items] }),
shift: () => set({ queue: get().queue.slice(1) }),
}));
