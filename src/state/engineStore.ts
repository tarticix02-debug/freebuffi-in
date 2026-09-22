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
const { level } = get();
const status = get().engine.getStatus();
if (status === 'ERROR' || status === 'LOADING') {
throw new Error('Motor hazır değil. Analiz/oyun başlatılamaz.');
}
// Motor meşgulken (THINKING) analyze()'ın 'stop' göndermesi lite-single wasm'da
// 'unreachable' crash'ine yol açıyor (arama ortasında iptal). Bunun yerine
// sürmekte olan arama bitene kadar bekleyip sıraya gir — en fazla ~3sn.
if (status === 'THINKING') {
const start = Date.now();
while (get().engine.getStatus() === 'THINKING' && Date.now() - start < 3000) {
await new Promise((r) => setTimeout(r, 50));
}
if (get().engine.getStatus() === 'THINKING') {
// Arama beklenen sürede bitmedi: cevap kayboldu (wasm çökmesi). Worker
// tazelenir; istek yeni worker'a gider — kilit diğer istekleri bloklamaz.
get().reset();
await get().init();
} else if (get().engine.getStatus() !== 'READY') {
throw new Error('Motor hazır değil. Analiz/oyun başlatılamaz.');
}
}
const movetimeMs = levelToMoveTimeMs(level);
// Yerleşik bekçi: bestmove beklenen sürede gelmezse istek hatayla biter,
// worker tazelenir ve istek bir kez yeni worker'da yeniden denenir.
try {
return await Promise.race([
get().engine.analyze(fen, { movetimeMs }, uid()),
new Promise<never>((_, reject) =>
setTimeout(() => reject(new Error('Motor arama zaman aşımı')), movetimeMs + 5000),
),
]);
} catch (e) {
if ((e as Error).message !== 'Motor arama zaman aşımı') throw e;
get().reset();
await get().init();
return get().engine.analyze(fen, { movetimeMs }, uid());
}
},

reset: () => {
get().engine.destroy();
const fresh = new StockfishEngine();
// Paylaşılan init sözü sıfırlanır ki reset sonrası init() gerçekten yeni
// worker'ı kursun; yeni worker'ın durum değişimleri de store'a akar.
fresh.onStatusChange((s) => set({ status: s, errorMessage: s === 'ERROR' ? fresh.getLastError() : null }));
set({ status: 'LOADING', errorMessage: null, engine: fresh });
initInFlight = null;
},
}));
