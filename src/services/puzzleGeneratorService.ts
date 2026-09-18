import type { GameReviewResult } from './gameReviewService';  
import type { PuzzleDefinition } from '../puzzles/types';  
  
/**  
 * Kullanıcının kendi oyunundaki gerçek hatalardan (blunder/mistake), gerçek  
 * Stockfish "best move" verisini kullanarak tek-hamlelik "cezalandırma"  
 * puzzle'ları üretir. Uydurma pozisyon veya hamle YOKTUR — her şey  
 * GameReview'ın zaten yaptığı gerçek analizden gelir.  
 */  
export function generatePuzzlesFromReview(review: GameReviewResult, gameId: string): PuzzleDefinition[] {  
  const puzzles: PuzzleDefinition[] = [];  
  
  for (let i = 0; i < review.moves.length - 1; i++) {  
    const blunderMove = review.moves[i];  
    if (blunderMove.classification !== 'blunder' && blunderMove.classification !== 'mistake') continue;  
  
    const punishMove = review.moves[i + 1];  
    if (!punishMove.bestUci) continue;  
    // Rakip zaten en iyi hamleyi oynadıysa "keşfedilecek" bir şey yok.  
    if (punishMove.bestUci === punishMove.playedUci) continue;  
  
    puzzles.push({  
      id: `gen-${gameId}-${i}`,  
      fen: punishMove.fenBefore, // == blunderMove.fenAfter  
      solutionUci: [punishMove.bestUci],  
      themes: blunderMove.winPercentLoss > 30 ? ['sacrifice'] : ['doubleAttack'],  
      rating: magnitudeToRating(blunderMove.winPercentLoss),  
      source: 'generated',  
      sourceGameId: gameId,  
    });  
  }  
  return puzzles;  
}  
  
/** Büyük hata = bulması nispeten kolay (düşük rating). Küçük ama kritik an = daha zor. */  
function magnitudeToRating(winPercentLoss: number): number {  
  return Math.round(2200 - Math.min(1000, winPercentLoss * 15));  
}
