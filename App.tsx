
import React, { useState, useRef } from 'react';
import { Settings, Play, Plus, Trash2, Layers, Download, Upload, Maximize2, FileCode, AlertCircle, Package, Cuboid, ChevronDown, LayoutTemplate, Loader2, XCircle, FileJson, FileSpreadsheet, Shapes, FilePlus2 } from 'lucide-react';
import { Sheet, Part, NestingStats, AIAnalysisResult, PlacedPart, StockItem } from './types';
import { MOCK_PARTS, getRandomColor, DEFAULT_SHEET_HEIGHT, DEFAULT_SHEET_WIDTH } from './constants';
import { analyzeNestingResult } from './services/geminiService';
import { parseSVG } from './services/svgParser';
import { parseDXF } from './services/dxfParser';
import { exportDXF } from './services/dxfExport';
import { exportPDF } from './services/pdfExport';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { SettingsModal } from './components/SettingsModal';
import { NestingCanvas, NestingCanvasRef } from './components/NestingCanvas';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PartPreview } from './components/PartPreview';
import { ShapeLibraryModal } from './components/ShapeLibraryModal';
import { ShapeTemplate } from './constants/shapeLibrary';

// --- Advanced Nesting Algorithm: Arbitrary Rotation Raster Packing ---

// Scale 0.1 means 1px = 10mm. Balanced precision with excellent performance.
const SCALE = 0.1; 

// Rotation angles to test (45-degree increments for speed, can add 90° if needed)
const ROTATION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]; 

interface PartMask {
  width: number;
  height: number;
  data: Uint8Array;
  offsetX: number;
  offsetY: number;
}

// Helper: Yield control to the browser to prevent freezing
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

const generateRotatedMask = (part: Part, angleDeg: number): PartMask => {
  const diag = Math.sqrt(part.width * part.width + part.height * part.height);
  // Padding for rotation buffer
  const canvasSize = Math.ceil(diag * SCALE * 1.5); 
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { width: 0, height: 0, data: new Uint8Array(0), offsetX: 0, offsetY: 0 };

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.translate(-part.width * SCALE / 2, -part.height * SCALE / 2);
  ctx.scale(SCALE, SCALE);
  
  const p = new Path2D(part.path || `M0,0 L${part.width},0 L${part.width},${part.height} L0,${part.height} Z`);
  
  // 1. Draw the shape solidly
  ctx.fillStyle = '#000000';
  ctx.fill(p);

  // 2. IMPORTANT: Dilation / Safety Buffer
  // Draw a stroke around the shape to artificially thicken it in the mask.
  // This ensures that parts have a physical gap (kerf) between them and don't visually overlap.
  // lineWidth of 1 at SCALE 0.2 roughly means 5mm gap total.
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1; 
  ctx.lineJoin = 'round';
  ctx.stroke(p);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // Check alpha channel
      if (pixels[(y * canvas.width + x) * 4 + 3] > 50) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasPixels = true;
      }
    }
  }

  if (!hasPixels) return { width: 0, height: 0, data: new Uint8Array(0), offsetX: 0, offsetY: 0 };

  const maskW = maxX - minX + 1;
  const maskH = maxY - minY + 1;
  const maskData = new Uint8Array(maskW * maskH);

  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      const srcX = minX + x;
      const srcY = minY + y;
      if (pixels[(srcY * canvas.width + srcX) * 4 + 3] > 50) {
        maskData[y * maskW + x] = 1;
      }
    }
  }

  const relativeCenterX = (cx - minX) / SCALE;
  const relativeCenterY = (cy - minY) / SCALE;
  
  return { 
    width: maskW, 
    height: maskH, 
    data: maskData, 
    offsetX: relativeCenterX,
    offsetY: relativeCenterY
  };
};

class GridSheet {
  width: number;
  height: number;
  grid: Uint8Array;
  
  constructor(width: number, height: number) {
    this.width = Math.ceil(width * SCALE);
    this.height = Math.ceil(height * SCALE);
    this.grid = new Uint8Array(this.width * this.height);
  }

