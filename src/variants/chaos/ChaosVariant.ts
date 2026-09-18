import type { VariantRule, VariantEvent, VariantRuntimeState } from '../types';
import type { ChessGame } from '../../chess/ChessGame';
import { uid } from '../../utils/id';

interface ChaosDef {
type: string;
weight: number;
describe: () => string;
apply: (game: ChessGame, state: VariantRuntimeState) => VariantEvent;
}

function randomOccupiedSquare(game: ChessGame): { square: string; type: string; color: 'w' | 'b' } | null {
const board = game.board();
const cells: { square: string; type: string; color: 'w' | 'b' }[] = [];
board.forEach((row) => row.forEach((cell) => {
if (cell) cells.push({ square: cell.square, type: cell.type, color: cell.color });
}));
if (!cells.length) return null;
return cells[Math.floor(Math.random() * cells.length)];
}

const EVENTS: ChaosDef[] = [
{
type: 'SWAP_PIECES',
weight: 30,
describe: () => 'İki rastgele taş yer değiştirdi',
apply: (game, state) => {
const board = game.board();
const cells: { square: string; type: any; color: 'w' | 'b' }[] = [];
board.forEach((row) => row.forEach((c) => { if (c) cells.push({ square: c.square, type: c.type, color: c.color }); }));
if (cells.length < 2) return noop(state);
const i = Math.floor(Math.random() * cells.length);
let j = Math.floor(Math.random() * cells.length);
while (j === i) j = Math.floor(Math.random() * cells.length);
const a = cells[i], b = cells[j];
game.remove(a.square as any);
game.remove(b.square as any);
game.put({ type: a.type, color: a.color }, b.square as any);
game.put({ type: b.type, color: b.color }, a.square as any);
return event('SWAP_PIECES', `${a.square} ve ${b.square} yer değiştirdi`, { a: a.square, b: b.square });
},
},
{
type: 'FREEZE_SQUARE',
weight: 30,
describe: () => 'Rastgele bir kare donduruldu',
apply: (game, state) => {
const target = randomOccupiedSquare(game);
if (!target) return noop(state);
state.customData.frozenSquare = target.square;
state.customData.frozenUntilMoveCounter = state.moveCounter + 2; // 1 tam tur
return event('FREEZE_SQUARE', `${target.square} karesi 1 tur donduruldu`, { square: target.square });
},
},
{
type: 'PAWN_KNIGHT_BOOST',
weight: 20,
describe: () => 'Bir piyon bu turda at gibi hareket edebilir',
apply: (_game, state) => {
state.customData.knightBoostActiveUntil = state.moveCounter + 1;
return event('PAWN_KNIGHT_BOOST', 'Sıradaki piyon hamlesi at hareketine izin veriyor', {});
},
},
{
type: 'NONE',
weight: 20,
describe: () => 'Sakin tur',
apply: (_g, s) => noop(s),
},
];

function event(type: string, description: string, payload: Record<string, unknown>): VariantEvent {
return { id: uid(), type, description, payload, appliedAt: Date.now() };
}
function noop(_s: VariantRuntimeState): VariantEvent {
return event('NONE', 'Sakin tur', {});
}

function rollEvent(): ChaosDef {
const total = EVENTS.reduce((s, e) => s + e.weight, 0);
let r = Math.random() * total;
for (const e of EVENTS) {
if (r < e.weight) return e;
r -= e.weight;
}
return EVENTS[EVENTS.length - 1];
}

export const ChaosVariant: VariantRule = {
id: 'chaos',
name: 'Chaos Chess',
description: 'Her hamleden sonra %30 ihtimalle tahtayı gerçekten değiştiren rastgele bir olay tetiklenir.',
status: 'implemented',

initialize: () => ({
variantId: 'chaos',
moveCounter: 0,
customData: {},
activeEvents: [],
log: [],
}),

onBeforeMove: (state, _game, from) => {
const frozen = state.customData.frozenSquare as string | undefined;
const until = state.customData.frozenUntilMoveCounter as number | undefined;
if (frozen && until !== undefined && state.moveCounter < until && from === frozen) {
return { allowed: false, reason: `${frozen} karesi donmuş durumda, bu tur oynanamaz.` };
}
return { allowed: true };
},

onAfterMove: (state, game) => {
state.moveCounter++;
const events: VariantEvent[] = [];
// %35 ihtimalle chaos event tetikle
if (Math.random() < 0.35) {
const def = rollEvent();
const ev = def.apply(game, state);
state.activeEvents = [ev];
state.log.push(ev);
events.push(ev);
} else {
state.activeEvents = [];
}
return events;
},
};
