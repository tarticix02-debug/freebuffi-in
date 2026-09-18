import type { QuestInstance } from '../../quests/types';

export function QuestListItem({ quest }: { quest: QuestInstance }) {
const pct = Math.min(100, (quest.currentProgress / quest.target) * 100);
return (
<div className={`quest-item ${quest.completed ? 'quest-item--done' : ''}`}>
<div className="quest-item__row">
<span>{quest.completed ? '✅' : '◻'} {quest.description}</span>
<span className="quest-item__count">{quest.currentProgress}/{quest.target}</span>
</div>
<div className="achievement-progress"><div className="achievement-progress__bar" style={{ width: `${pct}%` }} /></div>
</div>
);
}
