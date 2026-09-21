import { describe, it, expect } from 'vitest';
import {
  modifierColor, toggleHighlight, toggleArrow, clearAnnotations, EMPTY_ANNOTATIONS,
} from '../src/services/boardAnnotations';
import { premoveCandidate, resolvePremove, isPremoveActive } from '../src/services/premoveService';

describe('boardAnnotations (sağ-tık çizimler)', () => {
  it('modifier renkleri doğru eşlenir', () => {
    expect(modifierColor(false, false, false)).toBe('green');
    expect(modifierColor(true, false, false)).toBe('red');
    expect(modifierColor(false, true, false)).toBe('blue');
    expect(modifierColor(false, false, true)).toBe('yellow');
  });

  it('sağ tık kare vurgusu ekler, aynı renk tekrarı kaldırır', () => {
    let a = toggleHighlight(EMPTY_ANNOTATIONS, 'e4', 'green');
    expect(a.highlights).toEqual([{ square: 'e4', color: 'green' }]);
    a = toggleHighlight(a, 'e4', 'green');
    expect(a.highlights).toEqual([]);
  });

  it('farklı renk aynı kareye eklenir (çoklu renk)', () => {
    let a = toggleHighlight(EMPTY_ANNOTATIONS, 'e4', 'green');
    a = toggleHighlight(a, 'e4', 'red');
    expect(a.highlights).toHaveLength(2);
  });

  it('ok toggle: aynı from→to+renk kaldırır, farklı renk ekler', () => {
    let a = toggleArrow(EMPTY_ANNOTATIONS, 'e2', 'e4', 'green');
    expect(a.arrows).toEqual([{ from: 'e2', to: 'e4', color: 'green' }]);
    a = toggleArrow(a, 'e2', 'e4', 'green');
    expect(a.arrows).toHaveLength(0);
    a = toggleArrow(a, 'e2', 'e4', 'blue');
    expect(a.arrows).toHaveLength(1);
  });

  it('clearAnnotations her şeyi temizler ve girdiyi değiştirmez', () => {
    let a = toggleArrow(EMPTY_ANNOTATIONS, 'a1', 'a8', 'yellow');
    a = toggleHighlight(a, 'b2', 'red');
    expect(clearAnnotations()).toEqual(EMPTY_ANNOTATIONS);
    expect(a.arrows).toHaveLength(1);
    expect(a.highlights).toHaveLength(1);
  });
});

describe('premoveService', () => {
  it('aday: aynı kare premove olamaz', () => {
    expect(premoveCandidate('e2', 'e2')).toBeNull();
    expect(premoveCandidate('e2', 'e4')).toEqual({ from: 'e2', to: 'e4' });
  });

  it('resolvePremove: premove varken tampon her durumda temizlenir', () => {
    expect(resolvePremove({ from: 'e2', to: 'e4' }, 'w', 'b')).toEqual({ clear: true });
    expect(resolvePremove({ from: 'e2', to: 'e4' }, 'w', 'w')).toEqual({ clear: true });
    expect(resolvePremove(null, 'w', 'b')).toEqual({ clear: false });
  });

  it('isPremoveActive: beklenen rengin sırası değilken görünür', () => {
    expect(isPremoveActive({ from: 'e2', to: 'e4' }, 'w', 'b')).toBe(true);
    expect(isPremoveActive({ from: 'e2', to: 'e4' }, 'w', 'w')).toBe(false);
    expect(isPremoveActive(null, 'w', 'b')).toBe(false);
  });
});
