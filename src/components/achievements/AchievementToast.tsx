import { useEffect } from 'react';
import { useAchievementToastStore } from '../../state/achievementToastStore';

export function AchievementToast() {
const { queue, shift } = useAchievementToastStore();
const current = queue[0];

useEffect(() => {
if (!current) return;
const t = setTimeout(shift, 3500);
return () => clearTimeout(t);
}, [current, shift]);

if (!current) return null;
return (
<div className="achievement-toast" role="status">
<span className="achievement-toast__icon">🏆</span>
<div><strong>Başarım Kazanıldı</strong><p>{current.name}</p></div>
</div>
);
}
