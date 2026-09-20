// CANONICAL SÜRÜM: matchInProgress, matchStartedAt (gerçek süre ölçümü), legalMovesForSquare (terfi tespiti için), ses/haptic tetikleri, başarım değerlendirmesi tek dosyada birleşiktir.
import { create } from 'zustand';
import type { Square, Move } from 'chess.js';
import { ChessGame } from '../chess/ChessGame';
import { VARIANT_REGISTRY } from '../variants/registry';
import type { VariantRule, VariantRuntimeState, VariantEvent } from '../variants/types';
import { useEngineStore } from './engineStore';
import { saveGame } from '../storage/gameHistoryStore';
import { getProfile, updateProfile } from '../storage/profileStore';
import { computeNewRating } from '../services/ratingService';
import { levelToElo } from '../engine/levels';
import { evaluateAndPersistAchievements } from '../services/achievementService';
import { useAchievementToastStore } from './achievementToastStore';
import { useDailyQuestStore } from './dailyQuestStore';
import { playSound } from '../services/soundService';
import { triggerHaptic } from '../services/hapticService';
import { VariantAIAdapter } from '../variants/ai/VariantAIAdapter';
import {
  TIME_CONTROLS, initialClock, applyMoveToClock, restoreClockFromSnapshots,
  flaggedColor, timeoutWinner, countMaterial,
  type ClockState, type TimeControl,
} from '../services/clockService';

/** Bir eşleşmenin (match) kimliği. Yeni oyun başlatıldığında artar. */
type MatchToken = number;

interface GameState {
  game: ChessGame;
  orientation: 'w' | 'b';
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  variant: VariantRule | null;
  variantState: VariantRuntimeState | null;
  activeVariantEvents: VariantEvent[];
  vsComputer: boolean;
  gameOverInfo: { over: boolean; result?: string; winner?: 'w' | 'b' | null; endReason?: 'checkmate' | 'stalemate' | 'draw' | 'resign' | 'timeout' } | null;
  isOnlineMatch: boolean;
  /** Son kaydedilen oyunun id'si — oyun sonu ekranındaki 'İncele' bağlantısı için. */
  lastSavedGameId: string | null;
  matchInProgress: boolean;
  matchStartedAt: number | null;
  visibilityMask: boolean[][] | null;
  engineErrorMessage: string | null;
  /** Motorun en son beraberlik önerisini reddettiği hamle numarası (UI geri bildirimi için). */
  drawOfferRejectedAt: number | null;
  /** Kurulu oyun saati (yalnızca süreli oyunlarda non-null). */
  clock: ClockState | null;
  clockControl: TimeControl;
  /** Hamle öncesi saat anlık görüntüleri — undo chess.com semantiğiyle süre iadesi için. */
  clockSnapshots: ClockState[];

  startClassic: (humanColor: 'w' | 'b', vsComputer: boolean, timeControlId?: string) => void;
  /** Çevrimiçi (Beta): local iki oyuncu gibi ama yalnız kendi sırasında oynanabilir + hamleler yayınlanır. */
  startOnline: (myColor: 'w' | 'b', timeControlId?: string) => void;
  /** Hamle lokalde uygulandıktan sonra çağrılır (multiplayerStore kanca bağlar). */
  setMoveListener: (listener: ((from: string, to: string, promotion?: string) => void) | null) => void;
  /** Uzak hamle: doğrulama sonrası playMove ile uygulanır (sıra/validite orada denetlenir). */
  applyRemoteMove: (from: string, to: string, promotion?: string) => Promise<void>;
  startVariant: (variantId: string, humanColor: 'w' | 'b') => void;
  legalMovesForSquare: (square: Square) => Move[];
  playMove: (from: Square, to: Square, promotion?: string, remote?: boolean) => Promise<void>;
  performVariantAction: (type: string, payload: any) => { success: boolean; reason?: string };
  requestComputerMoveIfNeeded: () => Promise<void>;
  resignGame: () => Promise<void>;
  /** Online: rakip çıktı/teslim — kalan taraf kazanır (endGame sahibi üzerinden). */
  endOnlineGameAsWinner: (resultText: string) => Promise<void>;
  offerDraw: () => Promise<void>;
  /** Süreli oyunda saniyede bir çağrılır: bayrak kontrolü + canlı tick. */
  tickClock: () => Promise<void>;
  canUndo: () => boolean;
  undoLastMove: () => Promise<void>;
}

