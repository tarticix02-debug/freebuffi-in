/**
 * Stockfish seviye sistemi — TEK KAYNAK.
 * UI etiketleri (ENGINE_PRESETS), UCI opsiyonları (levelToOptions) ve rating
 * matematiği (levelToElo) buradan türetilir; formüller başka dosyalarda
 * kopyalanmaz.
 *
 * Canlı doğrulama (Stockfish 18 Lite WASM, `uci` çıktısı):
 *   UCI_Elo          spin default 1320 min 1320 max 3190
 *   Skill Level      spin default 20   min 0    max 20
 *   UCI_LimitStrength check
 */

export const MIN_UCI_ELO = 1320;
export const MAX_UCI_ELO = 3190;

export interface EngineOptions {
  UCI_LimitStrength: boolean;
  UCI_Elo?: number;
  SkillLevel: number;
  MultiPV: number;
}

export function levelToElo(level: number): number {
  const lvl = Math.max(0, Math.min(20, Math.round(level)));
  // 18+ tam güç: motorun kendi tavanı.
  if (lvl >= 18) return MAX_UCI_ELO;
  return Math.round(MIN_UCI_ELO + (lvl / 17) * (MAX_UCI_ELO - MIN_UCI_ELO));
}

/** Level 0-20 -> gerçek UCI ayarları. Sadece UI etiketi değildir. */
export function levelToOptions(level: number): EngineOptions {
  const lvl = Math.max(0, Math.min(20, Math.round(level)));

  if (lvl >= 18) {
    // Tam güç, sınırlama yok.
    return { UCI_LimitStrength: false, SkillLevel: 20, MultiPV: 1 };
  }

  return {
    UCI_LimitStrength: true,
    UCI_Elo: levelToElo(lvl),
    SkillLevel: Math.round((lvl / 17) * 19),
    MultiPV: 1,
  };
}

export function levelToMoveTimeMs(level: number): number {
  // Düşük seviyeler hızlı/az düşünür, yüksek seviyeler daha derin arar.
  return Math.round(250 + (Math.max(0, Math.min(20, level)) / 20) * 2250);
}

export interface EngineLevelPreset {
  id: string;
  label: string;
  level: number;
  description: string;
}

/** Oyun ekranındaki hazır zorluk düğmeleri. En kolayı en üstte. */
export const ENGINE_PRESETS: EngineLevelPreset[] = [
  { id: 'baby', label: 'Bebe', level: 0, description: 'Rastgeleye yakın, tam acemiler için' },
  { id: 'beginner', label: 'Acemi', level: 1, description: 'Çok kolay — hamle kurallarını yeni öğrenenlere' },
  { id: 'casual', label: 'Çırak', level: 3, description: 'Kolay — bazen basit hatalar yapar' },
  { id: 'easy', label: 'Kolay', level: 5, description: 'Yeni başlayanlar için ideal' },
  { id: 'medium', label: 'Orta', level: 8, description: 'Kulüp oyuncusu gücü' },
  { id: 'hard', label: 'Zor', level: 14, description: 'Deneyimli, disiplinli rakip' },
  { id: 'expert', label: 'Uzman', level: 19, description: 'Tam güç Stockfish' },
];
