import { dbGetAll, dbPut } from './db';

export type BoardTheme = 'classic' | 'green' | 'blue' | 'walnut' | 'ice';

export interface BoardThemeColors { light: string; dark: string; }
export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  classic: { light: '#edd9b7', dark: '#b58863' },
  green: { light: '#eeeed2', dark: '#769656' },
  blue: { light: '#dee3e6', dark: '#4b7399' },
  walnut: { light: '#d2b48c', dark: '#7c5430' },
  ice: { light: '#e8f4f8', dark: '#8fb8c9' },
};

export interface AppSettings {
id: string;
theme: 'dark' | 'light' | 'system';
accentColor: string;
boardTheme: BoardTheme;
soundEnabled: boolean;
soundVolume: number; // 0..1
hapticEnabled: boolean;
analysisDepth: number; // oyun incelemesi motor derinliği
language: 'tr' | 'en';
legalMoveHighlights: boolean;
showLastMoveHighlight: boolean;
autoPromoteToQueen: boolean;
showCoordinates: boolean;
puzzleGenProcessedGameIds: string[];
}

const SETTINGS_ID = 'app-settings';
const DEFAULT_SETTINGS: AppSettings = {
id: SETTINGS_ID, theme: 'dark', accentColor: '#4f8cff', boardTheme: 'classic',
soundEnabled: true, soundVolume: 0.8, hapticEnabled: true, analysisDepth: 18, language: 'tr',
legalMoveHighlights: true, showLastMoveHighlight: true, autoPromoteToQueen: false,
showCoordinates: true,
puzzleGenProcessedGameIds: [],
};

export async function getSettings(): Promise<AppSettings> {
const all = await dbGetAll<AppSettings>('settings');
const existing = all.find((s) => s.id === SETTINGS_ID);
if (existing) {
// Tek seferlik geçiş: eski 'Derin' (14) artık 'Dengeli'; chess.com-paritesi için
// mevcut kullanıcılar yeni 'Derin' (18) seviyesine taşınır.
if (existing.analysisDepth === 14) existing.analysisDepth = 18;
return { ...DEFAULT_SETTINGS, ...existing }; // eski kayıtlarda eksik yeni alanları tamamlar
}
await dbPut('settings', DEFAULT_SETTINGS);
return DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
const current = await getSettings();
const updated = { ...current, ...patch, id: SETTINGS_ID };
await dbPut('settings', updated);
return updated;
}
