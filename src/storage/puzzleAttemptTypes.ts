export interface PuzzleAttemptRecord {  
  id: string;  
  puzzleId: string;  
  date: number;  
  solved: boolean;  
  mistakeCount: number;  
  ratingBefore: number;  
  ratingAfter: number;  
  themes: string[];  
}
