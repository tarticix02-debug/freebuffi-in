import { getAllGames } from '../storage/gameHistoryStore';  
import { getSettings, updateSettings } from '../storage/settingsStore';  
import { analyzeGame } from './gameReviewService';  
import { generatePuzzlesFromReview } from './puzzleGeneratorService';  
import { saveGeneratedPuzzles } from '../storage/generatedPuzzleStore';  
  
export interface GenerationProgress { currentGame: number; totalGames: number; puzzlesFound: number; }  
  
/**  
 * Kullanıcı tarafından tetiklenen, gözlemlenebilir bir işlemdir.  
 * Arka planda otomatik/sessiz çalışmaz çünkü her oyun gerçek bir Stockfish  
 * analizi gerektirir (yavaş olabilir) — kullanıcı ne olduğunu görmeli.  
 *  
 * Sadece klasik/bilgisayara karşı oyunlar işlenir: varyant oyunlarında  
 * (jackpot, treasure vb.) tahtaya standart-dışı taş sayıları eklenebildiği  
 * için üretilecek puzzle'ların taktik kalitesi güvenilir olmaz.  
 */  
export async function generatePuzzlesFromOwnGames(  
  onProgress?: (p: GenerationProgress) => void  
): Promise<number> {  
  const [games, settings] = await Promise.all([getAllGames(), getSettings()]);  
  const processed = new Set(settings.puzzleGenProcessedGameIds ?? []);  
  const pending = games.filter(  
    (g) => !processed.has(g.id) && g.moveCount >= 6 && (g.mode === 'classic' || g.mode === 'vs-computer')  
  );  
  
  let totalFound = 0;  
  for (let i = 0; i < pending.length; i++) {  
    const game = pending[i];  
    try {  
      const review = await analyzeGame(game.pgn, { depth: 12 });  
      const puzzles = generatePuzzlesFromReview(review, game.id);  
      if (puzzles.length) {  
        await saveGeneratedPuzzles(puzzles);  
        totalFound += puzzles.length;  
      }  
    } catch (e) {  
      console.error(`Puzzle üretimi başarısız (oyun ${game.id}):`, e);  
    } finally {  
      processed.add(game.id);  
      onProgress?.({ currentGame: i + 1, totalGames: pending.length, puzzlesFound: totalFound });  
    }  
  }  
  await updateSettings({ puzzleGenProcessedGameIds: Array.from(processed) });  
  return totalFound;  
}
