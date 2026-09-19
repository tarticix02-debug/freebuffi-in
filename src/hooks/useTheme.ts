import { useEffect, useState, useCallback } from 'react';
import { getSettings, updateSettings, BOARD_THEMES, type AppSettings } from '../storage/settingsStore';

export function useTheme() {
const [settings, setSettings] = useState<AppSettings | null>(null);

const applyTheme = useCallback((theme: AppSettings['theme'], accent: string, boardTheme?: AppSettings['boardTheme']) => {
const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
document.documentElement.setAttribute('data-theme', resolved);
document.documentElement.style.setProperty('--accent-color', accent);
if (boardTheme && BOARD_THEMES[boardTheme]) {
  document.documentElement.style.setProperty('--board-light', BOARD_THEMES[boardTheme].light);
  document.documentElement.style.setProperty('--board-dark', BOARD_THEMES[boardTheme].dark);
}
}, []);

useEffect(() => {
getSettings().then((s) => { setSettings(s); applyTheme(s.theme, s.accentColor, s.boardTheme); });
const mql = window.matchMedia('(prefers-color-scheme: dark)');
const listener = () => setSettings((curr) => { if (curr?.theme === 'system') applyTheme('system', curr.accentColor, curr.boardTheme); return curr; });
mql.addEventListener('change', listener);
return () => mql.removeEventListener('change', listener);
}, [applyTheme]);

async function patch(p: Partial<AppSettings>) {
const updated = await updateSettings(p);
setSettings(updated);
if (p.theme || p.accentColor || p.boardTheme) applyTheme(updated.theme, updated.accentColor, updated.boardTheme);
}

return {
settings,
setTheme: (theme: AppSettings['theme']) => patch({ theme }),
setAccent: (accentColor: string) => patch({ accentColor }),
setBoardTheme: (boardTheme: AppSettings['boardTheme']) => patch({ boardTheme }),
setSoundVolume: (soundVolume: number) => patch({ soundVolume }),
setAnalysisDepth: (analysisDepth: number) => patch({ analysisDepth }),
setSoundEnabled: (v: boolean) => patch({ soundEnabled: v }),
setHapticEnabled: (v: boolean) => patch({ hapticEnabled: v }),
setLegalMoveHighlights: (v: boolean) => patch({ legalMoveHighlights: v }),
setShowLastMoveHighlight: (v: boolean) => patch({ showLastMoveHighlight: v }),
setAutoPromoteToQueen: (v: boolean) => patch({ autoPromoteToQueen: v }),
setShowCoordinates: (v: boolean) => patch({ showCoordinates: v }),
};
}
