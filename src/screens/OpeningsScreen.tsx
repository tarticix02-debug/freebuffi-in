import { useEffect, useState } from 'react';
import { useOpeningTrainerStore } from '../state/openingTrainerStore';
import { OPENING_LINES } from '../data/openingBook';
import { TrainerBoard } from '../components/openings/TrainerBoard';
import { OpeningExplorer } from '../components/openings/OpeningExplorer';
import { Button } from '../components/common/Button';
import { getAllGames } from '../storage/gameHistoryStore';
import { computeOpeningPerformance, type OpeningPerformance } from '../services/openingStatsService';

type Tab = 'trainer' | 'explorer' | 'stats';

export function OpeningsScreen() {
const [tab, setTab] = useState<Tab>('trainer');
return (
<div className="openings-screen">
<div className="tab-bar">
<button className={tab === 'trainer' ? 'tab-active' : ''} onClick={() => setTab('trainer')}>Antrenman</button>
<button className={tab === 'explorer' ? 'tab-active' : ''} onClick={() => setTab('explorer')}>Keşfet</button>
<button className={tab === 'stats' ? 'tab-active' : ''} onClick={() => setTab('stats')}>İstatistiklerim</button>
</div>
{tab === 'trainer' && <TrainerTab />}
{tab === 'explorer' && <OpeningExplorer />}
{tab === 'stats' && <StatsTab />}
</div>
);
}

function TrainerTab() {
const { session, loading, selectedLineName, startSpecificLine, startRecommended, retry, exit } = useOpeningTrainerStore();
const [color, setColor] = useState<'w' | 'b'>('w');

if (!session) {
return (
<div className="trainer-setup">
<div className="color-pick">
<Button variant={color === 'w' ? 'primary' : 'secondary'} onClick={() => setColor('w')}>Beyaz</Button>
<Button variant={color === 'b' ? 'primary' : 'secondary'} onClick={() => setColor('b')}>Siyah</Button>
</div>
<Button onClick={() => startRecommended(color)} disabled={loading}>
{loading ? 'Seçiliyor…' : 'Önerilen Açılışla Başla'}
</Button>
<div className="opening-list">
{OPENING_LINES.map((l) => (
<Button key={l.name} variant="ghost" onClick={() => startSpecificLine(l.name, color)}>
{l.name} ({l.eco})
</Button>
))}
</div>
</div>
);
}

return (
<div className="trainer-active">
<h3>{selectedLineName}</h3>
<TrainerBoard />
{session.status === 'wrong_waiting_retry' && (
<div className="trainer-feedback trainer-feedback--wrong">
<p>Yanlış hamle. Doğru hamle: <strong>{session.lastMistakeExpectedSan}</strong></p>
<Button onClick={retry}>Tekrar Dene</Button>
</div>
)}
{session.status === 'completed' && (
<div className="trainer-feedback trainer-feedback--done">
<p>{session.mistakes.length === 0 ? 'Satır hatasız tamamlandı!' : `Satır tamamlandı — ${session.mistakes.length} hata yapıldı.`}</p>
<Button onClick={exit}>Başka Bir Açılış</Button>
</div>
)}
{session.status === 'in_progress' && (
<p className="trainer-hint">{session.chess.turn() === session.traineeColor ? 'Sıra sizde, doğru hamleyi bulun.' : 'Rakip oynuyor…'}</p>
)}
</div>
);
}

function StatsTab() {
const [perf, setPerf] = useState<OpeningPerformance[] | null>(null);
useEffect(() => { getAllGames().then((games) => setPerf(computeOpeningPerformance(games))); }, []);
if (!perf) return <div className="state-panel"><div className="spinner" /></div>;
if (perf.length === 0) return <div className="empty-state"><p>Henüz açılış istatistiği oluşturacak kadar oyun yok.</p></div>;
return (
<div className="opening-stats-list">
{perf.map((p) => (
<div key={`${p.eco}-${p.name}`} className="opening-stats-row">
<div><strong>{p.name}</strong> <span className="eco-tag">{p.eco}</span></div>
<div>{p.games} oyun · {p.winRate.toFixed(0)}% kazanma</div>
</div>
))}
</div>
);
}
