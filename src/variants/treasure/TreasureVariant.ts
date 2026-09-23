import type { VariantRule, VariantEvent, VariantRuntimeState } from '../types';
import type { ChessGame } from '../../chess/ChessGame';
import { uid } from '../../utils/id';

const CHEST_COUNT = 6;

function randomEmptySquares(game: ChessGame, count: number): string[] {
const files = 'abcdefgh';
const board = game.board();
const empty: string[] = [];
for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (!board[r][f]) empty.push(`${files[f]}${8 - r}`);
const result: string[] = [];
const pool = [...empty];
while (result.length < count && pool.length) {
const idx = Math.floor(Math.random() * pool.length);
result.push(pool.splice(idx, 1)[0]);
}
return result;
}

export const TreasureVariant: VariantRule = {
id: 'treasure',
name: 'Treasure Chess',
description: 'Tahtaya gizli sandıklar yerleştirilir. Bir taş sandık karesine ulaştığında gerçek bir ödül/ceza uygulanır. Ekstra hamle sandığı gerçekten sırayı tekrar verir.',
status: 'implemented',

initialize: (game: ChessGame) => {
const chests = randomEmptySquares(game, CHEST_COUNT);
return {
variantId: 'treasure',
moveCounter: 0,
customData: { chests },
activeEvents: [],
log: [],
};
},

onAfterMove: (state: VariantRuntimeState, game: ChessGame) => {
state.moveCounter++;
const chests = state.customData.chests as string[];
const history = game.history({ verbose: true });
const last = history[history.length - 1];
if (!last || !chests.includes(last.to)) { state.activeEvents = []; return []; }

// sandığı tüket  
state.customData.chests = chests.filter((c) => c !== last.to);  

const roll = Math.random();  
let ev: VariantEvent;  
const color = last.color;  
if (roll < 0.25) {  
  // ekstra hamle hakkı — GameStore.bonusMoveFor bayrağını okuyup sırayı
  // gerçekten geri çevirir (UNO Chess ile aynı mekanizma).
  state.customData.bonusMoveFor = color;  
  ev = { id: uid(), type: 'TREASURE_EXTRA_TURN', description: `${last.to} sandığı: ekstra hamle hakkı!`, payload: {}, appliedAt: Date.now() };  
} else if (roll < 0.55) {  
  const files = 'abcdefgh';  
  const board = game.board();  
  const empties: string[] = [];  
  board.forEach((row, ri) => row.forEach((c, fi) => { if (!c) empties.push(`${files[fi]}${8 - ri}`); }));  
  const sq = empties[Math.floor(Math.random() * empties.length)];  
  if (sq) game.put({ type: 'p', color }, sq as any);  
  ev = { id: uid(), type: 'TREASURE_PAWN', description: `${last.to} sandığı: +1 piyon (${sq})`, payload: { sq }, appliedAt: Date.now() };  
} else if (roll < 0.75) {  
  ev = { id: uid(), type: 'TREASURE_EMPTY', description: `${last.to} sandığı boş çıktı`, payload: {}, appliedAt: Date.now() };  
} else {  
  // negatif: kendi taşlarından birini kaybet (hareket eden taş hariç)  
  const board = game.board();  
  const own: string[] = [];  
  board.forEach((row) => row.forEach((c) => { if (c && c.color === color && c.type !== 'k' && c.square !== last.to) own.push(c.square); }));  
  const target = own[Math.floor(Math.random() * own.length)];  
  if (target) game.remove(target as any);  
  ev = { id: uid(), type: 'TREASURE_NEGATIVE', description: target ? `${last.to} sandığı: ${target} kayboldu!` : `${last.to} sandığı boş çıktı`, payload: { target }, appliedAt: Date.now() };  
}  
state.activeEvents = [ev];  
state.log.push(ev);  
return [ev];

},
};
