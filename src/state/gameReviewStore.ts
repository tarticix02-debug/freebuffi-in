import { create } from 'zustand';
import { analyzeGame, type GameReviewResult } from '../services/gameReviewService';
import { parseGameInput, type ParsedGameInput } from '../services/gameInputService';
import { nextKeyMoment } from '../services/reviewNavigationService';
import { getSettings } from '../storage/settingsStore';

type Status = 'idle' | 'analyzing' | 'done' | 'error' | 'cancelled';

interface GameReviewState {
  status: Status;
  progress: number;
  result: GameReviewResult | null;
  error: string | null;
  selectedPly: number; // -1 = başlangıç pozisyonu
  cancelFlag: { cancelled: boolean };
  /**
   * FEN inceleme modu: PGN yerine tek pozisyon yüklenir; tahta üzerinde
   * serbest hamle denemesi + o pozisyonun motor analizi gösterilir.
   */
  fenMode: { fen: string; bestUci: string | null; evaluationCp: number | null; mate: number | null } | null;

  /** Kayıtlı oyun için: PGN analizi başlatır. */
  start: (pgn: string, depth?: number) => Promise<void>;
  /** Yapıştırılan PGN veya FEN'i parse edip uygun modda başlatır. */
  startFromUserInput: (raw: string) => Promise<void>;
  cancel: () => void;
  selectPly: (ply: number) => void;
  /** Bir hamle ileri (sınır: son hamle). */
  stepForward: () => void;
  /** Bir hamle geri (sınır: başlangıç pozisyonu). */
  stepBack: () => void;
  /** İleri/geri yönde bir sonraki "önemli hamle"ye atla (brilliant/great/miss/mistake/blunder). */
  jumpKeyMoment: (direction: 1 | -1) => void;
  reset: () => void;
}

export const useGameReviewStore = create<GameReviewState>((set, get) => ({
  status: 'idle',
  progress: 0,
  result: null,
  error: null,
  selectedPly: -1,
  cancelFlag: { cancelled: false },
  fenMode: null,

  start: async (pgn, depth) => {
    if (depth == null) {
      try { depth = (await getSettings()).analysisDepth ?? 18; } catch { depth = 18; }
    }
    const cancelFlag = { cancelled: false };
    set({ status: 'analyzing', progress: 0, error: null, result: null, cancelFlag, selectedPly: -1, fenMode: null });
    try {
      const result = await analyzeGame(pgn, {
        depth,
        signal: cancelFlag,
        onProgress: (done, total) => set({ progress: Math.round((done / total) * 100) }),
      });
      if (cancelFlag.cancelled) { set({ status: 'cancelled' }); return; }
      set({ status: 'done', result, selectedPly: result.moves.length - 1 });
    } catch (e) {
      if ((e as Error).message === 'CANCELLED') { set({ status: 'cancelled' }); return; }
      set({ status: 'error', error: (e as Error).message });
    }
  },

  startFromUserInput: async (raw) => {
    let parsed: ParsedGameInput;
    try {
      parsed = parseGameInput(raw);
    } catch (e) {
      set({ status: 'error', error: (e as Error).message, result: null, fenMode: null });
      return;
    }

    if (parsed.source === 'fen' && parsed.startingFen) {
      // Tek pozisyon: motor analizi (en iyi hamle + değerlendirme) yeterli.
      set({ status: 'analyzing', progress: 0, error: null, result: null, selectedPly: -1 });
      try {
        const { StockfishEngine } = await import('../engine/StockfishEngine');
        const engine = new StockfishEngine();
        await engine.init();
        engine.setMultiPV(1);
        engine.setLevel(20);
        try {
          const res = await engine.analyze(parsed.startingFen, { depth: 18 }, `fenmode-${Date.now()}`);
          set({
            status: 'done',
            result: null,
            selectedPly: -1,
            fenMode: {
              fen: parsed.startingFen,
              bestUci: res.bestMove,
              evaluationCp: res.evaluationCp,
              mate: res.mate,
            },
          });
        } finally {
          engine.destroy();
        }
      } catch (e) {
        set({ status: 'error', error: (e as Error).message });
      }
      return;
    }

    await get().start(parsed.pgn);
  },

  cancel: () => { get().cancelFlag.cancelled = true; },
  selectPly: (ply) => set({ selectedPly: ply }),

  stepForward: () => {
    const { result, selectedPly } = get();
    if (!result || selectedPly >= result.moves.length - 1) return;
    set({ selectedPly: selectedPly + 1 });
  },

  stepBack: () => {
    if (get().selectedPly <= -1) return;
    set({ selectedPly: get().selectedPly - 1 });
  },

  jumpKeyMoment: (direction) => {
    const { result, selectedPly } = get();
    if (!result) return;
    const target = nextKeyMoment(result, selectedPly, direction);
    if (target !== null) set({ selectedPly: target });
  },

  reset: () => set({ status: 'idle', progress: 0, result: null, error: null, selectedPly: -1, fenMode: null }),
}));
