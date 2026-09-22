import { useEffect, useRef, useState } from 'react';  
import { usePuzzleStore } from '../state/puzzleStore';  
import { PuzzleBoard } from '../components/puzzle/PuzzleBoard';  
import { Button } from '../components/common/Button';  
import { StatChip } from '../components/common/StatChip';  
import { computePuzzleStats } from '../services/puzzleStatsService';  
import { dbGetAll } from '../storage/db';  
import { generatePuzzlesFromOwnGames } from '../services/puzzleAutoGenService';  
import type { PuzzleAttemptRecord } from '../storage/puzzleAttemptTypes';  
  
const THEME_LABEL: Record<string, string> = {  
  mate: 'Mat', fork: 'Çatal', pin: 'Şiş', skewer: 'Şiş (Skewer)',  
  discoveredAttack: 'Keşif Saldırısı', doubleAttack: 'Çifte Saldırı',  
  sacrifice: 'Fedakarlık', zwischenzug: 'Ara Hamle', promotion: 'Terfi',  
  defensiveTactic: 'Savunma Taktiği', endgameTactic: 'Oyun Sonu Taktiği',  
};  
  
export function PuzzleScreen() {  
  const { loading, session, lastResult, puzzleRating, init, loadNext, giveUp } = usePuzzleStore();  
  const [stats, setStats] = useState<ReturnType<typeof computePuzzleStats> | null>(null);  
  const [generating, setGenerating] = useState<{ active: boolean; progress: string }>({ active: false, progress: '' });  
  const [genDone, setGenDone] = useState<string | null>(null);  
  const genCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });  
  
  useEffect(() => { init(); refreshStats(); }, [init]);
  // Her çözüm/başarısızlık denemesinden sonra istatistik çiplerini tazele.
  useEffect(() => { if (lastResult) refreshStats(); }, [lastResult]);  
  
  async function refreshStats() {  
    const attempts = await dbGetAll<PuzzleAttemptRecord>('puzzleAttempts');  
    setStats(computePuzzleStats(attempts));  
  }  
  
  async function handleGenerate() {  
    setGenDone(null);  
    setGenerating({ active: true, progress: 'Başlatılıyor…' });  
    genCancelRef.current = { cancelled: false };  
    const found = await generatePuzzlesFromOwnGames((p) =>  
      setGenerating({ active: true, progress: `${p.currentGame}/${p.totalGames} oyun analiz edildi, ${p.puzzlesFound} puzzle bulundu` })  
    );  
    setGenerating({ active: false, progress: '' });  
    await init();  
    await refreshStats();  
    setGenDone(found > 0 ? `${found} yeni puzzle oluşturuldu.` : 'Oyunlarınızda belirgin bir hata bulunamadı ya da işlenecek yeni oyun yok.');  
  }  
  
  if (loading) return <div className="state-panel"><div className="spinner" /><p>Puzzle yükleniyor…</p></div>;  
  
  if (!session) {  
    return (  
      <div className="empty-state">  
        <p>Şu anda gösterilecek puzzle yok.</p>  
        <Button onClick={handleGenerate} disabled={generating.active}>  
          {generating.active ? generating.progress : 'Kendi Oyunlarımdan Puzzle Üret'}  
        </Button>  
        {generating.active && <Button variant="secondary" onClick={() => { genCancelRef.current.cancelled = true; }}>İptal</Button>}
      </div>  
    );  
  }  
  
  return (  
    <div className="puzzle-screen">  
      <div className="puzzle-screen__header">  
        <StatChip label="Puzzle Rating" value={puzzleRating} />  
        {stats && stats.totalAttempts > 0 && (  
          <>  
            <StatChip label="Başarı Oranı" value={`${stats.successRate.toFixed(0)}%`} />  
            <StatChip label="Seri" value={stats.currentStreak} />  
          </>  
        )}  
      </div>  
  
      <div className="puzzle-screen__board"><PuzzleBoard /></div>  
  
      <div className="puzzle-screen__feedback">  
        {session.status === 'in_progress' && (  
          <>  
            <p>Doğru hamleyi bulun. {session.heroColor === 'w' ? 'Beyaz' : 'Siyah'} oynuyor.</p>  
            {session.lastAttemptWrong && (
              <p className="puzzle-feedback puzzle-feedback--wrong">Yanlış hamle, tekrar deneyin.</p>
            )}
            <Button variant="ghost" onClick={giveUp}>Pes Et</Button>  
          </>  
        )}  
        {session.status === 'solved' && (  
          <div className="puzzle-feedback puzzle-feedback--success">  
            <p>Doğru! {lastResult && `Rating: ${lastResult.ratingChange >= 0 ? '+' : ''}${lastResult.ratingChange}`}</p>  
            <Button onClick={loadNext}>Sıradaki Puzzle</Button>  
          </div>  
        )}  
        {session.status === 'failed' && (  
          <div className="puzzle-feedback puzzle-feedback--fail">  
            <p>Çözülemedi. {lastResult && `Rating: ${lastResult.ratingChange}`}</p>  
            <p className="puzzle-feedback__solution">Çözüm: {session.puzzle.solutionSanResolved.join(' ')}</p>  
            <Button onClick={loadNext}>Sıradaki Puzzle</Button>  
          </div>  
        )}  
      </div>  
  
      <div className="puzzle-screen__themes">  
        {session.puzzle.themes.map((t) => <span key={t} className="theme-badge">{THEME_LABEL[t] ?? t}</span>)}  
        <span className="theme-badge theme-badge--source">  
          {session.puzzle.source === 'generated' ? 'Kendi Oyunundan' : 'Örnek Puzzle'}  
        </span>  
      </div>  
  
      {generating.active && <Button variant="ghost" onClick={() => { genCancelRef.current.cancelled = true; }}>Üretimi İptal Et</Button>}  
      {!generating.active && (
        <Button variant="secondary" onClick={handleGenerate} disabled={generating.active}>  
          Kendi Oyunlarımdan Yeni Puzzle Üret  
        </Button>  
      )}  
      {generating.active && <p className="puzzle-feedback">Analiz sürüyor — İptal edebilirsiniz.</p>}
      {genDone && <p className="puzzle-feedback">{genDone}</p>}
    </div>  
  );  
}
