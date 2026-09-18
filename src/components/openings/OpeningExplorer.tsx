import { useState } from 'react';
import { OPENING_TREE } from '../../openings/openingTree';
import type { OpeningNode } from '../../openings/types';
import { AnalysisBoard } from '../review/AnalysisBoard';

export function OpeningExplorer() {
const [current, setCurrent] = useState<OpeningNode>(OPENING_TREE);

const path: OpeningNode[] = [];
let walker: OpeningNode | null = current;
while (walker) { path.unshift(walker); walker = walker.parent; }

const children = Array.from(current.children.values());
const displayName = findDisplayName(current);

return (
<div className="opening-explorer">
<div className="opening-explorer__board"><AnalysisBoard fen={current.fen} /></div>
<div className="opening-explorer__info">
<h3>{displayName ?? 'Başlangıç Pozisyonu'}</h3>
<div className="opening-explorer__breadcrumb">
{path.map((n) => (
<button key={n.id} className="breadcrumb-btn" onClick={() => setCurrent(n)}>
{n.moveSan ?? 'Başlangıç'}
</button>
))}
</div>
<div className="opening-explorer__children">
{children.length === 0 && <p className="empty-state">Bu pozisyondan devam eden kayıtlı bir teori yok.</p>}
{children.map((child) => (
<button key={child.id} className="continuation-btn" onClick={() => setCurrent(child)}>
{child.moveSan}
{child.name && <span className="continuation-btn__name">{child.name}</span>}
</button>
))}
</div>
</div>
</div>
);
}

function findDisplayName(node: OpeningNode): string | null {
let n: OpeningNode | null = node;
while (n) { if (n.name) return `${n.name} (${n.eco})`; n = n.parent; }
return null;
}
