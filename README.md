# Ultimate Chess

Klasik satranç, bilgisayara karşı oyun, bulmaca antrenmanı ve kural değiştiren
varyantlar (UNO Chess, Teleport Chess, Invisible Chess ve daha fazlası) içeren
mobil öncelikli satranç uygulaması. React + Vite + Capacitor ile geliştirilir;
Android APK olarak paketlenebilir.

## Özellikler

- **Klasik satranç** — yerel iki oyuncu veya Stockfish'e karşı (4 zorluk seviyesi)
- **Varyant modları** — Chaos, Jackpot, Treasure, Freeze, Teleport, Invisible, UNO Chess
- **Bulmacalar** — tematik puzzle seti + kendi oyunlarından otomatik üretilen bulmacalar
- **Açılış antrenörü** — açılış ağacı üzerinde Interaktif çalışma
- **Oyun incelemesi** — Stockfish analizi ile hamle hamle doğruluk (accuracy) raporu
- **Profil & ilerleme** — Elo tabanlı puanlama, günlük görevler, başarımlar, istatistikler
- **Ses & titreşim** — Web Audio ile sentetik ses efektleri, Capacitor haptic geri bildirim

## Kurulum

```bash
npm install
```

### Stockfish motoru

`public/assets/engine/` altında `stockfish.js` ve `stockfish.wasm` bulunmalıdır
(bilgisayara karşı oyun ve oyun incelemesi için gerekli). Bu depoya gömülü
gelmediyse [stockfish.js](https://github.com/nmrugg/stockfish.js) sayfasından
temin edip dosya adlarını değiştirmeden kopyalayın.

## Geliştirme

```bash
npm run dev      # Vite geliştirme sunucusu (http://localhost:5173)
npm test         # Vitest test paketi
npm run build    # TypeScript tip kontrolü + production web build
```

## Android APK

```bash
npx cap add android   # yalnızca ilk seferde
npm run cap:sync      # web build + Capacitor senkronizasyonu
npx cap open android  # Android Studio'da aç → Build APK(s)
```

Detaylı adımlar için [NASIL_CALISTIRILIR.md](./NASIL_CALISTIRILIR.md) dosyasına bakın.

## Mimari notlar

- `src/chess/` — chess.js sarmalayıcısı; tüm kural motoru bu katmandan geçer
- `src/variants/` — varyant kural motoru (`VariantRule` arayüzü) ve her varyantın
  gerçek state mutasyonları; varyant AI'ı Stockfish önerisini varyant
  kısıtlarına göre filtreleyen `VariantAIAdapter` kullanır
- `src/state/` — Zustand store'ları (`gameStore`, `engineStore`, `puzzleStore`, …);
  maç yarışları (race) maç-token mekanizmasıyla korunur
- `src/storage/` — IndexedDB kalıcılık katmanı
- `src/engine/` — Stockfish UCI worker köprüsü ve SEE (statik takas) analizi

## Lisans

Uygulama kodunun lisansı ve gömülü üçüncü taraf bileşenler (Stockfish GPLv3,
Lichess accuracy modeli notu) için [LICENSES.md](./LICENSES.md) dosyasına bakın.
