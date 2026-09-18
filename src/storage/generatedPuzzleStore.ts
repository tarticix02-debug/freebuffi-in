import { dbGetAll, dbPut } from './db';  
import type { PuzzleDefinition } from '../puzzles/types';  
  
export async function saveGeneratedPuzzles(puzzles: PuzzleDefinition[]): Promise<void> {  
  for (const p of puzzles) await dbPut('puzzles', p as any);  
}  
  
export async function getGeneratedPuzzles(): Promise<PuzzleDefinition[]> {  
  const all = await dbGetAll<any>('puzzles');  
  return all.filter((p) => p.source === 'generated');  
}
