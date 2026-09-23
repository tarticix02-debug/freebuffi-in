import type { VariantRule, VariantEvent, VariantRuntimeState } from '../types';
import type { ChessGame } from '../../chess/ChessGame';
import { uid } from '../../utils/id';

// Rastgelelik sınırı: üretim Math.random kullanır; testler setJackpotRng ile
// deterministik tohum enjekte ederek jackpot sonuçlarını sabitler.
let rng: () => number = Math.random;
export function setJackpotRng(next: () => number): void { rng = next; }

interface JackpotOutcome {
id: string;
weight: number;
apply: (game: ChessGame, color: 'w' | 'b') => VariantEvent;
}

function emptySquareOnOwnHalf(game: ChessGame, color: 'w' | 'b'): string | null {
const files = 'abcdefgh';
const ranks = color === 'w' ? [1, 2, 3] : [6, 7, 8];
const board = game.board();
const candidates: string[] = [];
ranks.forEach((r) => {
for (let f = 0; f < 8; f++) {
const rowIdx = 8 - r;
if (!board[rowIdx][f]) candidates.push(`${files[f]}${r}`);
}
});
if (!candidates.length) return null;
return candidates[Math.floor(rng() * candidates.length)];
}

function removeRandomOwnPiece(game: ChessGame, color: 'w' | 'b', excludeKingPawnMin = true): string | null {
const board = game.board();
const options: string[] = [];
board.forEach((row) => row.forEach((c) => {
if (c && c.color === color && c.type !== 'k' && !(excludeKingPawnMin && c.type === 'p' && countPawns(game, color) <= 1)) {
options.push(c.square);
}
}));
if (!options.length) return null;
const sq = options[Math.floor(rng() * options.length)];
game.remove(sq as any);
return sq;
}
function countPawns(game: ChessGame, color: 'w' | 'b') {
let n = 0;
game.board().forEach((row) => row.forEach((c) => { if (c && c.color === color && c.type === 'p') n++; }));
return n;
}

function addPieceEvent(game: ChessGame, type: 'p' | 'n' | 'b' | 'r' | 'q', color: 'w' | 'b', label: string): VariantEvent {
const sq = emptySquareOnOwnHalf(game, color);
if (!sq) return { id: uid(), type: 'JACKPOT_EMPTY', description: 'Jackpot: uygun boş kare bulunamadı', payload: {}, appliedAt: Date.now() };
game.put({ type, color }, sq as any);
return { id: uid(), type: 'JACKPOT_ADD', description: `${color === 'w' ? 'Beyaz' : 'Siyah'} jackpot ile ${label} kazandı (${sq})`, payload: { square: sq, pieceType: type, color }, appliedAt: Date.now() };
}

const POOL: JackpotOutcome[] = [
{ id: 'pawn', weight: 28, apply: (g, c) => addPieceEvent(g, 'p', c, 'piyon') },
{ id: 'knight', weight: 14, apply: (g, c) => addPieceEvent(g, 'n', c, 'at') },
{ id: 'bishop', weight: 14, apply: (g, c) => addPieceEvent(g, 'b', c, 'fil') },
{ id: 'rook', weight: 8, apply: (g, c) => addPieceEvent(g, 'r', c, 'kale') },
{ id: 'queen', weight: 3, apply: (g, c) => addPieceEvent(g, 'q', c, 'vezir') },
{ id: 'empty', weight: 18, apply: () => ({ id: uid(), type: 'JACKPOT_EMPTY', description: 'Jackpot: sonuç boş çıktı', payload: {}, appliedAt: Date.now() }) },
{
id: 'lose_pawn', weight: 10,
apply: (g, c) => {
const sq = removeRandomOwnPiece(g, c);
return { id: uid(), type: 'JACKPOT_LOSE', description: sq ? `Jackpot: ${sq} karesindeki taş kayboldu` : 'Jackpot: kayıp taş yok', payload: { square: sq }, appliedAt: Date.now() };
},
},
{
id: 'opponent_bonus', weight: 5,
apply: (g, c) => addPieceEvent(g, 'p', c === 'w' ? 'b' : 'w', 'piyon (rakibe)'),
},
];

function roll(): JackpotOutcome {
const total = POOL.reduce((s, o) => s + o.weight, 0);
let r = rng() * total;
for (const o of POOL) { if (r < o.weight) return o; r -= o.weight; }
return POOL[0];
}

export const JackpotVariant: VariantRule = {
id: 'jackpot',
name: 'Jackpot Chess',
description: 'Her taş alışından (capture) sonra %100 tetiklenen jackpot, tahtaya gerçek taş ekler/çıkarır.',
status: 'implemented',

initialize: () => ({ variantId: 'jackpot', moveCounter: 0, customData: {}, activeEvents: [], log: [] }),

onAfterMove: (state: VariantRuntimeState, game: ChessGame) => {
state.moveCounter++;
const history = game.history({ verbose: true });
const last = history[history.length - 1];
if (!last || !last.captured) {
state.activeEvents = [];
return [];
}
const outcome = roll();
// jackpot ödülü, hamleyi oynayan taraf için (bir önceki turn'ün tersi)
const winnerColor = last.color; // capture yapan taraf
const ev = outcome.apply(game, winnerColor);
state.activeEvents = [ev];
state.log.push(ev);
return [ev];
},
};
