/**
 * DXF Parser Service
 * Basit DXF dosyalarını parse ederek path bilgisi çıkarır
 * Not: Tam DXF parser karmaşıktır, burada temel entity'leri destekliyoruz
 */

export interface ParsedDXF {
  path: string;
  width: number;
  height: number;
  entities: string[];
}

export const parseDXF = (dxfContent: string): ParsedDXF | null => {
  try {
    const lines = dxfContent.split('\n').map(l => l.trim());
    const entities: any[] = [];
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // DXF'te ENTITIES section'ını bul
    let inEntities = false;
    let currentEntity: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'ENTITIES') {
        inEntities = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inEntities) {
        break;
      }
      
      if (!inEntities) continue;
      
      // Entity type
      if (lines[i] === '0' && i + 1 < lines.length) {
        if (currentEntity) entities.push(currentEntity);
        
        const entityType = lines[i + 1];
        currentEntity = { type: entityType, data: {} };
        i++;
        continue;
      }
      
      // Group code ve değer
      const groupCode = parseInt(line);
      if (!isNaN(groupCode) && i + 1 < lines.length) {
        const value = lines[i + 1];
        
        if (groupCode === 10) currentEntity.data.x1 = parseFloat(value);
        if (groupCode === 20) currentEntity.data.y1 = parseFloat(value);
        if (groupCode === 11) currentEntity.data.x2 = parseFloat(value);
        if (groupCode === 21) currentEntity.data.y2 = parseFloat(value);
        if (groupCode === 40) currentEntity.data.radius = parseFloat(value);
        
        i++;
      }
    }
    
    if (currentEntity) entities.push(currentEntity);
    
    // Entity'leri path'e çevir
    const pathParts: string[] = [];
    
    entities.forEach(entity => {
      const { type, data } = entity;
      
      switch (type) {
        case 'LINE':
          if (data.x1 !== undefined && data.y1 !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
            pathParts.push(`M${data.x1},${-data.y1} L${data.x2},${-data.y2}`);
            updateBounds(data.x1, data.y1);
            updateBounds(data.x2, data.y2);
          }
          break;
          
        case 'CIRCLE':
          if (data.x1 !== undefined && data.y1 !== undefined && data.radius !== undefined) {
            const cx = data.x1;
            const cy = -data.y1;
            const r = data.radius;
            
            pathParts.push(
              `M ${cx - r},${cy} ` +
              `A ${r},${r} 0 0,1 ${cx},${cy - r} ` +
              `A ${r},${r} 0 0,1 ${cx + r},${cy} ` +
              `A ${r},${r} 0 0,1 ${cx},${cy + r} ` +
              `A ${r},${r} 0 0,1 ${cx - r},${cy} Z`
            );
            
            updateBounds(cx - r, -cy - r);
            updateBounds(cx + r, -cy + r);
          }
          break;
          
        case 'LWPOLYLINE':
        case 'POLYLINE':
          // Polyline parsing daha karmaşık, basitleştirilmiş
          break;
      }
    });
    
    function updateBounds(x: number, y: number) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    if (pathParts.length === 0) {
      throw new Error('No valid entities found in DXF');
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Path'leri normalize et (0,0'dan başlasın)
    const normalizedPaths = pathParts.map(p => {
      return p.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (match, x, y) => {
        const nx = parseFloat(x) - minX;
        const ny = parseFloat(y) - minY;
        return `${nx.toFixed(2)},${ny.toFixed(2)}`;
      });
    });
    
    return {
      path: normalizedPaths.join(' '),
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      entities: entities.map(e => e.type)
    };
    
  } catch (error) {
    console.error('DXF Parse Error:', error);
    return null;
  }
};

