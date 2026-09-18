import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDailyQuestStore } from '../state/dailyQuestStore';
import { StatChip } from '../components/common/StatChip';
import { QuestListItem } from '../components/quests/QuestListItem';
import { Button } from '../components/common/Button';

export function HomeScreen() {
  const navigate = useNavigate();
  const { loading, profile, recentGames, stats, achievementsUnlocked, achievementsTotal } = useDashboardData();

  if (loading || !profile || !stats) {
    return <div className="state-panel"><div className="spinner" /></div>;
  }

  return (
    <div className="home-screen">
      <div className="home-header">
        <div className="profile-header__avatar">{profile.avatarInitial}</div>
        <div>
          <h1>Merhaba, {profile.username}</h1>
          <p>Rating: {profile.rating}</p>
        </div>
      </div>

      <section className="home-section">
        <div className="home-section__cta">
          <Button onClick={() => navigate('/play')}>Hızlı Oyun</Button>
          <Button variant="secondary" onClick={() => navigate('/variants')}>Varyantlar</Button>
          <Button variant="secondary" onClick={() => navigate('/puzzle')}>Günün Puzzle'ı</Button>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">İstatistikler</h2>
          <button className="link-btn" onClick={() => navigate('/stats')}>Tümü</button>
        </div>
        <div className="stat-chip-row">
          <StatChip label="Toplam Oyun" value={stats.totalGames} />
          <StatChip label="Kazanma Oranı" value={`${stats.winRate.toFixed(0)}%`} />
          <StatChip label="Güncel Seri" value={stats.currentWinStreak} />
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">Başarımlar</h2>
          <button className="link-btn" onClick={() => navigate('/profile')}>Tümü</button>
        </div>
        <StatChip label="Kilidi Açılan" value={`${achievementsUnlocked}/${achievementsTotal}`} />
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">Günlük Görevler</h2>
          <button className="link-btn" onClick={() => navigate('/quests')}>Tümü</button>
        </div>
        <DailyQuestPreview />
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Son Oyunlar</h2>
        {recentGames.length === 0 ? (
          <div className="empty-state"><p>Henüz kaydedilmiş bir oyun yok.</p></div>
        ) : (
          <div className="recent-games-list">
            {recentGames.map((game) => (
              <div key={game.id} className="recent-game-row">
                <div>
                  <strong>{game.mode === 'classic' ? 'Klasik' : game.mode === 'vs-computer' ? 'Bilgisayara Karşı' : game.mode}</strong>
                  <p>{game.opponent} · {game.result === 'win' ? 'Kazandı' : game.result === 'loss' ? 'Kaybetti' : 'Berabere'}</p>
                </div>
                <Link to={`/review/${game.id}`}>İncele</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DailyQuestPreview() {
  const { quests, streak, loading, init } = useDailyQuestStore();
  useEffect(() => { init(); }, [init]);

  if (loading) return <div className="empty-state"><p>Yükleniyor…</p></div>;

  const completedCount = quests.filter((q) => q.completed).length;
  return (
    <div>
      <div className="stat-chip-row" style={{ marginBottom: 'var(--space-3)' }}>
        <StatChip label="Tamamlanan" value={`${completedCount}/${quests.length}`} />
        <StatChip label="Seri" value={streak} />
      </div>
      {quests.slice(0, 2).map((q) => <QuestListItem key={q.id} quest={q} />)}
    </div>
  );
}
