export type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type UnoValue = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'skip'|'reverse'|'draw2'|'wild'|'wild4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

const COLORS: Exclude<UnoColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];

/** Gerçek standart UNO destesi: 108 kart (4×25 renkli + 8 joker). */
export function buildStandardDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let counter = 0;
  const push = (color: UnoColor, value: UnoValue) => cards.push({ id: `uc${counter++}`, color, value });

  for (const color of COLORS) {
    push(color, '0');
    for (let n = 1; n <= 9; n++) { push(color, String(n) as UnoValue); push(color, String(n) as UnoValue); }
    for (let i = 0; i < 2; i++) { push(color, 'skip'); push(color, 'reverse'); push(color, 'draw2'); }
  }
  for (let i = 0; i < 4; i++) { push('wild', 'wild'); push('wild', 'wild4'); }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function canPlay(card: UnoCard, topColor: UnoColor, topValue: UnoValue): boolean {
  if (card.color === 'wild') return true;
  return card.color === topColor || card.value === topValue;
}
