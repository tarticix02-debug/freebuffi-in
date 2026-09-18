import { Chess } from 'chess.js';
import type { Move, Square, PieceSymbol, Color } from 'chess.js';
import type { Side, GameSnapshot } from './types';

/**
 * ChessGame, chess.js'in Chess sınıfını sarmalayan (wrap eden) ince bir
 * katmandır. Uygulamanın geri kalanı chess.js'e doğrudan değil, bu sınıf
 * üzerinden erişir; böylece kural motoru (varyantlar, hamle doğrulama,
 * anlık durum/`snapshot`) tek bir yerde toplanır.
 */
export class ChessGame {
  /** Alttaki gerçek chess.js örneği. Varyantların doğrudan erişmesi gerektiğinde kullanılır. */
  readonly raw: Chess;

  constructor(fen?: string) {
    this.raw = fen ? new Chess(fen) : new Chess();
  }

  /** Hamleyi dener; geçersizse (chess.js hata fırlatırsa) null döner. */
  move(move: { from: string; to: string; promotion?: string }): Move | null {
    try {
      return this.raw.move(move);
    } catch {
      return null;
    }
  }

  /** Belirli bir kare için (veya tümü için) yasal hamleleri döner. */
  legalMoves(square?: Square): Move[] {
    return square
      ? this.raw.moves({ square, verbose: true })
      : this.raw.moves({ verbose: true });
  }

  board() {
    return this.raw.board();
  }

  fen(): string {
    return this.raw.fen();
  }

  /** Tahtayı verilen FEN ile sıfırdan yükler (hamle geçmişini sıfırlar). */
  loadFen(fen: string): void {
    this.raw.load(fen);
  }

  put(piece: { type: PieceSymbol; color: Color }, square: Square): boolean {
    return this.raw.put(piece, square);
  }

  remove(square: Square) {
    return this.raw.remove(square);
  }

  /** Oyunun anlık, UI'ın ihtiyaç duyduğu her şeyi içeren özetini üretir. */
  snapshot(): GameSnapshot {
    const history = this.raw.history({ verbose: true });
    const last = history[history.length - 1];
    const fen = this.raw.fen();
    const moveNumber = Number(fen.split(' ')[5] ?? '1');
    return {
      fen,
      pgn: this.raw.pgn(),
      turn: this.raw.turn(),
      isCheck: this.raw.isCheck(),
      isCheckmate: this.raw.isCheckmate(),
      isStalemate: this.raw.isStalemate(),
      isDraw: this.raw.isDraw(),
      isThreefold: this.raw.isThreefoldRepetition(),
      isInsufficientMaterial: this.raw.isInsufficientMaterial(),
      moveNumber,
      lastMoveSan: last ? last.san : null,
    };
  }

  /**
   * DÜRÜSTLÜK NOTU: chess.js'in load() metodu hamle geçmişini SIFIRLAR.
   * Bu yüzden bu metod yalnızca "tur atlama" gibi kuralları kasıtlı olarak
   * değiştiren varyantlarda (UNO Chess) kullanılmalıdır. Bu varyantların
   * PGN'i artık güvenilir olmadığı için Game Review'a gönderilmez
   * (bkz. src/utils/reviewability.ts).
   */
  forceActiveColor(color: Side): void {
    const parts = this.raw.fen().split(' ');
    parts[1] = color;
    this.raw.load(parts.join(' '));
  }
}
