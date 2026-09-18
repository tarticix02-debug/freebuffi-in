import { describe, it, expect } from 'vitest';
import { playSound } from '../src/services/soundService';
import { triggerHaptic } from '../src/services/hapticService';

describe('Ses/Haptic servisleri hata fırlatmaz', () => {
it('AudioContext/indexedDB olmayan ortamda playSound sessizce döner', async () => {
await expect(playSound('move')).resolves.toBeUndefined();
});

it('vibrate API olmayan ortamda triggerHaptic sessizce döner', async () => {
await expect(triggerHaptic('light')).resolves.toBeUndefined();
});
});
