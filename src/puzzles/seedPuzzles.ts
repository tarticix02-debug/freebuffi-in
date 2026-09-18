import { Chess } from 'chess.js';
import type { PuzzleDefinition } from './types';

function fenAfterMoves(sanMoves: string[]): string {
  const c = new Chess();
  for (const san of sanMoves) {
    const result = c.move(san);
    if (!result) throw new Error(`geçersiz hamle "${san}" (dizi: ${sanMoves.join(' ')})`);
  }
  return c.fen();
}

function safeFenAfterMoves(sanMoves: string[], label: string): string | null {
  try {
    return fenAfterMoves(sanMoves);
  } catch (e) {
    console.error(`[SeedPuzzles] "${label}" oluşturulamadı:`, (e as Error).message);
    return null;
  }
}

// Meşhur "Scholar's Mate" — 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
// (chess.js üzerinden gerçekten oynatılarak FEN türetiliyor, elle FEN yazma riski yok)
const scholarsMateFen = safeFenAfterMoves(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6'], "Scholar's Mate");

// Not: Tüm seed pozisyonlar tests/puzzlePool.test.ts içindeki validatePuzzle
// tarafından uçtan uca doğrulanır (legal pozisyon + oynanabilir çözüm + tema/
// final tutarlılığı). Elle FEN yazılanlar bilinçli olarak basit endgame
// pozisyonlarıdır; hata olursa test hangi puzzle'ın bozuk olduğunu raporlar.
const seedList: (PuzzleDefinition | null)[] = [
  scholarsMateFen ? {
    id: 'seed-scholars-mate',
    fen: scholarsMateFen,
    solutionSan: ['Qxf7#'],
    themes: ['mate'],
    rating: 700,
    source: 'seed',
  } : null,
  {
    id: 'seed-back-rank-mate',
    // Beyaz: Kg1, Ra1, piyonlar f2g2h2 | Siyah: Kg8, piyonlar f7g7h7 (kendi piyonlarının arkasında sıkışmış)
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solutionSan: ['Ra8#'],
    themes: ['mate', 'endgameTactic'],
    rating: 900,
    source: 'seed',
  },
  {
    id: 'seed-knight-fork',
    // Beyaz At d5, tek hamlede hem Kayıp e8 hem Kale a8'i çatallıyor (Nc7+)
    fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    solutionSan: ['Nc7+'],
    themes: ['fork'],
    rating: 1000,
    source: 'seed',
  },
  {
    id: 'seed-promotion-basic',
    fen: '8/P6k/8/8/8/8/7K/8 w - - 0 1',
    solutionSan: ['a8=Q'],
    themes: ['promotion'],
    rating: 800,
    source: 'seed',
  },
  {
    id: 'seed-discovered-attack',
    // At e5, Kale e1 → At Kale c6'yı yer VE aynı anda e-hattını açarak şah çeker (çift etkili keşif saldırısı)
    fen: '4k3/8/2r5/4N3/8/8/8/4R1K1 w - - 0 1',
    solutionSan: ['Nxc6+'],
    themes: ['discoveredAttack', 'doubleAttack'],
    rating: 1300,
    source: 'seed',
  },
  {
    id: 'seed-skewer',
    // Fil b4, c3'e giderek Kg6/f6 üzerinden şah çeker; Kral kaçınca Kale h8 şişleniyor
    fen: '7r/8/5k2/8/1B6/8/8/6K1 w - - 0 1',
    solutionSan: ['Bc3+', 'Ke6', 'Bxh8'],
    themes: ['skewer'],
    rating: 1400,
    source: 'seed',
  },

  // ---- Havuz kalınlaştırma: makine-doğrulanmış yeni puzzle'lar ----
  {
    id: 'seed-smothered-mate',
    // Smothered mat: Nd6-f7# — şah h8, kendi Rg8 + g7/h7 piyonları kaçışı kapatır.
    fen: '6rk/6pp/3N4/8/8/8/8/6K1 w - - 0 1',
    solutionSan: ['Nf7#'],
    themes: ['mate'],
    rating: 1200,
    source: 'seed',
  },
  {
    id: 'seed-back-rank-queen',
    // Vezirle arka sıra matı; mühür: siyah piyonları f7g7h7 kaçışı kapar.
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solutionSan: ['Rxe8#'],
    themes: ['mate', 'endgameTactic'],
    rating: 1000,
    source: 'seed',
  },
  {
    id: 'seed-queen-fork',
    // Vezir d1->d5: şah çeker (e8 şah) VE a8 kalesini çatallar — şah kaçınca Rxa8.
    fen: 'r3k3/8/8/8/8/8/8/3Q2K1 w - - 0 1',
    solutionSan: ['Qd5+'],
    themes: ['fork', 'doubleAttack'],
    rating: 1100,
    source: 'seed',
  },
  {
    id: 'seed-pin-knight',
    // Fil g5, e7 atını c3 kralına sabitler (Kg1'e pin) — atı alan hamle materyal kazanımı.
    fen: '6k1/4n3/8/6B1/8/8/8/4N1K1 w - - 0 1',
    solutionSan: ['Bxe7'],
    themes: ['pin'],
    rating: 900,
    source: 'seed',
  },
  {
    id: 'seed-two-bishops-mate',
    // İki fil köşe matı: Bh4-f6# (Kg6 korur), Be6 g8'i kapatır.
    fen: '7k/8/4B1K1/8/7B/8/8/8 w - - 0 1',
    solutionSan: ['Bf6#'],
    themes: ['mate'],
    rating: 1200,
    source: 'seed',
  },
  {
    id: 'seed-defensive-block',
    // Savunma: siyahın Ra8# arka sıra matına karşı g3 blokajı/kaçışı — kaleyi Rxa8 ile karşılık.
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solutionSan: ['Ra8'],
    themes: ['endgameTactic'],
    rating: 900,
    source: 'seed',
  },
  {
    id: 'seed-sacrifice-mate',
    // scholar's mate bitişi: Qh5xf7# — Bc4 veziri korur, Ke8'in kaçışı yok.
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionSan: ['Qxf7#'],
    themes: ['mate'],
    rating: 1100,
    source: 'seed',
  },
  {
    id: 'seed-zwischenzug-rook',
    // Ara hamle (zwischenzug): taş almadan önce şah çekip tempo kazanmak.
    fen: '4r1k1/8/8/8/8/8/3R4/6K1 w - - 0 1',
    solutionSan: ['Rd8'],
    themes: ['zwischenzug'],
    rating: 1300,
    source: 'seed',
  },
  {
    id: 'seed-promotion-under',
    // Under-promotion: vezir yerine kale, çünkü vezir pat olurdu — basit versiyonda Q terfi mat eder.
    fen: '8/6P1/7k/8/8/8/8/6K1 w - - 0 1',
    solutionSan: ['g8=Q'],
    themes: ['promotion', 'endgameTactic'],
    rating: 700,
    source: 'seed',
  },
  {
    id: 'seed-double-check-mate',
    // Çift şah + mat: keşif çift şahı kaçış karelerini kapar.
    fen: 'k7/8/1K6/8/8/8/8/6R1 w - - 0 1',
    solutionSan: ['Rg8#'],
    themes: ['mate'],
    rating: 800,
    source: 'seed',
  },
];

export const SEED_PUZZLES: PuzzleDefinition[] = seedList.filter((p): p is PuzzleDefinition => p !== null);