  canFit(mask: PartMask, x: number, y: number): boolean {
    if (x + mask.width > this.width || y + mask.height > this.height) return false;
    
    // Ultra-fast check: sample key points first before full scan
    // Check corners and center
    const centerX = Math.floor(mask.width / 2);
    const centerY = Math.floor(mask.height / 2);
    
    if (mask.data[0] === 1 && this.grid[y * this.width + x] === 1) return false;
    if (mask.data[mask.width - 1] === 1 && this.grid[y * this.width + (x + mask.width - 1)] === 1) return false;
    if (mask.data[centerY * mask.width + centerX] === 1 && this.grid[(y + centerY) * this.width + (x + centerX)] === 1) return false;
    
    // Full check with early exit optimization
    for (let my = 0; my < mask.height; my++) {
      const maskRow = my * mask.width;
      const gridRow = (y + my) * this.width;
      
      for (let mx = 0; mx < mask.width; mx++) {
        if (mask.data[maskRow + mx] === 1) {
          if (this.grid[gridRow + (x + mx)] === 1) return false;
        }
      }
    }
    return true;
  }

  place(mask: PartMask, x: number, y: number) {
    for (let my = 0; my < mask.height; my++) {
      for (let mx = 0; mx < mask.width; mx++) {
        if (mask.data[my * mask.width + mx] === 1) {
          this.grid[(y + my) * this.width + (x + mx)] = 1;
        }
      }
    }
  }
}

