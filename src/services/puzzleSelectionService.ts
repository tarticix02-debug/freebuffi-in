import type { CompiledPuzzle } from '../puzzles/compilePuzzle';  
  
export function pickNextPuzzle(  
  userPuzzleRating: number,  
  solvedIds: Set<string>,  
  pool: CompiledPuzzle[]  
): CompiledPuzzle | null {  
  if (pool.length === 0) return null;  
  const unsolved = pool.filter((p) => !solvedIds.has(p.id));  
  const candidates = unsolved.length > 0 ? unsolved : pool;  
  
  const sorted = [...candidates].sort(  
    (a, b) => Math.abs(a.rating - userPuzzleRating) - Math.abs(b.rating - userPuzzleRating)  
  );  
  const top = sorted.slice(0, Math.min(3, sorted.length));  
  return top[Math.floor(Math.random() * top.length)];  
}
