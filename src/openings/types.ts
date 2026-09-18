export interface OpeningLine {  
  eco: string;  
  name: string;  
  moves: string[]; // SAN, başlangıç pozisyonundan itibaren  
}  
  
export interface OpeningNode {  
  id: string;  
  moveSan: string | null;  
  eco: string | null;  
  name: string | null;  
  fen: string;  
  children: Map<string, OpeningNode>;  
  parent: OpeningNode | null;  
}
