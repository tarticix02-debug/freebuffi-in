import type { VariantRule, VariantEvent, VariantActionResult, VariantRuntimeState } from '../types';
import type { ChessGame } from '../../chess/ChessGame';
import { buildStandardDeck, shuffle, canPlay, type UnoCard, type UnoColor, type UnoValue } from './unoDeck';
import { uid } from '../../utils/id';

interface UnoCustomData {
  [key: string]: unknown;
  deck: UnoCard[];
  discard: UnoCard[];
  hands: { w: UnoCard[]; b: UnoCard[] };
  topColor: UnoColor;
  topValue: UnoValue;
  hasPlayedCardThisTurn: { w: boolean; b: boolean };
  pendingSkip: { drawCount: number } | null;
  pendingForcedNonCapture: { color: 'w' | 'b' } | null;
  bonusMoveFor: 'w' | 'b' | null;
}

function mkEvent(type: string, description: string, payload: any): VariantEvent {
  return { id: uid(), type, description, payload, appliedAt: Date.now() };
}
function sideLabel(c: 'w' | 'b') { return c === 'w' ? 'Beyaz' : 'Siyah'; }
function cardLabel(c: UnoCard) {
  const colorLabel: Record<string, string> = { red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', wild: 'Joker' };
  const valueLabel: Record<string, string> = { skip: 'Atla', reverse: 'Ters Çevir', draw2: '+2 Çek', wild: 'Joker', wild4: 'Joker +4' };
  return `${colorLabel[c.color]} ${valueLabel[c.value] ?? c.value}`;
}
function reshuffleFromDiscard(data: UnoCustomData) {
  if (data.discard.length <= 1) return;
  const top = data.discard[data.discard.length - 1];
  const rest = data.discard.slice(0, -1);
  data.deck.push(...shuffle(rest));
  data.discard = [top];
}
function ensureDeckHasCards(data: UnoCustomData, n: number) {
  if (data.deck.length < n) reshuffleFromDiscard(data);
}

export const UnoVariant: VariantRule = {
  id: 'uno',
  name: 'UNO Chess',
  description: 'Gerçek 108 kartlık UNO destesi kullanılır. Hamleden önce eşleşen kart oynayarak Skip/Reverse/+2/+4/Wild etkilerini tahtaya ve tur sırasına gerçekten uygulayabilirsiniz.',
  status: 'implemented',

  initialize: (): VariantRuntimeState => {
    const deck = shuffle(buildStandardDeck());
    const handW = deck.splice(0, 7);
    const handB = deck.splice(0, 7);
    let firstIdx = deck.findIndex((c) => c.color !== 'wild');
    if (firstIdx === -1) firstIdx = 0;
    const [first] = deck.splice(firstIdx, 1);

    const data: UnoCustomData = {
      deck, discard: [first], hands: { w: handW, b: handB },
      topColor: first.color, topValue: first.value,
      hasPlayedCardThisTurn: { w: false, b: false },
      pendingSkip: null, pendingForcedNonCapture: null, bonusMoveFor: null,
    };
    return { variantId: 'uno', moveCounter: 0, customData: data, activeEvents: [], log: [] };
  },

  onBeforeMove: (state, game, _from, to) => {
    const data = state.customData as UnoCustomData;
    const mover = game.raw.turn();
    if (data.pendingForcedNonCapture?.color === mover) {
      const targetPiece = game.raw.get(to);
      if (targetPiece) return { allowed: false, reason: 'Wild Draw Four etkisi altındasınız: bu hamlede taş alamazsınız.' };
    }
    return { allowed: true };
  },

  applyCustomAction: (state, game, action, actingColor): VariantActionResult => {
    const data = state.customData as UnoCustomData;
    if (data.hasPlayedCardThisTurn[actingColor]) {
      return { success: false, reason: 'Bu turda zaten bir kart oynadınız.', events: [] };
    }

    if (action.type === 'DRAW_CARD') {
      ensureDeckHasCards(data, 1);
      if (data.deck.length === 0) return { success: false, reason: 'Deste tamamen bitti.', events: [] };
      const card = data.deck.shift()!;
      data.hands[actingColor].push(card);
      return { success: true, events: [mkEvent('UNO_DRAW', `${sideLabel(actingColor)} bir kart çekti.`, {})] };
    }

    if (action.type === 'PLAY_CARD') {
      const { cardId, chosenColor, swapSquares } = action.payload ?? {};
      const hand = data.hands[actingColor];
      const idx = hand.findIndex((c) => c.id === cardId);
      if (idx === -1) return { success: false, reason: 'Bu kart elinizde yok.', events: [] };

      const card = hand[idx];
      if (!canPlay(card, data.topColor, data.topValue)) {
        return { success: false, reason: 'Bu kart mevcut renk/değerle eşleşmiyor.', events: [] };
      }

      hand.splice(idx, 1);
      data.discard.push(card);
      data.topValue = card.value;
      data.topColor = card.color === 'wild' ? (chosenColor as UnoColor ?? 'red') : card.color;
      data.hasPlayedCardThisTurn[actingColor] = true;

      const opponent: 'w' | 'b' = actingColor === 'w' ? 'b' : 'w';
      const events: VariantEvent[] = [mkEvent('UNO_PLAY', `${sideLabel(actingColor)} ${cardLabel(card)} oynadı.`, { card })];

      switch (card.value) {
        case 'skip':
        case 'reverse':
          // NOT: 2 oyunculu UNO'da Reverse, gerçek kurallara göre Skip ile aynı etkiye sahiptir.
          data.pendingSkip = { drawCount: 0 };
          events.push(mkEvent('UNO_SKIP', `${sideLabel(opponent)} sırasını kaybedecek.`, {}));
          break;
        case 'draw2':
          data.pendingSkip = { drawCount: 2 };
          events.push(mkEvent('UNO_DRAW2', `${sideLabel(opponent)} 2 kart çekecek ve sırasını kaybedecek.`, {}));
          break;
        case 'wild4':
          data.pendingSkip = { drawCount: 4 };
          data.pendingForcedNonCapture = { color: opponent };
          events.push(mkEvent('UNO_WILD4', `${sideLabel(opponent)} 4 kart çekecek, sırasını kaybedecek ve bir sonraki hamlesinde taş alamayacak.`, {}));
          break;
        case 'wild':
          if (swapSquares && swapSquares.length === 2) {
            const [sqA, sqB] = swapSquares;
            const pieceA = game.raw.get(sqA); const pieceB = game.raw.get(sqB);
            if (pieceA && pieceB && pieceA.color === actingColor && pieceB.color === actingColor && pieceA.type !== 'k' && pieceB.type !== 'k') {
              game.remove(sqA); game.remove(sqB);
              game.put({ type: pieceA.type, color: pieceA.color }, sqB);
              game.put({ type: pieceB.type, color: pieceB.color }, sqA);
              events.push(mkEvent('UNO_WILD_SWAP', `${sideLabel(actingColor)} Wild kartıyla iki taşının yerini değiştirdi.`, { sqA, sqB }));
            }
          }
          break;
      }

      if (data.deck.length === 0) reshuffleFromDiscard(data);
      if (hand.length === 0) {
        events.push(mkEvent('UNO_HAND_EMPTY', `${sideLabel(actingColor)} elini bitirdi ve bonus hamle kazandı!`, {}));
        data.bonusMoveFor = actingColor;
      }

      return { success: true, events };
    }

    return { success: false, reason: 'Bilinmeyen eylem.', events: [] };
  },

  onAfterMove: (state, game) => {
    const data = state.customData as UnoCustomData;
    const preSnap = game.snapshot();
    const justMoved: 'w' | 'b' = preSnap.turn === 'w' ? 'b' : 'w';

    if (data.pendingForcedNonCapture?.color === justMoved) data.pendingForcedNonCapture = null;

    const events: VariantEvent[] = [];
    const gameAlreadyOver = preSnap.isCheckmate || preSnap.isStalemate || preSnap.isDraw;

    if (!gameAlreadyOver && (data.pendingSkip || data.bonusMoveFor === justMoved)) {
      const opponent = preSnap.turn; // chess.js'e göre "sıradaki" — atlanacak taraf

      if (data.pendingSkip) {
        for (let i = 0; i < data.pendingSkip.drawCount; i++) {
          ensureDeckHasCards(data, 1);
          if (data.deck.length) data.hands[opponent].push(data.deck.shift()!);
        }
        game.forceActiveColor(justMoved);
        data.hasPlayedCardThisTurn[justMoved] = false;
        events.push(mkEvent('UNO_TURN_SKIPPED', `${sideLabel(opponent)} sırası atlandı, sıra tekrar ${sideLabel(justMoved)}'da.`, {}));
        data.pendingSkip = null;
      } else if (data.bonusMoveFor === justMoved) {
        game.forceActiveColor(justMoved);
        data.hasPlayedCardThisTurn[justMoved] = false;
        events.push(mkEvent('UNO_BONUS_MOVE', `${sideLabel(justMoved)} eli bitirdiği için ekstra hamle kazandı.`, {}));
      }
      data.bonusMoveFor = null;
    } else {
      data.hasPlayedCardThisTurn[preSnap.turn] = false;
      data.pendingSkip = null;
      data.bonusMoveFor = null;
    }

    state.moveCounter++;
    state.activeEvents = events;
    state.log.push(...events);
    return events;
  },

  decideAIPreMoveAction: (state, _game, aiColor) => {
    const data = state.customData as UnoCustomData;
    if (data.hasPlayedCardThisTurn[aiColor]) return null;

    const hand = data.hands[aiColor];
    const playable = hand.filter((c) => canPlay(c, data.topColor, data.topValue));
    if (playable.length === 0) return { type: 'DRAW_CARD', payload: {} };

    const priority: UnoValue[] = ['wild4', 'draw2', 'skip', 'reverse', 'wild'];
    const actionCard = playable.find((c) => priority.includes(c.value));
    const chosen = actionCard ?? playable[Math.floor(Math.random() * playable.length)];

    const payload: any = { cardId: chosen.id };
    if (chosen.color === 'wild') {
      const counts: Record<string, number> = {};
      for (const c of hand) if (c.color !== 'wild') counts[c.color] = (counts[c.color] ?? 0) + 1;
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      payload.chosenColor = best ? best[0] : 'red';
    }
    return { type: 'PLAY_CARD', payload };
  },
};
