import { Chess } from 'chess.js';  
import type { PuzzleDefinition } from './types';  
  
export interface CompiledPuzzle extends PuzzleDefinition {  
  solutionUci: string[];  
  solutionSanResolved: string[];  
  isCheckmateAtEnd: boolean;  
}  
  
export function compilePuzzle(def: PuzzleDefinition): CompiledPuzzle {  
  const chess = new Chess(def.fen);  
  const solutionUci: string[] = [];  
  const solutionSanResolved: string[] = [];  
  
  const sourceMoves = def.solutionSan ?? def.solutionUci;  
  if (!sourceMoves || sourceMoves.length === 0) {  
    throw new Error(`Puzzle "${def.id}" geçersiz: çözüm hamlesi tanımlı değil.`);  
  }  
  
  for (const mv of sourceMoves) {  
    const result = def.solutionSan  
      ? chess.move(mv)  
      : chess.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv.slice(4) || undefined } as any);  
  
    if (!result) {  
      throw new Error(`Puzzle "${def.id}" geçersiz: hamle "${mv}" bu pozisyonda oynanamıyor.`);  
    }  
    solutionUci.push(`${result.from}${result.to}${result.promotion ?? ''}`);  
    solutionSanResolved.push(result.san);  
  }  
  
  return { ...def, solutionUci, solutionSanResolved, isCheckmateAtEnd: chess.isCheckmate() };  
}
