import { describe, it, expect } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';

/**
 * Regresyon: chess.js 1.x'te put()/remove() mutasyonları, history()/pgn()
 * geçmiş-replay'i çağrıldığında kayboluyordu (canlı kanıt: Teleport'ta taş
 * eski karesine döndü). ChessGame artık geçmişi kendi sahipliğinde tutar
 * (fenStack + moveLog) ve tüm okumalar gerçek tahtaya dokunmadan üretilir.
 */
describe('ChessGame mutasyon karantinası', () => {
  it('teleport-benzeri ele geçirmeli mutasyon history()/pgn() okumalarından sağ kalır', () => {
    const game = new ChessGame('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    expect(game.move({ from: 'b8', to: 'c6' })).not.toBeNull();
    // onAfterMove mutasyonu: at c6'dan e4'a ışınlanır, beyaz piyonu alır
    game.remove('c6');
    game.remove('e4');
    game.put({ type: 'n', color: 'b' }, 'e4');
    const mutatedFen = game.fen();

    // Kusur önceden tam bu okumalarda tetikleniyordu (snapshot her hamlede çağrılır)
    game.history();
    game.history({ verbose: true });
    game.pgn();
    game.snapshot();

    expect(game.fen()).toBe(mutatedFen);
    expect(game.raw.get('c6')).toBeUndefined(); // at ışınlandı, eski karesi boş
    expect(game.raw.get('e4')?.type).toBe('n'); // at hedef karede
  });

  it('pgn() ve history() kendi kaydından üretilir, numaralandırma doğru', () => {
    const game = new ChessGame();
    game.move({ from: 'e2', to: 'e4' });
    game.move({ from: 'e7', to: 'e5' });
    game.move({ from: 'g1', to: 'f3' });
    expect(game.pgn()).toBe('1. e4 e5 2. Nf3');
    expect(game.history()).toEqual(['e4', 'e5', 'Nf3']);
    expect(game.history({ verbose: true }).map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('undo() tahtayı ve geçmişi bir ply geri alır', () => {
    const game = new ChessGame();
    const before = game.fen();
    game.move({ from: 'e2', to: 'e4' });
    expect(game.undo()).toBe(true);
    expect(game.fen()).toBe(before);
    expect(game.history()).toEqual([]);
    expect(game.pgn()).toBe('');
    expect(game.undo()).toBe(false); // boş geçmişte güvenli
  });

  it('üç tekrar ve 50 hamle kuralı FEN yığınından hesaplanır', () => {
    const game = new ChessGame();
    for (let i = 0; i < 2; i++) {
      game.move({ from: 'g1', to: 'f3' });
      game.move({ from: 'g8', to: 'f6' });
      game.move({ from: 'f3', to: 'g1' });
      game.move({ from: 'f6', to: 'g8' });
    }
    expect(game.isThreefoldRepetition()).toBe(true);
    expect(game.isDraw()).toBe(true);
  });

  it('sıra paraditesi: aynı renk üst üste hamle yapabilir (ekstra hamle varyantları)', () => {
    const game = new ChessGame();
    game.move({ from: 'e2', to: 'e4' });
    game.forceActiveColor('w'); // UNO/Treasure ekstra hamle senaryosu
    expect(game.move({ from: 'd2', to: 'd4' })).not.toBeNull();
    expect(game.pgn()).toBe('1. e4 d4');
  });
});