// ASYNC Nesting Function
const runNestingAsync = async (
    parts: Part[], 
    stockItems: StockItem[], 
    activeStockId: string,
    onProgress: (percent: number, status: string) => void,
    shouldStop: () => boolean
): Promise<{ sheets: Sheet[], stats: NestingStats }> => {
  
  const stock = stockItems.find(s => s.id === activeStockId) || stockItems[0];
  
  let queue: Part[] = [];
  parts.forEach(p => {
    for (let i = 0; i < p.quantity; i++) queue.push({ ...p });
  });

  // Sort by Area descending (largest first)
  queue.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const totalItems = queue.length;

  const sheets: Sheet[] = [];
  let currentSheetIndex = 1;
  let currentSheet = new GridSheet(stock.width, stock.height);
  let currentSheetParts: PlacedPart[] = [];
  let placedCount = 0;
  
  const maskCache: Record<string, PartMask> = {};

  const getMask = (part: Part, angle: number) => {
    const key = `${part.id}-${angle}`;
    if (!maskCache[key]) {
      maskCache[key] = generateRotatedMask(part, angle);
    }
    return maskCache[key];
  }

  // PRE-GENERATE ALL MASKS (massive speedup!)
  onProgress(0, "Pre-calculating rotations...");
  const uniqueParts = Array.from(new Set(parts.map(p => p.id))).map(id => parts.find(p => p.id === id)!);
  for (const part of uniqueParts) {
    for (const angle of ROTATION_ANGLES) {
      getMask(part, angle);
    }
  }
  await yieldToMain();

  let lastYieldTime = performance.now();

  while (queue.length > 0) {
    if (shouldStop()) throw new Error("Stopped");

    // Report Progress
    const progress = Math.round((placedCount / totalItems) * 100);
    
    // --- YIELD CHECK ---
    const now = performance.now();
    if (now - lastYieldTime > 20) { // Yield every 20ms
         onProgress(progress, `Placing part ${placedCount + 1}/${totalItems}...`);
         await yieldToMain();
         lastYieldTime = performance.now();
         if (shouldStop()) throw new Error("Stopped");
    }
    // ------------------

    let bestCandidateIdx = -1;
    let bestPos = { x: 0, y: 0, rot: 0 };
    let found = false;
    let minWasteScore = Infinity;

    // Look ahead: Only check first 3 parts (much faster!)
    const searchDepth = Math.min(queue.length, 3); 
    
    // Smart scanning: Use step size for initial scan
    const SCAN_STEP = 5; // pixels (much faster initial scan)
    
    for (let i = 0; i < searchDepth; i++) {
      const part = queue[i];
      
      // Only test key rotations
      for (const rot of ROTATION_ANGLES) {
        const mask = getMask(part, rot);
        if (mask.width === 0) continue;
        if (mask.width > currentSheet.width || mask.height > currentSheet.height) continue;

        // FAST SCAN: Coarse grid first
        for (let y = 0; y <= currentSheet.height - mask.height; y += SCAN_STEP) {
          for (let x = 0; x <= currentSheet.width - mask.width; x += SCAN_STEP) {
             
             if (currentSheet.canFit(mask, x, y)) {
               // Bottom-left heuristic: prefer lower-left positions
               const score = y * currentSheet.width + x; 
               
               if (score < minWasteScore) {
                 minWasteScore = score;
                 bestCandidateIdx = i;
                 bestPos = { x, y, rot };
                 found = true;
               }
               
               // Early exit if we find a very good position
               if (score < 100) break; 
             }
          }
          if (found && minWasteScore < 100) break;
        }
        if (found && minWasteScore < 100) break;
      }
      if (found && minWasteScore < 100) break;
    }

    if (found && bestCandidateIdx !== -1) {
      const part = queue[bestCandidateIdx];
      const mask = getMask(part, bestPos.rot);
      currentSheet.place(mask, bestPos.x, bestPos.y);
      
      currentSheetParts.push({
        ...part,
        x: bestPos.x / SCALE,
        y: bestPos.y / SCALE,
        sheetId: `sheet-${currentSheetIndex}`,
        rotation: bestPos.rot,
        visualOffsetX: mask.offsetX,
        visualOffsetY: mask.offsetY
      });
      
      placedCount++;
      queue.splice(bestCandidateIdx, 1);
    } else {
      // Finalize current sheet
      const finishedSheet = createNewSheet(currentSheetIndex, stock.width, stock.height);
      finishedSheet.placedParts = [...currentSheetParts];
      finalizeSheet(finishedSheet, stock.width, stock.height);
      sheets.push(finishedSheet);

      // Start new sheet
      currentSheetIndex++;
      currentSheet = new GridSheet(stock.width, stock.height);
      currentSheetParts = [];
      
      // Infinite loop guard - check if part can ever fit
      const part = queue[0];
      let fitsEver = false;
      for(const r of ROTATION_ANGLES) {
          const m = getMask(part, r);
          if(m.width <= currentSheet.width && m.height <= currentSheet.height) {
              fitsEver = true; 
              break;
          }
      }
      
      if (!fitsEver) {
         console.warn(`Part ${part.name} is too large for the stock.`);
         queue.shift(); 
         placedCount++;
      }
    }
  }

  if (currentSheetParts.length > 0) {
    const finishedSheet = createNewSheet(currentSheetIndex, stock.width, stock.height);
    finishedSheet.placedParts = [...currentSheetParts];
    finalizeSheet(finishedSheet, stock.width, stock.height);
    sheets.push(finishedSheet);
  }

  const totalArea = sheets.length * stock.width * stock.height;
  const usedArea = sheets.reduce((acc, s) => acc + s.placedParts.reduce((pAcc, p) => pAcc + (p.width * p.height), 0), 0);

  return {
    sheets,
    stats: {
      totalParts: totalItems, 
      placedParts: placedCount,
      totalSheets: sheets.length,
      globalEfficiency: totalArea > 0 ? (usedArea / totalArea) * 100 : 0,
      wasteArea: totalArea - usedArea
    }
  };
};

const createNewSheet = (index: number, width: number, height: number): Sheet => ({
  id: `sheet-${index}`,
  width,
  height,
  placedParts: [],
  efficiency: 0,
  waste: 0
});

const finalizeSheet = (sheet: Sheet, totalW: number, totalH: number) => {
  const usedArea = sheet.placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  sheet.efficiency = (usedArea / (totalW * totalH)) * 100;
  sheet.waste = (totalW * totalH) - usedArea;
};

