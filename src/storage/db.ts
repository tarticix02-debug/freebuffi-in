const DB_NAME = 'ultimate-chess-db';
const DB_VERSION = 4; // v3->v4: 'openingSessions' ve 'questNotifications' eklendi
const STORES = [
'games', 'profile', 'settings', 'puzzles', 'puzzleAttempts',
'quests', 'achievements', 'openingProgress', 'openingSessions', 'questNotifications',
] as const;

function openDb(): Promise<IDBDatabase> {
return new Promise((resolve, reject) => {
const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = () => {
const db = req.result;
STORES.forEach((s) => {
if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
});
};
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
}

export async function dbPut<T extends { id: string }>(store: (typeof STORES)[number], value: T) {
const db = await openDb();
return new Promise<void>((resolve, reject) => {
const tx = db.transaction(store, 'readwrite');
tx.objectStore(store).put(value);
tx.oncomplete = () => resolve();
tx.onerror = () => reject(tx.error);
});
}

export async function dbGetAll<T>(store: (typeof STORES)[number]): Promise<T[]> {
const db = await openDb();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, 'readonly');
const req = tx.objectStore(store).getAll();
req.onsuccess = () => resolve(req.result as T[]);
req.onerror = () => reject(req.error);
});
}

export async function dbDelete(store: (typeof STORES)[number], id: string) {
const db = await openDb();
return new Promise<void>((resolve, reject) => {
const tx = db.transaction(store, 'readwrite');
tx.objectStore(store).delete(id);
tx.oncomplete = () => resolve();
tx.onerror = () => reject(tx.error);
});
}
