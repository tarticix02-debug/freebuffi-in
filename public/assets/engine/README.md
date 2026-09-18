Stockfish Motor Asseti (GERÇEK, HAZIR)

Bu klasördeki `stockfish.js` ve `stockfish.wasm` dosyaları Stockfish 18'in
TAM (full NNUE) single-threaded derlemesidir (resmi `stockfish` npm paketi,
nmrugg/stockfish.js v18.0.8, `stockfish-18-single`). Lite sürümden burada
farkı: gerçek NNUE ağırıyla çalışır, analiz çok daha derine iner (depth 20+
saniyeler içinde) ve sınıflandırma chess.com/Lichess kalitesine yaklaşır.
SharedArrayBuffer GEREKTİRMEZ — normal statik hosting ve Capacitor WebView'de
çalışır. Maliyeti boyutu: wasm ~113 MB (lite ~7 MB idi), APK buna göre büyür.

DOSYALARI DEĞİŞTİRMEK/GÜNCELLEMEK İSTERSENİZ
1. `npm install stockfish` (bu paket ~150MB'tır, sadece dosyaları almak için
   geçicidir; kurulumdan sonra istersen `npm uninstall stockfish` diyebilirsin,
   uygulamanın çalışması buna bağlı değildir).
2. `node_modules/stockfish/bin/` içinden istediğiniz derlemeyi seçin:
   - ÖNERİLEN: `stockfish-18-lite-single.js` + `.wasm` (küçük, hızlı, header gerektirmez)
   - Daha güçlü ama büyük ve header gerektiren: `stockfish-18-single.js` + `.wasm`
   - "Multi-threaded" (`stockfish-18.js`, `stockfish-18-lite.js`) seçmeyin;
     özel header ayarlamadıysanız çalışmaz.
3. Seçtiğiniz iki dosyayı bu klasöre `stockfish.js` ve `stockfish.wasm` olarak
   (isimler BİREBİR bu şekilde) kopyalayın; StockfishEngine.ts bu isimlere göre
   `new Worker('/assets/engine/stockfish.js')` çağrısı yapar.

LİSANS
Stockfish GPLv3 lisanslıdır. Uygulamayı dağıtırken kaynak koduna erişim/atıf
sağlamanız ve lisans metnini bir "Hakkında/Lisanslar" ekranında göstermeniz
gerekir (bkz. proje kökündeki LICENSES.md).

Bu dosyalar CDN üzerinden fetch edilerek DEĞİL, build içine gömülü statik
asset olarak dahil edilir; böylece APK offline çalışır.
