import { Chess } from 'chess.js';
import type { GameRecord } from '../storage/gameHistoryStore';
import { identifyOpening } from './openingService';

export interface OpeningPerformance {
name: string;
eco: string;
games: number;
wins: number;
losses: number;
draws: number;
winRate: number;
}

export function computeOpeningPerformance(games: GameRecord[]): OpeningPerformance[] {
const map = new Map<string, OpeningPerformance>();

for (const g of games) {
if (!g.pgn) continue;
let sanMoves: string[];
try {
const c = new Chess();
c.loadPgn(g.pgn);
sanMoves = c.history();
} catch { continue; }

const info = identifyOpening(sanMoves);  
if (!info.name || !info.eco) continue;  

const key = `${info.eco}-${info.name}`;  
if (!map.has(key)) map.set(key, { name: info.name, eco: info.eco, games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 });  
const entry = map.get(key)!;  
entry.games++;  
if (g.result === 'win') entry.wins++;  
else if (g.result === 'loss') entry.losses++;  
else entry.draws++;

}

const list = Array.from(map.values());
list.forEach((e) => (e.winRate = e.games ? (e.wins / e.games) * 100 : 0));
return list.sort((a, b) => b.games - a.games);
}
