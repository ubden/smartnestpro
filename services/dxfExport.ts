/**
 * DXF Export Service - Canvas Accurate Version
 * Canvas'taki gerçek yerleşimi %100 yansıtır
 */

import { Sheet } from '../types';

export const exportDXF = (sheets: Sheet[]): string => {
  let dxf = '';
  
  console.log(`DXF Export starting: ${sheets.length} sheets`);
  
  // === HEADER ===
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000
  dxf += '9\n$INSUNITS\n70\n4\n'; // mm
  dxf += '0\nENDSEC\n';
  
  // === TABLES ===
  dxf += '0\nSECTION\n2\nTABLES\n';
  
  // Layer table
  dxf += '0\nTABLE\n2\nLAYER\n70\n' + (sheets.length + 2) + '\n';
  
  // Default layer
  dxf += '0\nLAYER\n2\n0\n70\n0\n62\n7\n';
  
  // Sheet outline layer
  dxf += '0\nLAYER\n2\nSHEET_OUTLINE\n70\n0\n62\n5\n';
  
  // Part layers
  sheets.forEach((sheet, idx) => {
    dxf += `0\nLAYER\n2\nSHEET_${idx + 1}_PARTS\n70\n0\n62\n${(idx % 6) + 1}\n`;
  });
  
  dxf += '0\nENDTAB\n0\nENDSEC\n';
  
  // === ENTITIES ===
  dxf += '0\nSECTION\n2\nENTITIES\n';
  
  let sheetOffsetX = 0;
  
  sheets.forEach((sheet, sheetIdx) => {
    console.log(`DXF Sheet ${sheetIdx + 1}: ${sheet.placedParts.length} parts`);
    
    // Sheet outline
    dxf += '0\nLWPOLYLINE\n';
    dxf += '8\nSHEET_OUTLINE\n';
    dxf += '90\n4\n';
    dxf += '70\n1\n'; // Closed
    dxf += `10\n${sheetOffsetX}\n20\n0\n`;
    dxf += `10\n${sheetOffsetX + sheet.width}\n20\n0\n`;
    dxf += `10\n${sheetOffsetX + sheet.width}\n20\n${sheet.height}\n`;
    dxf += `10\n${sheetOffsetX}\n20\n${sheet.height}\n`;
    
    // Part'ları çiz - Canvas pozisyonlarını kullan
    let renderedCount = 0;
    
    sheet.placedParts.forEach((part, partIdx) => {
      try {
        // Canvas'taki GERÇEK pozisyon
        const baseX = sheetOffsetX + part.x;
        const baseY = part.y;
        const rotation = part.rotation || 0;
        
        // Dikdörtgen köşeleri (rotasyon öncesi)
        const corners = [
          { x: 0, y: 0 },
          { x: part.width, y: 0 },
          { x: part.width, y: part.height },
          { x: 0, y: part.height }
        ];
        
        // Rotasyon transform
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const transformedCorners = corners.map(c => ({
          x: baseX + (c.x * cos - c.y * sin),
          y: baseY + (c.x * sin + c.y * cos)
        }));
        
        // LWPOLYLINE
        dxf += '0\nLWPOLYLINE\n';
        dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
        dxf += '90\n4\n';
        dxf += '70\n1\n'; // Closed
        
        transformedCorners.forEach(corner => {
          dxf += `10\n${corner.x.toFixed(3)}\n`;
          dxf += `20\n${corner.y.toFixed(3)}\n`;
        });
        
        // Part ismi (TEXT)
        const cleanName = cleanTurkishChars(part.name);
        dxf += '0\nTEXT\n';
        dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
        dxf += `10\n${baseX.toFixed(3)}\n`;
        dxf += `20\n${baseY.toFixed(3)}\n`;
        dxf += '40\n8\n'; // Text height
        dxf += `1\n${cleanName}\n`;
        
        if (rotation !== 0) {
          dxf += `50\n${rotation}\n`;
        }
        
        renderedCount++;
        
      } catch (err) {
        console.error(`DXF Part ${part.name} error:`, err);
      }
    });
    
    console.log(`DXF Sheet ${sheetIdx + 1}: Rendered ${renderedCount} parts`);
    
    // Sonraki sheet için offset
    sheetOffsetX += sheet.width + 100;
  });
  
  dxf += '0\nENDSEC\n0\nEOF\n';
  
  console.log('DXF Export completed');
  return dxf;
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
