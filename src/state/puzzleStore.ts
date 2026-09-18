import { create } from 'zustand';  
import type { Square } from 'chess.js';  
import { PUZZLE_REGISTRY } from '../puzzles/registry';  
import { compilePuzzle, type CompiledPuzzle } from '../puzzles/compilePuzzle';  
import { createPuzzleSession, submitMove, type PuzzleSessionState } from '../puzzles/puzzleEngine';  
import { pickNextPuzzle } from '../services/puzzleSelectionService';  
import { getProfile, updateProfile } from '../storage/profileStore';  
import { updatePuzzleRating } from '../services/puzzleRatingService';  
import { dbPut, dbGetAll } from '../storage/db';  
import { getGeneratedPuzzles } from '../storage/generatedPuzzleStore';  
import { uid } from '../utils/id';  
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';  
import { evaluateAndPersistAchievements } from '../services/achievementService';
import { useAchievementToastStore } from './achievementToastStore';
import { playSound } from '../services/soundService';
import { triggerHaptic } from '../services/hapticService';
import { useDailyQuestStore } from './dailyQuestStore';
  
interface PuzzleStoreState {  
  loading: boolean;  
  session: PuzzleSessionState | null;  
  puzzleRating: number;  
  lastResult: { solved: boolean; ratingChange: number } | null;  
  solvedIds: Set<string>;  
  allPuzzles: CompiledPuzzle[];  
  
  init: () => Promise<void>;  
  loadNext: () => void;  
  attemptMove: (from: Square, to: Square, promotion?: string) => Promise<void>;  
  giveUp: () => Promise<void>;  
}  
  
export const usePuzzleStore = create<PuzzleStoreState>((set, get) => ({  
  loading: true,  
  session: null,  
  puzzleRating: 1200,  
  lastResult: null,  
  solvedIds: new Set(),  
  allPuzzles: [],  
  
  init: async () => {  
    set({ loading: true });  
    const [profile, generatedDefs, attempts] = await Promise.all([  
      getProfile(),  
      getGeneratedPuzzles(),  
      dbGetAll<PuzzleAttemptRecord>('puzzleAttempts'),  
    ]);  
  
    const generatedCompiled: CompiledPuzzle[] = [];  
    for (const def of generatedDefs) {  
      try { generatedCompiled.push(compilePuzzle(def)); }  
      catch (e) { console.error('[PuzzleStore] üretilmiş puzzle geçersiz:', (e as Error).message); }  
    }  
  
    const allPuzzles = [...PUZZLE_REGISTRY, ...generatedCompiled];  
    const solvedIds = new Set(attempts.filter((a) => a.solved).map((a) => a.puzzleId));  
  
    set({ allPuzzles, solvedIds, puzzleRating: profile.puzzleRating, loading: false });  
    get().loadNext();  
  },  
  
  loadNext: () => {  
    const { allPuzzles, solvedIds, puzzleRating } = get();  
    const next = pickNextPuzzle(puzzleRating, solvedIds, allPuzzles);  
    set({ session: next ? createPuzzleSession(next) : null, lastResult: null });  
  },  
  
  attemptMove: async (from, to, promotion) => {  
    const { session } = get();  
    if (!session) return;  
    const updated = submitMove(session, from, to, promotion);  
    set({ session: { ...updated } });  

    if (updated.lastAttemptWrong) {
      playSound('wrongMove');
      triggerHaptic('error');
    } else if (updated.status === 'in_progress') {
      playSound('move');
    }

    if (updated.status === 'solved' || updated.status === 'failed') {  
      await finalizeAttempt(get, set, updated);  
    }  
  },  
  
  giveUp: async () => {  
    const { session } = get();  
    if (!session || session.status !== 'in_progress') return;  
    const failedSession = { ...session, status: 'failed' as const };  
    set({ session: failedSession });  
    await finalizeAttempt(get, set, failedSession);  
  },  
}));  

// E2e test ve hata ayıklama köprüsü (gameStore ile aynı desen).
if (typeof window !== 'undefined') {
  (window as any).__puzzleStore = usePuzzleStore;
}
  
async function finalizeAttempt(  
  get: () => PuzzleStoreState,  
  set: (partial: Partial<PuzzleStoreState>) => void,  
  finished: PuzzleSessionState  
) {  
  const solved = finished.status === 'solved';  
  const profile = await getProfile();  
  const newRating = updatePuzzleRating(profile.puzzleRating, finished.puzzle.rating, solved, finished.mistakeCount);  
  await updateProfile({ puzzleRating: newRating });  
  
  const record: PuzzleAttemptRecord = {  
    id: uid(), puzzleId: finished.puzzle.id, date: Date.now(),  
    solved, mistakeCount: finished.mistakeCount,  
    ratingBefore: profile.puzzleRating, ratingAfter: newRating,  
    themes: finished.puzzle.themes,  
  };  
  await dbPut('puzzleAttempts', record);  

  if (solved) { playSound('puzzleSuccess'); triggerHaptic('success'); }
  else { playSound('puzzleFail'); triggerHaptic('error'); }

  try {
    const newlyAch = await evaluateAndPersistAchievements();
    if (newlyAch.length) useAchievementToastStore.getState().push(newlyAch);
  } catch (e) { console.error('Başarım değerlendirmesi başarısız:', e); }

  try {
    await useDailyQuestStore.getState().refreshAndNotify();
  } catch (e) { console.error('Görev değerlendirmesi başarısız:', e); }

  set({  
    puzzleRating: newRating,  
    lastResult: { solved, ratingChange: newRating - profile.puzzleRating },  
    solvedIds: solved ? new Set([...get().solvedIds, finished.puzzle.id]) : get().solvedIds,  
  });  
}
