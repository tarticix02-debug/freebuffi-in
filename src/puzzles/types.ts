export type PuzzleTheme =  
  | 'mate' | 'fork' | 'pin' | 'skewer' | 'discoveredAttack'  
  | 'doubleAttack' | 'sacrifice' | 'zwischenzug' | 'promotion'  
  | 'defensiveTactic' | 'endgameTactic';  
  
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';  
  
export interface PuzzleDefinition {  
  id: string;  
  fen: string;  
  /** Elle hazırlanan (seed) puzzle'lar SAN kullanır. */  
  solutionSan?: string[];  
  /** Motor tarafından üretilen (generated) puzzle'lar UCI kullanır. */  
  solutionUci?: string[];  
  themes: PuzzleTheme[];  
  rating: number;  
  source: 'seed' | 'generated';  
  sourceGameId?: string;  
}  
  
export function ratingToDifficulty(rating: number): PuzzleDifficulty {  
  if (rating < 1000) return 'easy';  
  if (rating < 1400) return 'medium';  
  if (rating < 1800) return 'hard';  
  return 'expert';  
}
