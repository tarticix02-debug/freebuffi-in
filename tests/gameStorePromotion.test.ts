import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/state/gameStore';

describe('Terfi hamlesi tespiti (gameStore)', () => {
beforeEach(() => { useGameStore.getState().startClassic('w', false); });

it('son sıraya ulaşan piyon için 4 farklı terfi seçeneği döner', () => {
const store = useGameStore.getState();
store.game.loadFen('8/P6k/8/8/8/8/7K/8 w - - 0 1');
const moves = store.legalMovesForSquare('a7' as any);
expect(moves.length).toBeGreaterThan(0);
expect(moves.every((m) => Boolean(m.promotion))).toBe(true);
expect(new Set(moves.map((m) => m.promotion))).toEqual(new Set(['q', 'r', 'b', 'n']));
});

it('normal hamlede promotion alanı tanımsızdır', () => {
const store = useGameStore.getState();
const moves = store.legalMovesForSquare('e2' as any);
expect(moves.every((m) => !m.promotion)).toBe(true);
});
});
