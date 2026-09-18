import { useState } from 'react';
import { updateProfile } from '../storage/profileStore';
import { Button } from '../components/common/Button';

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleStart() {
    const trimmed = name.trim();
    setSaving(true);
    await updateProfile({
      username: trimmed || 'Oyuncu',
      avatarInitial: (trimmed[0] ?? 'O').toUpperCase(),
      hasOnboarded: true,
    });
    onDone();
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__card">
        <h1>Ultimate Chess'e Hoş Geldiniz</h1>
        <p>Klasik satranç, bilgisayara karşı oyun, puzzle antrenmanı ve kural değiştiren varyantlar (UNO Chess, Teleport Chess ve daha fazlası) sizi bekliyor.</p>

        <label className="welcome-screen__label" htmlFor="welcome-username">Size nasıl hitap edelim?</label>
        <input
          id="welcome-username"
          className="welcome-screen__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kullanıcı adınız"
          maxLength={24}
          onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
          autoFocus
        />

        <Button onClick={handleStart} disabled={saving}>
          {saving ? 'Hazırlanıyor…' : 'Başla'}
        </Button>
      </div>
    </div>
  );
}
