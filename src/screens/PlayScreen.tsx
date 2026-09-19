import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { useGameStore } from '../state/gameStore';
import { useEngineStore } from '../state/engineStore';
import { VARIANT_REGISTRY } from '../variants/registry';
import { ENGINE_PRESETS, levelToElo } from '../engine/levels';
import { Board } from '../components/board/Board';
import { Button } from '../components/common/Button';
import { UnoHand } from '../components/variants/uno/UnoHand';
import { MoveClassIcon, CLASS_LABELS } from '../components/review/MoveClassIcon';
import { analyzeGame, type GameReviewResult } from '../services/gameReviewService';
import { pickKeyChips } from '../services/reviewKeyChips';
import { TIME_CONTROLS, formatClock, remainingMs, isTimed, type TimeControl } from '../services/clockService';

export function PlayScreen() {
  const { variantId } = useParams();
  const navigate = useNavigate();
  const { matchInProgress, gameOverInfo, vsComputer, variant, variantState, orientation, activeVariantEvents, engineErrorMessage, game, startClassic, startVariant, resignGame, offerDraw, canUndo, undoLastMove, drawOfferRejectedAt } = useGameStore();
  const engineStatus = useEngineStore((s) => s.status);
  const [pendingColor, setPendingColor] = useState<'w' | 'b'>('w');
  const [pendingOpponent, setPendingOpponent] = useState<'computer' | 'local'>('computer');
  const [pendingLevel, setPendingLevel] = useState<number>(8);
  const [pendingTimeControl, setPendingTimeControl] = useState<string>('unlimited');
  const [hintUci, setHintUci] = useState<{ from: string; to: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintCooldownUntil, setHintCooldownUntil] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [confirmResign, setConfirmResign] = useState(false);
  const [drawOfferPending, setDrawOfferPending] = useState(false);

  // Hamle listesi: her render'da history'den türetilir; otomatik kaydırma için ref.
  // NOT: Hook'lar erken return'den ÖNCE çağrılmalı (Rules of Hooks).
  const historyLen = useGameStore((s) => s.game.raw.history().length);
  const historySan = useGameStore((s) => s.game.raw.history());
  const clock = useGameStore((s) => s.clock);
  const clockControl = useGameStore((s) => s.clockControl);
  const moveListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { moveListRef.current?.scrollTo({ top: moveListRef.current.scrollHeight }); }, [historyLen]);

  // Canlı saat: süreli maçta 200ms'de bir yeniden çiz (bayrak zaten store tick'inde).
  useEffect(() => {
    if (!clock) return;
    const id = setInterval(() => setClockNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [clock]);

  // Hamle değişince ipucu gösterimi temizlenir (eski hamle için ok kalmasın).
  useEffect(() => { setHintUci(null); }, [historyLen]);

  const rule = variantId ? VARIANT_REGISTRY[variantId] : null;

  // İpucu: motorun en iyi hamlesini al, tahtada vurgula. Rate-limit: 10sn'de bir;
  // motor hâlâ yükleniyorsa zarifçe vazgeç (çift-init düzeltmesi sonrası
  // initInFlight sözünü paylaşır ama 113MB wasm'da ilk saniyeler makul bir bekleme).
  async function requestHint() {
    if (hintLoading || Date.now() < hintCooldownUntil) return;
    setHintLoading(true);
    try {
      const es = useEngineStore.getState();
      if (es.status === 'LOADING' || es.status === 'ERROR') {
        await Promise.race([es.init(), new Promise((r) => setTimeout(r, 4000))]);
      }
      const st = useEngineStore.getState();
      if (st.status === 'LOADING' || st.status === 'ERROR') return; // sessizce vazgeç
      const result = await st.requestBestMove(useGameStore.getState().game.fen());
      if (!result.bestMove) return;
      const current = useGameStore.getState();
      if (current.game.raw.turn() !== current.orientation) return; // sıra geçti
      const from = result.bestMove.slice(0, 2);
      const to = result.bestMove.slice(2, 4);
      const legal = current.game.legalMoves(from as Square);
      if (!legal.some((m) => m.to === to)) return; // motor sürprizi: gösterme
      setHintUci({ from, to });
      setHintCooldownUntil(Date.now() + 10_000);
    } catch { /* motor hatası: sessizce vazgeç */ }
    finally { setHintLoading(false); }
  }

  if (variantId && (!rule || rule.status !== 'implemented')) {
    return (
      <div className="state-panel">
        <p>Bu varyant henüz uygulanmadı.</p>
        <Button onClick={() => navigate('/variants')}>Varyantlara Dön</Button>
      </div>
    );
  }

  const activeMatchMismatch = matchInProgress && ((variantId && variant?.id !== variantId) || (!variantId && variant !== null));
  const matchOver = Boolean(gameOverInfo?.over);

  // Maç bittiğinde gameOverInfo gösterilmeli — bu yüzden setup paneline yalnızca
  // "bitmiş bir maç yokken" düşülür (overlay'a hiç ulaşılamıyordu).
  if ((!matchInProgress || activeMatchMismatch) && !matchOver) {
    return (
      <div className="setup-panel">
        {rule && (
          <div className="setup-panel__variant-info">
            <h2>{rule.name}</h2>
            <p>{rule.description}</p>
          </div>
        )}

        <div className="setup-panel__group">
          <h3>Renk</h3>
          <div className="setup-panel__choices">
            <Button variant={pendingColor === 'w' ? 'primary' : 'secondary'} onClick={() => setPendingColor('w')}>Beyaz</Button>
            <Button variant={pendingColor === 'b' ? 'primary' : 'secondary'} onClick={() => setPendingColor('b')}>Siyah</Button>
          </div>
        </div>

        {!variantId && (
          <>
            <div className="setup-panel__group">
              <h3>Rakip</h3>
              <div className="setup-panel__choices">
                <Button variant={pendingOpponent === 'computer' ? 'primary' : 'secondary'} onClick={() => setPendingOpponent('computer')}>Bilgisayar</Button>
                <Button variant={pendingOpponent === 'local' ? 'primary' : 'secondary'} onClick={() => setPendingOpponent('local')}>Yerel İki Oyuncu</Button>
              </div>
            </div>

            <div className="setup-panel__group">
              <h3>Süre</h3>
              <div className="setup-panel__choices setup-panel__choices--wrap">
                {TIME_CONTROLS.map((t) => (
                  <Button
                    key={t.id}
                    variant={pendingTimeControl === t.id ? 'primary' : 'secondary'}
                    onClick={() => setPendingTimeControl(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {pendingOpponent === 'computer' && (
              <div className="setup-panel__group">
                <h3>Zorluk</h3>
                <div className="setup-panel__choices setup-panel__choices--wrap">
                  {ENGINE_PRESETS.map((d) => (
                    <Button
                      key={d.id}
                      variant={pendingLevel === d.level ? 'primary' : 'secondary'}
                      title={`${d.description} (~${levelToElo(d.level)} Elo)`}
                      onClick={() => { setPendingLevel(d.level); useEngineStore.getState().setLevel(d.level); }}
                    >
                      {d.label}
                      <span className="difficulty-elo">~{levelToElo(d.level)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Button onClick={() => {
          if (variantId) startVariant(variantId, pendingColor);
          else startClassic(pendingColor, pendingOpponent === 'computer', pendingTimeControl);
        }}>
          Oyunu Başlat
        </Button>
      </div>
    );
  }

  const undoAvailable = canUndo();
  const history = historySan;
  const movePairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({ num: i / 2 + 1, white: history[i], black: history[i + 1] });
  }

  return (
    <div className="play-screen">
      {!matchOver && (
        <>
          <div className="play-screen__status">
            <span>{game.raw.turn() === 'w' ? 'Beyaz' : 'Siyah'} oynuyor</span>
            {variant && <span className="play-screen__variant-name">{variant.name}</span>}
            {vsComputer && game.raw.turn() !== orientation && !engineErrorMessage && (
              <span className="play-screen__thinking"><span className="spinner spinner--small" /> Bilgisayar düşünüyor…</span>
            )}
          </div>

          {clock && isTimed(clockControl) && (() => {
            const rem = remainingMs(clock, clockNow);
            const lowTime = rem.whiteMs < 30_000 || rem.blackMs < 30_000;
            return (
              <div className="clock-row" role="timer" aria-label="Kalan süre">
                <span className={`clock-chip ${clock.activeColor === 'w' ? 'clock-chip--active' : ''} ${lowTime && rem.whiteMs < 30_000 ? 'clock-chip--low' : ''}`}>♔ {formatClock(rem.whiteMs)}</span>
                <span className="clock-row__vs">{clockControl.initialSeconds}+{clockControl.incrementSeconds}</span>
                <span className={`clock-chip ${clock.activeColor === 'b' ? 'clock-chip--active' : ''} ${lowTime && rem.blackMs < 30_000 ? 'clock-chip--low' : ''}`}>♚ {formatClock(rem.blackMs)}</span>
              </div>
            );
          })()}

          <div className="play-screen__actions">
            <Button variant="secondary" disabled={!undoAvailable} onClick={() => { setConfirmResign(false); undoLastMove(); }}>
              ↩ Geri Al
            </Button>
            {confirmResign ? (
              <>
                <Button variant="danger" onClick={() => { setConfirmResign(false); resignGame(); }}>Evet, teslim ol</Button>
                <Button variant="secondary" onClick={() => setConfirmResign(false)}>Vazgeç</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmResign(true)}>🏳 Teslim Ol</Button>
            )}
            {drawOfferPending ? (
              <>
                <Button variant="primary" onClick={() => { setDrawOfferPending(false); offerDraw(); }}>½ Beraberlik öner</Button>
                <Button variant="secondary" onClick={() => setDrawOfferPending(false)}>Vazgeç</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setDrawOfferPending(true)}>½ Beraberlik</Button>
            )}
            {!variantId && !vsComputer && (
              <Button variant="secondary" onClick={() => {
                useGameStore.setState({ orientation: orientation === 'w' ? 'b' : 'w' });
              }}>⇅ Çevir</Button>
            )}
            {!variant && vsComputer && game.raw.turn() === orientation && (
              <Button
                variant="secondary"
                disabled={hintLoading || Date.now() < hintCooldownUntil}
                title="Motorun önerdiği en iyi hamleyi tahtada göster"
                onClick={() => { void requestHint(); }}
              >{hintLoading ? '💡 …' : '💡 İpucu'}</Button>
            )}
          </div>

          {hintUci && (
            <div className="hint-banner" role="status">
              <p className="draw-banner__msg">💡 Öneri: {hintUci.from} → {hintUci.to} (tahtada vurgulu)</p>
              <Button variant="ghost" onClick={() => setHintUci(null)}>Tamam</Button>
            </div>
          )}

          {drawOfferRejectedAt !== null && (
            <div className="draw-banner" role="status">
              <p className="draw-banner__msg">Motor beraberlik önerisini reddetti — üstün olduğun için devam ediyor.</p>
              <Button variant="ghost" onClick={() => useGameStore.setState({ drawOfferRejectedAt: null })}>Tamam</Button>
            </div>
          )}
        </>
      )}

      {engineErrorMessage && (
        <div className="engine-error-banner">
          <p>Satranç motoru çalışmadı: {engineErrorMessage}</p>
          <p className="engine-error-banner__hint">public/assets/engine/ klasöründeki stockfish.js ve stockfish.wasm dosyalarını kontrol edin.</p>
        </div>
      )}

      {engineStatus === 'LOADING' && vsComputer && !engineErrorMessage && game.raw.turn() !== orientation && (
        <p className="engine-loading-note">Motor ilk kez yükleniyor, birkaç saniye sürebilir…</p>
      )}

      <Board hintSquares={hintUci ? [hintUci.from, hintUci.to] : undefined} />

      {movePairs.length > 0 && (
        <div className="move-list-panel" ref={moveListRef} aria-label="Hamle listesi">
          <div className="move-list-panel__grid">
            {movePairs.map(({ num, white, black }) => (
              <MovePair key={num} num={num} white={white} black={black} latestIndex={history.length - 1} />
            ))}
          </div>
        </div>
      )}

      {variant?.id === 'uno' && <UnoHand color={orientation} />}

      {activeVariantEvents.length > 0 && (
        <div className="variant-events">
          {activeVariantEvents.map((e) => <p key={e.id} className="variant-event">{e.description}</p>)}
        </div>
      )}

      {gameOverInfo?.over && <GameOverOverlay
        info={gameOverInfo}
        vsComputer={vsComputer}
        humanColor={orientation}
        isVariant={Boolean(variantId)}
        gameId={useGameStore.getState().lastSavedGameId}
        onRematch={() => (variantId ? startVariant(variantId, orientation) : startClassic(orientation, vsComputer))}
        onHome={() => navigate('/')}
      />}
    </div>
  );
}

/** Oyun içi hamle listesi satırı: "1. e4 e5" biçiminde, son hamle vurgulu. */
function MovePair({ num, white, black, latestIndex }: { num: number; white?: string; black?: string; latestIndex: number }) {
  const wIdx = (num - 1) * 2;
  const bIdx = wIdx + 1;
  return (
    <>
      <span className="move-list-panel__num">{num}.</span>
      <span className={`move-list-panel__san ${wIdx === latestIndex ? 'move-list-panel__san--latest' : ''}`}>{white ?? ''}</span>
      <span className={`move-list-panel__san ${bIdx === latestIndex ? 'move-list-panel__san--latest' : ''}`}>{black ?? ''}</span>
    </>
  );
}

/** chess.com tarzı oyun sonu ekranı: büyük sonuç + neden + 3 kilit hamle göstergesi. */
function GameOverOverlay({ info, vsComputer, humanColor, isVariant, gameId, onRematch, onHome }: {
  info: NonNullable<ReturnType<typeof useGameStore.getState>['gameOverInfo']>;
  vsComputer: boolean;
  humanColor: 'w' | 'b';
  isVariant: boolean;
  gameId: string | null;
  onRematch: () => void;
  onHome: () => void;
}) {
  const navigate = useNavigate();
  const [keyMoves, setKeyMoves] = useState<GameReviewResult | null>(null);

  // Biten oyunun hızlı derinlik-8 analiziyle en önemli 3 hamle çıkarılır.
  useEffect(() => {
    let active = true;
    if (isVariant || !gameId) return;
    (async () => {
      try {
        const { getGameById } = await import('../storage/gameHistoryStore');
        const record = await getGameById(gameId);
        if (!record?.pgn || !active) return;
        const result = await analyzeGame(record.pgn, { depth: 8 });
        if (active) setKeyMoves(result);
      } catch { /* analiz başarısızsa göstergeler gizli kalır */ }
    })();
    return () => { active = false; };
  }, [gameId, isVariant]);

  // chess.com önceliği: brilliant > very good (great) > en ağır hata.
  // Türetmenin tek sahibi pickKeyChips — overlay ile regresyon testi aynı sözleşmeyi paylaşır.
  const picks = keyMoves ? pickKeyChips(keyMoves, humanColor) : [];

  const iWon = info.winner === humanColor;
  const isDraw = !info.winner;
  const reasonText = info.endReason === 'checkmate' ? 'Şah mat sonucu'
    : info.endReason === 'stalemate' ? 'Pat (beraberlik) sebebiyle'
    : info.endReason === 'resign' ? (iWon ? 'Rakibin çekilmesi üzerine' : 'Teslim olma üzerine')
    : info.endReason === 'timeout' ? (isDraw ? 'Süre bitti — rakipte yetersiz materyal' : 'Süre bitti')
    : 'Beraberlik sebebiyle';

  const title = isDraw ? 'Beraberlik' : iWon ? 'Zafer' : 'Yenilgi';
  const tone = isDraw ? 'draw' : iWon ? 'win' : 'loss';

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true">
      <div className="game-over-panel">
        <h2 className={`game-over-panel__title game-over-panel__title--${tone}`}>{title}</h2>
        <p className="game-over-panel__reason">
          {vsComputer && info.endReason === 'checkmate' && !iWon ? 'Şah mat sonucu — rakip kazandı' : reasonText}
        </p>

        {picks.length > 0 && (
          <div className="game-over-panel__summary">
            {picks.map(({ cls, n }) => (
              <div key={cls} className="game-over-panel__key" title={CLASS_LABELS[cls]}>
                <MoveClassIcon kind={cls} size={34} />
                <em>{n}</em>
                <span>{CLASS_LABELS[cls]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="game-over-panel__actions">
          <Button onClick={onRematch}>Tekrar Oyna</Button>
          {gameId && !isVariant && (
            <Button variant="secondary" onClick={() => navigate(`/review/${gameId}`)}>Oyunu İncele</Button>
          )}
          <Button variant="secondary" onClick={onHome}>Ana Sayfa</Button>
        </div>
      </div>
    </div>
  );
}
