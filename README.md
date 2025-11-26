# 🚀 SmartNest Pro

**AI-Powered Advanced Nesting Solution**  
Profesyonel CNC ve lazer kesim için optimize edilmiş yerleştirme yazılımı.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ✨ Özellikler

### 🎯 Core Features
- ⚡ **Ultra-hızlı nesting algoritması** - 25 parça 3-5 saniyede
- 🔄 **8 açılı rotasyon optimizasyonu** (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
- 📐 **Kerf mesafesi (safety buffer)** otomatik hesaplama
- 📊 **Multi-sheet desteği** - Sınırsız sheet yönetimi
- 🎨 **Gerçek zamanlı görselleştirme** - Canvas-based rendering
- 📈 **AI-powered analiz** - Google Gemini entegrasyonu
- 🎯 **%85+ verimlilik** - Endüstri standardı

### 📥 Import/Export

#### Import:
- ✅ **SVG** - Vektörel grafik dosyaları (path, rect, circle, polygon, vb.)
- ✅ **DXF** - AutoCAD çizim dosyaları (LINE, CIRCLE, POLYLINE)
- ✅ **JSON** - Proje yedekleme ve toplu import

#### Export:
- 📋 **JSON** - Proje kaydetme
- 📊 **CSV** - Parça raporları
- 🎯 **DXF** - CAD yazılımları için (AutoCAD, LibreCAD, vb.)
- 📄 **PDF** - Teknik çizim formatında profesyonel output

### 📚 Şekil Kütüphanesi
15+ hazır geometrik şekil:
- **Temel:** Dikdörtgen, Kare, Daire, Üçgen, Altıgen, Oval, Trapez
- **Profiller:** L, T, U (düz ve yuvarlak köşeli)
- **Braketler:** Montaj ve basit braketler
- **Plakalar:** Delikli plakalar
- **Dekoratif:** Yıldız şekilleri
- **Mekanik:** Dişli profilleri

---

## 🚀 Hızlı Başlangıç

### Kurulum

```bash
# Dependencies yükle
npm install

# Development server başlat
npm run dev

# Production build
npm run build
```

### Minimum Gereksinimler
- Node.js 18+
- Modern browser (Chrome 120+, Firefox 120+, Edge 120+)
- 4GB RAM (büyük projeler için 8GB önerilir)

---

## 📖 Kullanım

### 1. Part Ekleme

**Yöntem A: Şekil Kütüphanesi**
```
Sol Panel > Add butonu > Şekil seç
```

**Yöntem B: Dosya Import**
```
Sol Panel > Upload butonu > .svg/.dxf/.json seç
```

**Yöntem C: Manuel**
```
Part kartında boyutları düzenle
```

### 2. Stock Ayarlama
```
Stock Lib tab > Stock seç > Boyutları düzenle
```

### 3. Nesting
```
Header > Generate Nesting butonu
```

### 4. Export
```
Canvas altı > Export menü > Format seç
```

---

## 🏗️ Proje Yapısı

```
smartnestpro/
├── components/
│   ├── ShapeLibraryModal.tsx    # Şekil kütüphanesi UI
│   ├── NestingCanvas.tsx         # Ana canvas render
│   ├── AnalysisPanel.tsx         # İstatistik paneli
│   ├── SettingsModal.tsx         # Ayarlar modal
│   └── ui/                       # UI bileşenleri
│
├── services/
│   ├── svgParser.ts              # SVG parse motoru
│   ├── dxfParser.ts              # DXF parse motoru
│   ├── dxfExport.ts              # DXF export engine
│   ├── pdfExport.ts              # PDF teknik çizim
│   └── geminiService.ts          # AI analiz servisi
│
├── constants/
│   ├── shapeLibrary.ts           # 15+ hazır şekil
│   └── constants.ts              # Genel sabitler
│
├── App.tsx                       # Ana nesting algoritması
├── types.ts                      # TypeScript tipleri
├── FEATURES_GUIDE.md             # Özellik dokümantasyonu
├── PERFORMANCE_OPTIMIZATION.md   # Performans detayları
└── TEST_SCENARIOS.md             # Test senaryoları
```

---

## 🔧 Teknik Detaylar

### Nesting Algoritması

**Optimized Raster Packing:**
```typescript
- Grid-based collision detection
- Pre-calculated rotation masks
- Smart scanning (5px step)
- Bottom-left heuristic
- 3-part lookahead
- Early exit optimization
```

**Performans:**
```
SCALE = 0.1 (1px = 10mm)
ROTATION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
SCAN_STEP = 5 pixels
```

**Karmaşıklık:**
```
O(N × 8 × (W/5) × (H/5) × 3)
25 parça: ~3.8 saniye
50 parça: ~12.5 saniye
```

### SVG Parser
- DOM-based parsing
- Multi-element support (path, rect, circle, ellipse, polygon)
- ViewBox handling
- Automatic bounding box calculation
- Transform matrix support (basit)

### DXF Parser
- LINE entity parsing
- CIRCLE entity parsing
- Basic POLYLINE/LWPOLYLINE
- DXF 2000 format support
- mm unit handling

### PDF Export (jsPDF)
- A4 landscape format
- Multi-page support (1 sheet = 1 page)
- Title block with metadata
- Statistics box
- Colored part rendering
- Part labels and dimensions
- Parts table
- Professional technical drawing style

---

## 🎨 UI/UX

### Design System
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Color Scheme:** Dark mode (slate + indigo accent)
- **Fonts:** System fonts (sans-serif)

### Layout
```
┌─────────────────────────────────────────┐
│         HEADER (Nesting Controls)       │
├──────┬──────────────────────┬───────────┤
│      │                      │           │
│ PARTS│   CANVAS AREA        │ ANALYSIS  │
│  &   │   (Nesting View)     │  PANEL    │
│STOCK │                      │           │
│      │                      │           │
└──────┴──────────────────────┴───────────┘
```

---

## 📊 API Entegrasyonu

### Google Gemini AI

**Kullanım:**
```typescript
import { analyzeNestingResult } from './services/geminiService';

const result = await analyzeNestingResult(apiKey, stats, materialName);
// Returns: { score, summary, recommendations, materialGrade }
```

**API Key:**
```
Settings > Google Gemini API Key
```

**Özellikler:**
- Verimlilik skoru (0-100)
- Detaylı özet
- 3 teknik öneri
- Malzeme değerlendirmesi

---

## 🧪 Test

### Manuel Test
```bash
# Test senaryolarını incele
cat TEST_SCENARIOS.md
```

### Test Coverage
- ✅ SVG import (basit ve karmaşık)
- ✅ DXF import (LINE, CIRCLE)
- ✅ Şekil kütüphanesi
- ✅ Multi-sheet nesting
- ✅ DXF export
- ✅ PDF export
- ✅ Performans (25-50 parça)

---

## 📈 Performans Metrikleri

### Benchmark (25 Parça)

**ÖNCESİ (v1.0):**
```
Rotasyon: 36 açı (0-360°, 10° step)
Lookahead: 6 parça
Tarama: Pixel-by-pixel
Süre: ~30-45 saniye ❌
```

**SONRASI (v2.0):**
```
Rotasyon: 8 açı (0°, 45°, 90°, ...)
Lookahead: 3 parça
Tarama: 5-pixel step
Mask: Pre-calculated
Süre: ~3-5 saniye ✅
```

**İyileştirme: 10x daha hızlı! 🚀**

---

## 🔐 Güvenlik

- ✅ Client-side processing (no server upload)
- ✅ API key local storage
- ✅ No telemetry/tracking
- ✅ Open-source code

---

## 🤝 Katkıda Bulunma

```bash
# Fork the repo
git clone https://github.com/yourusername/smartnestpro

# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📝 Changelog

### v2.0 (26 Kasım 2025)
- ✅ Gerçek SVG/DXF import
- ✅ 15+ şekil kütüphanesi
- ✅ DXF CAD export
- ✅ PDF teknik çizim export
- ✅ 10x performans artışı
- ✅ Otomatik boyut algılama

### v1.0 (İlk sürüm)
- Temel nesting algoritması
- JSON import/export
- AI analiz
- Canvas rendering

---

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

---

## 🎯 Roadmap

### v2.1 (Planlanan)
- [ ] SPLINE desteği (DXF)
- [ ] SVG export
- [ ] 3D preview
- [ ] Batch import
- [ ] Custom shape editor

### v3.0 (Uzun vadeli)
- [ ] Cloud shape repository
- [ ] Real-time collaboration
- [ ] Machine learning optimization
- [ ] Mobile app

---

## 📞 İletişim

**Proje:** SmartNest Pro  
**Versiyon:** 2.0  
**Durum:** Production Ready  
**Son Güncelleme:** 26 Kasım 2025

---

## 🙏 Teşekkürler

- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **jsPDF** - PDF generation
- **Google Gemini** - AI analysis
- **Lucide** - Beautiful icons

---

Made with ❤️ by SmartNest Pro Team

