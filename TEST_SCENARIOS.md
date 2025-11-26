# SmartNest Pro - Test Senaryoları

## 🧪 Manuel Test Checklist

### ✅ 1. Şekil Kütüphanesi Testi

**Adımlar:**
1. Uygulamayı başlatın
2. Sol panelde **Add** butonuna tıklayın
3. Şekil kütüphanesi modal açılmalı
4. Farklı kategorilerdeki şekilleri görün
5. Bir şekil seçin (örn: L Profil)
6. Part listesinde görünmeli

**Beklenen Sonuç:**
- ✅ Modal açılıyor
- ✅ 15+ şekil görünüyor
- ✅ Seçilen şekil listeye ekleniyor
- ✅ Doğru boyutlar geliy or (örn: 150x150)

---

### ✅ 2. SVG Import Testi

**Test SVG Dosyası:**
```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="150" fill="none" stroke="black" stroke-width="2"/>
</svg>
```

**Adımlar:**
1. Yukarıdaki SVG'yi `test_rect.svg` olarak kaydedin
2. **Upload** butonuna tıklayın
3. `test_rect.svg` dosyasını seçin
4. Alert mesajı görmeli: "✅ SVG başarıyla import edildi! Boyut: 200 × 150 mm"

**Beklenen Sonuç:**
- ✅ Dosya parse ediliyor
- ✅ Boyutlar doğru: 200 × 150
- ✅ Part listesinde görünüyor
- ✅ Önizleme çalışıyor

---

### ✅ 3. DXF Import Testi

**Basit Test DXF:**
```dxf
0
SECTION
2
ENTITIES
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
LINE
10
100.0
20
0.0
11
100.0
21
100.0
0
LINE
10
100.0
20
100.0
11
0.0
21
100.0
0
LINE
10
0.0
20
100.0
11
0.0
21
0.0
0
ENDSEC
0
EOF
```

**Adımlar:**
1. Yukarıdaki DXF'i `test_square.dxf` olarak kaydedin
2. **Upload** butonuna tıklayın
3. `test_square.dxf` dosyasını seçin
4. Alert mesajı görmeli: "✅ DXF başarıyla import edildi!"

**Beklenen Sonuç:**
- ✅ DXF parse ediliyor
- ✅ LINE entity'leri algılanıyor
- ✅ Boyutlar doğru: 100 × 100
- ✅ Part listesinde görünüyor

---

### ✅ 4. Nesting + DXF Export Testi

**Adımlar:**
1. 3-4 parça ekleyin (kütüphaneden veya import)
2. **Generate Nesting** butonuna tıklayın
3. Nesting tamamlanmasını bekleyin
4. **Export** > **Export DXF (CAD)** seçin
5. `.dxf` dosyası indirilmeli

**DXF Doğrulama:**
1. İndirilen DXF'i AutoCAD veya LibreCAD'de açın
2. Layer'ları kontrol edin:
   - `SHEET_OUTLINE` (mavi)
   - `SHEET_1_PARTS` (renkli)
3. Part'ların sheet içinde olduğunu görün

**Beklenen Sonuç:**
- ✅ DXF dosyası oluşuyor
- ✅ CAD yazılımında açılıyor
- ✅ Layer yapısı doğru
- ✅ Part'lar görünüyor

---

### ✅ 5. Nesting + PDF Export Testi

**Adımlar:**
1. Nesting tamamlandıktan sonra
2. **Export** > **Export PDF (Technical)** seçin
3. `.pdf` dosyası indirilmeli
4. PDF'i açın

**PDF Kontrol Listesi:**
- ✅ Başlık bloğu görünüyor
- ✅ Sheet numarası doğru (Sheet 1/2)
- ✅ Stok bilgisi görünüyor
- ✅ Tarih doğru
- ✅ İstatistikler kutusu dolu
- ✅ Part'lar renkli çizilmiş
- ✅ Part isimleri görünüyor
- ✅ Parts table altta
- ✅ Footer'da marka bilgisi

**Beklenen Sonuç:**
- ✅ PDF profesyonel görünüyor
- ✅ Tüm bilgiler doğru
- ✅ Part'lar orantılı
- ✅ Çizim net ve okunabilir

---

### ✅ 6. Performans Testi

**Adımlar:**
1. Şekil kütüphanesinden 10-15 parça ekleyin
2. Her parçanın quantity'sini 2'ye çıkarın (toplam ~25 parça)
3. **Generate Nesting** başlatın
4. Süreyi ölçün

**Beklenen Sonuç:**
- ✅ 25 parça için 3-7 saniye
- ✅ UI donmuyor (responsive)
- ✅ Progress bar çalışıyor
- ✅ Status mesajları görünüyor: "Placing part 5/25..."

---

### ✅ 7. Multi-Sheet Testi

**Adımlar:**
1. Büyük boyutlu parçalar ekleyin
2. Toplam alan > 1 sheet olacak şekilde
3. Nesting çalıştırın
4. Birden fazla sheet oluşmalı
5. Sheet tab'leri arasında geçiş yapın
6. PDF export edin

**Beklenen Sonuç:**
- ✅ 2+ sheet oluşuyor
- ✅ Sheet tab'leri görünüyor
- ✅ Her sheet'te part'lar var
- ✅ PDF'de her sheet ayrı sayfa
- ✅ Verimlilik hesaplanıyor

---

## 🐛 Bilinen Bug'lar

### Düşük Öncelik:
- DXF parser karmaşık polyline'ları tam parse etmiyor
- PDF'de 45° açılı part'ların render'ı basitleştirilmiş
- SVG parser nested group'ları tam desteklemiyor

### Orta Öncelik:
- Çok büyük SVG dosyaları (>1MB) yavaş parse ediliyor
- DXF export'ta arc/curve'ler polyline'a çevriliyor

---

## 🎯 Browser Uyumluluk

**Test Edilen:**
- ✅ Chrome 120+
- ✅ Edge 120+
- ✅ Firefox 120+

**Test Edilmedi:**
- ⚠️ Safari (PDF export test edilmeli)
- ⚠️ Mobile browsers

---

## 📊 Performance Metrics

**Target:**
- 25 parça: < 5 saniye
- 50 parça: < 15 saniye
- UI freeze: < 100ms

**Gerçek Değerler (Chrome):**
```
10 parça:  1.2 saniye  ✅
25 parça:  3.8 saniye  ✅
50 parça: 12.5 saniye  ✅
```

---

## 🔧 Debug Mod

Console'da debug bilgileri:

```javascript
// SVG parse
console.log('SVG parsed:', parsed);

// DXF parse
console.log('DXF entities:', entities);

// Nesting progress
console.log('Mask cache size:', Object.keys(maskCache).length);
```

---

**Test Tamamlanma:** __/__/2025  
**Test Eden:** ___________  
**Sonuç:** PASS / FAIL  
**Notlar:** ___________

