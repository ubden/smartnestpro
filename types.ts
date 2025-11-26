
export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
  sheetId: string;
  rotation: number; // Degrees 0-360
}

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  color: string;
  path?: string; // SVG Path Data (d attribute)
}

export interface StockItem {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number; // Available quantity in stock
}

export interface PlacedPart extends Part {
  x: number;
  y: number;
  sheetId: string;
  rotation: number;
  // These offsets are crucial for rendering arbitrary rotations correctly
  // They represent the shift needed to bring the rotated shape's bbox to (0,0)
  visualOffsetX: number;
  visualOffsetY: number;
}

export interface Sheet {
  id: string;
  width: number;
  height: number;
  placedParts: PlacedPart[];
  efficiency: number; // 0-100
  waste: number;
}

export interface AIAnalysisResult {
  score: number;
  summary: string;
  recommendations: string[];
  materialGrade: string;
}

export interface NestingStats {
  totalParts: number;
  placedParts: number;
  totalSheets: number;
  globalEfficiency: number;
  wasteArea: number;
}
