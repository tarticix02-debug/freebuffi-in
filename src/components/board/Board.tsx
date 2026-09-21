import { useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { PieceIcon } from './PieceIcon';
import { PromotionPicker } from './PromotionPicker';
import { useGameStore } from '../../state/gameStore';
import { getSettings, type AppSettings } from '../../storage/settingsStore';
import {
  BoardAnnotations, AnnotationColor, EMPTY_ANNOTATIONS,
  modifierColor, toggleArrow, toggleHighlight, clearAnnotations,
} from '../../services/boardAnnotations';
import { Premove, premoveCandidate, resolvePremove, isPremoveActive } from '../../services/premoveService';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const ARROW_COLORS: Record<AnnotationColor, string> = {
  green: 'rgba(21,190,110,0.85)',
  red: 'rgba(236,80,72,0.85)',
  blue: 'rgba(56,130,246,0.85)',
  yellow: 'rgba(236,197,59,0.85)',
};

/** 64 hücreli tek grid: hem kare hem de ok katmanı bunun üstünde konumlanır. */
export function Board({ hintSquares }: { hintSquares?: string[] }) {
  const { game, orientation, lastMove, checkSquare, variant, variantState, visibilityMask, vsComputer, legalMovesForSquare, playMove } = useGameStore();
  const [selected, setSelected] = useState<Square | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);
  const [annotations, setAnnotations] = useState<BoardAnnotations>(EMPTY_ANNOTATIONS);
  const [premove, setPremove] = useState<Premove | null>(null);
  const [dragTarget, setDragTarget] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [bouncedFrom, setBouncedFrom] = useState<{ from: Square; key: number } | null>(null);
  const dragFromRef = useRef<Square | null>(null);
  const rightDragJustEnded = useRef(false);

  useEffect(() => { getSettings().then(setSettings); }, []);

  const board = game.board();
  const targets = selected ? legalMovesForSquare(selected).map((m) => m.to) : [];
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? FILES : [...FILES].reverse();
  const decorations = variant?.getBoardDecorations && variantState ? variant.getBoardDecorations(variantState) : [];
  const decorationMap = new Map(decorations.map((d) => [d.square, d.kind]));
  const canInteract = !vsComputer || game.raw.turn() === orientation;

  // Premove görünürlüğü: rakibin sırasında beklerken turuncu vurgu (chess.com).
  const turn = game.raw.turn();
  const showPremove = isPremoveActive(premove, orientation, turn);

  async function commitMove(from: Square, to: Square, promotion?: string) {
    setSelected(null);
    setPendingPromotion(null);
    await playMove(from, to, promotion);
  }

  function onSquareClick(square: Square) {
    if (!canInteract) {
      // Rakip oynuyor: tık-tık premove — kendi taşını seç, hedefi tıkla.
      const piece = game.raw.get(square);
      if (piece && piece.color === orientation) { setPremoveSel(square); return; }
      if (premoveSel && square !== premoveSel) {
        setPremove(premoveCandidate(premoveSel, square));
        setPremoveSel(null);
      }
      return;
    }
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

  // --- Sağ tık çizimler (lichess): down → kayıt, up → uygula/toggle ---
  function onSquareContextMenu(e: React.MouseEvent, square: Square) {
    e.preventDefault();
    // Sağ tık premove'u iptal eder (chess.com).
    if (premove) { setPremove(null); return; }
    if (!canInteract) return;
    // Sağ sürükleme sırasında/yaklaşık zamanında gelen contextmenu vurgu TETİKLEMEZ:
    // (a) mousedown kayıtlıysa sürükleme sürüyor (Linux: contextmenu mousedown'da),
    // (b) az önce ok bırakıldıysa (Windows: contextmenu mouseup'tan sonra).
    if (dragFromRef.current || rightDragJustEnded.current) return;
    const color = modifierColor(e.altKey, e.ctrlKey || e.metaKey, e.shiftKey);
    setAnnotations((a) => toggleHighlight(a, square, color));
  }

  // Sağ sürükleme oku: mousedown(button=2) kaydı, mouseup hedefi.
  function onSquareMouseDown(e: React.MouseEvent, square: Square) {
    if (e.button !== 2) return;
    dragFromRef.current = square;
  }

  function onSquareMouseUp(e: React.MouseEvent, square: Square) {
    if (e.button !== 2 || !dragFromRef.current) return;
    const from = dragFromRef.current;
    dragFromRef.current = null;
    if (from === square) return; // aynı kare → contextmenu vurguyu halleder
    const color = modifierColor(e.altKey, e.ctrlKey || e.metaKey, e.shiftKey);
    rightDragJustEnded.current = true;
    setTimeout(() => { rightDragJustEnded.current = false; }, 0);
    setAnnotations((a) => toggleArrow(a, from, square, color));
  }

  // Sol tık tüm çizimleri temizler (lichess).
  function onBoardLeftClickClear() {
    setAnnotations(clearAnnotations());
  }

  const [premoveSel, setPremoveSel] = useState<Square | null>(null);

  // --- Premove: rakip hamlesinde otomatik uygulama (~0.1sn) ---
  useEffect(() => {
    if (!premove) return;
    if (turn === orientation) {
      // Sıra bize geldi → karar: premove uygulanır veya düşer (resolvePremove sahibi).
      const legal = legalMovesForSquare(premove.from as Square).some((m) => m.to === premove.to);
      const { clear } = resolvePremove(premove, orientation, turn);
      if (clear) {
        const p = premove;
        setPremove(null);
        if (legal) {
          void commitMove(p.from as Square, p.to as Square);
        } else {
          setBouncedFrom({ from: p.from as Square, key: Date.now() });
        }
      }
    }
  }, [turn, premove, orientation]);

  // --- Drag & drop UX: HTML5 drag yerine pointer tabanlı hafif sürükleme ---
  function onSquareDragStart(e: React.DragEvent, square: Square) {
    const piece = game.raw.get(square);
    if (!piece || piece.color !== game.raw.turn() || !canInteract) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
    setDragFrom(square);
    dragFromRef.current = square;
  }

  function onSquareDragOver(e: React.DragEvent, square: Square) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragTarget !== square) setDragTarget(square);
  }

  async function onSquareDrop(e: React.DragEvent, square: Square) {
    e.preventDefault();
    const from = (e.dataTransfer.getData('text/plain') || dragFromRef.current) as Square | null;
    setDragTarget(null);
    setDragFrom(null);
    dragFromRef.current = null;
    if (!from || from === square) return;
    const piece = game.raw.get(from);
    const isPromotion = piece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'));
    const legal = legalMovesForSquare(from).some((m) => m.to === square);
    if (!legal) {
      // Kuraldışı bırakış: yumuşak geri dönüş animasyonu (bounce).
      setBouncedFrom({ from, key: Date.now() });
      return;
    }
    if (isPromotion && !settings?.autoPromoteToQueen) {
      setSelected(from);
      setPendingPromotion({ from, to: square, color: piece!.color });
      return;
    }
    await commitMove(from, square, isPromotion ? 'q' : undefined);
  }

  // Zen modu köprüsü PlayScreen'dedir; Board saf tahta kalır.

  // Hamle değişince drag/premove seçim state'ini sıfırla (kalıntı olmasın).
  const lastLen = game.raw.history().length;
  useEffect(() => { setDragFrom(null); setDragTarget(null); setPremoveSel(null); }, [lastLen]);

  return (
    <div className={`board-wrapper${dragFrom ? ' board-wrapper--dragging' : ''}`} onContextMenu={(e) => e.preventDefault()}>
      <div
        className="board-grid"
        role="grid"
        aria-label="Satranç tahtası"
        onClick={onBoardLeftClickClear}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const rowIdx = 8 - rank;
            const colIdx = FILES.indexOf(file);
            const cell = board[rowIdx][colIdx];
            const isDark = (rowIdx + colIdx) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = settings?.legalMoveHighlights !== false && targets.includes(square);
            const isCaptureTarget = isTarget && Boolean(cell);
            const isLastMove = settings?.showLastMoveHighlight !== false && (lastMove?.from === square || lastMove?.to === square);
            const isCheck = checkSquare === square;
            const isHint = Boolean(hintSquares?.includes(square));
            const isCheckmate = isCheck && useGameStore.getState().gameOverInfo?.endReason === 'checkmate';
            const decoKind = decorationMap.get(square);
            const isVisible = !visibilityMask || visibilityMask[rowIdx][colIdx];
            const showCoord = settings?.showCoordinates !== false;
            const isEdgeFile = showCoord && rank === (orientation === 'w' ? 1 : 8);
            const isEdgeRank = showCoord && file === (orientation === 'w' ? 'h' : 'a');
            const isDragSource = dragFrom === square;
            const isDragTarget = dragTarget === square && Boolean(dragFrom);
            const isBounceSource = bouncedFrom?.from === square;
            const isPremoveFrom = showPremove && premove!.from === square;
            const isPremoveTo = showPremove && premove!.to === square;
            const highlights = annotations.highlights.filter((h) => h.square === square);

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
                  isHint && 'square--hint',
                  decoKind && `square--${decoKind}`,
                  isDragSource && 'square--drag-source',
                  isDragTarget && 'square--drag-target',
                  isBounceSource && 'square--bounce',
                  isPremoveFrom && 'square--premove-from',
                  isPremoveTo && 'square--premove-to',
                  premoveSel === square && 'square--selected',
                  ...highlights.map((h) => `square--annot-${h.color}`),
                ].filter(Boolean).join(' ')}
                onClick={(e) => { if (e.button === 0) onSquareClick(square); }}
                onContextMenu={(e) => onSquareContextMenu(e, square)}
                onMouseDown={(e) => onSquareMouseDown(e, square)}
                onMouseUp={(e) => onSquareMouseUp(e, square)}
                draggable={Boolean(cell) && cell?.color === game.raw.turn() && canInteract}
                onDragStart={(e) => onSquareDragStart(e, square)}
                onDragOver={(e) => onSquareDragOver(e, square)}
                onDrop={(e) => { void onSquareDrop(e, square); }}
                aria-label={square}
                style={isBounceSource ? { animation: 'square-bounce 0.35s ease' } : undefined}
              >
                {cell && isVisible && <PieceIcon type={cell.type} color={cell.color} />}
                {isTarget && !cell && <span className="square__dot" />}
                {isEdgeFile && <span className={`square__coord square__coord--file ${isDark ? 'square__coord--on-dark' : 'square__coord--on-light'}`}>{file}</span>}
                {isEdgeRank && <span className={`square__coord square__coord--rank ${isDark ? 'square__coord--on-dark' : 'square__coord--on-light'}`}>{rank}</span>}
                {decoKind === 'teleport-pad' && <span className="square__teleport-icon">◎</span>}
              </button>
            );
          })
        )}
      </div>

      {/* Ok katmanı: konumlandırma wrapper'a göre; viewBox grid oranı 8x8 */}
      <svg className="board-arrows" viewBox="0 0 800 800" aria-hidden="true">
        {annotations.arrows.map((a) => {
          const { x1, y1, x2, y2 } = squareCenter(a.from, a.to, orientation);
          return (
            <line
              key={`${a.from}${a.to}${a.color}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={ARROW_COLORS[a.color]}
              strokeWidth="26"
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${a.color})`}
            />
          );
        })}
        {(['green', 'red', 'blue', 'yellow'] as AnnotationColor[]).map((c) => (
          <defs key={c}>
            <marker id={`arrowhead-${c}`} markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 z" fill={ARROW_COLORS[c]} />
            </marker>
          </defs>
        ))}
      </svg>

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

/** Kare adı → SVG koordinatı (viewBox 800x800; orientation'a göre çevrilmiş). */
function squareCenter(from: string, to: string, orientation: 'w' | 'b') {
  const center = (sq: string): [number, number] => {
    const fileIdx = FILES.indexOf(sq[0]);
    const rank = Number(sq[1]);
    const col = orientation === 'w' ? fileIdx : 7 - fileIdx;
    const row = orientation === 'w' ? 8 - rank : rank - 1;
    return [col * 100 + 50, row * 100 + 50];
  };
  const [x1, y1] = center(from);
  const [x2, y2] = center(to);
  return { x1, y1, x2, y2 };
}
