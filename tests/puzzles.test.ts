import { describe, it, expect } from 'vitest';  
import { SEED_PUZZLES } from '../src/puzzles/seedPuzzles';  
import { compilePuzzle } from '../src/puzzles/compilePuzzle';  
import { PUZZLE_REGISTRY } from '../src/puzzles/registry';  
import { createPuzzleSession, submitMove } from '../src/puzzles/puzzleEngine';  
import { generatePuzzlesFromReview } from '../src/services/puzzleGeneratorService';  
import { updatePuzzleRating } from '../src/services/puzzleRatingService';  
import { pickNextPuzzle } from '../src/services/puzzleSelectionService';  
import type { GameReviewResult } from '../src/services/gameReviewService';  
  
describe('Seed puzzle veri bütünlüğü', () => {  
  it('tüm seed puzzle\'lar hatasız compile edilir', () => {  
    expect(PUZZLE_REGISTRY.length).toBe(SEED_PUZZLES.length);  
  });  
  
  it('mate temalı puzzle\'lar gerçekten mat ile bitiyor', () => {  
    const mateOnes = PUZZLE_REGISTRY.filter((p) => p.themes.includes('mate'));  
    expect(mateOnes.length).toBeGreaterThan(0);  
    mateOnes.forEach((p) => expect(p.isCheckmateAtEnd).toBe(true));  
  });  
  
  it('her puzzle en az bir çözüm hamlesine sahip', () => {  
    PUZZLE_REGISTRY.forEach((p) => expect(p.solutionUci.length).toBeGreaterThan(0));  
  });  
});  
  
describe('Puzzle çözme motoru', () => {  
  it('doğru hamle puzzle\'ı çözer', () => {  
    const puzzle = PUZZLE_REGISTRY.find((p) => p.id === 'seed-knight-fork')!;  
    let session = createPuzzleSession(puzzle);  
    session = submitMove(session, 'd5' as any, 'c7' as any);  
    expect(session.status).toBe('solved');  
  });  
  
  it('yanlış hamle mistake sayacını artırır ve pozisyonu geri alır', () => {  
    const puzzle = PUZZLE_REGISTRY.find((p) => p.id === 'seed-knight-fork')!;  
    let session = createPuzzleSession(puzzle);  
    const fenBefore = session.chess.fen();  
    session = submitMove(session, 'd5' as any, 'b4' as any); // yanlış hamle  
    expect(session.mistakeCount).toBe(1);  
    expect(session.status).toBe('in_progress');  
    expect(session.chess.fen()).toBe(fenBefore);  
  });  
  
  it('çok hamleli puzzle rakip hamlesini otomatik oynatır', () => {  
    const puzzle = PUZZLE_REGISTRY.find((p) => p.id === 'seed-skewer')!;  
    let session = createPuzzleSession(puzzle);  
    session = submitMove(session, 'b4' as any, 'c3' as any); // Bc3+  
    expect(session.status).toBe('in_progress'); // rakip Ke6 oynadı, sıra tekrar hero'da  
    session = submitMove(session, 'c3' as any, 'h8' as any); // Bxh8  
    expect(session.status).toBe('solved');  
  });  
});  
  
describe('Rating güncelleme', () => {  
  it('hatasız çözüm rating\'i artırır', () => {  
    expect(updatePuzzleRating(1200, 1200, true, 0)).toBeGreaterThan(1200);  
  });  
  it('çözülemezse rating düşer', () => {  
    expect(updatePuzzleRating(1200, 1200, false, 0)).toBeLessThan(1200);  
  });  
});  
  
describe('Otomatik puzzle üretimi (kendi oyunlarından)', () => {  
  it('blunder sonrası gerçek best move ile puzzle üretir', () => {  
    const fakeReview: GameReviewResult = {  
      moves: [  
        {          ply: 0, side: 'w', san: 'Bad', fenBefore: 'fen0', fenAfter: 'fen1', 
          playedUci: 'e2e4', bestUci: 'd2d4', evalBeforeWhiteCp: 0, evalAfterWhiteCp: -400, 
          evalAfterMate: null, winPercentLoss: 35, accuracy: 10, moverWinPercentBefore: 80, moverWinPercentAfter: 15, classification: 'blunder', isBookMove: false,   
        },  
        {          ply: 1, side: 'b', san: 'Punish', fenBefore: 'fen1', fenAfter: 'fen2', 
          playedUci: 'g8f6', bestUci: 'd8h4', evalBeforeWhiteCp: 0, evalAfterWhiteCp: -390, 
          evalAfterMate: null, winPercentLoss: 1, accuracy: 95, moverWinPercentBefore: 95, moverWinPercentAfter: 96, classification: 'good', isBookMove: false,   
        },  
      ],  
      evalHistoryWhiteCp: [20, -400, -390],
      whiteAccuracy: 10, blackAccuracy: 95, openingName: null, openingEco: null,
      whiteClassCounts: { blunder: 1 }, blackClassCounts: { good: 1 },
    };  
  
    const puzzles = generatePuzzlesFromReview(fakeReview, 'game-1');  
    expect(puzzles).toHaveLength(1);  
    expect(puzzles[0].fen).toBe('fen1');  
    expect(puzzles[0].solutionUci).toEqual(['d8h4']);  
  });  
  
  it('rakip zaten en iyisini oynadıysa puzzle üretmez', () => {  
    const fakeReview: GameReviewResult = {  
      moves: [        { ply: 0, side: 'w', san: 'Bad', fenBefore: 'f0', fenAfter: 'f1', playedUci: 'e2e4', bestUci: 'd2d4', evalBeforeWhiteCp: 0, evalAfterWhiteCp: -300, evalAfterMate: null, winPercentLoss: 30, accuracy: 20, moverWinPercentBefore: 82, moverWinPercentAfter: 20, classification: 'blunder', isBookMove: false }, 
        { ply: 1, side: 'b', san: 'Best', fenBefore: 'f1', fenAfter: 'f2', playedUci: 'd8h4', bestUci: 'd8h4', evalBeforeWhiteCp: 0, evalAfterWhiteCp: -290, evalAfterMate: null, winPercentLoss: 1, accuracy: 98, moverWinPercentBefore: 95, moverWinPercentAfter: 96, classification: 'best', isBookMove: false },   
      ],  
      evalHistoryWhiteCp: [0, -300, -290], whiteAccuracy: 20, blackAccuracy: 98, openingName: null, openingEco: null,
      whiteClassCounts: { blunder: 1 }, blackClassCounts: { best: 1 },
    };  
    expect(generatePuzzlesFromReview(fakeReview, 'game-2')).toHaveLength(0);  
  });  
});  
  
describe('Puzzle seçim mantığı', () => {  
  it('çözülmemiş puzzle\'ları öncelikli seçer', () => {  
    const pool = PUZZLE_REGISTRY;  
    const solved = new Set(pool.slice(0, pool.length - 1).map((p) => p.id));  
    const picked = pickNextPuzzle(1000, solved, pool);  
    expect(picked?.id).toBe(pool[pool.length - 1].id);  
  });  
});
