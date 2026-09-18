import { computeNewRating } from './ratingService';  
  
/**  
 * İlk denemede hatasız çözüm = tam galibiyet.  
 * Hata yapıp sonunda çözüldü = beraberlik (kısmi kredi).  
 * Çözülemedi/pes edildi = mağlubiyet.  
 */  
export function updatePuzzleRating(  
  currentPuzzleRating: number,  
  puzzleDifficultyRating: number,  
  solved: boolean,  
  mistakeCount: number  
): number {  
  const result: 'win' | 'loss' | 'draw' = !solved ? 'loss' : mistakeCount === 0 ? 'win' : 'draw';  
  return computeNewRating(currentPuzzleRating, puzzleDifficultyRating, result, 24);  
}
