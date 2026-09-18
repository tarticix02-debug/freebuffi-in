import type { ChessGame } from '../chess/ChessGame';
import type { Square } from 'chess.js';

export interface VariantEvent {
id: string;
type: string;
description: string;
payload: Record<string, unknown>;
appliedAt: number;
}

export interface VariantRuntimeState {
variantId: string;
moveCounter: number;
customData: Record<string, unknown>;
activeEvents: VariantEvent[];
log: VariantEvent[];
}

export interface MoveGuardResult {
allowed: boolean;
reason?: string;
}

export interface VariantAction {
type: string;
payload?: any;
}

export interface VariantActionResult {
success: boolean;
reason?: string;
events: VariantEvent[];
}

export interface BoardDecoration {
square: string;
kind: string;
}

export interface VariantRule {
id: string;
name: string;
description: string;
status: 'implemented' | 'planned';

initialize(game: ChessGame): VariantRuntimeState;

/** Hamle chess.js'e uygulanmadan önce ekstra kısıtlama var mı? */
onBeforeMove?(state: VariantRuntimeState, game: ChessGame, from: Square, to: Square): MoveGuardResult;

/** Hamle uygulandıktan sonra tetiklenen gerçek state mutasyonları. */
onAfterMove?(state: VariantRuntimeState, game: ChessGame): VariantEvent[];

/** true = kare o oyuncuya görünür. CSS değil, gerçek render kararı. */
getVisibilityMask?(state: VariantRuntimeState, forSide: 'w' | 'b'): boolean[][];

isGameOver?(state: VariantRuntimeState, game: ChessGame): { over: boolean; result?: string };

/** Satranç hamlesi DIŞINDA, oyuncunun tetiklediği özel bir eylem (ör. UNO kart oynama). */
applyCustomAction?(state: VariantRuntimeState, game: ChessGame, action: VariantAction, actingColor: 'w' | 'b'): VariantActionResult;

/** Tahtada gösterilecek, kural motoruna ait sabit/dinamik dekorasyonlar (ör. ışınlanma kareleri). */
getBoardDecorations?(state: VariantRuntimeState): BoardDecoration[];

/** Bilgisayar rakibinin, gerçek hamleden ÖNCE oynamak isteyebileceği özel eylem (ör. UNO kartı). */
decideAIPreMoveAction?(state: VariantRuntimeState, game: ChessGame, aiColor: 'w' | 'b'): VariantAction | null;
}
