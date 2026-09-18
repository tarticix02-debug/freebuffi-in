import type { VariantRule } from './types';
import { InvisibleVariant } from './invisible/InvisibleVariant';
import { ChaosVariant } from './chaos/ChaosVariant';
import { JackpotVariant } from './jackpot/JackpotVariant';
import { TreasureVariant } from './treasure/TreasureVariant';
import { FreezeVariant } from './freeze/FreezeVariant';
import { TeleportVariant } from './teleport/TeleportVariant';
import { UnoVariant } from './uno/UnoVariant';
import { PLANNED_VARIANTS } from './planned/PlannedVariants';

export const VARIANT_REGISTRY: Record<string, VariantRule> = {
  invisible: InvisibleVariant,
  chaos: ChaosVariant,
  jackpot: JackpotVariant,
  treasure: TreasureVariant,
  freeze: FreezeVariant,
  teleport: TeleportVariant,
  uno: UnoVariant,
  ...PLANNED_VARIANTS, // artık sadece: portal, bomb, lava, survival, stealth
};
