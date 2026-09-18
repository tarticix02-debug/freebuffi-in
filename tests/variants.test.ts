import { describe, it, expect, afterEach } from 'vitest';
import { ChessGame } from '../src/chess/ChessGame';
import { JackpotVariant, setJackpotRng } from '../src/variants/jackpot/JackpotVariant';
import { InvisibleVariant } from '../src/variants/invisible/InvisibleVariant';
import { FreezeVariant } from '../src/variants/freeze/FreezeVariant';

// Flake kök nedeni: eski test her tohumda geçersizdi — 'empty' sonucu (POOL
// ağırlığı 18/100) tahtaya dokunmadığı için piece sayısı değişmiyordu.
// RNG sınırı (setJackpotRng) üzerinden tohum enjekte ediliyor; her sonuç
// bandı kendi testinde sabit tohumla doğrulanıyor.
describe('Jackpot Chess gerçek state mutasyonu (deterministik)', () => {
afterEach(() => { setJackpotRng(Math.random); });

function capturedGame(): ChessGame {
  const g = new ChessGame();
  JackpotVariant.initialize(g);
  g.move({ from: 'e2', to: 'e4' });
  g.move({ from: 'd7', to: 'd5' });
  g.move({ from: 'e4', to: 'd5' }); // capture
  return g;
}

it('add bantı: jackpot tahtaya gerçek taş ekler', () => {
  const g = capturedGame();
  const before = countPieces(g);
  // rng()=0 -> ilk POOL sonucu 'pawn' (ağırlık 28).
  setJackpotRng(() => 0);
  const events = JackpotVariant.onAfterMove!(JackpotVariant.initialize(g), g);
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('JACKPOT_ADD');
  expect(countPieces(g)).toBe(before + 1);
});

it('empty bantı: boş çekilişte tahta değişmez ama olay üretilir', () => {
  const g = capturedGame();
  const before = countPieces(g);
  // Kümülatif bantlar: pawn .00-.28, knight .28-.42, bishop .42-.56,
  // rook .56-.64, queen .64-.67, empty .67-.85 -> 0.76 bandın ortası.
  setJackpotRng(() => 0.76);
  const events = JackpotVariant.onAfterMove!(JackpotVariant.initialize(g), g);
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('JACKPOT_EMPTY');
  expect(countPieces(g)).toBe(before);
});

it('lose bantı: jackpot kendi taşını düşürür', () => {
  const g = capturedGame();
  const before = countPieces(g);
  // lose_pawn bandı .85-.95 -> 0.90.
  setJackpotRng(() => 0.9);
  const events = JackpotVariant.onAfterMove!(JackpotVariant.initialize(g), g);
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('JACKPOT_LOSE');
  expect(countPieces(g)).toBe(before - 1);
});
});

describe('Invisible Chess görünürlük', () => {
it('tüm kareler görünmez olarak maskelenir', () => {
const g = new ChessGame();
const state = InvisibleVariant.initialize(g);
const mask = InvisibleVariant.getVisibilityMask!(state, 'w');
expect(mask.flat().every((v) => v === false)).toBe(true);
});
});

describe('Freeze Chess', () => {
it('donan kare hamle yapılmasını engeller', () => {
const g = new ChessGame();
const state = FreezeVariant.initialize(g);
(state.customData.frozen as Record<string, number>)['e2'] = 5;
state.moveCounter = 0;
const guard = FreezeVariant.onBeforeMove!(state, g, 'e2' as any, 'e4' as any);
expect(guard.allowed).toBe(false);
});
});

function countPieces(g: ChessGame) {
let n = 0;
g.board().forEach((row) => row.forEach((c) => { if (c) n++; }));
return n;
}
