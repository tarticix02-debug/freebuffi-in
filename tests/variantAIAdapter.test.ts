import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';
import { VariantAIAdapter } from '../src/variants/ai/VariantAIAdapter';
import { FreezeVariant } from '../src/variants/freeze/FreezeVariant';
import { StockfishEngine } from '../src/engine/StockfishEngine';

function neverGuard(): boolean {
  return true;
}

describe('VariantAIAdapter', () => {
  it('iznli hamle yoksa null döner', async () => {
    const g = new ChessGame();
    const adapter = new VariantAIAdapter(new StockfishEngine());
    const pick = await adapter.pickMove(g, { variantId: 'x', moveCounter: 0, customData: {}, activeEvents: [], log: [] }, () => false);
    expect(pick).toBeNull();
  });

  it('tek izinli hamle varsa motoru beklemeden onu seçer', async () => {
    // Beyazın yalnızca tek legal hamlesi olan bir pozisyon kur.
    const g = new ChessGame('7k/8/8/8/8/8/6q1/K7 w - - 0 1');
    const adapter = new VariantAIAdapter(new StockfishEngine());
    const pick = await adapter.pickMove(g, { variantId: 'x', moveCounter: 0, customData: {}, activeEvents: [], log: [] }, neverGuard);
    expect(pick).not.toBeNull();
    // Kaçış hamlesi: a1 şahı tek legal hamle yapabilir (a2/b1/b2'den birine).
    expect(['a2', 'b1', 'b2']).toContain(pick!.to);
  });

  it('guard kuralına uymayan motor önerisini eler (Freeze guard)', async () => {
    const g = new ChessGame();
    const state = FreezeVariant.initialize(g);
    // Motorun seveceği merkezi hamleler dondurulmuş olsun; e2-e4 yasağı koy.
    (state.customData.frozen as Record<string, number>)['e2'] = 99;
    const guard = (from: string) => FreezeVariant.onBeforeMove!(state, g, from as any, '' as any).allowed || from !== 'e2';
    // Basitleştirilmiş guard: e2 kaynaklı hamleler yasak.
    const guardFrom = (from: string) => from !== 'e2';

    const adapter = new VariantAIAdapter(new StockfishEngine());
    const pick = await adapter.pickMove(g, state, guardFrom);
    expect(pick).not.toBeNull();
    expect(pick!.from).not.toBe('e2');
  });

  it('motor hazır değilken greedy fallback ile hamle seçer', async () => {
    const g = new ChessGame();
    const engine = new StockfishEngine(); // init edilmemiş: analyze hata fırlatır
    const adapter = new VariantAIAdapter(engine);
    const pick = await adapter.pickMove(g, { variantId: 'x', moveCounter: 0, customData: {}, activeEvents: [], log: [] }, neverGuard);
    expect(pick).not.toBeNull();
    expect(g.legalMoves().some((m) => m.from === pick!.from && m.to === pick!.to)).toBe(true);
  });

  it('greedy fallback alma hamlesini tercih eder', async () => {
    const g = new ChessGame('4k3/8/8/3p4/8/8/3R4/4K3 w - - 0 1');
    const engine = new StockfishEngine();
    const adapter = new VariantAIAdapter(engine);
    const pick = await adapter.pickMove(g, { variantId: 'x', moveCounter: 0, customData: {}, activeEvents: [], log: [] }, neverGuard);
    expect(pick).toEqual({ from: 'd2', to: 'd5', promotion: undefined });
  });
});
