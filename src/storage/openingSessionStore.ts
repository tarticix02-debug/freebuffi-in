import { dbGetAll, dbPut } from './db';
import { uid } from '../utils/id';

export interface OpeningSessionRecord {
id: string;
lineId: string;
lineName: string;
date: number;
mistakes: number;
mistakeFree: boolean;
}

/** Antrenör oturumunu kaydeder — günlük görevler bu tabloyu okur. */
export async function appendOpeningSession(lineId: string, lineName: string, mistakeCount: number): Promise<void> {
await dbPut('openingSessions', {
id: uid(), lineId, lineName, date: Date.now(),
mistakes: mistakeCount, mistakeFree: mistakeCount === 0,
});
}
