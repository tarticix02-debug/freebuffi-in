import { Chess } from 'chess.js';
import type { Move, Square, PieceSymbol, Color } from 'chess.js';
import type { Side, GameSnapshot } from './types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * ChessGame, chess.js'in Chess sınıfını sarmalayan ince bir katmandır.
 *
 * MUTASYON KARANTİNASI: chess.js 1.x'te put()/remove() ile yapılan doğrudan
 * tahta değişiklikleri, history()/pgn()/undo() gibi geçmiş temelli metotlar
 * çağrıldığında KAYBOLUR — bu metotlar pozisyonu hamle geçmişini baştan
 * oynayarak yeniden kurar ve replay'de olmayan varyant mutasyonlarını
 * (teleport, jackpot, hazine...) siler.
 *
 * Bu sınıf tuzağı kökten kapatır:
 *  - Hamle geçmişi bu sınıfın sahipliğindedir (fenStack + moveLog).
 *  - history()/pgn()/undo() KENDİ kaydımızdan üretilir; hiçbir zaman
 *    chess.js'in geçmiş-replay'ine dokunmaz. Gerçek tahta (raw) yalnızca
 *    fen()/board()/get() ile OKUNUR ve load() ile YAZILIR.
 *  - Ekstra hamle veren varyantların forceActiveColor ile bozan sıra
 *    paraditesi de sorun olmaz: kayıt FEN yığınıdır, replay yoktur.
 */
export class ChessGame {
  /** Alttaki gerçek chess.js örneği — yalnızca tahta durumu taşıyıcısı. */
  readonly raw: Chess;

  /** Pozisyon yığını: fenStack[0] = başlangıç FEN'i, sonrası her hamle sonrası FEN. */
  private fenStack: string[] = [];
  /** Hamle günlüğü: chess.js Move nesneleri (san/from/to/flags/...). */
  private moveLog: Move[] = [];

  constructor(fen?: string) {
    const start = fen ?? START_FEN;
    this.raw = new Chess(start);
    this.fenStack = [start];
  }

  /** Hamleyi dener; geçersizse (chess.js hata fırlatırsa) null döner. */
  move(move: { from: string; to: string; promotion?: string }): Move | null {
    try {
      // Kurallar, geçmiş-replay'i tetiklememesi için geçici örnek üzerinde işler.
      const board = new Chess(this.raw.fen());
      const mv = board.move(move);
      if (!mv) return null;
      this.raw.load(board.fen()); // load() chess.js geçmişini sıfırlar — geçmiş zaten bizde
      this.fenStack.push(board.fen());
      this.moveLog.push(mv);
      return mv;
    } catch {
      return null;
    }
  }

  /** Son gerçek hamleyi geri alır; geri alınacak hamle yoksa false döner. */
  undo(): boolean {
    if (!this.moveLog.length) return false;
    this.moveLog.pop();
    this.fenStack.pop();
    this.raw.load(this.fenStack[this.fenStack.length - 1]);
    return true;
  }

  /** Belirli bir kare için (veya tümü için) yasal hamleleri döner. */
  legalMoves(square?: Square): Move[] {
    const board = new Chess(this.raw.fen());
    return square
      ? board.moves({ square, verbose: true })
      : board.moves({ verbose: true });
  }

  history(): string[];
  history(options: { verbose: true }): Move[];
  history(options?: { verbose?: boolean }): string[] | Move[] {
    return options?.verbose ? this.moveLog : this.moveLog.map((m) => m.san);
  }

  pgn(): string {
    const parts = this.baseFen().split(' ');
    let moveNo = Number(parts[5] ?? '1') || 1;
    let turn = (parts[1] === 'b' ? 'b' : 'w') as 'w' | 'b';
    const out: string[] = [];
    for (const mv of this.moveLog) {
      if (turn === 'w') out.push(`${moveNo}.`);
      out.push(mv.san);
      if (turn === 'b') moveNo++;
      turn = turn === 'w' ? 'b' : 'w';
    }
    return out.join(' ');
  }

  board() {
    return this.raw.board();
  }

  fen(): string {
    return this.raw.fen();
  }

  private baseFen(): string {
    return this.fenStack[0];
  }

  isCheck(): boolean {
    return new Chess(this.raw.fen()).isCheck();
  }

  isCheckmate(): boolean {
    return new Chess(this.raw.fen()).isCheckmate();
  }

  isStalemate(): boolean {
    return new Chess(this.raw.fen()).isStalemate();
  }

  isInsufficientMaterial(): boolean {
    return new Chess(this.raw.fen()).isInsufficientMaterial();
  }

  /** Üç tekrar: aynı pozisyon (ilk 4 FEN alanı) yığında toplamda ≥3 kez. */
  isThreefoldRepetition(): boolean {
    const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
    const current = key(this.raw.fen());
    let count = 0;
    for (const fen of this.fenStack) if (key(fen) === current) count++;
    return count >= 3;
  }

  /** 50 hamle kuralı: yarı-hamle sayacı ≥ 100. */
  private isFiftyMove(): boolean {
    return Number(this.raw.fen().split(' ')[4] ?? '0') >= 100;
  }

  /** Beraberlik: pat, yetersiz malzeme, üç tekrar veya 50 hamle kuralı. */
  isDraw(): boolean {
    return (
      this.isStalemate() ||
      this.isInsufficientMaterial() ||
      this.isThreefoldRepetition() ||
      this.isFiftyMove()
    );
  }

  /** Tahtayı verilen FEN ile sıfırdan yükler (hamle geçmişini sıfırlar). */
  loadFen(fen: string): void {
    this.raw.load(fen);
    this.fenStack = [fen];
    this.moveLog = [];
  }

  put(piece: { type: PieceSymbol; color: Color }, square: Square): boolean {
    return this.raw.put(piece, square);
  }

  remove(square: Square) {
    return this.raw.remove(square);
  }

  /** Oyunun anlık, UI'ın ihtiyaç duyduğu her şeyi içeren özetini üretir. */
  snapshot(): GameSnapshot {
    const history = this.moveLog;
    const last = history[history.length - 1];
    const fen = this.fen();
    const moveNumber = Number(fen.split(' ')[5] ?? '1');
    return {
      fen,
      pgn: this.pgn(),
      turn: this.raw.turn(),
      isCheck: this.isCheck(),
      isCheckmate: this.isCheckmate(),
      isStalemate: this.isStalemate(),
      isDraw: this.isDraw(),
      isThreefold: this.isThreefoldRepetition(),
      isInsufficientMaterial: this.isInsufficientMaterial(),
      moveNumber,
      lastMoveSan: last ? last.san : null,
    };
  }

  /**
   * Sırayı zorla değiştirir (ekstra hamle veren varyantlar). Alttaki load()
   * chess.js geçmişini sıfırlar — zararsızdır, geçmişin tek sahibi bu sınıftır.
   */
  forceActiveColor(color: Side): void {
    const parts = this.raw.fen().split(' ');
    parts[1] = color;
    this.raw.load(parts.join(' '));
  }
}
