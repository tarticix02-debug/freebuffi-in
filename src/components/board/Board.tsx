import { useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { PieceIcon } from './PieceIcon';
import { PromotionPicker } from './PromotionPicker';
import { useGameStore } from '../../state/gameStore';
import { getSettings, type AppSettings } from '../../storage/settingsStore';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board() {
  const { game, orientation, lastMove, checkSquare, variant, variantState, visibilityMask, vsComputer, legalMovesForSquare, playMove } = useGameStore();
  const [selected, setSelected] = useState<Square | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);

  useEffect(() => { getSettings().then(setSettings); }, []);

  const board = game.board();
  const targets = selected ? legalMovesForSquare(selected).map((m) => m.to) : [];
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? FILES : [...FILES].reverse();
  const decorations = variant?.getBoardDecorations && variantState ? variant.getBoardDecorations(variantState) : [];
  const decorationMap = new Map(decorations.map((d) => [d.square, d.kind]));
  const canInteract = !vsComputer || game.raw.turn() === orientation;

  async function commitMove(from: Square, to: Square, promotion?: string) {
    setSelected(null);
    setPendingPromotion(null);
    await playMove(from, to, promotion);
  }

  function onSquareClick(square: Square) {
    if (!canInteract) return;

    if (selected && targets.includes(square)) {
      const piece = game.raw.get(selected);
      const isPromotion = piece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'));
      if (isPromotion) {
        if (settings?.autoPromoteToQueen) commitMove(selected, square, 'q');
        else setPendingPromotion({ from: selected, to: square, color: piece!.color });
      } else {
        commitMove(selected, square);
      }
      return;
    }

    const piece = game.raw.get(square);
    if (piece && piece.color === game.raw.turn()) setSelected(square);
    else setSelected(null);
  }

  return (
    <div className="board-wrapper">
      <div className="board-grid" role="grid" aria-label="Satranç tahtası">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const rowIdx = 8 - rank;
            const colIdx = FILES.indexOf(file);
            const cell = board[rowIdx][colIdx];
            const isDark = (rowIdx + colIdx) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = settings?.legalMoveHighlights !== false && targets.includes(square);
            const isCaptureTarget = isTarget && Boolean(cell); // dolu kare = taş alma hedefi
            const isLastMove = settings?.showLastMoveHighlight !== false && (lastMove?.from === square || lastMove?.to === square);
            const isCheck = checkSquare === square;
            // Şah mat anında mat edilen kralın karesi dolgun kırmızı yanar (chess.com).
            const isCheckmate = isCheck && useGameStore.getState().gameOverInfo?.endReason === 'checkmate';
            const decoKind = decorationMap.get(square);
            const isVisible = !visibilityMask || visibilityMask[rowIdx][colIdx];

            return (
              <button
                key={square}
                className={[
                  'square',
                  isDark ? 'square--dark' : 'square--light',
                  isSelected && 'square--selected',
                  isTarget && 'square--target',
                  isCaptureTarget && 'square--capture',
                  isLastMove && 'square--last-move',
                  isCheck && 'square--check',
                  isCheckmate && 'square--checkmate',
                  decoKind && `square--${decoKind}`,
                ].filter(Boolean).join(' ')}
                onClick={() => onSquareClick(square)}
                aria-label={square}
              >
                {cell && isVisible && <PieceIcon type={cell.type} color={cell.color} />}
                {isTarget && !cell && <span className="square__dot" />}
                {decoKind === 'teleport-pad' && <span className="square__teleport-icon">◎</span>}
              </button>
            );
          })
        )}
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={pendingPromotion.color}
          onSelect={(p) => commitMove(pendingPromotion.from, pendingPromotion.to, p)}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
}
