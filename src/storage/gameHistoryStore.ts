import { dbGetAll, dbPut } from './db';
import { uid } from '../utils/id';

export interface GameRecord {
id: string;
date: number;
mode: string; // 'classic' | 'vs-computer' | 'chaos' | 'jackpot' | ...
opponent: string;
userColor: 'w' | 'b';
result: 'win' | 'loss' | 'draw';
pgn: string;
finalFen: string;
moveCount: number;
durationSeconds: number;
ratingBefore: number;
ratingAfter: number;
/** Saat modu: TIME_CONTROLS id'si ('blitz3+2'…) veya 'unlimited'. Eski kayıtlarda yok — helper 'unknown' sayar. */
timeControlId?: string;
}

export async function saveGame(record: Omit<GameRecord, 'id'>): Promise<GameRecord> {
const full: GameRecord = { ...record, id: uid() };
await dbPut('games', full);
return full;
}

export async function getAllGames(): Promise<GameRecord[]> {
const games = await dbGetAll<GameRecord>('games');
return games.sort((a, b) => b.date - a.date);
}

export async function getGameById(id: string): Promise<GameRecord | null> {
const games = await dbGetAll<GameRecord>('games');
return games.find((g) => g.id === id) ?? null;
}
