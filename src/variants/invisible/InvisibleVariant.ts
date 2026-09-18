import type { VariantRule } from '../types';

/**

Invisible Chess: HER İKİ oyuncu da kendi taşlarını göremez.

Taşlar chess.js state'inde gerçekten var; sadece Board.tsx bu maskeyi

kullanarak render'ı atlar. Hamle mantığı görünürlükten bağımsız çalışır.
*/
export const InvisibleVariant: VariantRule = {
id: 'invisible',
name: 'Invisible Chess',
description: 'Tüm taşlar (kendi taşların dahil) görünmezdir. Hamleler gerçek tahta pozisyonuna göre geçerli sayılır.',
status: 'implemented',


initialize: () => ({
variantId: 'invisible',
moveCounter: 0,
customData: {},
activeEvents: [],
log: [],
}),

getVisibilityMask: () =>
Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => false)),
};