// --- Eşleşme yarışı (race) koruması -----------------------------------------
// Uzun süren bir motor analizi ("bilgisayar düşünüyor…") beklenirken kullanıcı
// yeni bir oyun başlatırsa, eski eşleşmenin gelen cevabı YENİ tahtayı
// bozmamalıdır. Her eşleşme bir token alır; asenkron işler tamamlanınca
// token hâlâ güncel mi diye bakılır, değilse sonuç çöpe gider.
let matchTokenCounter = 0;
/** Online maçta hamle yayın kanca'sı (multiplayerStore bağlar; null = offline). */
let moveListener: ((from: string, to: string, promotion?: string) => void) | null = null;
const tokenOf = new WeakMap<object, MatchToken>();
function tokenFor(state: object): MatchToken | undefined {
  return tokenOf.get(state);
}

/** Uzun süren asenkron iş (motor cevabı vb.) bu maçta hâlâ geçerli mi? */
function isMatchCurrent(game: ChessGame, myToken: MatchToken | undefined): boolean {
  return useGameStore.getState().game === game && tokenFor(game) === myToken;
}

function moveEndsGame(snap: ReturnType<ChessGame['snapshot']>): boolean {
  return snap.isCheckmate || snap.isStalemate || snap.isDraw;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: new ChessGame(),
  drawOfferRejectedAt: null,
  clock: null,
  clockControl: TIME_CONTROLS[0].control,
  clockSnapshots: [],

  // Not: DEV modunda window'a teşhir edilir (aşağıda) — e2e doğrulama ve
  // hata ayıklama için modül-örneği belirsizliğini ortadan kaldırır.
  orientation: 'w',
  lastMove: null,
  checkSquare: null,
  variant: null,
  variantState: null,
  activeVariantEvents: [],
  vsComputer: false,
  /** Çevrimiçi (Beta) maç bayrağı: sıra kilidi + unrated kayıt için. */
  isOnlineMatch: false,
  gameOverInfo: null,
  lastSavedGameId: null,
  matchInProgress: false,
  matchStartedAt: null,
  visibilityMask: null,
  engineErrorMessage: null,

  setMoveListener: (listener) => { moveListener = listener; },

  /** Uzak hamle: legalite + sıra playMove içinde denetlenir; sessizce yoksayılır. */
  applyRemoteMove: async (from, to, promotion) => {
    const s = get();
    if (!s.isOnlineMatch || !s.matchInProgress) return; // online olmayan maçta uzak hamle kabul edilmez
    await get().playMove(from as Square, to as Square, promotion, true);
  },

  startClassic: (humanColor, vsComputer, timeControlId) => {
    const game = new ChessGame();
    const control = TIME_CONTROLS.find((t) => t.id === timeControlId)?.control ?? TIME_CONTROLS[0].control;
    const timed = control.initialSeconds > 0;
    set({
      game, orientation: humanColor, variant: null, variantState: null, vsComputer,
      lastMove: null, gameOverInfo: null, lastSavedGameId: null, visibilityMask: null,
      matchInProgress: true, matchStartedAt: Date.now(),
      activeVariantEvents: [], engineErrorMessage: null, isOnlineMatch: false,
      clockControl: control,
      clock: timed ? initialClock(control, 'w') : null,
      clockSnapshots: [],
      drawOfferRejectedAt: null,
    });
    tokenOf.set(game, ++matchTokenCounter); // bekleyen eski motor cevaplarını geçersiz kılar
    playSound('gameStart');
    if (vsComputer) useEngineStore.getState().init();
    get().requestComputerMoveIfNeeded();
  },

  /** Çevrimiçi (Beta): standard başlangıç pozisyonu, local-iki-oyuncu kuralları + sıra kilidi. */
  startOnline: (myColor, timeControlId) => {
    const game = new ChessGame();
    const control = TIME_CONTROLS.find((t) => t.id === timeControlId)?.control ?? TIME_CONTROLS[0].control;
    const timed = control.initialSeconds > 0;
    set({
      game, orientation: myColor, variant: null, variantState: null, vsComputer: false,
      lastMove: null, gameOverInfo: null, lastSavedGameId: null, visibilityMask: null,
      matchInProgress: true, matchStartedAt: Date.now(),
      activeVariantEvents: [], engineErrorMessage: null, isOnlineMatch: true,
      clockControl: control,
      clock: timed ? initialClock(control, 'w') : null,
      clockSnapshots: [],
      drawOfferRejectedAt: null,
    });
    tokenOf.set(game, ++matchTokenCounter);
    playSound('gameStart');
  },

  startVariant: (variantId, humanColor) => {
    const rule = VARIANT_REGISTRY[variantId];
    if (!rule || rule.status !== 'implemented') {
      console.error(`Varyant "${variantId}" henüz uygulanmadı.`);
      return;
    }
    const game = new ChessGame();
    const variantState = rule.initialize(game);
    const mask = rule.getVisibilityMask ? rule.getVisibilityMask(variantState, humanColor) : null;
    set({
      game, variant: rule, variantState, orientation: humanColor, vsComputer: true,
      lastMove: null, gameOverInfo: null, lastSavedGameId: null, visibilityMask: mask,
      matchInProgress: true, matchStartedAt: Date.now(),
      activeVariantEvents: [], engineErrorMessage: null,
    });
    tokenOf.set(game, ++matchTokenCounter);
    playSound('gameStart');
    useEngineStore.getState().init();
    get().requestComputerMoveIfNeeded();
  },

  legalMovesForSquare: (square) => {
    const { game, variant, variantState } = get();
    const moves = game.legalMoves(square);
    if (!variant?.onBeforeMove || !variantState) return moves;
    return moves.filter((m) => variant.onBeforeMove!(variantState, game, m.from as Square, m.to as Square).allowed);
  },

  playMove: async (from, to, promotion, remote = false) => {
    const { game, variant, variantState } = get();
    const myToken = tokenFor(game);
    if (variant?.onBeforeMove && variantState) {
      const guard = variant.onBeforeMove(variantState, game, from, to);
      if (!guard.allowed) return;
    }
    const mv = game.move({ from, to, promotion });
    if (!mv) return;

    // Online maç sıra kilidi: herkes yalnızca KENDİ rengiyle oynar. applyRemoteMove
    // uzak hamleyi işaretler (remote=true): uzak tarafın reni orientation'ın tersi olmalı;
    // kendi rengine gelen uzak hamle (echo/yaşlı mesaj) geri alınır ve yoksayılır.
    if (get().isOnlineMatch && remote && mv.color === get().orientation) { game.raw.undo(); return; }

    // Saat: hamleyi oynayanın süresinden geçen süre düşer, increment eklenir,
    // sıra rakibe geçer. Hamle öncesi anlık görüntü saklanır (undo iadesi).
    // Ardından bayrak kontrolü — düşen taraf hemen kaybeder.
    if (get().clock) {
      const [updated, snapshot] = applyMoveToClock(get().clock!, get().clockControl, mv.color);
      set({ clock: updated, clockSnapshots: [...get().clockSnapshots, snapshot] });
      await checkFlagFall();
      if (!get().matchInProgress) return; // bayrak düştü, zincir durur
    }

    let events: VariantEvent[] = [];
    if (variant?.onAfterMove && variantState) events = variant.onAfterMove(variantState, game);

    const snap = game.snapshot();
    const mask = variant?.getVisibilityMask && variantState ? variant.getVisibilityMask(variantState, get().orientation) : get().visibilityMask;

    // UNO Chess (bonusMoveFor) ve Treasure Chess (extraTurnFor) sandığı: bazı
    // varyantlar hamleyi oynayan tarafa GERÇEK ekstra hamle verebilir. chess.js
    // sırayı rakibe çevirdiği için, hamle oyunu bitirmiyorsa active color'ı
    // forceActiveColor ile tekrar hamle sahibine çeviriyoruz.
    const bonusState = variantState;
    const bonusMoveFor = bonusState?.customData?.['bonusMoveFor'] ?? bonusState?.customData?.['extraTurnFor'];
    const variantGrantsBonus =
      typeof bonusMoveFor === 'string' &&
      bonusMoveFor === (snap.turn === 'w' ? 'b' : 'w') && // hamleyi oynayan taraf
      !moveEndsGame(snap);
    if (variantGrantsBonus && bonusState) {
      // Bayrağı tüket: aksi halde ekstra hamleler sonsuza dek tekrar eder.
      // (UNO kendi bayrağını onAfterMove içinde yönetir; generic okuma yalnızca
      // Treasure gibi yönetilmeyen varyantlar için devreye girer.)
      delete bonusState.customData['bonusMoveFor'];
      delete bonusState.customData['extraTurnFor'];
      game.forceActiveColor(bonusMoveFor as 'w' | 'b');
    }

    set({
      game, lastMove: { from, to },
      checkSquare: snap.isCheck ? findKingSquare(game, snap.turn) : null,
      activeVariantEvents: events, visibilityMask: mask,
      ...(variantGrantsBonus && bonusState ? { variantState: { ...bonusState } } : {}),
    });

    if (snap.isCheckmate) { playSound('checkmate'); triggerHaptic('heavy'); }
    else if (mv.captured) { playSound('capture'); triggerHaptic('medium'); }
    else if (snap.isCheck) { playSound('check'); triggerHaptic('medium'); }
    else { playSound('move'); triggerHaptic('light'); }

    // Online maçta lokal (kendi sırasında oynanan) hamleyi peer'a yayınla.
    // Uzak hamlede moveListener tekrar yayın yapmaz: applyRemoteMove, kendi
    // kancasını geçici olarak kapatar bu satıra tek-ulaş sağlar.
    if (get().isOnlineMatch && moveListener && mv.color === get().orientation) {
      moveListener(from, to, promotion);
    }

    if (moveEndsGame(snap)) {
      // lichess benzeri bitiş sesi: mat zaten 'checkmate' tonu çaldı; diğer
      // bitişlerde (pat/berabere/teslim dışı draw) 'gameEnd' kapanış tonu.
      if (!snap.isCheckmate) playSound('gameEnd');
      await persistFinishedGame(get());
      set({
        gameOverInfo: {
          over: true,
          // Detaylı ekran bilgisi PlayScreen'de chess.com düzeninde kurulur.
          result: snap.isCheckmate ? 'checkmate' : snap.isStalemate ? 'stalemate' : 'draw',
          winner: snap.isCheckmate ? (snap.turn === 'w' ? 'b' : 'w') : null,
          endReason: snap.isCheckmate ? 'checkmate' : snap.isStalemate ? 'stalemate' : 'draw',
        },
        matchInProgress: false,
      });
      return;
    }

    // Ekstra hamle verildiğinde sıra hamleyi oynananda kalır.
    // requestComputerMoveIfNeeded sıra insanda ise no-op'tur, yapay zekadaysa
    // (Treasure sandığı yapay zekâya denk gelirse) zinciri devam ettirir.
    await get().requestComputerMoveIfNeeded();
  },

  performVariantAction: (type, payload) => {
    const { game, variant, variantState, orientation } = get();
    if (!variant?.applyCustomAction || !variantState) {
      return { success: false, reason: 'Bu varyant özel eylem desteklemiyor.' };
    }
    const actingColor = game.raw.turn();
    const result = variant.applyCustomAction(variantState, game, { type, payload }, actingColor);
    if (result.success) {
      const mask = variant.getVisibilityMask ? variant.getVisibilityMask(variantState, orientation) : get().visibilityMask;
      set({ activeVariantEvents: result.events, visibilityMask: mask, variantState: { ...variantState } });
      playSound('move');
    }
    return { success: result.success, reason: result.reason };
  },

  requestComputerMoveIfNeeded: async () => {
    const { game, orientation, vsComputer, variant, variantState } = get();
    if (!vsComputer) return;
    if (game.raw.turn() === orientation) return;

    const myToken = tokenFor(game);
    let engineStore = useEngineStore.getState();
    try {
      if (variant) {
        const aiColor = game.raw.turn();
        if (variant.decideAIPreMoveAction && variant.applyCustomAction && variantState) {
          const action = variant.decideAIPreMoveAction(variantState, game, aiColor);
          if (action) {
            const actionResult = variant.applyCustomAction(variantState, game, action, aiColor);
            if (actionResult.success) {
              const mask = variant.getVisibilityMask ? variant.getVisibilityMask(variantState, orientation) : get().visibilityMask;
              set({ activeVariantEvents: actionResult.events, visibilityMask: mask, variantState: { ...variantState } });
            }
          }
        }
        const legal = game.legalMoves().filter((m) =>
          !variant.onBeforeMove || (variantState && variant.onBeforeMove(variantState, game, m.from as Square, m.to as Square).allowed)
        );
        if (!legal.length) return;
        if (!variantState) return;

        // Varyant rakibi: Stockfish önerisi varyant kurallarına göre filtrelenir
        // (VariantAIAdapter); motor yoksa/uymazsa materyal-farkında greedy seçim.
        const adapter = new VariantAIAdapter(engineStore.engine);
        const pick = await adapter.pickMove(game, variantState, (f, t) =>
          !variant.onBeforeMove || (variantState ? variant.onBeforeMove(variantState, game, f as Square, t as Square).allowed : true)
        );
        if (!pick) return;
        if (!isMatchCurrent(game, myToken)) return; // bu sırada maç değişti/tesslim edildi
        await get().playMove(pick.from as Square, pick.to as Square, pick.promotion);
      } else {
        if (engineStore.status === 'LOADING' || engineStore.status === 'ERROR') {
          set({ engineErrorMessage: null });
          await engineStore.init();
          engineStore = useEngineStore.getState();
        }
        if (engineStore.status === 'LOADING' || engineStore.status === 'ERROR') {
          set({ engineErrorMessage: engineStore.errorMessage ?? 'Satranç motoru başlatılamadı.' });
          return;
        }
        set({ engineErrorMessage: null });
        const result = await engineStore.requestBestMove(game.fen());
        if (!result.bestMove) return;
        if (!isMatchCurrent(game, myToken)) return; // bu sırada maç değişti/tesslim edildi
        const from = result.bestMove.slice(0, 2) as Square;
        const to = result.bestMove.slice(2, 4) as Square;
        const promotion = result.bestMove.slice(4) || undefined;
        await get().playMove(from, to, promotion);
      }
    } catch (e) {
      if (!isMatchCurrent(game, myToken)) return; // eski maçın hatası yeni maça sızmaz
      console.error('Bilgisayar hamlesi alınamadı:', e);
      set({ engineErrorMessage: (e as Error).message ?? 'Bilgisayar hamlesi alınamadı.' });
    }
  },

  resignGame: async () => {
    const { game, matchInProgress, orientation } = get();
    if (!matchInProgress) return;
    await endGame({
      endReason: 'resign',
      resultText: 'Teslim oldunuz',
      winner: orientation === 'w' ? 'b' : 'w',
      forcedResult: 'loss', // teslim, mat ile biten kayıpla aynı puanlanır
    });
  },

  endOnlineGameAsWinner: async (resultText) => {
    const { matchInProgress, orientation } = get();
    if (!matchInProgress) return;
    await endGame({
      endReason: 'resign',
      resultText,
      winner: orientation,
      forcedResult: 'win',
    });
  },

  /**
   * Beraberlik önerisi (chess.com davranışı). Motor kabulü basit ve dürüst
   * kuralla: öneren taraf objective olarak ÜSTÜNDEYSE motor reddeder
   * (kabul etseydi kandırılmış olurdu); üstün değilse kabul eder. Yerel
   * oyunda iki oyuncu da kabul eder.
   */
  offerDraw: async () => {
    const { game, matchInProgress, vsComputer, orientation, variant } = get();
    if (!matchInProgress || variant) return;
    const snap = game.snapshot();
    if (snap.isCheckmate || snap.isStalemate || snap.isDraw) return; // zaten bitti/bitior
    if (!vsComputer) {
      await endGame({ endReason: 'draw', resultText: 'Karşılıklı anlaşma ile beraberlik', winner: null, forcedResult: 'draw' });
      return;
    }
    // Üstünlük ölçüsü: TEK materyal yardımcısından.
    const mat = countMaterial(game.board());
    const myMaterial = orientation === 'w' ? mat.white : mat.black;
    const oppMaterial = orientation === 'w' ? mat.black : mat.white;
    if (myMaterial > oppMaterial + 1) {
      // Öneren üstün: motor reddeder, kısa geri bildirim.
      set({ drawOfferRejectedAt: snap.moveNumber });
      playSound('gameEnd');
      return;
    }
    await endGame({ endReason: 'draw', resultText: 'Motor beraberlik önerisini kabul etti', winner: null, forcedResult: 'draw' });
  },

  /** Saniyelik tick: süreli maçta bayrak düştü mü? Düştüyse oyunu kapat. */
  tickClock: async () => {
    await checkFlagFall();
  },

  canUndo: () => {
    const { game, vsComputer, orientation, matchInProgress, variant } = get();
    if (!matchInProgress) return false;
    if (variant) return false; // varyant tahtası put/remove ile değişir; güvenli geri alma yok
    if (!vsComputer) return game.raw.history().length >= 2;
    // Bilgisayara karşı: sıra oyuncudaysa son iki hamle (bilgisayar + oyuncu) geri alınır.
    return game.raw.turn() === orientation && game.raw.history().length >= 2;
  },

  undoLastMove: async () => {
    if (!get().canUndo()) return;
    const { game, clockSnapshots } = get();
    tokenOf.set(game, ++matchTokenCounter); // bekleyen motor cevabını iptal et
    game.raw.undo();
    game.raw.undo();
    const snap = game.snapshot();
    // chess.com semantiği: geri alınan hamlelerin süresi iade edilir.
    const clock = restoreClockFromSnapshots(get().clock, clockSnapshots.slice(-1));
    set({
      game,
      lastMove: lastMoveFromHistory(game),
      checkSquare: snap.isCheck ? findKingSquare(game, snap.turn) : null,
      engineErrorMessage: null,
      ...(clock ? { clock, clockSnapshots: clockSnapshots.slice(0, -1) } : {}),
    });
  },
}));

