import { useEffect } from 'react';
import { useDailyQuestStore } from '../state/dailyQuestStore';
import { QuestListItem } from '../components/quests/QuestListItem';
import { StatChip } from '../components/common/StatChip';

export function QuestsScreen() {
const { quests, streak, loading, init } = useDailyQuestStore();
useEffect(() => { init(); }, [init]);

if (loading) return <div className="state-panel"><div className="spinner" /></div>;

return (
<div className="quests-screen">
<h1>Günlük Görevler</h1>
<StatChip label="Günlük Seri" value={streak} />
<div className="quest-list">
{quests.map((q) => <QuestListItem key={q.id} quest={q} />)}
</div>
<p className="quests-screen__note">Görevler her gün otomatik yenilenir ve gerçek oyun/puzzle/antrenman verilerinizden hesaplanır.</p>
</div>
);
}
