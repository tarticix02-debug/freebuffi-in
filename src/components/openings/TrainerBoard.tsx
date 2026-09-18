import { useState } from 'react';
import type { Square } from 'chess.js';
import { PieceIcon } from '../board/PieceIcon';
import { useOpeningTrainerStore } from '../../state/openingTrainerStore';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function TrainerBoard() {
const { session, attemptMove } = useOpeningTrainerStore();
const [selected, setSelected] = useState<Square | null>(null);
if (!session) return null;

const board = session.chess.board();
const orientation = session.traineeColor;
const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
const files = orientation === 'w' ? FILES : [...FILES].reverse();
const targets = selected ? session.chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];

function onSquareClick(square: Square) {
if (session!.status !== 'in_progress') return;
if (session!.chess.turn() !== session!.traineeColor) return;
if (selected && targets.includes(square)) { attemptMove(selected, square); setSelected(null); return; }
const piece = session!.chess.get(square);
if (piece && piece.color === session!.traineeColor) setSelected(square);
else setSelected(null);
}

return (
<div className="board-grid" role="grid" aria-label="Açılış antrenman tahtası">
{ranks.map((rank) => files.map((file) => {
const square = `${file}${rank}` as Square;
const rowIdx = 8 - rank;
const colIdx = FILES.indexOf(file);
const cell = board[rowIdx][colIdx];
const isDark = (rowIdx + colIdx) % 2 === 1;
return (
<button key={square}
className={['square', isDark ? 'square--dark' : 'square--light', selected === square && 'square--selected', targets.includes(square) && 'square--target'].filter(Boolean).join(' ')}
onClick={() => onSquareClick(square)} aria-label={square}>
{cell && <PieceIcon type={cell.type} color={cell.color} />}
{targets.includes(square) && !cell && <span className="square__dot" />}
</button>
);
}))}
</div>
);
}
