import { describe, it, expect } from 'vitest';  
import { priorityScore, pickNextLine, type OpeningProgressRecord } from '../src/services/openingProgressService';  
import type { OpeningLine } from '../src/openings/types';  
  
const LINES: OpeningLine[] = [  
  { eco: 'C50', name: 'A', moves: ['e4'] },  
  { eco: 'C51', name: 'B', moves: ['d4'] },  
];  
  
function record(overrides: Partial<OpeningProgressRecord>): OpeningProgressRecord {  
  return { id: 'x', lineName: 'x', eco: 'x', timesTrained: 0, timesMistakeFree: 0, totalMistakes: 0, lastTrainedAt: 0, mistakePlies: {}, ...overrides };  
}  
  
describe('Öncelik puanlama', () => {  
  it('hiç çalışılmamış satır yüksek öncelik alır', () => {  
    const never = priorityScore(record({ timesTrained: 0 }));  
    const recentlyPerfect = priorityScore(record({ timesTrained: 5, lastTrainedAt: Date.now() }));  
    expect(never).toBeGreaterThan(recentlyPerfect);  
  });  
  
  it('çok hata yapılan satır yüksek öncelik alır', () => {  
    const highMistake = priorityScore(record({ timesTrained: 3, totalMistakes: 10, lastTrainedAt: Date.now() }));  
    const noMistake = priorityScore(record({ timesTrained: 3, totalMistakes: 0, lastTrainedAt: Date.now() }));  
    expect(highMistake).toBeGreaterThan(noMistake);  
  });  
});  
  
describe('pickNextLine', () => {  
  it('her zaman geçerli bir satır döner', () => {  
    const picked = pickNextLine(LINES, []);  
    expect(LINES.map((l) => l.name)).toContain(picked.name);  
  });  
});
