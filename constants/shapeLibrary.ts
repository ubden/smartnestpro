/**
 * Şekil Kütüphanesi
 * Varsayılan geometrik şekiller
 */

export interface ShapeTemplate {
  id: string;
  name: string;
  category: string;
  path: string;
  width: number;
  height: number;
  thumbnail?: string;
}

export const SHAPE_LIBRARY: ShapeTemplate[] = [
  // Temel Şekiller
  {
    id: 'rect',
    name: 'Dikdörtgen',
    category: 'Temel',
    path: 'M0,0 L200,0 L200,150 L0,150 Z',
    width: 200,
    height: 150
  },
  {
    id: 'square',
    name: 'Kare',
    category: 'Temel',
    path: 'M0,0 L150,0 L150,150 L0,150 Z',
    width: 150,
    height: 150
  },
  {
    id: 'circle',
    name: 'Daire',
    category: 'Temel',
    path: 'M 50,100 A 50,50 0 0,1 100,50 A 50,50 0 0,1 150,100 A 50,50 0 0,1 100,150 A 50,50 0 0,1 50,100 Z',
    width: 100,
    height: 100
  },
  {
    id: 'triangle',
    name: 'Üçgen',
    category: 'Temel',
    path: 'M100,0 L200,150 L0,150 Z',
    width: 200,
    height: 150
  },
  
  // L Profiller
  {
    id: 'l-profile',
    name: 'L Profil',
    category: 'Profiller',
    path: 'M0,0 L150,0 L150,30 L30,30 L30,150 L0,150 Z',
    width: 150,
    height: 150
  },
  {
    id: 'l-profile-rounded',
    name: 'L Profil (Yuvarlak)',
    category: 'Profiller',
    path: 'M0,0 L150,0 L150,30 Q145,30 145,35 L145,150 L30,150 L30,35 Q30,30 25,30 L0,30 Z',
    width: 150,
    height: 150
  },
  
  // T Profiller
  {
    id: 't-profile',
    name: 'T Profil',
    category: 'Profiller',
    path: 'M0,0 L200,0 L200,30 L115,30 L115,150 L85,150 L85,30 L0,30 Z',
    width: 200,
    height: 150
  },
  
  // U Profiller
  {
    id: 'u-profile',
    name: 'U Profil',
    category: 'Profiller',
    path: 'M0,0 L30,0 L30,120 L170,120 L170,0 L200,0 L200,150 L0,150 Z',
    width: 200,
    height: 150
  },
  
  // Brackets
  {
    id: 'bracket-simple',
    name: 'Basit Braket',
    category: 'Braketler',
    path: 'M0,0 L100,0 L100,40 Q95,40 95,45 L95,80 L150,80 L150,110 L95,110 L95,145 Q95,150 100,150 L0,150 Z',
    width: 150,
    height: 150
  },
  {
    id: 'bracket-mounting',
    name: 'Montaj Braketi',
    category: 'Braketler',
    path: 'M0,30 L0,0 L200,0 L200,30 L170,30 L170,120 L200,120 L200,150 L0,150 L0,120 L30,120 L30,30 Z',
    width: 200,
    height: 150
  },
  
  // Delikli Şekiller
  {
    id: 'plate-4holes',
    name: 'Plaka (4 Delik)',
    category: 'Plakalar',
    path: 'M0,0 L250,0 L250,150 L0,150 Z M20,20 A10,10 0 0,1 20,20 A10,10 0 0,1 20,20 M230,20 A10,10 0 0,1 230,20 M230,130 A10,10 0 0,1 230,130 M20,130 A10,10 0 0,1 20,130',
    width: 250,
    height: 150
  },
  
  // Hexagon
  {
    id: 'hexagon',
    name: 'Altıgen',
    category: 'Temel',
    path: 'M75,0 L150,43.3 L150,129.9 L75,173.2 L0,129.9 L0,43.3 Z',
    width: 150,
    height: 173
  },
  
  // Yıldız
  {
    id: 'star',
    name: 'Yıldız',
    category: 'Dekoratif',
    path: 'M100,0 L120,70 L190,70 L135,110 L160,180 L100,140 L40,180 L65,110 L10,70 L80,70 Z',
    width: 200,
    height: 180
  },
  
  // Oval
  {
    id: 'oval',
    name: 'Oval',
    category: 'Temel',
    path: 'M 50,100 A 50,100 0 0,1 150,100 A 50,100 0 0,1 50,100 Z',
    width: 100,
    height: 200
  },
  
  // Trapez
  {
    id: 'trapezoid',
    name: 'Trapez',
    category: 'Temel',
    path: 'M50,0 L150,0 L200,150 L0,150 Z',
    width: 200,
    height: 150
  },
  
  // Gear outline (simplified)
  {
    id: 'gear-outline',
    name: 'Dişli (Basit)',
    category: 'Mekanik',
    path: 'M90,0 L110,0 L110,20 L120,30 L110,40 L110,60 L120,70 L110,80 L110,100 L90,100 L90,80 L80,70 L90,60 L90,40 L80,30 L90,20 Z',
    width: 120,
    height: 100
  }
];

// Kategorilere göre şekilleri grupla
export const getShapesByCategory = (): Record<string, ShapeTemplate[]> => {
  const grouped: Record<string, ShapeTemplate[]> = {};
  
  SHAPE_LIBRARY.forEach(shape => {
    if (!grouped[shape.category]) {
      grouped[shape.category] = [];
    }
    grouped[shape.category].push(shape);
  });
  
  return grouped;
};

// ID'ye göre şekil bul
export const getShapeById = (id: string): ShapeTemplate | undefined => {
  return SHAPE_LIBRARY.find(s => s.id === id);
};

