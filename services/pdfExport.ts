/**
 * PDF Technical Drawing Export Service
 * jsPDF kullanarak teknik çizim formatında PDF oluşturur
 */

import { Sheet, NestingStats } from '../types';
import { jsPDF } from 'jspdf';

export const exportPDF = (sheets: Sheet[], stats: NestingStats, stockName: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // jsPDF ile PDF oluştur
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      
      // Her sheet için bir sayfa
      sheets.forEach((sheet, idx) => {
        if (idx > 0) doc.addPage();
        
        // === HEADER / TITLE BLOCK ===
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, margin, pageWidth - 2 * margin, 25, 'F');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SmartNest Pro - Teknik Çizim', margin + 5, margin + 8);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sheet ${idx + 1} / ${sheets.length}`, margin + 5, margin + 15);
        doc.text(`Stok: ${stockName}`, margin + 5, margin + 20);
        
        // Tarih
        const date = new Date().toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(date, pageWidth - margin - 50, margin + 8);
        
        // === STATISTICS BOX ===
        const statsX = pageWidth - margin - 80;
        const statsY = margin + 12;
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.rect(statsX, statsY, 75, 25, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('İstatistikler:', statsX + 3, statsY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Parça Sayısı: ${sheet.placedParts.length}`, statsX + 3, statsY + 10);
        doc.text(`Verimlilik: ${sheet.efficiency.toFixed(1)}%`, statsX + 3, statsY + 15);
        doc.text(`Fire: ${(sheet.waste / 1000).toFixed(2)} m²`, statsX + 3, statsY + 20);
        
        // === DRAWING AREA ===
        const drawingY = margin + 45;
        const drawingHeight = pageHeight - drawingY - margin - 30;
        const drawingWidth = pageWidth - 2 * margin;
        
        // Sheet outline border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.rect(margin, drawingY, drawingWidth, drawingHeight, 'S');
        
        // Ölçekleme hesapla
        const scaleX = drawingWidth / sheet.width;
        const scaleY = drawingHeight / sheet.height;
        const scale = Math.min(scaleX, scaleY) * 0.95; // %95'ini kullan, kenar boşluğu için
        
        const offsetX = margin + (drawingWidth - sheet.width * scale) / 2;
        const offsetY = drawingY + (drawingHeight - sheet.height * scale) / 2;
        
        // Sheet outline
        doc.setDrawColor(0, 100, 200);
        doc.setLineWidth(0.3);
        doc.rect(offsetX, offsetY, sheet.width * scale, sheet.height * scale, 'S');
        
        // Sheet boyutları
        doc.setFontSize(7);
        doc.setTextColor(0, 100, 200);
        doc.text(`${sheet.width} mm`, offsetX + (sheet.width * scale) / 2, offsetY - 3, { align: 'center' });
        doc.text(`${sheet.height} mm`, offsetX - 5, offsetY + (sheet.height * scale) / 2, { angle: 90, align: 'center' });
        
        // Part'ları çiz
        const maxPartsPerPage = 100; // Performans için limit
        const partsToRender = sheet.placedParts.slice(0, maxPartsPerPage);
        
        if (sheet.placedParts.length > maxPartsPerPage) {
          console.warn(`Sheet has ${sheet.placedParts.length} parts, rendering first ${maxPartsPerPage} for performance`);
        }
        
        partsToRender.forEach((part, partIdx) => {
          try {
            const px = offsetX + part.x * scale;
            const py = offsetY + part.y * scale;
            const pw = part.width * scale;
            const ph = part.height * scale;
            
            // Part rengi (her part farklı ton)
            const hue = (partIdx * 137.5) % 360; // Golden angle için
            const rgb = hslToRgb(hue, 70, 85);
            
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.setDrawColor(50, 50, 50);
            doc.setLineWidth(0.2);
            
            // Rotation varsa
            if (part.rotation && part.rotation !== 0) {
              doc.saveGraphicsState();
              
              const centerX = px + pw / 2;
              const centerY = py + ph / 2;
              
              // Rotate around center
              const rad = (part.rotation * Math.PI) / 180;
              doc.setTransformationMatrix(
                Math.cos(rad),
                Math.sin(rad),
                -Math.sin(rad),
                Math.cos(rad),
                centerX,
                centerY
              );
              
              // Gerçek path'i çiz (path varsa)
              if (part.path && part.path.trim() !== '') {
                try {
                  drawSVGPath(doc, part.path, -pw / 2, -ph / 2, scale, part.width, part.height);
                } catch (e) {
                  // Path çizimi başarısızsa dikdörtgen çiz
                  doc.rect(-pw / 2, -ph / 2, pw, ph, 'FD');
                }
              } else {
                doc.rect(-pw / 2, -ph / 2, pw, ph, 'FD');
              }
              
              // Part ismi
              doc.setFontSize(6);
              doc.setTextColor(50, 50, 50);
              doc.text(part.name, 0, 0, { align: 'center' });
              
              doc.restoreGraphicsState();
            } else {
              // Gerçek path'i çiz (path varsa)
              if (part.path && part.path.trim() !== '') {
                try {
                  drawSVGPath(doc, part.path, px, py, scale, part.width, part.height);
                } catch (e) {
                  // Path çizimi başarısızsa dikdörtgen çiz
                  doc.rect(px, py, pw, ph, 'FD');
                }
              } else {
                doc.rect(px, py, pw, ph, 'FD');
              }
              
              // Part ismi
              doc.setFontSize(6);
              doc.setTextColor(50, 50, 50);
              doc.text(part.name, px + pw / 2, py + ph / 2, { align: 'center' });
            }
            
            // Part boyutları (küçük fontla)
            doc.setFontSize(5);
            doc.setTextColor(100, 100, 100);
            doc.text(`${part.width}×${part.height}`, px + pw / 2, py + ph + 3, { align: 'center' });
          } catch (partError) {
            // Tek bir part hata verirse diğerlerine devam et
            console.warn(`Part ${part.name} render error:`, partError);
          }
        });
        
        // === PARTS TABLE ===
        const tableY = pageHeight - margin - 25;
        
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, tableY, pageWidth - 2 * margin, 25, 'F');
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        
        // Başlıklar
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        const colWidth = (pageWidth - 2 * margin) / 5;
        doc.text('Part Adı', margin + 2, tableY + 5);
        doc.text('Boyut (mm)', margin + colWidth + 2, tableY + 5);
        doc.text('Pozisyon (mm)', margin + 2 * colWidth + 2, tableY + 5);
        doc.text('Rotasyon', margin + 3 * colWidth + 2, tableY + 5);
        doc.text('Alan (mm²)', margin + 4 * colWidth + 2, tableY + 5);
        
        // İlk 3 part'ı listele (alan kısıtlı)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
        partsToRender.slice(0, 3).forEach((part, i) => {
          const y = tableY + 10 + i * 5;
          doc.text(part.name, margin + 2, y);
          doc.text(`${part.width} × ${part.height}`, margin + colWidth + 2, y);
          doc.text(`(${part.x.toFixed(1)}, ${part.y.toFixed(1)})`, margin + 2 * colWidth + 2, y);
          doc.text(`${part.rotation}°`, margin + 3 * colWidth + 2, y);
          doc.text(`${(part.width * part.height).toFixed(0)}`, margin + 4 * colWidth + 2, y);
        });
        
        if (sheet.placedParts.length > 3) {
          doc.setTextColor(150, 150, 150);
          const remainingText = sheet.placedParts.length > maxPartsPerPage 
            ? `... ve ${sheet.placedParts.length - 3} parça daha (PDF'de ilk ${maxPartsPerPage} gösteriliyor)`
            : `... ve ${sheet.placedParts.length - 3} parça daha`;
          doc.text(remainingText, margin + 2, tableY + 24);
        }
        
        // Footer
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('SmartNest Pro | AI-Powered Nesting Solution', pageWidth / 2, pageHeight - 5, { align: 'center' });
      });
      
      // PDF'i blob olarak döndür
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      reject(error);
    }
  });
};

