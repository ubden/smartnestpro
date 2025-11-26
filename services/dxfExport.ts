/**
 * DXF Export Service
 * Canvas rendering logic ile %100 uyumlu
 */

import { Sheet } from '../types';

export const exportDXF = (sheets: Sheet[]): string => {
  let dxf = '';
  
  console.log(`DXF Export: ${sheets.length} sheets`);
  
  // Header
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n';
  dxf += '9\n$INSUNITS\n70\n4\n'; // mm
  dxf += '0\nENDSEC\n';
  
  // Tables
  dxf += '0\nSECTION\n2\nTABLES\n';
  dxf += '0\nTABLE\n2\nLAYER\n70\n' + (sheets.length + 2) + '\n';
  
  dxf += '0\nLAYER\n2\n0\n70\n0\n62\n7\n';
  dxf += '0\nLAYER\n2\nSHEET_OUTLINE\n70\n0\n62\n5\n';
  
  sheets.forEach((sheet, idx) => {
    dxf += `0\nLAYER\n2\nSHEET_${idx + 1}_PARTS\n70\n0\n62\n${(idx % 6) + 1}\n`;
  });
  
  dxf += '0\nENDTAB\n0\nENDSEC\n';
  
  // Entities
  dxf += '0\nSECTION\n2\nENTITIES\n';
  
  let sheetOffsetX = 0;
  
  sheets.forEach((sheet, sheetIdx) => {
    console.log(`DXF Sheet ${sheetIdx + 1}: ${sheet.placedParts.length} parts`);
    
    // Sheet outline
    dxf += '0\nLWPOLYLINE\n';
    dxf += '8\nSHEET_OUTLINE\n';
    dxf += '90\n4\n70\n1\n';
    dxf += `10\n${sheetOffsetX}\n20\n0\n`;
    dxf += `10\n${sheetOffsetX + sheet.width}\n20\n0\n`;
    dxf += `10\n${sheetOffsetX + sheet.width}\n20\n${sheet.height}\n`;
    dxf += `10\n${sheetOffsetX}\n20\n${sheet.height}\n`;
    
    let rendered = 0;
    
    // Part'ları çiz - Canvas mantığı
    sheet.placedParts.forEach((part, idx) => {
      try {
        // Canvas: translate(part.x, part.y)
        const baseX = sheetOffsetX + part.x;
        const baseY = part.y;
        
        // Canvas: translate(visualOffsetX, visualOffsetY) rotate(rotation) translate(-width/2, -height/2)
        const rotation = part.rotation || 0;
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        // Canvas'ta path varsa path kullan, yoksa rect
        if (part.path && part.path.trim()) {
          try {
            const points = parseSVGPath(part.path);
            
            if (points.length >= 3) {
              // Transform: visualOffset + rotation + translate(-w/2, -h/2)
              const transformedPoints = points.map(p => {
                // Merkeze taşı
                let x = p.x - part.width / 2;
                let y = p.y - part.height / 2;
                
                // Rotasyon
                const xRot = x * cos - y * sin;
                const yRot = x * sin + y * cos;
                
                // visualOffset ekle
                return {
                  x: baseX + part.visualOffsetX + xRot,
                  y: baseY + part.visualOffsetY + yRot
                };
              });
              
              // LWPOLYLINE
              dxf += '0\nLWPOLYLINE\n';
              dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
              dxf += `90\n${transformedPoints.length}\n`;
              dxf += '70\n1\n'; // Closed
              
              transformedPoints.forEach(p => {
                dxf += `10\n${p.x.toFixed(3)}\n`;
                dxf += `20\n${p.y.toFixed(3)}\n`;
              });
              
              rendered++;
            } else {
              throw new Error('Not enough points');
            }
          } catch (pathError) {
            console.warn(`Part ${part.name} path failed, using rect`);
            addRotatedRect(dxf, baseX, baseY, part.width, part.height, rotation, `SHEET_${sheetIdx + 1}_PARTS`);
            rendered++;
          }
        } else {
          // Path yok - dikdörtgen
          const corners = [
            { x: 0, y: 0 },
            { x: part.width, y: 0 },
            { x: part.width, y: part.height },
            { x: 0, y: part.height }
          ];
          
          const centerX = part.width / 2;
          const centerY = part.height / 2;
          
          const transformed = corners.map(c => {
            const x = c.x - centerX;
            const y = c.y - centerY;
            return {
              x: baseX + (x * cos - y * sin),
              y: baseY + (x * sin + y * cos)
            };
          });
          
          dxf += '0\nLWPOLYLINE\n';
          dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
          dxf += '90\n4\n70\n1\n';
          
          transformed.forEach(p => {
            dxf += `10\n${p.x.toFixed(3)}\n`;
            dxf += `20\n${p.y.toFixed(3)}\n`;
          });
          
          rendered++;
        }
        
        // Part ismi
        const cleanName = cleanTurkishChars(part.name);
        dxf += '0\nTEXT\n';
        dxf += `8\nSHEET_${sheetIdx + 1}_PARTS\n`;
        dxf += `10\n${baseX.toFixed(3)}\n`;
        dxf += `20\n${baseY.toFixed(3)}\n`;
        dxf += '40\n8\n';
        dxf += `1\n${cleanName} (${idx + 1})\n`;
        
        if (rotation !== 0) {
          dxf += `50\n${rotation}\n`;
        }
        
      } catch (err) {
        console.error(`DXF Part ${part.name} error:`, err);
      }
    });
    
    console.log(`DXF Sheet ${sheetIdx + 1}: Rendered ${rendered} parts`);
    
    sheetOffsetX += sheet.width + 100;
  });
  
  dxf += '0\nENDSEC\n0\nEOF\n';
  
  console.log('DXF Export completed');
  return dxf;
};

// SVG path'i 2D noktalara çevir
function parseSVGPath(pathString: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
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
      case 'M':
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          startX = currentX;
          startY = currentY;
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'L':
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'H':
        if (values.length >= 1) {
          currentX = values[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V':
        if (values.length >= 1) {
          currentY = values[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C':
        if (values.length >= 6) {
          currentX = values[4];
          currentY = values[5];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'S':
        if (values.length >= 4) {
          currentX = values[2];
          currentY = values[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Q':
        if (values.length >= 4) {
          currentX = values[2];
          currentY = values[3];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'A':
        if (values.length >= 7) {
          currentX = values[5];
          currentY = values[6];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'Z':
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

function addRotatedRect(
  dxf: string,
  baseX: number,
  baseY: number,
  width: number,
  height: number,
  rotation: number,
  layer: string
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
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  const transformed = corners.map(c => {
    const x = c.x - centerX;
    const y = c.y - centerY;
    return {
      x: baseX + (x * cos - y * sin),
      y: baseY + (x * sin + y * cos)
    };
  });
  
  dxf += '0\nLWPOLYLINE\n';
  dxf += `8\n${layer}\n`;
  dxf += '90\n4\n70\n1\n';
  
  transformed.forEach(p => {
    dxf += `10\n${p.x.toFixed(3)}\n`;
    dxf += `20\n${p.y.toFixed(3)}\n`;
  });
  
  return dxf;
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
