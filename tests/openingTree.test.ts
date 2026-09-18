import { describe, it, expect } from 'vitest';  
import { OPENING_TREE, findNodeByMoves } from '../src/openings/openingTree';  
import { identifyOpening } from '../src/services/openingService';  
  
describe('Açılış ağacı bütünlüğü', () => {  
  it('İtalyan Açılışı doğru düğüme yerleşir', () => {  
    const node = findNodeByMoves(OPENING_TREE, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);  
    expect(node?.name).toBe('İtalyan Açılışı');  
    expect(node?.eco).toBe('C50');  
  });  
  
  it('ortak önek paylaşan satırlar aynı ara düğümü kullanır', () => {  
    const italianNode = findNodeByMoves(OPENING_TREE, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);  
    const giuocoNode = findNodeByMoves(OPENING_TREE, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);  
    expect(giuocoNode?.parent?.id).toBe(italianNode?.id);  
  });  
  
  it('bilinmeyen dizi için kök hâlâ mevcuttur ama devam düğümü yoktur', () => {  
    const node = findNodeByMoves(OPENING_TREE, ['a3', 'a6', 'a4']);  
    expect(node).toBeNull();  
  });  
});  
  
describe('identifyOpening (tree tabanlı)', () => {  
  it('tam eşleşen satırı doğru tanır', () => {  
    const result = identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);  
    expect(result.name).toBe('İtalyan Açılışı');  
    expect(result.matchedFullLine).toBe(true);  
  });  
  
  it('bilinmeyen ilk hamlede name null, matchedFullLine false döner', () => {  
    const result = identifyOpening(['a3', 'a6', 'a4']);  
    expect(result.name).toBeNull();  
    expect(result.matchedFullLine).toBe(false);  
  });  
  
  it('daha derin ama isimsiz devam hamlesi son bilinen ismi korur', () => {  
    // İtalyan'dan sonra teoride olmayan bir hamle: name yine İtalyan kalır ama matchedFullLine false olur  
    const result = identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'a5']);  
    expect(result.name).toBe('İtalyan Açılışı');  
    expect(result.matchedFullLine).toBe(false);  
  });  
});