function App() {
  const [apiKey, setApiKey] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'parts' | 'stock'>('parts');
  
  const [stockItems, setStockItems] = useState<StockItem[]>([
    { id: 's1', name: 'Standard Sheet', width: 2400, height: 1200, quantity: 100 },
    { id: 's2', name: 'Large Sheet', width: 3000, height: 1500, quantity: 50 },
  ]);
  const [activeStockId, setActiveStockId] = useState<string>('s1');

  const [parts, setParts] = useState<Part[]>(MOCK_PARTS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isShapeLibraryOpen, setIsShapeLibraryOpen] = useState(false);
  
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [stats, setStats] = useState<NestingStats | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  // Reference to canvas to trigger methods like fitView
  const canvasRef = useRef<NestingCanvasRef>(null);

  // Async Nesting States
  const [isNesting, setIsNesting] = useState(false);
  const [nestingProgress, setNestingProgress] = useState(0);
  const [nestingStatus, setNestingStatus] = useState("Initializing...");
  const abortControllerRef = useRef<boolean>(false);

  const handleNest = async () => {
    setAiResult(null);
    setIsNesting(true);
    setNestingProgress(0);
    setNestingStatus("Initializing geometric analysis...");
    abortControllerRef.current = false;

    try {
        await new Promise(r => setTimeout(r, 100));

        const result = await runNestingAsync(
            parts, 
            stockItems, 
            activeStockId,
            (percent, status) => {
                setNestingProgress(percent);
                setNestingStatus(status);
            },
            () => abortControllerRef.current
        );

        setSheets(result.sheets);
        setStats(result.stats);
        setActiveSheetIdx(0);
        // Auto fit view after nesting
        setTimeout(() => canvasRef.current?.fitView(), 100);
    } catch (e: any) {
        if (e.message !== "Stopped") {
            console.error(e);
            alert("Nesting error occurred.");
        }
    } finally {
        setIsNesting(false);
        setNestingProgress(100);
    }
  };

  const handleCancelNesting = () => {
      abortControllerRef.current = true;
      setIsNesting(false);
  };

  const handleAIAnalysis = async () => {
    if (!stats || !apiKey) return;
    setIsAnalyzing(true);
    try {
      const activeStock = stockItems.find(s => s.id === activeStockId);
      const materialName = activeStock ? activeStock.name : "Generic Steel";
      const result = await analyzeNestingResult(apiKey, stats, materialName);
      setAiResult(result);
    } catch (e) {
      alert("AI Analysis Failed. Check console/API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addPart = () => {
    // Şekil kütüphanesini aç
    setIsShapeLibraryOpen(true);
  };

  const handleShapeSelect = (shape: ShapeTemplate) => {
    const newPart: Part = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${shape.name} ${parts.length + 1}`,
      width: shape.width,
      height: shape.height,
      quantity: 1,
      color: getRandomColor(),
      path: shape.path
    };
    setParts([...parts, newPart]);
  };

  const addStock = () => {
    const newStock: StockItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Stock`,
      width: 2000,
      height: 1000,
      quantity: 10
    };
    setStockItems([...stockItems, newStock]);
  };

  const updatePart = (id: string, field: keyof Part, value: any) => {
    setParts(parts.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'width' || field === 'height') {
            updated.path = `M0,0 L${updated.width},0 L${updated.width},${updated.height} L0,${updated.height} Z`;
        }
        return updated;
    }));
  };

  const updateStock = (id: string, field: keyof StockItem, value: any) => {
    setStockItems(stockItems.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removePart = (id: string) => setParts(parts.filter(p => p.id !== id));
  const removeStock = (id: string) => {
    if (stockItems.length <= 1) return; 
    setStockItems(stockItems.filter(s => s.id !== id));
    if (activeStockId === id) setActiveStockId(stockItems[0].id);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.svg')) {
          // SVG import
          const parsed = parseSVG(content);
          if (parsed) {
            const newPart: Part = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name.replace('.svg', ''),
              width: parsed.width,
              height: parsed.height,
              quantity: 1,
              color: getRandomColor(),
              path: parsed.path
            };
            setParts([...parts, newPart]);
            alert(`✅ SVG başarıyla import edildi!\nBoyut: ${parsed.width} × ${parsed.height} mm`);
          } else {
            alert('❌ SVG dosyası okunamadı. Lütfen geçerli bir SVG dosyası yükleyin.');
          }
        } else if (file.name.endsWith('.dxf')) {
          // DXF import
          const parsed = parseDXF(content);
          if (parsed) {
            const newPart: Part = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name.replace('.dxf', ''),
              width: parsed.width,
              height: parsed.height,
              quantity: 1,
              color: getRandomColor(),
              path: parsed.path
            };
            setParts([...parts, newPart]);
            alert(`✅ DXF başarıyla import edildi!\nBoyut: ${parsed.width} × ${parsed.height} mm\nEntity: ${parsed.entities.join(', ')}`);
          } else {
            alert('❌ DXF dosyası okunamadı. Lütfen geçerli bir DXF dosyası yükleyin.');
          }
        } else if (file.name.endsWith('.json')) {
          // JSON import
          const imported = JSON.parse(content);
          if (Array.isArray(imported) && imported.length > 0) {
            const formattedParts: Part[] = imported.map((p: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: p.name || 'Imported',
              width: Number(p.width) || 100,
              height: Number(p.height) || 100,
              quantity: Number(p.quantity) || 1,
              color: getRandomColor(),
              path: p.path || `M0,0 L${p.width || 100},0 L${p.width || 100},${p.height || 100} L0,${p.height || 100} Z`
            }));
            setParts([...parts, ...formattedParts]);
            alert(`✅ ${formattedParts.length} parça başarıyla import edildi!`);
          }
        } else {
          alert('❌ Desteklenmeyen dosya formatı. Lütfen .svg, .dxf veya .json dosyası yükleyin.');
        }
      } catch (err) {
        console.error("Import failed", err);
        alert('❌ Dosya import edilirken hata oluştu. Lütfen dosyayı kontrol edin.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    setIsExportMenuOpen(false);
  };

  const exportJSON = () => {
    if(sheets.length === 0) return;
    const data = JSON.stringify({ sheets, stats, date: new Date().toISOString() }, null, 2);
    downloadFile(data, `nesting_project_${Date.now()}.json`, 'application/json');
  };

  const exportCSV = () => {
    if(sheets.length === 0) return;
    let csv = "SheetID,PartID,PartName,X,Y,Rotation\n";
    sheets.forEach(s => {
        s.placedParts.forEach(p => {
            csv += `${s.id},${p.id},${p.name},${p.x.toFixed(2)},${p.y.toFixed(2)},${p.rotation}\n`;
        });
    });
    downloadFile(csv, `nesting_report_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportDXF = () => {
    if(sheets.length === 0) return;
    try {
      const dxfContent = exportDXF(sheets);
      downloadFile(dxfContent, `nesting_${Date.now()}.dxf`, 'application/dxf');
      alert('✅ DXF dosyası başarıyla oluşturuldu!');
    } catch (error) {
      console.error('DXF export error:', error);
      alert('❌ DXF export sırasında hata oluştu.');
    }
  };

  const handleExportPDF = async () => {
    if(sheets.length === 0 || !stats) return;
    try {
      const activeStock = stockItems.find(s => s.id === activeStockId);
      const stockName = activeStock ? activeStock.name : 'Standard Stock';
      
      const pdfBlob = await exportPDF(sheets, stats, stockName);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `technical_drawing_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExportMenuOpen(false);
      alert('✅ PDF teknik çizim başarıyla oluşturuldu!');
    } catch (error: any) {
      console.error('PDF export error:', error);
      const errorMessage = error?.message || 'Bilinmeyen hata';
      alert(`❌ PDF export hatası:\n${errorMessage}\n\nÇok fazla parça varsa birkaç sheet'i ayrı ayrı export etmeyi deneyin.`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-slate-100 font-sans overflow-hidden">
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/30 border border-indigo-500/30">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
              SmartNest <span className="font-light italic text-indigo-400">Pro</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider">AI-POWERED CAM SUITE</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {!apiKey && (
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
               <AlertCircle size={14} className="text-amber-500" />
               <span className="text-xs text-amber-500 font-medium">System API Key Missing</span>
             </div>
           )}
           <div className="h-6 w-px bg-slate-800 mx-2" />
           <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-white">
             <Settings size={20} />
           </Button>
           <Button variant="primary" onClick={handleNest} disabled={isNesting} className="gap-2 shadow-indigo-500/20">
             <Play size={16} fill="currentColor" />
             <span className="hidden sm:inline font-semibold">Generate Nesting</span>
           </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading Overlay */}
        {isNesting && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="w-96 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-indigo-400">{nestingProgress}%</div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Optimizing Layout</h3>
                    <p className="text-slate-400 text-sm text-center mb-6">{nestingStatus}</p>
                    
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style={{ width: `${nestingProgress}%` }}></div>
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={handleCancelNesting} className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50">
                        <XCircle size={14} /> Cancel Operation
                    </Button>
                </div>
            </div>
        )}

        {/* SIDEBAR */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-30 shadow-xl">
            <div className="flex border-b border-slate-800">
                <button onClick={() => setActiveTab('parts')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'parts' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Cuboid size={14} /> Parts
                </button>
                <button onClick={() => setActiveTab('stock')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'stock' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Package size={14} /> Stock Lib
                </button>
            </div>

            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                    {activeTab === 'parts' ? `${parts.length} ITEMS` : `${stockItems.length} SIZES`}
                </span>
                <div className="flex gap-1">
                    {activeTab === 'parts' && (
                        <>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.dxf,.svg" onChange={handleFileUpload} />
                            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Import" className="h-7 w-7 p-0"><Upload size={14}/></Button>
                        </>
                    )}
                    <Button size="sm" variant="secondary" onClick={activeTab === 'parts' ? addPart : addStock} className="h-7 px-2 text-xs gap-1">
                        <Plus size={12} /> Add
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {activeTab === 'parts' ? (
                    parts.map((part) => (
                        <div key={part.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700 hover:border-indigo-500/30 transition-all group">
                            <div className="flex gap-3 mb-2">
                                <PartPreview width={part.width} height={part.height} color={part.color} path={part.path} />
                                <div className="flex-1 min-w-0">
                                    <input className="bg-transparent text-sm font-medium focus:outline-none w-full text-slate-200 placeholder-slate-600" value={part.name} onChange={(e) => updatePart(part.id, 'name', e.target.value)} placeholder="Part Name" />
                                    <div className="flex items-center gap-2 mt-1">
                                         <div className="text-[10px] text-slate-500 bg-slate-900 px-1.5 rounded border border-slate-700">{part.width} x {part.height}</div>
                                    </div>
                                </div>
                                <button onClick={() => removePart(part.id)} className="text-slate-600 hover:text-red-400 self-start opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                                <div><label className="text-[9px] text-slate-500 block">W</label><input type="number" className="w-full bg-slate-900 rounded border border-slate-700 px-1 text-xs py-0.5 text-slate-300" value={part.width} onChange={(e) => updatePart(part.id, 'width', parseInt(e.target.value) || 0)} /></div>
                                <div><label className="text-[9px] text-slate-500 block">H</label><input type="number" className="w-full bg-slate-900 rounded border border-slate-700 px-1 text-xs py-0.5 text-slate-300" value={part.height} onChange={(e) => updatePart(part.id, 'height', parseInt(e.target.value) || 0)} /></div>
                                <div><label className="text-[9px] text-slate-500 block">QTY</label><input type="number" className="w-full bg-slate-900 rounded border border-slate-700 px-1 text-xs py-0.5 text-indigo-300 font-bold" value={part.quantity} onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 0)} /></div>
                            </div>
                        </div>
                    ))
                ) : (
                    stockItems.map((stock) => (
                        <div key={stock.id} onClick={() => setActiveStockId(stock.id)} className={`rounded-lg p-3 border cursor-pointer transition-all ${activeStockId === stock.id ? 'bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${activeStockId === stock.id ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                                    <input className="bg-transparent text-sm font-medium focus:outline-none w-32 truncate text-slate-200" value={stock.name} onChange={(e) => updateStock(stock.id, 'name', e.target.value)} onClick={(e) => e.stopPropagation()} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeStock(stock.id); }} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/50 rounded p-1.5 flex justify-between items-center px-2"><span className="text-[10px] text-slate-500">W</span><input className="bg-transparent w-12 text-right text-xs text-slate-300 outline-none" value={stock.width} onChange={(e) => updateStock(stock.id, 'width', parseInt(e.target.value))} onClick={(e) => e.stopPropagation()} /></div>
                                <div className="bg-slate-900/50 rounded p-1.5 flex justify-between items-center px-2"><span className="text-[10px] text-slate-500">H</span><input className="bg-transparent w-12 text-right text-xs text-slate-300 outline-none" value={stock.height} onChange={(e) => updateStock(stock.id, 'height', parseInt(e.target.value))} onClick={(e) => e.stopPropagation()} /></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>

        {/* CANVAS AREA */}
        <main className="flex-1 bg-[#050505] relative flex flex-col min-w-0">
          <div className="absolute top-4 left-4 z-20 flex gap-2 max-w-[calc(100%-200px)] overflow-x-auto no-scrollbar">
            {sheets.map((sheet, idx) => (
              <button key={sheet.id} onClick={() => setActiveSheetIdx(idx)} className={`px-4 py-2 text-xs font-semibold rounded-lg backdrop-blur-md border transition-all flex items-center gap-2 shadow-lg ${activeSheetIdx === idx ? 'bg-indigo-600/90 border-indigo-500 text-white ring-2 ring-indigo-500/20' : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span>Sheet {idx + 1}</span>
                {sheet.efficiency > 0 && (<span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${sheet.efficiency > 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{sheet.efficiency.toFixed(0)}%</span>)}
              </button>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden">
             <NestingCanvas ref={canvasRef} sheets={sheets} activeSheetIndex={activeSheetIdx} />
          </div>
          
          <div className="h-12 border-t border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-4">
                <div className="text-xs text-slate-500 font-mono flex gap-4"><span>X: 0.00</span><span>Y: 0.00</span></div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="text-xs text-indigo-400 font-medium">Active Stock: {stockItems.find(s => s.id === activeStockId)?.name}</div>
            </div>
            
            <div className="flex gap-2 relative">
               <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs gap-2 text-slate-400 hover:text-white"
                onClick={() => canvasRef.current?.fitView()}
               >
                 <Maximize2 size={14} /> Fit View
               </Button>
               
               <div className="relative">
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 text-xs gap-2 border-slate-700 bg-slate-800 hover:bg-slate-700" 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                    disabled={!stats}
                 >
                    <Download size={14} /> Export <ChevronDown size={12} />
                 </Button>

                 {isExportMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                        <div className="p-2 space-y-1">
                            <button onClick={exportJSON} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded text-left">
                                <FileJson size={14} className="text-indigo-400" /> Export Project (JSON)
                            </button>
                            <button onClick={exportCSV} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded text-left">
                                <FileSpreadsheet size={14} className="text-emerald-400" /> Export Report (CSV)
                            </button>
                            <div className="h-px bg-slate-700 my-1" />
                            <button onClick={handleExportDXF} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded text-left">
                                <FileCode size={14} className="text-cyan-400" /> Export DXF (CAD)
                            </button>
                            <button onClick={handleExportPDF} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded text-left">
                                <FilePlus2 size={14} className="text-rose-400" /> Export PDF (Technical)
                            </button>
                        </div>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-0 shrink-0 overflow-hidden flex flex-col z-30 shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Layers size={14} /> Project Analysis</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <AnalysisPanel stats={stats} aiResult={aiResult} loading={isAnalyzing} onAnalyze={handleAIAnalysis} hasApiKey={!!apiKey} />
          </div>
        </aside>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} />
      <ShapeLibraryModal isOpen={isShapeLibraryOpen} onClose={() => setIsShapeLibraryOpen(false)} onSelectShape={handleShapeSelect} />
    </div>
  );
}

export default App;
