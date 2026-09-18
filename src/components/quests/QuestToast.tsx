import { useEffect } from 'react';
import { useQuestToastStore } from '../../state/questToastStore';

export function QuestToast() {
const { queue, shift } = useQuestToastStore();
const current = queue[0];

useEffect(() => {
if (!current) return;
const t = setTimeout(shift, 3500);
return () => clearTimeout(t);
}, [current, shift]);

if (!current) return null;
return (
<div className="quest-toast" role="status">
<span className="quest-toast__icon">✅</span>
<div><strong>Görev Tamamlandı</strong><p>{current.description}</p></div>
</div>
);
}
