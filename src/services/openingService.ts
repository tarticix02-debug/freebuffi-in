import { Chess } from 'chess.js';  
import { OPENING_TREE } from '../openings/openingTree';  
  
export interface OpeningIdentification {  
  name: string | null;  
  eco: string | null;  
  /** true ise verilen hamle dizisinin TAMAMI hâlâ bilinen teori (kitap) içindedir. */  
  matchedFullLine: boolean;  
}  
  
export function identifyOpening(sanMoves: string[]): OpeningIdentification {  
  let current = OPENING_TREE;  
  let lastNamed: { name: string; eco: string } | null = null;  
  let matchedFullLine = true;  
  
  for (const san of sanMoves) {  
    const child = current.children.get(san);  
    if (!child) { matchedFullLine = false; break; }  
    current = child;  
    if (current.name && current.eco) lastNamed = { name: current.name, eco: current.eco };  
  }  
  
  return { name: lastNamed?.name ?? null, eco: lastNamed?.eco ?? null, matchedFullLine };  
}  
  
