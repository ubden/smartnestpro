

export const DEFAULT_SHEET_WIDTH = 2400;
export const DEFAULT_SHEET_HEIGHT = 1200;

export const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const MOCK_PARTS = [
  { 
    id: '1', 
    name: 'Interlock L', 
    width: 300, 
    height: 300, 
    quantity: 6, 
    color: '#6366f1',
    // L-Shape designed to nest
    path: 'M0,0 L300,0 L300,100 L100,100 L100,300 L0,300 Z' 
  },
  { 
    id: '2', 
    name: 'Tetris T', 
    width: 300, 
    height: 200, 
    quantity: 8, 
    color: '#ec4899',
    // T-Shape
    path: 'M0,0 L300,0 L300,60 L180,60 L180,200 L120,200 L120,60 L0,60 Z'
  },
  { 
    id: '3', 
    name: 'Triangle 45', 
    width: 200, 
    height: 200, 
    quantity: 12, 
    color: '#10b981',
    // Triangle
    path: 'M0,0 L200,0 L0,200 Z'
  },
  { 
    id: '4', 
    name: 'Notched Plate', 
    width: 250, 
    height: 150, 
    quantity: 10, 
    color: '#f59e0b',
    // Rect with notch
    path: 'M0,0 L250,0 L250,150 L150,150 L150,80 L100,80 L100,150 L0,150 Z'
  },
  {
    id: '5',
    name: 'Hex Bolt',
    width: 150,
    height: 130,
    quantity: 15,
    color: '#06b6d4',
    // Hexagon
    path: 'M37.5,0 L112.5,0 L150,65 L112.5,130 L37.5,130 L0,65 Z'
  },
  {
    id: '6',
    name: 'Ellipse Disk',
    width: 200,
    height: 150,
    quantity: 8,
    color: '#ec4899',
    // Approx Ellipse
    path: 'M100,0 C155.23,0 200,33.58 200,75 C200,116.42 155.23,150 100,150 C44.77,150 0,116.42 0,75 C0,33.58 44.77,0 100,0 Z'
  },
  {
      id: '7',
      name: 'Butterfly Valve',
      width: 200,
      height: 200,
      quantity: 6,
      color: '#8b5cf6',
      // Realistic Curved Butterfly/Bowtie shape using Cubic Bezier (C)
      path: 'M0,0 C80,60 80,140 0,200 L200,200 C120,140 120,60 200,0 Z'
  }
];
