# Stockfish Motor Asseti (Stockfish 19, tam NNUE, single-thread)

Bu klasördeki `stockfish.js` (21 KB glue) ve `stockfish.wasm` (99 MB tam NNUE)
dosyaları resmi `stockfish` npm paketinin **v19.0.0** sürümünden
`bin/stockfish-19-single.js` + `bin/stockfish-19-single.wasm` olarak alınmıştır
(unpkg.com/stockfish@19.0.0/bin/…).

**ÖNEMLİ:** İnceleme kalibrasyonu (chess.com paritesi) tam NNUE gerektirir.
Lite varyant (`stockfish-19-lite-single`, 1.7 MB) sıkıştırılmış minik ağ kullandığı
için değerlendirmeler zayıflar ve doğruluk oranları düşer — inceleme hattında
LİTE KULLANMA. Lite yalnızca boyut kritikse (APK) oyun içi ipucu/eval için
düşünülebilir.

- **Single-thread**: SharedArrayBuffer/pthread GEREKTİRMEZ — normal statik
  hosting, Vite dev ve Capacitor WebView'de özel header olmadan çalışır.
- **Lite NNUE**: sıkıştırılmış ağ gömülü (lite multi-thread wasm'ıyla karışmaz;
  glue tam NNUE wasm'ı değil `stockfish.wasm` adıyla kendi binary'sini arar).
- Glue + wasm **aynı varyant ve sürümden** gelmek zorundadır; karışık eşleşme
  (ör. SF19 single glue + SF19 lite wasm) motoru sessizce bozar — bu geçmişte
  "Add files via upload" ile başımıza geldi.

DOSYALARI GÜNCELLEMEK İSTERSEN
1. `https://unpkg.com/stockfish@<sürüm>/bin/` altından **aynı varyantın**
   `.js` + `.wasm` ikilisini indir (multi-threaded `stockfish-19.js` /
   `stockfish-19-lite.js` seçme — header gerektirir, burada çalışmaz).
2. İkisini de bu klasöre `stockfish.js` ve `stockfish.wasm` adıyla kopyala.
3. Canlı doğrula: uygulama açılır, motor `READY` olur, "en iyi hamle" döner.
