import { describe, it, expect } from 'vitest';
import { SEED_PUZZLES } from '../src/puzzles/seedPuzzles';
import { validatePuzzle, type PuzzleIssue } from './puzzleValidator';

describe('Puzzle havuzu bütünlüğü (tüm havuz taraması)', () => {
  const allIssues = SEED_PUZZLES.flatMap(validatePuzzle);
  const invalid = allIssues.filter((i: PuzzleIssue) => i.severity === 'invalid');

  it('havuzdaki her puzzle geçerli', () => {
    expect(invalid, `Bozuk puzzle'lar:\n${invalid.map((i) => `- ${i.puzzleId}: ${i.reason}`).join('\n')}`).toEqual([]);
  });

  it('havuz en az 10 puzzle içerir (havuz kalınlığı)', () => {
    expect(SEED_PUZZLES.length).toBeGreaterThanOrEqual(10);
  });

  it('havuzda kimlik tekrarı yok', () => {
    const ids = SEED_PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('temalar çeşitli (en az 5 farklı tema)', () => {
    const themes = new Set(SEED_PUZZLES.flatMap((p) => p.themes));
    expect(themes.size).toBeGreaterThanOrEqual(5);
  });
});
