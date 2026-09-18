import { SEED_PUZZLES } from './seedPuzzles';  
import { compilePuzzle, type CompiledPuzzle } from './compilePuzzle';  
  
function buildRegistry(): CompiledPuzzle[] {  
  const compiled: CompiledPuzzle[] = [];  
  for (const def of SEED_PUZZLES) {  
    try {  
      compiled.push(compilePuzzle(def));  
    } catch (e) {  
      console.error(`[PuzzleRegistry] "${def.id}" atlandı:`, (e as Error).message);  
    }  
  }  
  return compiled;  
}  
  
export const PUZZLE_REGISTRY: CompiledPuzzle[] = buildRegistry();
