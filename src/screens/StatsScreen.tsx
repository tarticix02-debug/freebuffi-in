import { useEffect, useState } from 'react';
import { getAllGames, type GameRecord } from '../storage/gameHistoryStore';
import { computeStats, type UserStats } from '../services/statsService';
import { computeOpeningPerformance, type OpeningPerformance } from '../services/openingStatsService';
import { StatChip } from '../components/common/StatChip';

const MODE_LABEL: Record<string, string> = {
  classic: 'Klasik', 'vs-computer': 'Bilgisayara Karşı',
  invisible: 'Invisible Chess', chaos: 'Chaos Chess', jackpot: 'Jackpot Chess',
  treasure: 'Treasure Chess', freeze: 'Freeze Chess', teleport: 'Teleport Chess', uno: 'UNO Chess',
};

export function StatsScreen() {
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [openings, setOpenings] = useState<OpeningPerformance[]>([]);

  useEffect(() => {
    getAllGames().then((g) => {
      setGames(g);
      setStats(computeStats(g));
      setOpenings(computeOpeningPerformance(g));
    });
  }, []);

  if (!games || !stats) return <div className="state-panel"><div className="spinner" /></div>;

  if (games.length === 0) {
    return <div className="empty-state"><p>İstatistik üretmek için henüz kaydedilmiş bir oyun yok.</p></div>;
  }

  return (
    <div className="stats-screen">
      <h1>İstatistikler</h1>

      <section>
        <div className="stat-chip-row">
          <StatChip label="Toplam Oyun" value={stats.totalGames} />
          <StatChip label="Kazanma Oranı" value={`${stats.winRate.toFixed(0)}%`} />
          <StatChip label="Beyaz Kazanma" value={`${stats.whiteWinRate.toFixed(0)}%`} />
          <StatChip label="Siyah Kazanma" value={`${stats.blackWinRate.toFixed(0)}%`} />
          <StatChip label="Güncel Seri" value={stats.currentWinStreak} />
          <StatChip label="En Uzun Seri" value={stats.longestWinStreak} />
          <StatChip label="Ort. Hamle" value={stats.avgMoveCount.toFixed(0)} />
          <StatChip label="Ort. Süre" value={`${Math.round(stats.avgDurationSeconds / 60)} dk`} />
        </div>
      </section>

      <section>
        <h2>Moda Göre</h2>
        {Object.entries(stats.byMode).map(([mode, m]) => (
          <div key={mode} className="mode-stats-row">
            <span>{MODE_LABEL[mode] ?? mode}</span>
            <span>{m.games} oyun · %{m.winRate.toFixed(0)} kazanma</span>
          </div>
        ))}
      </section>

      {openings.length > 0 && (
        <section>
          <h2>Açılışlara Göre</h2>
          {openings.slice(0, 8).map((p) => (
            <div key={`${p.eco}-${p.name}`} className="opening-stats-row">
              <span>{p.name} ({p.eco})</span>
              <span>{p.games} oyun · %{p.winRate.toFixed(0)} kazanma</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
