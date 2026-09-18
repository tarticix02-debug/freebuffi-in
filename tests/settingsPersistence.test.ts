import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings, updateSettings, BOARD_THEMES, type AppSettings } from '../src/storage/settingsStore';
import { dbGetAll, dbPut } from '../src/storage/db';

async function clearSettings() {
  // Kaydı tamamen sıfırla: yeni alanlar içermeyen minimal bir eski-kayıt yaz,
  // getSettings() onu varsayılanlarla tamamlasın.
  await dbPut('settings', { id: 'app-settings', theme: 'dark', accentColor: '#4f8cff' } as unknown as AppSettings);
  await getSettings(); // tamamlansın
}

describe('settingsStore kalıcılık', () => {
  beforeEach(async () => {
    await clearSettings();
  });

  it('varsayılan ayarlar boardTheme/soundVolume/analysisDepth içerir', async () => {
    const s = await getSettings();
    expect(s.boardTheme).toBe('classic');
    expect(s.soundVolume).toBe(0.8);
    expect(s.analysisDepth).toBe(18);
  });

  it('updateSettings yeni alanları kalıcı yazar ve okuma turu tamamlatır', async () => {
    await updateSettings({ boardTheme: 'green', soundVolume: 0.4, analysisDepth: 18 });
    const s = await getSettings(); // yeni okuma — IndexedDB'den gelir
    expect(s.boardTheme).toBe('green');
    expect(s.soundVolume).toBe(0.4);
    expect(s.analysisDepth).toBe(18);
  });

  it('eski kayıtlar (yeni alanlar eksik) varsayılanlarla tamamlanır', async () => {
    // Eski kaydı yeni alanlar OLMADAN zorla yaz
    const all = await dbGetAll<AppSettings>('settings');
    const current = all.find((x) => x.id === 'app-settings')!;
    const { boardTheme, soundVolume, analysisDepth, ...legacy } = current;
    expect(boardTheme).toBeUndefined();
    await dbPut('settings', legacy as AppSettings);

    const s = await getSettings();
    expect(s.boardTheme).toBe('classic');
    expect(s.soundVolume).toBe(0.8);
    expect(s.analysisDepth).toBe(18);
    expect(s.theme).toBe(current.theme); // diğer alanlar korunur
  });

  it('BOARD_THEMES be tema tanımlı ve renk çiftleri geçerli', () => {
    const keys = Object.keys(BOARD_THEMES);
    expect(keys.length).toBe(5);
    for (const k of keys) {
      expect(BOARD_THEMES[k as keyof typeof BOARD_THEMES].light).toMatch(/^#/);
      expect(BOARD_THEMES[k as keyof typeof BOARD_THEMES].dark).toMatch(/^#/);
    }
  });
});
