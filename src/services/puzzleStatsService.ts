import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';  
  
export interface PuzzleStats {  
  totalAttempts: number;  
  solvedCount: number;  
  successRate: number;  
  currentStreak: number;  
  bestStreak: number;  
  byTheme: Record<string, { attempts: number; solved: number; successRate: number }>;  
}  
  
export function computePuzzleStats(attempts: PuzzleAttemptRecord[]): PuzzleStats {  
  if (attempts.length === 0) {  
    return { totalAttempts: 0, solvedCount: 0, successRate: 0, currentStreak: 0, bestStreak: 0, byTheme: {} };  
  }  
  
  const sorted = [...attempts].sort((a, b) => b.date - a.date);  
  const solvedCount = sorted.filter((a) => a.solved).length;  
  
  let currentStreak = 0;  
  for (const a of sorted) { if (a.solved) currentStreak++; else break; }  
  
  let bestStreak = 0, running = 0;  
  for (const a of [...sorted].reverse()) { running = a.solved ? running + 1 : 0; bestStreak = Math.max(bestStreak, running); }  
  
  const byTheme: PuzzleStats['byTheme'] = {};  
  for (const a of attempts) {  
    for (const theme of a.themes) {  
      byTheme[theme] ??= { attempts: 0, solved: 0, successRate: 0 };  
      byTheme[theme].attempts++;  
      if (a.solved) byTheme[theme].solved++;  
    }  
  }  
  Object.values(byTheme).forEach((t) => (t.successRate = (t.solved / t.attempts) * 100));  
  
  return {  
    totalAttempts: attempts.length, solvedCount,  
    successRate: (solvedCount / attempts.length) * 100,  
    currentStreak, bestStreak, byTheme,  
  };  
}
