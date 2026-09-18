import { Chess } from 'chess.js';  
import { OPENING_LINES } from '../data/openingBook';  
import type { OpeningNode } from './types';  
import { uid } from '../utils/id';  
  
function createNode(moveSan: string | null, fen: string, parent: OpeningNode | null): OpeningNode {  
  return { id: uid(), moveSan, eco: null, name: null, fen, children: new Map(), parent };  
}  
  
export function buildOpeningTree(): OpeningNode {  
  const root = createNode(null, new Chess().fen(), null);  
  
  for (const line of OPENING_LINES) {  
    let current = root;  
    const chess = new Chess();  
    let valid = true;  
  
    for (const san of line.moves) {  
      const result = chess.move(san);  
      if (!result) {  
        console.error(`[OpeningBook] "${line.name}" içinde geçersiz hamle: "${san}" — satır atlandı.`);  
        valid = false;  
        break;  
      }  
      const key = result.san;  
      let child = current.children.get(key);  
      if (!child) {  
        child = createNode(key, chess.fen(), current);  
        current.children.set(key, child);  
      }  
      current = child;  
    }  
  
    if (valid) {  
      current.eco = line.eco;  
      current.name = line.name;  
    }  
  }  
  return root;  
}  
  
export const OPENING_TREE = buildOpeningTree();  
  
export function findNodeByMoves(root: OpeningNode, sanMoves: string[]): OpeningNode | null {  
  let current = root;  
  for (const san of sanMoves) {  
    const child = current.children.get(san);  
    if (!child) return null;  
    current = child;  
  }  
  return current;  
}
