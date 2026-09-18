import { create } from 'zustand';
import type { AchievementStatus } from '../achievements/types';

interface ToastState {
queue: AchievementStatus[];
push: (items: AchievementStatus[]) => void;
shift: () => void;
}

export const useAchievementToastStore = create<ToastState>((set, get) => ({
queue: [],
push: (items) => set({ queue: [...get().queue, ...items] }),
shift: () => set({ queue: get().queue.slice(1) }),
}));
