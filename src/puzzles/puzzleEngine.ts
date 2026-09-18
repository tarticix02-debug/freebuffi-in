import { Chess, type Square } from 'chess.js';
import type { CompiledPuzzle } from './compilePuzzle';

export type PuzzleAttemptStatus = 'in_progress' | 'solved' | 'failed';

export interface PuzzleSessionState {
  puzzle: CompiledPuzzle;
  chess: Chess;
  solutionIndex: number;
  status: PuzzleAttemptStatus;
  mistakeCount: number;
  heroColor: 'w' | 'b';
  /** Son denenen hamlenin yanlış olup olmadığı — UI'ın anlık geri bildirim (mesaj/titreşim) vermesi için. */
  lastAttemptWrong: boolean;
}

export function createPuzzleSession(puzzle: CompiledPuzzle): PuzzleSessionState {
  const chess = new Chess(puzzle.fen);
  return { puzzle, chess, solutionIndex: 0, status: 'in_progress', mistakeCount: 0, heroColor: chess.turn(), lastAttemptWrong: false };
}

export function legalHeroTargets(session: PuzzleSessionState, square: Square): Square[] {
  if (session.status !== 'in_progress') return [];
  return session.chess.moves({ square, verbose: true }).map((m) => m.to as Square);
}

/**
 * Kullanıcının hamlesini gerçek tahtaya uygular, çözüm dizisiyle UCI bazında
 * karşılaştırır. Yanlışsa hamleyi geri alır (undo) ve mistakeCount artırır.
 * Doğruysa, sıradaki rakip hamlesini (script'ten) otomatik oynatır.
 */
export function submitMove(session: PuzzleSessionState, from: Square, to: Square, promotion?: string): PuzzleSessionState {
  if (session.status !== 'in_progress') return session;

  const expectedUci = session.puzzle.solutionUci[session.solutionIndex];
  const applied = session.chess.move({ from, to, promotion });
  if (!applied) return session;

  const appliedUci = `${applied.from}${applied.to}${applied.promotion ?? ''}`;

  if (appliedUci !== expectedUci) {
    session.chess.undo();
    session.mistakeCount += 1;
    return { ...session, lastAttemptWrong: true };
  }

  session.solutionIndex += 1;
  if (session.solutionIndex >= session.puzzle.solutionUci.length) {
    session.status = 'solved';
    return { ...session, lastAttemptWrong: false };
  }

  const opponentUci = session.puzzle.solutionUci[session.solutionIndex];
  const oppApplied = session.chess.move({
    from: opponentUci.slice(0, 2) as Square,
    to: opponentUci.slice(2, 4) as Square,
    promotion: opponentUci.slice(4) || undefined,
  });
  if (!oppApplied) {
    session.status = 'failed'; // veri hatası — sessizce geçilmez
    return { ...session, lastAttemptWrong: false };
  }

  session.solutionIndex += 1;
  if (session.solutionIndex >= session.puzzle.solutionUci.length) {
    session.status = 'solved';
  }
  return { ...session, lastAttemptWrong: false };
}
