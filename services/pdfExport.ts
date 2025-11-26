/**
 * PDF Technical Drawing Export Service - Canvas Accurate Version
 * Canvas'taki gerçek yerleşimi %100 yansıtır
 */

import { Sheet, NestingStats } from '../types';
import { jsPDF } from 'jspdf';

export const exportPDF = (sheets: Sheet[], stats: NestingStats, stockName: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // PDF sayfa boyutları
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      
      sheets.forEach((sheet, sheetIdx) => {
        if (sheetIdx > 0) doc.addPage();
        
        console.log(`PDF Export - Sheet ${sheetIdx + 1}: ${sheet.placedParts.length} parts`);
        
        // === HEADER ===
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, margin, pageWidth - 2 * margin, 25, 'F');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        // Türkçe karakter desteği için basit karakterler kullan
        doc.text('SmartNest Pro - Teknik Cizim', margin + 5, margin + 8);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sheet ${sheetIdx + 1} / ${sheets.length}`, margin + 5, margin + 15);
        doc.text(`Stok: ${stockName}`, margin + 5, margin + 20);
        
        const date = new Date().toLocaleDateString('tr-TR');
        doc.text(date, pageWidth - margin - 40, margin + 8);
        
        // === STATS BOX ===
        const statsX = pageWidth - margin - 80;
        const statsY = margin + 12;
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.rect(statsX, statsY, 75, 25, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Istatistikler:', statsX + 3, statsY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Parca: ${sheet.placedParts.length}`, statsX + 3, statsY + 10);
        doc.text(`Verim: ${sheet.efficiency.toFixed(1)}%`, statsX + 3, statsY + 15);
        doc.text(`Fire: ${(sheet.waste / 1000).toFixed(2)} m2`, statsX + 3, statsY + 20);
        
        // === DRAWING AREA ===
        const drawingY = margin + 45;
        const drawingHeight = pageHeight - drawingY - margin - 30;
        const drawingWidth = pageWidth - 2 * margin;
        
        // Border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.rect(margin, drawingY, drawingWidth, drawingHeight, 'S');
        
        // Scale hesapla - Canvas ile aynı mantık
        const scaleX = drawingWidth / sheet.width;
        const scaleY = drawingHeight / sheet.height;
        const scale = Math.min(scaleX, scaleY) * 0.92;
        
        const offsetX = margin + (drawingWidth - sheet.width * scale) / 2;
        const offsetY = drawingY + (drawingHeight - sheet.height * scale) / 2;
        
        // Sheet outline
        doc.setDrawColor(0, 100, 200);
        doc.setLineWidth(0.3);
        doc.rect(offsetX, offsetY, sheet.width * scale, sheet.height * scale, 'S');
        
        doc.setFontSize(7);
        doc.setTextColor(0, 100, 200);
        doc.text(`${sheet.width} mm`, offsetX + (sheet.width * scale) / 2, offsetY - 3, { align: 'center' });
        
        // === PART'LARI ÇİZ ===
        let renderedCount = 0;
        let skippedCount = 0;
        
        sheet.placedParts.forEach((part, partIdx) => {
          try {
            // Canvas'taki GERÇEK pozisyon
            const partX = offsetX + part.x * scale;
            const partY = offsetY + part.y * scale;
            const partW = part.width * scale;
            const partH = part.height * scale;
            
            // Part rengi
            const hue = (partIdx * 137.5) % 360;
            const rgb = hslToRgb(hue, 70, 85);
            
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.setDrawColor(50, 50, 50);
            doc.setLineWidth(0.15);
            
            // Rotasyon uygula - Canvas'taki gibi
            const rotation = part.rotation || 0;
            
            if (rotation !== 0) {
              doc.saveGraphicsState();
              
              // Rotation center - part'ın merkezi
              const centerX = partX + partW / 2;
              const centerY = partY + partH / 2;
              
              const rad = (rotation * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              
              // Basit dikdörtgen çiz (rotasyonlu)
              const corners = [
                { x: -partW/2, y: -partH/2 },
                { x: partW/2, y: -partH/2 },
                { x: partW/2, y: partH/2 },
                { x: -partW/2, y: partH/2 }
              ];
              
              const rotated = corners.map(c => ({
                x: centerX + (c.x * cos - c.y * sin),
                y: centerY + (c.x * sin + c.y * cos)
              }));
              
              // Polygon çiz
              doc.lines(
                rotated.slice(1).map((p, i) => [
                  p.x - rotated[i].x,
                  p.y - rotated[i].y
                ]),
                rotated[0].x,
                rotated[0].y,
                [1, 1],
                'FD'
              );
              
              doc.restoreGraphicsState();
            } else {
              // Rotasyon yok - direkt dikdörtgen
              doc.rect(partX, partY, partW, partH, 'FD');
            }
            
            // Part ismi (Türkçe karakter olmadan)
            doc.setFontSize(5);
            doc.setTextColor(50, 50, 50);
            const cleanName = cleanTurkishChars(part.name);
            doc.text(cleanName, partX + partW/2, partY + partH/2, { align: 'center' });
            
            renderedCount++;
            
          } catch (err) {
            console.error(`Part ${part.name} render error:`, err);
            skippedCount++;
          }
        });
        
        console.log(`Rendered: ${renderedCount}, Skipped: ${skippedCount}`);
        
        // === PARTS TABLE ===
        const tableY = pageHeight - margin - 25;
        
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, tableY, pageWidth - 2 * margin, 25, 'F');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        const colWidth = (pageWidth - 2 * margin) / 5;
        doc.text('Part', margin + 2, tableY + 5);
        doc.text('Boyut (mm)', margin + colWidth + 2, tableY + 5);
        doc.text('Pozisyon (mm)', margin + 2 * colWidth + 2, tableY + 5);
        doc.text('Rotasyon', margin + 3 * colWidth + 2, tableY + 5);
        doc.text('Alan', margin + 4 * colWidth + 2, tableY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
        sheet.placedParts.slice(0, 3).forEach((part, i) => {
          const y = tableY + 10 + i * 5;
          const cleanName = cleanTurkishChars(part.name);
          doc.text(cleanName, margin + 2, y);
          doc.text(`${part.width} x ${part.height}`, margin + colWidth + 2, y);
          doc.text(`(${part.x.toFixed(1)}, ${part.y.toFixed(1)})`, margin + 2 * colWidth + 2, y);
          doc.text(`${part.rotation || 0} deg`, margin + 3 * colWidth + 2, y);
          doc.text(`${(part.width * part.height).toFixed(0)}`, margin + 4 * colWidth + 2, y);
        });
        
        if (sheet.placedParts.length > 3) {
          doc.setTextColor(150, 150, 150);
          doc.text(`... ve ${sheet.placedParts.length - 3} parca daha`, margin + 2, tableY + 24);
        }
        
        // Footer
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('SmartNest Pro | AI-Powered Nesting', pageWidth / 2, pageHeight - 5, { align: 'center' });
      });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      reject(error);
    }
  });
};

// Türkçe karakterleri temizle
function cleanTurkishChars(text: string): string {
  const map: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

// HSL to RGB
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
