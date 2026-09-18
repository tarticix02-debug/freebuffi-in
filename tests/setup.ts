// Vitest'in node ortamında gerçek tarayıcı IndexedDB'si bulunmaz.
// Bu polyfill olmadan storage katmanına dokunan HİÇBİR test güvenilir çalışmaz
// (önceki turlarda bu boşluk vardı — burada düzeltiliyor).
import 'fake-indexeddb/auto';
