# Kurulum, Çalıştırma ve APK Alma

## 1) Gereksinimler
- Node.js 18+ (node -v ile kontrol edin)
- Android Studio (APK adımı için) — SDK + bir emülatör veya bağlı telefon

## 2) Bağımlılıkları kurun
Proje klasöründe (package.json'ın olduğu yerde) cmd/terminal açıp:

```
npm install
```

## 3) Derleme hatası var mı diye kontrol (opsiyonel ama önerilir)
```
npm run build
```
Bu komut hem TypeScript tip kontrolünü hem de production web build'ini yapar.
`dist/` klasörü oluşursa hatasız demektir.

## 4) Testleri çalıştırmak isterseniz (opsiyonel)
```
npm test
```

## 5) Masaüstünde/tarayıcıda canlı önizleme
```
npm run dev
```
Terminalde çıkan http://localhost:5173 adresini tarayıcıda açın.

## 6) Stockfish motorunu ekleyin (ÖNEMLİ — bilgisayara karşı oynamak için gerekli)
`public/assets/engine/` klasörüne GERÇEK şu iki dosyayı siz eklemelisiniz
(bunlar telif/lisans nedeniyle projeye gömülü gelmez):
- stockfish.js
- stockfish.wasm

Nereden: https://github.com/official-stockfish/Stockfish ya da npm'deki
`stockfish` paketinin içinden. Dosya adlarını DEĞİŞTİRMEYİN.
Bu dosyalar eklenmeden Bilgisayara Karşı modu "motor hazır değil" hatası verir
(klasik iki-oyunculu mod ve tüm varyantlar bundan etkilenmez).

## 7) Android projesini oluşturun (yalnızca ilk seferde)
```
npx cap add android
```

## 8) Web build'i Android projesine senkronize edin
```
npm run cap:sync
```
(Bu komut hem `vite build` hem `cap sync` çalıştırır.)

## 9) Android Studio'da açıp APK üretin
```
npx cap open android
```
Android Studio açılınca: Build → Build Bundle(s) / APK(s) → Build APK(s).
Üretilen .apk dosyası `android/app/build/outputs/apk/debug/` altında olur.

## Notlar
- `LICENSES.md` dosyasını okuyun: Stockfish GPLv3 lisanslıdır, dağıtırken
  kaynak koda erişim/atıf sağlamanız gerekir. Game Review doğruluk (accuracy)
  formülünün lisans durumu da ticari dağıtım öncesi netleştirilmelidir.
- "Yakında" etiketli varyantlar (Portal, Bomb, Lava, Survival, Stealth) henüz
  gerçek kural mantığına sahip değildir, kasıtlı olarak iskelet bırakılmıştır.
