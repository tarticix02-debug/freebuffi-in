import { PieceIcon } from './PieceIcon';
import type { Color } from 'chess.js';

const CHOICES: Array<'q' | 'r' | 'b' | 'n'> = ['q', 'r', 'b', 'n'];

export function PromotionPicker({
color, onSelect, onCancel,
}: { color: Color; onSelect: (p: 'q' | 'r' | 'b' | 'n') => void; onCancel: () => void }) {
return (
<div className="promotion-overlay" role="dialog" aria-label="Terfi seçimi" aria-modal="true">
<div className="promotion-picker">
<p>Terfi edilecek taşı seçin</p>
<div className="promotion-picker__choices">
{CHOICES.map((c) => (
<button key={c} onClick={() => onSelect(c)} aria-label={pieceLabel(c)}>
<PieceIcon type={c} color={color} size={48} />
</button>
))}
</div>
<button className="promotion-picker__cancel" onClick={onCancel}>İptal</button>
</div>
</div>
);
}

function pieceLabel(p: 'q' | 'r' | 'b' | 'n') {
return { q: 'Vezir', r: 'Kale', b: 'Fil', n: 'At' }[p];
}
