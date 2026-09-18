import { useState } from 'react';  
import type { Square } from 'chess.js';  
import { PieceIcon } from '../board/PieceIcon';  
import { usePuzzleStore } from '../../state/puzzleStore';  
import { legalHeroTargets } from '../../puzzles/puzzleEngine';  
  
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];  
  
export function PuzzleBoard() {  
  const { session, attemptMove } = usePuzzleStore();  
  const [selected, setSelected] = useState<Square | null>(null);  
  
  if (!session) return null;  
  
  const board = session.chess.board();  
  const targets = selected ? legalHeroTargets(session, selected) : [];  
  const orientation = session.heroColor;  
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];  
  const files = orientation === 'w' ? FILES : [...FILES].reverse();  
  
  function onSquareClick(square: Square) {  
    if (session!.status !== 'in_progress') return;  
    if (session!.chess.turn() !== session!.heroColor) return;  
  
    if (selected && targets.includes(square)) {  
      attemptMove(selected, square);  
      setSelected(null);  
      return;  
    }  
    const piece = session!.chess.get(square);  
    if (piece && piece.color === session!.heroColor) setSelected(square);  
    else setSelected(null);  
  }  
  
  return (  
    <div className="board-grid" role="grid" aria-label="Puzzle tahtası">  
      {ranks.map((rank) =>  
        files.map((file) => {  
          const square = `${file}${rank}` as Square;  
          const rowIdx = 8 - rank;  
          const colIdx = FILES.indexOf(file);  
          const cell = board[rowIdx][colIdx];  
          const isDark = (rowIdx + colIdx) % 2 === 1;  
          const isSelected = selected === square;  
          const isTarget = targets.includes(square);  
  
          return (  
            <button  
              key={square}  
              className={['square', isDark ? 'square--dark' : 'square--light', isSelected && 'square--selected', isTarget && 'square--target'].filter(Boolean).join(' ')}  
              onClick={() => onSquareClick(square)}  
              aria-label={square}  
            >  
              {cell && <PieceIcon type={cell.type} color={cell.color} />}  
              {isTarget && !cell && <span className="square__dot" />}  
            </button>  
          );  
        })  
      )}  
    </div>  
  );  
}
