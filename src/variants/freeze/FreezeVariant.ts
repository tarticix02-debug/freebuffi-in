import type { VariantRule, VariantRuntimeState } from '../types';
import { uid } from '../../utils/id';

export const FreezeVariant: VariantRule = {
id: 'freeze',
name: 'Freeze Chess',
description: 'Her 4 hamlede bir, rakibin rastgele bir taşı 2 tur boyunca donar ve oynatılamaz.',
status: 'implemented',

initialize: () => ({ variantId: 'freeze', moveCounter: 0, customData: { frozen: {} }, activeEvents: [], log: [] }),

onBeforeMove: (state, _game, from) => {
const frozen = state.customData.frozen as Record<string, number>;
const until = frozen[from];
if (until !== undefined && state.moveCounter < until) {
return { allowed: false, reason: `${from} donmuş durumda (${until - state.moveCounter} hamle kaldı).` };
}
return { allowed: true };
},

onAfterMove: (state: VariantRuntimeState, game) => {
state.moveCounter++;
if (state.moveCounter % 4 !== 0) { state.activeEvents = []; return []; }
const board = game.board();
const turnAfter = game.raw.turn(); // sıradaki oyuncu = "rakip" donacak taraf değil, tam tersi mantık: hamleyi oynayanın rakibi donsun
const opponentColor = turnAfter; // sıradaki hamle sahibinin taşı donsun (dezavantaj)
const candidates: string[] = [];
board.forEach((row) => row.forEach((c) => { if (c && c.color === opponentColor && c.type !== 'k') candidates.push(c.square); }));
if (!candidates.length) { state.activeEvents = []; return []; }
const sq = candidates[Math.floor(Math.random() * candidates.length)];
(state.customData.frozen as Record<string, number>)[sq] = state.moveCounter + 2;
const ev = { id: uid(), type: 'FREEZE', description: `${sq} karesi 2 tur donduruldu`, payload: { sq }, appliedAt: Date.now() };
state.activeEvents = [ev];
state.log.push(ev);
return [ev];
},
};
