import type {ReactNode} from 'react';
export function StatChip({label,value}:{label:string;value:ReactNode}){return <div className="stat-chip"><span className="stat-chip__value">{value}</span><span className="stat-chip__label">{label}</span></div>}
