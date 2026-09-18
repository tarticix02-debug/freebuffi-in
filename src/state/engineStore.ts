import { create } from 'zustand';
import { StockfishEngine, type EngineStatus, type AnalysisResult } from '../engine/StockfishEngine';
import { levelToMoveTimeMs } from '../engine/levels';
import { uid } from '../utils/id';

interface EngineState {
engine: StockfishEngine;
status: EngineStatus;
errorMessage: string | null;
level: number;
init: () => Promise<void>;
setLevel: (lvl: number) => void;
requestBestMove: (fen: string) => Promise<AnalysisResult>;
reset: () => void;
}

// Tek uçuşta init: StockfishEngine.init zaten guard'lı (worker varsa no-op),
// bu yüzden ikinci çağrı devam eden el sıkışmayı BEKLEMEZ. 113MB wasm yüklenirken
// startClassic + ilk hamle zinciri aynı anda init çağırınca ikisi de anında dönüyor
// ve zincir "hâlâ LOADING" sanıp motoru terk ediyordu. Söz burada paylaşılır.
let initInFlight: Promise<void> | null = null;

export const useEngineStore = create<EngineState>((set, get) => ({
engine: new StockfishEngine(),
status: 'LOADING',
errorMessage: null,
level: 8,

init: async () => {
if (initInFlight) return initInFlight;
const { engine } = get();
engine.onStatusChange((s) => set({ status: s, errorMessage: s === 'ERROR' ? engine.getLastError() : null }));
initInFlight = (async () => {
try {
await engine.init();
engine.setLevel(get().level);
} catch (e) {
initInFlight = null; // gerçek hata: tekrar denenebilir
set({ status: 'ERROR', errorMessage: (e as Error).message });
}
})();
return initInFlight;
},

setLevel: (lvl) => {
set({ level: lvl });
get().engine.setLevel(lvl);
},

requestBestMove: async (fen: string) => {
const { engine, level } = get();
if (engine.getStatus() === 'ERROR' || engine.getStatus() === 'LOADING') {
throw new Error('Motor hazır değil. Analiz/oyun başlatılamaz.');
}
const requestId = uid();
const movetimeMs = levelToMoveTimeMs(level);
return engine.analyze(fen, { movetimeMs }, requestId);
},

reset: () => {
get().engine.destroy();
set({ status: 'LOADING', errorMessage: null, engine: new StockfishEngine() });
},
}));
