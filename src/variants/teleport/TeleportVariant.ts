import type { VariantRule, VariantEvent } from '../types';
import type { ChessGame } from '../../chess/ChessGame';
import { uid } from '../../utils/id';

const PAIR_COUNT = 3;

function randomEmptyMidBoardSquares(game: ChessGame, count: number): string[] {
  const files = 'abcdefgh';
  const board = game.board();
  const candidates: string[] = [];
  // Sadece 3-6. sıralar (başlangıç taşlarının olmadığı bölge) hedeflenir.
  for (let rank = 3; rank <= 6; rank++) {
    const rowIdx = 8 - rank;
    for (let f = 0; f < 8; f++) if (!board[rowIdx][f]) candidates.push(`${files[f]}${rank}`);
  }
  const pool = [...candidates];
  const result: string[] = [];
  while (result.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

export const TeleportVariant: VariantRule = {
  id: 'teleport',
  name: 'Teleport Chess',
  description: 'Tahtada 3 çift ışınlanma karesi vardır. Bu karelere gelen taş gerçekten partner kareye ışınlanır — orada rakip taşı varsa alınır, kendi taşınız varsa ışınlanma engellenir.',
  status: 'implemented',

  initialize: (game) => {
    const squares = randomEmptyMidBoardSquares(game, PAIR_COUNT * 2);
    const pads: Record<string, string> = {};
    for (let i = 0; i < squares.length - 1; i += 2) {
      pads[squares[i]] = squares[i + 1];
      pads[squares[i + 1]] = squares[i];
    }
    return { variantId: 'teleport', moveCounter: 0, customData: { pads }, activeEvents: [], log: [] };
  },

  onAfterMove: (state, game) => {
    state.moveCounter++;
    const pads = state.customData.pads as Record<string, string>;
    const history = game.raw.history({ verbose: true });
    const last = history[history.length - 1];

    if (!last || !pads[last.to]) { state.activeEvents = []; return []; }

    const partner = pads[last.to];
    const mover = game.raw.get(last.to);
    if (!mover) { state.activeEvents = []; return []; }

    const occupant = game.raw.get(partner as any);
    const events: VariantEvent[] = [];

    if (occupant && occupant.color === mover.color) {
      events.push({
        id: uid(), type: 'TELEPORT_BLOCKED',
        description: `${last.to} karesi ${partner}'a bağlı bir ışınlanma karesi, ancak orada kendi taşınız olduğu için ışınlanma gerçekleşmedi.`,
        payload: { from: last.to, to: partner }, appliedAt: Date.now(),
      });
    } else {
      const captured = Boolean(occupant);
      game.remove(last.to as any);
      game.remove(partner as any);
      game.put({ type: mover.type, color: mover.color }, partner as any);
      events.push({
        id: uid(), type: 'TELEPORT',
        description: captured
          ? `Taş ${last.to}'dan ${partner}'a ışınlandı ve rakip taşı ele geçirdi!`
          : `Taş ${last.to}'dan ${partner}'a ışınlandı.`,
        payload: { from: last.to, to: partner, captured }, appliedAt: Date.now(),
      });
    }
    state.activeEvents = events;
    state.log.push(...events);
    return events;
  },

  getBoardDecorations: (state) => {
    const pads = state.customData.pads as Record<string, string>;
    return Object.keys(pads).map((sq) => ({ square: sq, kind: 'teleport-pad' }));
  },
};
