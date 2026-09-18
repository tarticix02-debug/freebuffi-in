import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';

describe('ChessGame çekirdek kuralları', () => {
it('beyaz her zaman ilk hamleyi yapar', () => {
const g = new ChessGame();
expect(g.snapshot().turn).toBe('w');
});

it('kısa rok geçerli', () => {
const g = new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
const mv = g.move({ from: 'e1', to: 'g1' });
expect(mv?.san).toBe('O-O');
});

it('en passant çalışır', () => {
const g = new ChessGame();
g.move({ from: 'e2', to: 'e4' });
g.move({ from: 'a7', to: 'a6' });
g.move({ from: 'e4', to: 'e5' });
g.move({ from: 'd7', to: 'd5' });
const mv = g.move({ from: 'e5', to: 'd6' });
expect(mv?.flags).toContain('e');
});

it("şah mat doğru tespit edilir (fool's mate)", () => {
const g = new ChessGame();
g.move({ from: 'f2', to: 'f3' });
g.move({ from: 'e7', to: 'e5' });
g.move({ from: 'g2', to: 'g4' });
g.move({ from: 'd8', to: 'h4' });
expect(g.snapshot().isCheckmate).toBe(true);
});

it('üç tekrar beraberlik tespit edilir', () => {
const g = new ChessGame();
for (let i = 0; i < 2; i++) {
g.move({ from: 'g1', to: 'f3' }); g.move({ from: 'g8', to: 'f6' });
g.move({ from: 'f3', to: 'g1' }); g.move({ from: 'f6', to: 'g8' });
}
expect(g.snapshot().isThreefold).toBe(true);
});
});
