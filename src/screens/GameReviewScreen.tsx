import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameReviewStore } from '../state/gameReviewStore';
import { buildReviewJson } from '../services/gameReviewService';
import { useEngineStore } from '../state/engineStore';
import { getAllGames } from '../storage/gameHistoryStore';
import { AnalysisBoard } from '../components/review/AnalysisBoard';
import { EvalGraph } from '../components/review/EvalGraph';
import { EvalBar } from '../components/review/EvalBar';
import { MoveReviewRow } from '../components/review/MoveReviewRow';
import { MoveClassIcon, CLASS_LABELS, CLASS_COLORS, type MoveClassKey } from '../components/review/MoveClassIcon';
import { buildAnnotatedPgn } from '../services/pgnExportService';
import { nextKeyMoment } from '../services/reviewNavigationService';

export function GameReviewScreen() {
  const { gameId } = useParams();
  const { status, progress, result, error, selectedPly, fenMode, start, startFromUserInput, selectPly, stepForward, stepBack, jumpKeyMoment, cancel, reset } = useGameReviewStore();
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    let active = true;
    // Game Review kendi Stockfish worker'ını açar; aynı anda canlı bir
    // "Bilgisayara Karşı" oyunu açıksa iki worker CPU paylaşır. Bu yüzden
    // review ekranına girerken canlı oyun motoru durdurulur.
    useEngineStore.getState().reset();
    (async () => {
      const games = await getAllGames();
      const record = games.find((g) => g.id === gameId);
      if (record && active) start(record.pgn);
      else if (active) setShowImport(true); // kayıt yoksa içe aktarma paneli aç
    })();
    return () => { active = false; cancel(); };
  }, [gameId]);

  if (status === 'idle' && showImport) {
    return (
      <div className="review-screen">
        <h2>Oyun İnceleme</h2>
        <ImportPanel onImport={(raw) => { setShowImport(false); return startFromUserInput(raw); }} />
      </div>
    );
  }
  if (status === 'idle' || status === 'analyzing') {
    return (
      <div className="state-panel">
        <div className="spinner" />
        <p>Oyun analiz ediliyor… %{progress}</p>
        <button onClick={cancel}>İptal Et</button>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="state-panel state-panel--error">
        <p>Analiz başarısız: {error}</p>
        <ImportPanel onImport={startFromUserInput} />
        <button onClick={() => { reset(); setShowImport(true); }}>Yeni İnceleme</button>
      </div>
    );
  }
  if (status === 'cancelled') return <div className="state-panel"><p>Analiz iptal edildi.</p></div>;

  // FEN inceleme modu: tek pozisyon + motorun en iyi hamlesi.
  if (fenMode) {
    return (
      <div className="review-screen">
        <h2>Pozisyon İncelemesi</h2>
        <div className="review-screen__board-area">
          <EvalBar cpWhite={fenMode.evaluationCp} mateWhite={fenMode.mate} />
          <AnalysisBoard fen={fenMode.fen} highlightFrom={fenMode.bestUci?.slice(0, 2)} highlightTo={fenMode.bestUci?.slice(2, 4)} />
        </div>
        <div className="review-screen__summary">
          <p className="fen-best-line">
            <strong>Motor önerisi:</strong> {fenMode.bestUci ?? '—'}
            {fenMode.mate !== null && ` (Mat ${Math.abs(fenMode.mate)} hamlede)`}
            {fenMode.mate === null && fenMode.evaluationCp !== null && ` (${(fenMode.evaluationCp / 100).toFixed(2)})`}
          </p>
          <p className="fen-mode-hint">Vurgulanan kareler motorun önerdiği hamledir.</p>
        </div>
        <ImportPanel onImport={startFromUserInput} />
      </div>
    );
  }

  if (!result) return <div className="state-panel"><p>Analiz iptal edildi.</p></div>;

  const currentFen = selectedPly === -1 ? result.moves[0]?.fenBefore ?? '' : result.moves[selectedPly].fenAfter;
  const currentMove = selectedPly >= 0 ? result.moves[selectedPly] : null;
  const currentCp = result.evalHistoryWhiteCp[selectedPly + 1] ?? 0;

  return (
    <div className="review-screen">
      <div className="review-screen__header">
        <h2>{result.openingName ?? 'Bilinmeyen Açılış'} {result.openingEco && `(${result.openingEco})`}
          <span className="beta-badge" title="Oyun incelemesi geliştirme aşamasında — sonuçlar yaklaşıktır">BETA</span>
        </h2>
        <div className="review-screen__export">
          <button className="btn btn--secondary" onClick={() => downloadPgn(result)}>PGN İndir</button>
          <button className="btn btn--secondary" onClick={() => downloadReviewJson(result)}>JSON İndir</button>
          <CopyFenButton fen={currentFen} />
          <button className="btn btn--secondary" onClick={() => { reset(); setShowImport(true); }}>Yeni PGN/FEN İncele</button>
        </div>
      </div>

      <div className="review-screen__board-area">
        <EvalBar cpWhite={currentCp} mateWhite={currentMove?.evalAfterMate ?? null} />
        <AnalysisBoard
          fen={currentFen}
          highlightFrom={currentMove?.playedUci.slice(0, 2)}
          highlightTo={currentMove?.playedUci.slice(2, 4)}
          bestFrom={currentMove?.bestUci?.slice(0, 2)}
          bestTo={currentMove?.bestUci?.slice(2, 4)}
          badgeMove={currentMove}
        />
      </div>

      <ReviewNavBar
        totalPlies={result.moves.length}
        selectedPly={selectedPly}
        hasPrevKey={nextKeyMoment(result, selectedPly, -1) !== null}
        hasNextKey={nextKeyMoment(result, selectedPly, 1) !== null}
        onFirst={() => selectPly(-1)}
        onPrevKey={() => jumpKeyMoment(-1)}
        onPrev={() => stepBack()}
        onNext={() => stepForward()}
        onNextKey={() => jumpKeyMoment(1)}
        onLast={() => selectPly(result.moves.length - 1)}
      />

      <div className="review-screen__summary">
        <AccuracyCards result={result} />
        <EvalGraph evalHistoryWhiteCp={result.evalHistoryWhiteCp} selectedPly={selectedPly} onSelect={selectPly} />
      </div>

      {currentMove && <MoveDetailCard move={currentMove} />}

      <div className="review-screen__move-list">
        {result.moves.map((m, i) => (
          <MoveReviewRow key={m.ply} move={m} selected={i === selectedPly} onClick={() => selectPly(i)} />
        ))}
      </div>

      {showImport && <ImportPanel onImport={async (raw) => { setShowImport(false); await startFromUserInput(raw); }} />}
    </div>
  );
}function downloadPgn(result: NonNullable<ReturnType<typeof useGameReviewStore.getState>['result']>) {
  const pgn = buildAnnotatedPgn(result);
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ultimate-chess-inceleme.pgn';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Bileşen 5: chess.com-şemalı JSON raporu .json dosyası olarak indirir. */
function downloadReviewJson(result: NonNullable<ReturnType<typeof useGameReviewStore.getState>['result']>) {
  const blob = new Blob([JSON.stringify(buildReviewJson(result), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ultimate-chess-inceleme.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** FEN kopyalama butonu: geçerli pozisyonu panoya kopyalar. */
function CopyFenButton({ fen }: { fen: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(fen);
    } catch {
      // Clipboard API yoksa (http/güvensiz bağlam) eski yöntem.
      const ta = document.createElement('textarea');
      ta.value = fen;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return <button className="btn btn--secondary" onClick={copy}>{copied ? 'Kopyalandı ✓' : 'FEN Kopyala'}</button>;
}

/**
 * Hamle gezinme çubuğu — chess.com tarzı 4 ok yan yana:
 * dıştakiler çift ok (önemli hamlelere atlama: brilliant/great/miss/mistake/blunder),
 * içtekiler tek ok (bir hamle ileri/geri). Klavye ok tuşları da çalışır.
 */
function ReviewNavBar(props: {
  totalPlies: number;
  selectedPly: number;
  hasPrevKey: boolean;
  hasNextKey: boolean;
  onFirst: () => void;
  onPrevKey: () => void;
  onPrev: () => void;
  onNext: () => void;
  onNextKey: () => void;
  onLast: () => void;
}) {
  const { totalPlies, selectedPly, hasPrevKey, hasNextKey, onFirst, onPrevKey, onPrev, onNext, onNextKey, onLast } = props;
  const [autoPlaying, setAutoPlaying] = useState(false);
  const atStart = selectedPly === -1;
  const atEnd = selectedPly >= totalPlies - 1;

  // "Hamle işlerletme": otomatik oynatma, son hamleye kadar ~900ms arayla ilerler.
  useEffect(() => {
    if (!autoPlaying) return;
    if (atEnd) { setAutoPlaying(false); return; }
    const t = setTimeout(onNext, 900);
    return () => clearTimeout(t);
  }, [autoPlaying, atEnd, selectedPly, onNext]);

  // Klavye: ←/→ bir hamle, Shift+←/→ önemli hamle, Home/End başlangıç/son.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); e.shiftKey ? onPrevKey() : onPrev(); break;
        case 'ArrowRight': e.preventDefault(); e.shiftKey ? onNextKey() : onNext(); break;
        case 'Home': e.preventDefault(); onFirst(); break;
        case 'End': e.preventDefault(); onLast(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onPrevKey, onNextKey, onFirst, onLast]);

  return (
    <div className="review-navbar">
      <div className="review-navbar__arrows">
        <button className="review-navbar__btn" title="Başlangıç (Home)" onClick={onFirst} disabled={atStart}>
          <NavArrowIcon dir="left" double />
        </button>
        <button className="review-navbar__btn" title="Önemli hamleye geri (Shift+←)" onClick={onPrevKey} disabled={!hasPrevKey || atStart}>
          <NavArrowIcon dir="left" double />
        </button>
        <button className="review-navbar__btn" title="Bir hamle geri (←)" onClick={onPrev} disabled={atStart}>
          <NavArrowIcon dir="left" />
        </button>
        <span className="review-navbar__position">{selectedPly + 1} / {totalPlies}</span>
        <button className="review-navbar__btn" title="Bir hamle ileri (→)" onClick={onNext} disabled={atEnd}>
          <NavArrowIcon dir="right" />
        </button>
        <button className="review-navbar__btn" title="Önemli hamleye ilerle (Shift+→)" onClick={onNextKey} disabled={!hasNextKey || atEnd}>
          <NavArrowIcon dir="right" double />
        </button>
        <button className="review-navbar__btn" title="Son hamle (End)" onClick={onLast} disabled={atEnd}>
          <NavArrowIcon dir="right" double />
        </button>
        <button
          className={`review-navbar__btn review-navbar__btn--play ${autoPlaying ? 'review-navbar__btn--active' : ''}`}
          title={autoPlaying ? 'Otomatik oynatmayı durdur' : 'Hamleleri otomatik oynat'}
          onClick={() => setAutoPlaying((v) => !v)}
          disabled={atEnd && !autoPlaying}
        >
          {autoPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  );
}

function NavArrowIcon({ dir, double }: { dir: 'left' | 'right'; double?: boolean }) {
  // Taban yol SOLA bakar; sağa bakan butonlar için aynala.
  const flip = dir === 'right';
  return (
    <svg width="20" height="16" viewBox="0 0 26 16" aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M3 8l6-6v4h7v4H9v4z" fill="currentColor" />
      {double && <path d="M11 8l6-6v4h7v4h-7v4z" fill="currentColor" opacity="0.9" />}
    </svg>
  );
}

function PlayIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor" /></svg>;
}
function PauseIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><rect x="2.5" y="1.5" width="3.4" height="11" rx="1" fill="currentColor" /><rect x="8.1" y="1.5" width="3.4" height="11" rx="1" fill="currentColor" /></svg>;
}

/** Beyaz/Siyah doğruluk + sınıf sayımı (chess.com game report tarzı). */
function AccuracyCards({ result }: { result: NonNullable<ReturnType<typeof useGameReviewStore.getState>['result']> }) {
  const rowFor = (side: 'w' | 'b') => {
    const counts = side === 'w' ? result.whiteClassCounts : result.blackClassCounts;
    const accuracy = side === 'w' ? result.whiteAccuracy : result.blackAccuracy;
    const key: MoveClassKey[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
    return (
      <div className={`accuracy-card accuracy-card--${side === 'w' ? 'white' : 'black'}`}>
        <div className="accuracy-card__header">
          <span className="accuracy-card__side">{side === 'w' ? 'Beyaz' : 'Siyah'}</span>
          <span className="accuracy-card__value">{accuracy.toFixed(1)}<small>% doğruluk</small></span>
        </div>
        <div className="accuracy-card__classes">
          {key.map((k) => (
            <span key={k} className="accuracy-card__class" title={CLASS_LABELS[k]}>
              <MoveClassIcon kind={k} size={16} />
              <em>{counts[k] ?? 0}</em>
            </span>
          ))}
        </div>
      </div>
    );
  };
  return <div className="accuracy-cards">{rowFor('w')}{rowFor('b')}</div>;
}

function MoveDetailCard({ move }: { move: NonNullable<ReturnType<typeof useGameReviewStore.getState>['result']>['moves'][number] }) {
  const kind = move.classification as MoveClassKey;
  // Örnek bloktaki Beyaz-perspektifli kazanma şansı (win%): mover değerinden çevrilir.
  const whiteWinBefore = move.side === 'w' ? move.moverWinPercentBefore : 100 - move.moverWinPercentBefore;
  const whiteWinAfter = move.side === 'w' ? move.moverWinPercentAfter : 100 - move.moverWinPercentAfter;
  const centipawnLoss = move.evalBeforeWhiteCp !== null && move.evalAfterWhiteCp !== null
    ? Math.round(move.side === 'w' ? move.evalBeforeWhiteCp - move.evalAfterWhiteCp : move.evalAfterWhiteCp - move.evalBeforeWhiteCp)
    : null;
  const fmtEval = (cp: number | null) => cp === null ? '?' : `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;
  return (
    <div className={`review-screen__move-detail review-screen__move-detail--${move.classification}`}>
      <div className="move-detail__title">
        <MoveClassIcon kind={kind} size={28} />
        <strong>{move.moveNumber ?? Math.floor(move.ply / 2) + 1}{move.side === 'w' ? '.' : '...'} {move.san}</strong>
        <span className="move-detail__label" style={{ color: CLASS_COLORS[kind] }}>{CLASS_LABELS[kind]}</span>
      </div>
      <p>
        Oynanan: {move.playedUci}
        {move.bestUci && move.bestUci !== move.playedUci && (
          <> — <strong>En iyisi:</strong> {move.bestUci}</>
        )}
      </p>
      <div className="move-detail__metrics">
        <span title="Hamle öncesi → sonrası motor değerlendirmesi (Beyaz perspektifi)">Değerlendirme: {fmtEval(move.evalBeforeWhiteCp)} → {fmtEval(move.evalAfterWhiteCp)}</span>
        <span title="Beyazın kazanma olasılığı (sigmoid dönüşümü)">Kazanma şansı: {whiteWinBefore.toFixed(1)}% → {whiteWinAfter.toFixed(1)}%</span>
        <span title="Sentipawn kaybı">Cp kaybı: {centipawnLoss ?? '—'}</span>
        <span title="Bu hamledeki doğruluk">Hamle doğruluğu: {move.accuracy.toFixed(1)}%</span>
      </div>
      {move.comment && <p className="move-detail__comment">{move.comment}</p>}
    </div>
  );
}

/** PGN veya FEN yapıştırarak inceleme paneli (dosya seçimi de destekler). */
export function ImportPanel({ onImport }: { onImport: (raw: string) => Promise<void> }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await onImport(raw);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    setError(null);
    setBusy(true);
    try {
      await onImport(text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-panel">
      <h3>PGN veya FEN ile İncele</h3>
      <textarea
        className="import-panel__textarea"
        placeholder={'Örnek PGN:\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...\n\nÖrnek FEN:\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
      />
      <div className="import-panel__actions">
        <button className="btn btn--primary" onClick={submit} disabled={busy || !raw.trim()}>
          {busy ? 'Analiz ediliyor…' : 'İncele'}
        </button>
        <label className="btn btn--secondary import-panel__file-label">
          .pgn Dosyası Aç
          <input type="file" accept=".pgn,.txt,text/plain" onChange={onFile} hidden />
        </label>
      </div>
      {error && <p className="import-panel__error">{error}</p>}
    </div>
  );
}