// SVG path'i jsPDF'e çizen helper fonksiyon
function drawSVGPath(
  doc: any,
  pathString: string,
  offsetX: number,
  offsetY: number,
  scale: number,
  originalWidth: number,
  originalHeight: number
) {
  // Basit SVG path komutlarını parse et
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
  
  if (!commands || commands.length === 0) {
    throw new Error('Invalid path');
  }
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  commands.forEach((cmd, idx) => {
    const type = cmd[0].toUpperCase();
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentX = offsetX + (coords[0] * scale);
          currentY = offsetY + (coords[1] * scale);
          startX = currentX;
          startY = currentY;
          
          if (idx === 0) {
            // İlk moveTo - path'i başlat
            doc.lines([[0, 0]], currentX, currentY, [scale, scale], 'FD');
          }
        }
        break;
        
      case 'L': // Line to
        if (coords.length >= 2) {
          const nextX = offsetX + (coords[0] * scale);
          const nextY = offsetY + (coords[1] * scale);
          
          doc.line(currentX, currentY, nextX, nextY);
          currentX = nextX;
          currentY = nextY;
        }
        break;
        
      case 'H': // Horizontal line
        if (coords.length >= 1) {
          const nextX = offsetX + (coords[0] * scale);
          doc.line(currentX, currentY, nextX, currentY);
          currentX = nextX;
        }
        break;
        
      case 'V': // Vertical line
        if (coords.length >= 1) {
          const nextY = offsetY + (coords[1] * scale);
          doc.line(currentX, currentY, currentX, nextY);
          currentY = nextY;
        }
        break;
        
      case 'Z': // Close path
        if (currentX !== startX || currentY !== startY) {
          doc.line(currentX, currentY, startX, startY);
        }
        currentX = startX;
        currentY = startY;
        break;
        
      // A (Arc) ve C (Cubic Bezier) gibi karmaşık komutlar için basitleştirilmiş çizim
      case 'A':
      case 'C':
      case 'S':
      case 'Q':
        // Bu komutlar için son noktaya düz çizgi çek
        if (coords.length >= 2) {
          const lastIdx = coords.length - 2;
          const nextX = offsetX + (coords[lastIdx] * scale);
          const nextY = offsetY + (coords[lastIdx + 1] * scale);
          doc.line(currentX, currentY, nextX, nextY);
          currentX = nextX;
          currentY = nextY;
        }
        break;
    }
  });
}

// HSL'den RGB'ye çevirme helper
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}
