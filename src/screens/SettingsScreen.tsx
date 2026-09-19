import { useState, type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { BOARD_THEMES, type BoardTheme } from '../storage/settingsStore';
import { previewVolume } from '../services/soundService';
import { Card } from '../components/common/Card';

const BOARD_THEME_LABELS: Record<BoardTheme, string> = {
  classic: 'Klasik',
  green: 'Çimen',
  blue: 'Okyanus',
  walnut: 'Ceviz',
  ice: 'Buz',
};

const DEPTH_OPTIONS = [
  { value: 10, label: 'Hızlı', hint: 'Anında sonuç' },
  { value: 14, label: 'Dengeli', hint: 'Günlük inceleme' },
  { value: 18, label: 'Derin', hint: 'Chess.com benzeri isabet' },
  { value: 22, label: 'Maksimum', hint: 'En keskin analiz, yavaş' },
];

export function SettingsScreen() {
  const {
    settings, setTheme, setAccent, setBoardTheme, setSoundEnabled, setSoundVolume,
    setHapticEnabled, setLegalMoveHighlights, setShowLastMoveHighlight, setAutoPromoteToQueen, setAnalysisDepth, setShowCoordinates,
  } = useTheme();
  const [flash, setFlash] = useState<string | null>(null);

  if (!settings) return <div className="state-panel"><div className="spinner" /></div>;

  function announce(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div className="settings-screen">
      <h1>Ayarlar</h1>
      {flash && <div className="settings-flash" role="status">{flash}</div>}

      <SettingsSection title="Görünüm">
        <SettingRow label="Tema">
          <div className="seg-control">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                className={settings.theme === t ? 'seg-control__opt--active' : ''}
                onClick={() => { setTheme(t); announce(t === 'dark' ? 'Koyu tema' : t === 'light' ? 'Açık tema' : 'Sistem teması'); }}
              >
                {t === 'dark' ? 'Koyu' : t === 'light' ? 'Açık' : 'Sistem'}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Vurgu Rengi">
          <input type="color" value={settings.accentColor} onChange={(e) => setAccent(e.target.value)} />
        </SettingRow>
        <SettingRow label="Tahta Rengi" stacked>
          <div className="board-theme-row">
            {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((t) => (
              <button
                key={t}
                className={`board-swatch ${settings.boardTheme === t ? 'board-swatch--active' : ''}`}
                title={BOARD_THEME_LABELS[t]}
                aria-label={BOARD_THEME_LABELS[t]}
                onClick={() => { setBoardTheme(t); announce(`Tahta: ${BOARD_THEME_LABELS[t]}`); }}
              >
                <span className="board-swatch__half" style={{ background: BOARD_THEMES[t].light }} />
                <span className="board-swatch__half" style={{ background: BOARD_THEMES[t].dark }} />
              </button>
            ))}
          </div>
          <span className="setting-row__hint">{BOARD_THEME_LABELS[settings.boardTheme]}</span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Davranış">
        <ToggleRow label="Ses efektleri" value={settings.soundEnabled} onChange={(v) => { setSoundEnabled(v); if (v) previewVolume(settings.soundVolume); announce(v ? 'Ses açık' : 'Ses kapalı'); }} />
        <SettingRow label="Ses Seviyesi">
          <input
            type="range" min={0} max={1} step={0.1}
            value={settings.soundVolume}
            disabled={!settings.soundEnabled}
            aria-label="Ses seviyesi"
            onChange={(e) => {
              const v = Number(e.target.value);
              setSoundVolume(v);
              previewVolume(v);
            }}
          />
          <span className="setting-row__hint">{Math.round(settings.soundVolume * 100)}%</span>
        </SettingRow>
        <ToggleRow label="Titreşim" value={settings.hapticEnabled} onChange={setHapticEnabled} />
        <ToggleRow label="Geçerli hamle göstergeleri" value={settings.legalMoveHighlights} onChange={setLegalMoveHighlights} />
        <ToggleRow label="Son hamle vurgusu" value={settings.showLastMoveHighlight} onChange={setShowLastMoveHighlight} />
        <ToggleRow label="Otomatik vezir terfisi" value={settings.autoPromoteToQueen} onChange={setAutoPromoteToQueen} />
        <ToggleRow label="Tahta koordinatları (a-h, 1-8)" value={settings.showCoordinates} onChange={(v) => { setShowCoordinates(v); announce(v ? 'Koordinatlar açık' : 'Koordinatlar kapalı'); }} />
      </SettingsSection>

      <SettingsSection title="Analiz">
        <SettingRow label="İnceleme Derinliği" stacked>
          <div className="depth-grid">
            {DEPTH_OPTIONS.map((d) => (
              <button
                key={d.value}
                className={`depth-card ${settings.analysisDepth === d.value ? 'depth-card--active' : ''}`}
                onClick={() => { setAnalysisDepth(d.value); announce(`Derinlik: ${d.label}`); }}
              >
                <strong>{d.label}</strong>
                <span>{d.hint}</span>
                <em>derinlik {d.value}</em>
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2><Card>{children}</Card></section>;
}
function SettingRow({ label, children, stacked }: { label: string; children: ReactNode; stacked?: boolean }) {
  return <div className={`setting-row ${stacked ? 'setting-row--stacked' : ''}`}><span>{label}</span><div className="setting-row__control">{children}</div></div>;
}
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <button
        className={`toggle-pill ${value ? 'toggle-pill--on' : ''}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-pill__knob" />
      </button>
    </div>
  );
}
