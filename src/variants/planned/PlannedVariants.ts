import type { VariantRule, VariantRuntimeState } from '../types';
import type { ChessGame } from '../../chess/ChessGame';

/** Henüz uygulanmamış varyantlar için yer tutucu. UI, status !== 'implemented' olduğu için bunları başlatmaz. */
function plannedStub(id: string, name: string, description: string): VariantRule {
  return {
    id,
    name,
    description,
    status: 'planned',
    initialize: (_game: ChessGame): VariantRuntimeState => ({
      variantId: id,
      moveCounter: 0,
      customData: {},
      activeEvents: [],
      log: [],
    }),
  };
}

export const PLANNED_VARIANTS: Record<string, VariantRule> = {
  portal: plannedStub('portal', 'Portal Chess', 'Tahtada birbirine bağlı sabit portal çiftleri bulunur.'),
  bomb: plannedStub('bomb', 'Bomb Chess', 'Belirli kareler patlayarak çevresindeki taşları etkiler.'),
  lava: plannedStub('lava', 'Lava Chess', 'Bazı kareler geçici olarak "lav" olur ve üzerine gelen taşı yakar.'),
  survival: plannedStub('survival', 'Survival Chess', 'Sınırlı hamle/süre içinde hayatta kalma modu.'),
  stealth: plannedStub('stealth', 'Stealth Chess', 'Görüş mekaniğine bağlı kısmi gizlilik (satır/mesafe kısıtlı).'),
};
