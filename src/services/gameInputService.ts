import { Chess } from 'chess.js';

export interface ParsedGameInput {
  /** Analiz edilecek hamlelerin PGN'i (FEN'den başladıysa FEN header'lı). */
  pgn: string;
  source: 'pgn' | 'fen';
  /** FEN'den başlatıldıysa başlangıç pozisyonu. */
  startingFen?: string;
}

/**
 * Kullanıcının yapıştırdığı PGN veya FEN'i doğrular ve analize hazır hale getirir.
 * - PGN: chess.js ile parse edilmeye çalışılır; hamle yoksa hata.
 * - FEN: geçerli bir pozisyon olmalı; tek pozisyonluk "analiz" için PGN'e çevrilmez,
 *   bunun yerine boş PGN + startingFen döner (review akışı FEN'i yükleyip
 *   tahtada serbest inceleme moduna geçer).
 */
export function parseGameInput(raw: string): ParsedGameInput {
  const text = raw.trim();
  if (!text) throw new Error('Boş giriş. Lütfen bir PGN veya FEN yapıştırın.');

  // FEN tespiti: 6 boşlukla ayrılmış alan ve taş dizisi içeriyor.
  const looksLikeFen = /^([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+\s+[wb]\s+(-|[KQkq]+)\s+(-|[a-h][36])\s+\d+\s+\d+$/.test(text);
  if (looksLikeFen) {
    const chess = new Chess();
    try {
      chess.load(text);
    } catch (e) {
      throw new Error(`Geçersiz FEN: ${(e as Error).message}`);
    }
    return { pgn: '', source: 'fen', startingFen: chess.fen() };
  }

  // PGN: hamleleri çıkar (chess.js header'ları tolere eder).
  const chess = new Chess();
  try {
    chess.loadPgn(text);
  } catch {
    // loadPgn bazen header varyantlarında takılır — hamle listesini elle dene.
    const moveText = text
      .replace(/\[.*?\]\s*/gs, '')
      .replace(/\{.*?\}/gs, '')
      .replace(/\d+\.(\.\.)?/g, ' ')
      .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '')
      .trim();
    if (!moveText) throw new Error('PGN içinde hamle bulunamadı.');
    try {
      for (const san of moveText.split(/\s+/)) {
        if (san) chess.move(san);
      }
    } catch (e) {
      throw new Error(`Geçersiz PGN: ${(e as Error).message}`);
    }
  }

  if (chess.history().length === 0) {
    throw new Error('PGN içinde hamle bulunamadı. FEN incelemek istiyorsanız FEN modunu kullanın.');
  }

  return { pgn: chess.pgn(), source: 'pgn' };
}
