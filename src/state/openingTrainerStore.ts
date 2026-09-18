import { create } from 'zustand';
import type { Square } from 'chess.js';
import { OPENING_LINES } from '../data/openingBook';
import { createTrainerSession, attemptTraineeMove, retryAfterMistake, type TrainerSession } from '../openings/openingTrainerEngine';
import { getAllProgress, recordTrainingSession, pickNextLine } from '../services/openingProgressService';
import { evaluateAndPersistAchievements } from '../services/achievementService';
import { useAchievementToastStore } from './achievementToastStore';
import { useDailyQuestStore } from './dailyQuestStore';

interface OpeningTrainerState {
  session: TrainerSession | null;
  loading: boolean;
  selectedLineName: string | null;
  startSpecificLine: (lineName: string, color: 'w' | 'b') => void;
  startRecommended: (color: 'w' | 'b') => Promise<void>;
  attemptMove: (from: Square, to: Square, promotion?: string) => void;
  retry: () => void;
  exit: () => void;
}

export const useOpeningTrainerStore = create<OpeningTrainerState>((set, get) => ({
  session: null, loading: false, selectedLineName: null,

  startSpecificLine: (lineName, color) => {
    const line = OPENING_LINES.find((l) => l.name === lineName);
    if (!line) return;
    set({ session: createTrainerSession(line, color), selectedLineName: lineName });
  },

  startRecommended: async (color) => {
    set({ loading: true });
    const progress = await getAllProgress();
    const line = pickNextLine(OPENING_LINES, progress);
    set({ session: createTrainerSession(line, color), selectedLineName: line.name, loading: false });
  },

  attemptMove: (from, to, promotion) => {
    const { session } = get();
    if (!session) return;
    const updated = attemptTraineeMove(session, from, to, promotion);
    set({ session: { ...updated } });
    if (updated.status === 'completed') {
      recordTrainingSession(updated.line, updated.mistakes).then(async () => {
        try {
          const newlyAch = await evaluateAndPersistAchievements();
          if (newlyAch.length) useAchievementToastStore.getState().push(newlyAch);
        } catch (e) { console.error('Başarım değerlendirmesi başarısız:', e); }

        try {
          await useDailyQuestStore.getState().refreshAndNotify();
        } catch (e) { console.error('Görev değerlendirmesi başarısız:', e); }
      });
    }
  },

  retry: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...retryAfterMistake(session) } });
  },

  exit: () => set({ session: null, selectedLineName: null }),
}));
