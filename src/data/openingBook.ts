import type { OpeningLine } from '../openings/types';  
  
/**  
 * DÜRÜSTLÜK NOTU: Bu tam bir ECO veritabanı değildir. ~34 satırlık,  
 * her biri chess.js ile runtime'da doğrulanan (bkz. openingTree.ts),  
 * yaygın bilinen açılışlardan oluşan bir başlangıç kitabıdır.  
 * Genişletmek için buraya yeni { eco, name, moves } eklemek yeterlidir.  
 */  
export const OPENING_LINES: OpeningLine[] = [  
  { eco: 'C20', name: 'Açık Oyun (Kral Piyonu)', moves: ['e4', 'e5'] },  
  { eco: 'C50', name: 'İtalyan Açılışı', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },  
  { eco: 'C53', name: 'Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },  
  { eco: 'C55', name: 'İki At Savunması', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },  
  { eco: 'C60', name: 'Ruy Lopez (İspanyol Açılışı)', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },  
  { eco: 'C70', name: 'Ruy Lopez, Morphy Savunması', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'] },  
  { eco: 'C65', name: 'Ruy Lopez, Berlin Savunması', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },  
  { eco: 'C42', name: 'Petrov Savunması', moves: ['e4', 'e5', 'Nf3', 'Nf6'] },  
  { eco: 'C44', name: 'İskoç Oyunu', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },  
  { eco: 'C25', name: 'Viyana Oyunu', moves: ['e4', 'e5', 'Nc3'] },  
  { eco: 'C30', name: 'Kral Gambiti', moves: ['e4', 'e5', 'f4'] },  
  { eco: 'B20', name: 'Sicilya Savunması', moves: ['e4', 'c5'] },  
  { eco: 'B90', name: 'Sicilya Najdorf', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },  
  { eco: 'B70', name: 'Sicilya Ejderha', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },  
  { eco: 'C00', name: 'Fransız Savunması', moves: ['e4', 'e6'] },  
  { eco: 'C02', name: 'Fransız İleri Varyant', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },  
  { eco: 'B10', name: 'Caro-Kann Savunması', moves: ['e4', 'c6'] },  
  { eco: 'B18', name: 'Caro-Kann Klasik Varyant', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },  
  { eco: 'B01', name: 'Skandinav Savunması', moves: ['e4', 'd5'] },  
  { eco: 'B02', name: 'Alekhine Savunması', moves: ['e4', 'Nf6'] },  
  { eco: 'B07', name: 'Pirc Savunması', moves: ['e4', 'd6'] },  
  { eco: 'B06', name: 'Modern Savunma', moves: ['e4', 'g6'] },  
  { eco: 'D00', name: 'Vezir Piyonu Oyunu', moves: ['d4', 'd5'] },  
  { eco: 'D06', name: 'Vezir Gambiti', moves: ['d4', 'd5', 'c4'] },  
  { eco: 'D30', name: 'Vezir Gambiti Reddi', moves: ['d4', 'd5', 'c4', 'e6'] },  
  { eco: 'D20', name: 'Vezir Gambiti Kabulü', moves: ['d4', 'd5', 'c4', 'dxc4'] },  
  { eco: 'D10', name: 'Slav Savunması', moves: ['d4', 'd5', 'c4', 'c6'] },  
  { eco: 'E60', name: 'Kral Hindi Savunması', moves: ['d4', 'Nf6', 'c4', 'g6'] },  
  { eco: 'E20', name: 'Nimzo-Hint Savunması', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },  
  { eco: 'D80', name: 'Grünfeld Savunması', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },  
  { eco: 'D02', name: 'Londra Sistemi', moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'] },  
  { eco: 'A10', name: 'İngiliz Açılışı', moves: ['c4'] },  
  { eco: 'A30', name: 'İngiliz, Simetrik Varyant', moves: ['c4', 'c5'] },  
  { eco: 'A80', name: 'Hollanda Savunması', moves: ['d4', 'f5'] },  
];