// E2e test ve hata ayıklama köprüsü: modül-örneği belirsizliğine (çift HMR
// importu) takılmadan her zaman CANONICAL store'a erişim verir.
if (typeof window !== 'undefined') {
  (window as any).__gameStore = useGameStore;
}

function lastMoveFromHistory(game: ChessGame): { from: string; to: string } | null {
  const history = game.raw.history({ verbose: true });
  const last = history[history.length - 1];
  return last ? { from: last.from, to: last.to } : null;
}

function findKingSquare(game: ChessGame, color: 'w' | 'b'): string | null {
  const board = game.board();
  for (const row of board) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square;
  return null;
}

/**
 * Oyun sonu kaydının TEK sahibi: puan güncellemesi, geçmişe kayıt,
 * lastSavedGameId, başarım ve günlük görev değerlendirmesi hepsi burada.
 * forcedResult, tahtadan okunamayan bitişler içindir (teslim = 'loss').
 */
/**
 * Oyun bitişinin TEK sahibi: overlay kurar, kapanış sesi çalar,
 * persistFinishedGame ile kaydeder (puan, geçmiş, başarım, görev).
 * Dört bitiş yolu (mat, teslim, beraberlik, bayrak) buraya iner.
 */
let endGameInFlight = false;
async function endGame(opts: {
  endReason: 'checkmate' | 'stalemate' | 'draw' | 'resign' | 'timeout';
  resultText: string;
  winner: 'w' | 'b' | null;
  forcedResult: 'win' | 'loss' | 'draw';
}): Promise<void> {
  if (endGameInFlight) return; // çift tetikleme: iki tick / tick+hamle yarışı
  endGameInFlight = true;
  try {
    const { game } = useGameStore.getState();
    tokenOf.set(game, ++matchTokenCounter); // havada kalan motor cevabını iptal et
    useGameStore.setState({
      gameOverInfo: { over: true, result: opts.resultText, winner: opts.winner, endReason: opts.endReason },
      matchInProgress: false,
      engineErrorMessage: null,
    });
    playSound('gameEnd');
    await persistFinishedGame(useGameStore.getState(), opts.forcedResult);
  } finally {
    endGameInFlight = false;
  }
}

