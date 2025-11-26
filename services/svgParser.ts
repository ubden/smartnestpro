/**
 * SVG Parser Service
 * Gerçek SVG dosyalarını parse ederek path ve boyut bilgilerini çıkarır
 */

export interface ParsedShape {
  path: string;
  width: number;
  height: number;
  viewBox?: { x: number; y: number; width: number; height: number };
}

export const parseSVG = (svgContent: string): ParsedShape | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) throw new Error('Invalid SVG');

    // ViewBox'tan boyutları al
    const viewBox = svg.getAttribute('viewBox');
    let width = parseFloat(svg.getAttribute('width') || '0');
    let height = parseFloat(svg.getAttribute('height') || '0');
    
    let vbX = 0, vbY = 0, vbW = 0, vbH = 0;
    
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/).map(v => parseFloat(v));
      [vbX, vbY, vbW, vbH] = parts;
      
      if (!width) width = vbW;
      if (!height) height = vbH;
    }

    // Tüm path'leri topla
    const paths: string[] = [];
    
    // <path> elementleri
    doc.querySelectorAll('path').forEach(pathEl => {
      const d = pathEl.getAttribute('d');
      if (d) paths.push(d);
    });
    
    // <rect> elementleri
    doc.querySelectorAll('rect').forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const w = parseFloat(rect.getAttribute('width') || '0');
      const h = parseFloat(rect.getAttribute('height') || '0');
      paths.push(`M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`);
    });
    
    // <circle> elementleri
    doc.querySelectorAll('circle').forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      
      // Circle'ı path'e çevir
      paths.push(
        `M ${cx - r},${cy} ` +
        `A ${r},${r} 0 0,1 ${cx},${cy - r} ` +
        `A ${r},${r} 0 0,1 ${cx + r},${cy} ` +
        `A ${r},${r} 0 0,1 ${cx},${cy + r} ` +
        `A ${r},${r} 0 0,1 ${cx - r},${cy} Z`
      );
    });
    
    // <ellipse> elementleri
    doc.querySelectorAll('ellipse').forEach(ellipse => {
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '0');
      const ry = parseFloat(ellipse.getAttribute('ry') || '0');
      
      paths.push(
        `M ${cx - rx},${cy} ` +
        `A ${rx},${ry} 0 0,1 ${cx},${cy - ry} ` +
        `A ${rx},${ry} 0 0,1 ${cx + rx},${cy} ` +
        `A ${rx},${ry} 0 0,1 ${cx},${cy + ry} ` +
        `A ${rx},${ry} 0 0,1 ${cx - rx},${cy} Z`
      );
    });
    
    // <polygon> ve <polyline> elementleri
    doc.querySelectorAll('polygon, polyline').forEach(poly => {
      const points = poly.getAttribute('points');
      if (!points) return;
      
      const coords = points.trim().split(/\s+|,/).map(v => parseFloat(v));
      if (coords.length < 4) return;
      
      let pathStr = `M${coords[0]},${coords[1]}`;
      for (let i = 2; i < coords.length; i += 2) {
        pathStr += ` L${coords[i]},${coords[i + 1]}`;
      }
      if (poly.tagName.toLowerCase() === 'polygon') {
        pathStr += ' Z';
      }
      paths.push(pathStr);
    });

    if (paths.length === 0) {
      throw new Error('No valid shapes found in SVG');
    }

    // Tüm path'leri birleştir
    const combinedPath = paths.join(' ');

    // Eğer boyut yoksa, path'ten hesapla
    if (!width || !height) {
      const bbox = calculatePathBounds(combinedPath);
      width = bbox.width;
      height = bbox.height;
    }

    return {
      path: combinedPath,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      viewBox: viewBox ? { x: vbX, y: vbY, width: vbW, height: vbH } : undefined
    };
  } catch (error) {
    console.error('SVG Parse Error:', error);
    return null;
  }
};

// Path'ten bounding box hesapla (basitleştirilmiş)
const calculatePathBounds = (path: string): { width: number; height: number } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 100, height: 100 };
  
  const p = new Path2D(path);
  canvas.width = 2000;
  canvas.height = 2000;
  
  ctx.fillStyle = 'black';
  ctx.fill(p);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
  let hasPixels = false;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      if (data[idx + 3] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        hasPixels = true;
      }
    }
  }
  
  if (!hasPixels) return { width: 100, height: 100 };
  
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
};

// SVG string'ten data URL oluştur (preview için)
export const svgToDataUrl = (svgContent: string): string => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
};

