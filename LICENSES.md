# Üçüncü Taraf Lisanslar ve Hukuki Notlar

Bu dosya, projede kullanılan üçüncü taraf kod/veri kaynaklarını ve
ticari dağıtım öncesi netleştirilmesi gereken noktaları listeler.

## Stockfish (GPLv3)
`stockfish` paketi GPLv3 ile lisanslıdır. Dağıtımda kaynak koduna
erişim/atıf zorunludur ve uygulama içinde (ör. Ayarlar ekranında)
lisans metni/bağlantısı gösterilmelidir. `stockfish.js`/`stockfish.wasm`
binary dosyaları bu depoya dahil edilmemiştir — resmi kaynaktan temin
edip `public/assets/engine/` altına eklemeniz gerekir.

## chess.js (BSD-2-Clause)
Sorunsuz, atıf zorunluluğu yok ama lisans metninin korunması iyi pratiktir.

## Game Review — Accuracy / Win% Formülü
`src/chess/replay.ts` içinde belgelenen accuracy ve win% dönüşüm
formülleri, Lichess'in açık kaynak (AGPL) yayınladığı "Accuracy"
modelinin bağımsız bir yeniden implementasyonudur. **Ticari dağıtımdan
önce bu formülün lisans durumu (AGPL türev eser riski) hukuken
netleştirilmelidir.**

## PieceIcon SVG Seti
Bu teslimatta özgün/basit geometrik path olarak üretildi, telif riski
yoktur; görsel kaliteyi ticari seviyeye çıkarmak için profesyonel ve
lisansı netleşmiş bir set ile değiştirilmesi önerilir.

## Font
Manrope/Inter/JetBrains Mono kullanılıyorsa: SIL Open Font License — sorunsuz.