/**
 * Bayrak kontrolü: süreli maçta bir tarafın süresi bittiyse oyunu kapat.
 * Kazanan kuralı: bayrakta olanın RAKİBİ kral dışı taş varsa 'win' (süre
 * kazanımı), yalnızca kral varsa beraberlik (FIDE).
 */
async function checkFlagFall() {
  const s = useGameStore.getState();
  if (!s.matchInProgress || !s.clock) return;
  const flagged = flaggedColor(s.clock);
  if (!flagged) return;
  const winner = timeoutWinner(flagged, s.game.board());
  await endGame({
    endReason: winner === 'draw' ? 'draw' : 'timeout',
    resultText: winner === 'draw' ? 'Süre bitti — beraberlik' : 'Süre bitti',
    winner: winner === 'draw' ? null : (flagged === 'w' ? 'b' : 'w'),
    forcedResult: winner === 'draw' ? 'draw' : (flagged === s.orientation ? 'loss' : 'win'),
  });
}

// Süreli maçlarda saniyelik bayrak-tick. Maç yokken interval no-op'tur.
if (typeof window !== 'undefined') {
  setInterval(() => {
    const s = useGameStore.getState();
    if (s.matchInProgress && s.clock) void useGameStore.getState().tickClock();
  }, 1000);
}

 async function persistFinishedGame(state: GameState, forcedResult?: 'win' | 'loss' | 'draw') {
  const snap = state.game.snapshot();
  const result: 'win' | 'loss' | 'draw' = forcedResult ?? (snap.isDraw || snap.isStalemate ? 'draw'
    : snap.isCheckmate ? (snap.turn !== state.orientation ? 'win' : 'loss') : 'draw');

  const mode = state.isOnlineMatch ? 'online' : state.variant?.id ?? (state.vsComputer ? 'vs-computer' : 'classic');
  // Rating kararı (tutarlı, iki tarafta da): online maçlar Beta'da UNRATED —
  // rakip Elo'su bilinmediğinden adil bir Elo değişimi hesaplanamaz.
  const isRated = mode === 'classic' || mode === 'vs-computer';

  let ratingBefore = 0, ratingAfter = 0;
  if (isRated) {
    const profile = await getProfile();
    ratingBefore = profile.rating;
    const engineLevel = useEngineStore.getState().level;
    ratingAfter = computeNewRating(ratingBefore, levelToElo(engineLevel), result);
    await updateProfile({ rating: ratingAfter });
  }

  const durationSeconds = state.matchStartedAt ? Math.round((Date.now() - state.matchStartedAt) / 1000) : 0;

  const saved = await saveGame({
    date: Date.now(), mode,
    opponent: state.isOnlineMatch ? 'Çevrimiçi Rakip' : state.vsComputer ? `Stockfish (Lv. ${useEngineStore.getState().level})` : 'Yerel Oyuncu',
    userColor: state.orientation, result, pgn: snap.pgn, finalFen: snap.fen,
    moveCount: state.game.raw.history().length, durationSeconds, ratingBefore, ratingAfter,
    timeControlId: state.clock ? TIME_CONTROLS.find((t) => t.control === state.clockControl)?.id ?? 'timed' : 'unlimited',
  });
  useGameStore.setState({ lastSavedGameId: saved.id });

  const newly = await evaluateAndPersistAchievements();
  if (newly.length) useAchievementToastStore.getState().push(newly);

  try {
    await useDailyQuestStore.getState().refreshAndNotify();
  } catch (e) { console.error('Görev değerlendirmesi başarısız:', e); }
}
