import { getSettings } from '../storage/settingsStore';

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
light: 10, medium: 25, heavy: 50, success: [20, 40, 20], error: [40, 30, 40, 30, 40],
};

export async function triggerHaptic(kind: HapticKind) {
try {
const settings = await getSettings();
if (!settings.hapticEnabled) return;
if (!('vibrate' in navigator)) return; // masaüstünde API yok, sessizce atla
navigator.vibrate(PATTERNS[kind]);
} catch {
// yoksay
}
}
