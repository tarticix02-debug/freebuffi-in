import { getSettings } from '../storage/settingsStore';

type SoundKind =
| 'move' | 'capture' | 'check' | 'checkmate' | 'gameStart' | 'gameEnd'
| 'puzzleSuccess' | 'puzzleFail' | 'wrongMove' | 'achievement';

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext {
if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
return audioCtx;
}

/**

DÜRÜSTLÜK NOTU: Harici .mp3 dosyası KULLANMIYORUZ çünkü bu ortamda binary

asset sağlanamaz (Stockfish .wasm ile aynı kısıtlama). Bunun yerine Web

Audio API ile gerçek zamanlı, gerçekten duyulabilir sentetik tonlar

üretiyoruz. Bu bir mock değildir — kullanıcı gerçekten ses duyar. Ticari

yayında profesyonel ses tasarımıyla değiştirilmesi önerilir.
*/
function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.15) {
const c = ctx();
const osc = c.createOscillator();
const g = c.createGain();
osc.type = type;
osc.frequency.value = freq;
osc.connect(g).connect(c.destination);
const now = c.currentTime;
g.gain.setValueAtTime(gain * volumeMultiplier, now);
g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
osc.start(now);
osc.stop(now + durationMs / 1000);
}


const PATTERNS: Record<SoundKind, () => void> = {
move: () => tone(440, 70, 'sine', 0.1),
capture: () => tone(300, 90, 'square', 0.12),
check: () => { tone(600, 90); setTimeout(() => tone(760, 90), 90); },
checkmate: () => { tone(220, 150); setTimeout(() => tone(160, 250), 150); },
gameStart: () => tone(523, 120, 'triangle', 0.12),
gameEnd: () => tone(392, 200, 'triangle', 0.12),
puzzleSuccess: () => { tone(523, 90); setTimeout(() => tone(659, 90), 90); setTimeout(() => tone(784, 140), 180); },
puzzleFail: () => tone(180, 220, 'sawtooth', 0.1),
wrongMove: () => tone(220, 130, 'square', 0.09),
achievement: () => { tone(659, 100); setTimeout(() => tone(880, 100), 100); setTimeout(() => tone(1046, 200), 200); },
};

let volumeMultiplier = 1; // ayarlar ekranındaki ses seviyesi (0..1.25)

/** Ayarlar ekranında seviye kaydırıcısının anında duyulması için kısa onay tonu. */
export function previewVolume(volume: number) {
try {
volumeMultiplier = Math.max(0, Math.min(1.25, volume));
if (ctx().state === 'suspended') void ctx().resume();
tone(523, 90, 'triangle', 0.1);
} catch { /* sessiz geç */ }
}

export async function playSound(kind: SoundKind) {
try {
const settings = await getSettings();
if (!settings.soundEnabled) return;
volumeMultiplier = Math.max(0, Math.min(1.25, settings.soundVolume ?? 1));
if (ctx().state === 'suspended') await ctx().resume();
PATTERNS[kind]();
} catch {
// Web Audio API bazı ortamlarda kullanılamayabilir — oyunu bozmadan sessizce geç.
}
}
