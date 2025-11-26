/**
 * DXF Export Service
 * Nesting sonuçlarını DXF formatına çevirir
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
    dxf += '8\nSHEET_OUTLINE\n'; // Layer
    dxf += '90\n4\n'; // Vertex count
    dxf += '70\n1\n'; // Closed
    dxf += `10\n${offsetX}\n`;
    dxf += `20\n0\n`;
    dxf += `10\n${offsetX + sheet.width}\n`;
    dxf += `20\n0\n`;
    dxf += `10\n${offsetX + sheet.width}\n`;
    dxf += `20\n${sheet.height}\n`;
    dxf += `10\n${offsetX}\n`;
    dxf += `20\n${sheet.height}\n`;
    
    // Part'ları çiz
    sheet.placedParts.forEach(part => {
      const path = part.path || `M0,0 L${part.width},0 L${part.width},${part.height} L0,${part.height} Z`;
      
      // Path'i DXF entity'lerine çevir (basitleştirilmiş)
      // Bu örnekte sadece bounding box çiziyoruz
      const x = offsetX + part.x;
      const y = part.y;
      
      // Rotasyonu uygula
      const rad = (part.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      // Part bounding box
      const corners = [
        { x: 0, y: 0 },
        { x: part.width, y: 0 },
        { x: part.width, y: part.height },
        { x: 0, y: part.height }
      ];
      
      const rotatedCorners = corners.map(c => ({
        x: x + c.x * cos - c.y * sin,
        y: y + c.x * sin + c.y * cos
      }));
      
      dxf += '0\nLWPOLYLINE\n';
      dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
      dxf += '90\n4\n';
      dxf += '70\n1\n'; // Closed
      
      rotatedCorners.forEach(corner => {
        dxf += `10\n${corner.x.toFixed(3)}\n`;
        dxf += `20\n${corner.y.toFixed(3)}\n`;
      });
      
      // Part ismini text olarak ekle
      dxf += '0\nTEXT\n';
      dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
      dxf += `10\n${x.toFixed(3)}\n`;
      dxf += `20\n${y.toFixed(3)}\n`;
      dxf += '40\n10\n'; // Text height
      dxf += `1\n${part.name}\n`;
    });
    
    offsetX += sheet.width + 100; // Sheet'ler arası boşluk
  });
  
  dxf += '0\nENDSEC\n';
  dxf += '0\nEOF\n';
  
  return dxf;
};

