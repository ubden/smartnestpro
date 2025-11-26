/**
 * PDF Technical Drawing Export Service
 * Canvas rendering logic ile %100 uyumlu
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
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      
      sheets.forEach((sheet, sheetIdx) => {
        if (sheetIdx > 0) doc.addPage();
        
        console.log(`PDF Sheet ${sheetIdx + 1}: ${sheet.placedParts.length} parts`);
        
        // Header
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, margin, pageWidth - 2 * margin, 25, 'F');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SmartNest Pro - Teknik Cizim', margin + 5, margin + 8);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sheet ${sheetIdx + 1} / ${sheets.length}`, margin + 5, margin + 15);
        doc.text(`Stok: ${stockName}`, margin + 5, margin + 20);
        
        const date = new Date().toLocaleDateString('tr-TR');
        doc.text(date, pageWidth - margin - 40, margin + 8);
        
        // Stats
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
        
        // Drawing area
        const drawingY = margin + 45;
        const drawingHeight = pageHeight - drawingY - margin - 30;
        const drawingWidth = pageWidth - 2 * margin;
        
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.rect(margin, drawingY, drawingWidth, drawingHeight, 'S');
        
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
        
        // PART'LARI ÇİZ - Canvas mantığı ile
        let rendered = 0;
        let skipped = 0;
        
        sheet.placedParts.forEach((part, idx) => {
          try {
            // Canvas transform mantığı: translate(part.x, part.y)
            const partBaseX = offsetX + part.x * scale;
            const partBaseY = offsetY + part.y * scale;
            
            // Canvas: translate(visualOffsetX, visualOffsetY) rotate(rotation) translate(-width/2, -height/2)
            const rotation = part.rotation || 0;
            const rad = (rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            // Part rengi
            const hue = (idx * 137.5) % 360;
            const rgb = hslToRgb(hue, 70, 85);
            
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.15);
            
            // Canvas'taki gibi: path varsa path çiz, yoksa rect
            if (part.path && part.path.trim()) {
              // SVG path'i parse et ve çiz
              try {
                const points = parseSVGPath(part.path);
                
                if (points.length > 0) {
                  // Transform: visualOffset + rotation + translate(-w/2, -h/2)
                  const transformedPoints = points.map(p => {
                    // Önce merkeze taşı
                    let x = p.x - part.width / 2;
                    let y = p.y - part.height / 2;
                    
                    // Rotasyon uygula
                    const xRot = x * cos - y * sin;
                    const yRot = x * sin + y * cos;
                    
                    // visualOffset ekle ve scale uygula
                    return {
                      x: partBaseX + (part.visualOffsetX + xRot) * scale,
                      y: partBaseY + (part.visualOffsetY + yRot) * scale
                    };
                  });
                  
                  // Polygon çiz
                  if (transformedPoints.length >= 3) {
                    doc.lines(
                      transformedPoints.slice(1).map((p, i) => [
                        p.x - transformedPoints[i].x,
                        p.y - transformedPoints[i].y
                      ]),
                      transformedPoints[0].x,
                      transformedPoints[0].y,
                      [1, 1],
                      'FD',
                      true // close path
                    );
                  }
                  
                  rendered++;
                } else {
                  throw new Error('No points');
                }
              } catch (pathError) {
                // Path parse başarısız - rect fallback
                console.warn(`Part ${part.name} path parse failed, using rect`);
                drawRotatedRect(doc, partBaseX, partBaseY, part.width, part.height, scale, rotation);
                rendered++;
              }
            } else {
              // Path yok - dikdörtgen çiz
              drawRotatedRect(doc, partBaseX, partBaseY, part.width, part.height, scale, rotation);
              rendered++;
            }
            
            // Part numarası
            doc.setFontSize(5);
            doc.setTextColor(255, 255, 255);
            doc.text(`${idx + 1}`, partBaseX, partBaseY, { align: 'center' });
            
          } catch (err) {
            console.error(`Part ${part.name} render error:`, err);
            skipped++;
          }
        });
        
        console.log(`PDF: Rendered ${rendered}, Skipped ${skipped}`);
        
        // Parts table
        const tableY = pageHeight - margin - 25;
        
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, tableY, pageWidth - 2 * margin, 25, 'F');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        const colWidth = (pageWidth - 2 * margin) / 5;
        doc.text('Part', margin + 2, tableY + 5);
        doc.text('Boyut', margin + colWidth + 2, tableY + 5);
        doc.text('Pozisyon', margin + 2 * colWidth + 2, tableY + 5);
        doc.text('Rot', margin + 3 * colWidth + 2, tableY + 5);
        doc.text('Alan', margin + 4 * colWidth + 2, tableY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
        sheet.placedParts.slice(0, 3).forEach((part, i) => {
          const y = tableY + 10 + i * 5;
          const cleanName = cleanTurkishChars(part.name);
          doc.text(cleanName, margin + 2, y);
          doc.text(`${part.width}x${part.height}`, margin + colWidth + 2, y);
          doc.text(`(${part.x.toFixed(0)},${part.y.toFixed(0)})`, margin + 2 * colWidth + 2, y);
          doc.text(`${part.rotation || 0}°`, margin + 3 * colWidth + 2, y);
          doc.text(`${(part.width * part.height).toFixed(0)}`, margin + 4 * colWidth + 2, y);
        });
        
        if (sheet.placedParts.length > 3) {
          doc.setTextColor(150, 150, 150);
          doc.text(`+ ${sheet.placedParts.length - 3} more`, margin + 2, tableY + 24);
        }
        
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('SmartNest Pro', pageWidth / 2, pageHeight - 5, { align: 'center' });
      });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      reject(error);
    }
  });
};

// SVG path'i 2D noktalara çevir
function parseSVGPath(pathString: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  // Basit path komutlarını parse et
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
  if (!commands) return points;
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const values = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // MoveTo
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          startX = currentX;
          startY = currentY;
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'L': // LineTo
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'H': // Horizontal
        if (values.length >= 1) {
          currentX = values[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V': // Vertical
        if (values.length >= 1) {
          currentY = values[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C': // Cubic bezier - basit approximation (son nokta)
        if (values.length >= 6) {
          currentX = values[4];
          currentY = values[5];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'S': // Smooth cubic
        if (values.length >= 4) {
          currentX = values[2];
          currentY = values[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Q': // Quadratic bezier
        if (values.length >= 4) {
          currentX = values[2];
          currentY = values[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'A': // Arc - basit approximation (son nokta)
        if (values.length >= 7) {
          currentX = values[5];
          currentY = values[6];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Z': // Close
        if (currentX !== startX || currentY !== startY) {
          points.push({ x: startX, y: startY });
        }
        currentX = startX;
        currentY = startY;
        break;
    }
  });
  
  return points;
}

// Rotasyonlu dikdörtgen çiz
function drawRotatedRect(
  doc: any,
  baseX: number,
  baseY: number,
  width: number,
  height: number,
  scale: number,
  rotation: number
) {
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];
  
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  const transformed = corners.map(c => {
    const x = c.x - centerX;
    const y = c.y - centerY;
    return {
      x: baseX + (x * cos - y * sin) * scale,
      y: baseY + (x * sin + y * cos) * scale
    };
  });
  
  doc.lines(
    transformed.slice(1).map((p, i) => [
      p.x - transformed[i].x,
      p.y - transformed[i].y
    ]),
    transformed[0].x,
    transformed[0].y,
    [1, 1],
    'FD',
    true
  );
}

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
