/**
 * DXF Export Service
 * Nesting sonuçlarını gerçek geometrilerle DXF formatına çevirir
 */

import { Sheet } from '../types';

export const exportDXF = (sheets: Sheet[]): string => {
  let dxf = '';
  
  // DXF Header
  dxf += '0\nSECTION\n';
  dxf += '2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000
  dxf += '9\n$INSUNITS\n70\n4\n'; // mm units
  dxf += '0\nENDSEC\n';
  
  // Tables Section
  dxf += '0\nSECTION\n';
  dxf += '2\nTABLES\n';
  
  // Layer table
  dxf += '0\nTABLE\n';
  dxf += '2\nLAYER\n';
  dxf += '70\n' + (sheets.length + 2) + '\n'; // Layer count
  
  // Layer 0 (default)
  dxf += '0\nLAYER\n';
  dxf += '2\n0\n';
  dxf += '70\n0\n';
  dxf += '62\n7\n'; // Color white
  
  // Sheet outline layer
  dxf += '0\nLAYER\n';
  dxf += '2\nSHEET_OUTLINE\n';
  dxf += '70\n0\n';
  dxf += '62\n5\n'; // Color blue
  
  // Part layers (her sheet için)
  sheets.forEach((sheet, idx) => {
    dxf += '0\nLAYER\n';
    dxf += `2\nSHEET_${idx + 1}_PARTS\n`;
    dxf += '70\n0\n';
    dxf += `62\n${(idx % 6) + 1}\n`; // Farklı renkler
  });
  
  dxf += '0\nENDTAB\n';
  dxf += '0\nENDSEC\n';
  
  // Entities Section
  dxf += '0\nSECTION\n';
  dxf += '2\nENTITIES\n';
  
  let offsetX = 0;
  
  sheets.forEach((sheet, sheetIdx) => {
    // Sheet outline (dikdörtgen)
    dxf += '0\nLWPOLYLINE\n';
    dxf += '8\nSHEET_OUTLINE\n';
    dxf += '90\n4\n';
    dxf += '70\n1\n';
    dxf += `10\n${offsetX}\n20\n0\n`;
    dxf += `10\n${offsetX + sheet.width}\n20\n0\n`;
    dxf += `10\n${offsetX + sheet.width}\n20\n${sheet.height}\n`;
    dxf += `10\n${offsetX}\n20\n${sheet.height}\n`;
    
    // Part'ları gerçek geometrileriyle çiz
    sheet.placedParts.forEach(part => {
      const baseX = offsetX + part.x;
      const baseY = part.y;
      const rotation = part.rotation || 0;
      
      // Gerçek path'i DXF'e çevir
      if (part.path && part.path.trim() !== '') {
        try {
          const dxfPath = convertSVGPathToDXF(
            part.path,
            baseX,
            baseY,
            rotation,
            `SHEET_${sheetIdx + 1}_PARTS`
          );
          dxf += dxfPath;
        } catch (e) {
          console.warn(`Part ${part.name} path conversion failed, using bounding box`, e);
          // Fallback: Bounding box
          dxf += createRotatedRectangle(baseX, baseY, part.width, part.height, rotation, `SHEET_${sheetIdx + 1}_PARTS`);
        }
      } else {
        // Path yoksa dikdörtgen çiz
        dxf += createRotatedRectangle(baseX, baseY, part.width, part.height, rotation, `SHEET_${sheetIdx + 1}_PARTS`);
      }
      
      // Part ismini text olarak ekle
      dxf += '0\nTEXT\n';
      dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
      dxf += `10\n${baseX.toFixed(3)}\n`;
      dxf += `20\n${baseY.toFixed(3)}\n`;
      dxf += '40\n10\n'; // Text height
      dxf += `1\n${part.name}\n`;
      
      // Rotasyon varsa text'i de döndür
      if (rotation !== 0) {
        dxf += `50\n${rotation}\n`;
      }
    });
    
    offsetX += sheet.width + 100; // Sheet'ler arası boşluk
  });
  
  dxf += '0\nENDSEC\n';
  dxf += '0\nEOF\n';
  
  return dxf;
};

/**
 * SVG path'i DXF entity'lerine çevirir
 */
function convertSVGPathToDXF(
  pathString: string,
  offsetX: number,
  offsetY: number,
  rotation: number,
  layerName: string
): string {
  let dxf = '';
  
  // SVG path komutlarını parse et
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
  if (!commands || commands.length === 0) {
    throw new Error('Invalid path');
  }
  
  const points: { x: number; y: number }[] = [];
  let currentX = 0;
  let currentY = 0;
  
  // Path'i noktalara çevir
  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'L': // Line to
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'H': // Horizontal line
        if (coords.length >= 1) {
          currentX = coords[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V': // Vertical line
        if (coords.length >= 1) {
          currentY = coords[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C': // Cubic Bezier (basitleştirilmiş - sadece son nokta)
        if (coords.length >= 6) {
          currentX = coords[4];
          currentY = coords[5];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'S': // Smooth Cubic Bezier (basitleştirilmiş)
        if (coords.length >= 4) {
          currentX = coords[2];
          currentY = coords[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Q': // Quadratic Bezier (basitleştirilmiş)
        if (coords.length >= 4) {
          currentX = coords[2];
          currentY = coords[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'A': // Arc (basitleştirilmiş - sadece son nokta)
        if (coords.length >= 7) {
          currentX = coords[5];
          currentY = coords[6];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Z': // Close path - ilk noktaya geri dön
        if (points.length > 0) {
          points.push({ x: points[0].x, y: points[0].y });
        }
        break;
    }
  });
  
  if (points.length < 2) {
    throw new Error('Not enough points');
  }
  
  // Rotasyonu ve offset'i uygula
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const transformedPoints = points.map(p => ({
    x: offsetX + (p.x * cos - p.y * sin),
    y: offsetY + (p.x * sin + p.y * cos)
  }));
  
  // DXF LWPOLYLINE oluştur
  dxf += '0\nLWPOLYLINE\n';
  dxf += `8\n${layerName}\n`;
  dxf += `90\n${transformedPoints.length}\n`; // Vertex count
  dxf += '70\n1\n'; // Closed flag
  
  transformedPoints.forEach(p => {
    dxf += `10\n${p.x.toFixed(3)}\n`;
    dxf += `20\n${p.y.toFixed(3)}\n`;
  });
  
  return dxf;
}

/**
 * Döndürülmüş dikdörtgen oluşturur
 */
function createRotatedRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  layerName: string
): string {
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];
  
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const rotatedCorners = corners.map(c => ({
    x: x + (c.x * cos - c.y * sin),
    y: y + (c.x * sin + c.y * cos)
  }));
  
  let dxf = '0\nLWPOLYLINE\n';
  dxf += `8\n${layerName}\n`;
  dxf += '90\n4\n';
  dxf += '70\n1\n';
  
  rotatedCorners.forEach(corner => {
    dxf += `10\n${corner.x.toFixed(3)}\n`;
    dxf += `20\n${corner.y.toFixed(3)}\n`;
  });
  
  return dxf;
}
