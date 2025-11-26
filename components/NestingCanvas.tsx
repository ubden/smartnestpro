
import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Sheet } from "../types";
import { ZoomIn, ZoomOut, Move } from "lucide-react";

interface NestingCanvasProps {
  sheets: Sheet[];
  activeSheetIndex: number;
}

export interface NestingCanvasRef {
  fitView: () => void;
}

export const NestingCanvas = forwardRef<NestingCanvasRef, NestingCanvasProps>(({ sheets, activeSheetIndex }, ref) => {
  const sheet = sheets[activeSheetIndex];
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2); 
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const performFitView = () => {
    if (containerRef.current && sheet) {
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 100;
      const scaleX = (clientWidth - padding) / sheet.width;
      const scaleY = (clientHeight - padding) / sheet.height;
      const newScale = Math.min(scaleX, scaleY, 0.5); 
      setScale(newScale);
      setOffset({
        x: (clientWidth - sheet.width * newScale) / 2,
        y: (clientHeight - sheet.height * newScale) / 2
      });
    }
  };

  // Expose fitView to parent via ref
  useImperativeHandle(ref, () => ({
    fitView: performFitView
  }));

  // Auto-fit when sheet changes
  useEffect(() => {
    performFitView();
  }, [sheet, activeSheetIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const newScale = Math.max(0.01, Math.min(4, scale - e.deltaY * zoomSensitivity));
        setScale(newScale);
    }
  };

  if (!sheet) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500">
        <div className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-lg mb-4 flex items-center justify-center">
            <Move className="opacity-20" />
        </div>
        <p className="font-medium">Ready to Nest</p>
        <p className="text-xs opacity-50">Add parts and start simulation</p>
      </div>
    );
  }

  const renderRulers = () => {
      const rulerColor = "#334155";
      const ticksX = [];
      const ticksY = [];
      for (let i = 0; i <= sheet.width; i += 200) {
          ticksX.push(
            <g key={`x-${i}`} transform={`translate(${i}, 0)`}>
              <line y1="0" y2="5" stroke={rulerColor} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text y="-5" x="0" textAnchor="middle" fill={rulerColor} fontSize="12" transform="scale(1, -1)">{i}</text>
            </g>
          );
      }
      for (let i = 0; i <= sheet.height; i += 200) {
          ticksY.push(
            <g key={`y-${i}`} transform={`translate(0, ${i})`}>
              <line x1="0" x2="5" stroke={rulerColor} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x="-8" y="4" textAnchor="end" fill={rulerColor} fontSize="12" transform="scale(1, -1)">{i}</text>
            </g>
          );
      }
      return { ticksX, ticksY };
  };

  const { ticksX, ticksY } = renderRulers();

  return (
    <div 
        ref={containerRef}
        className="w-full h-full bg-[#0a0a0a] relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 bg-slate-900/90 border border-slate-700 p-1 rounded-lg backdrop-blur">
            <button onClick={() => setScale(s => Math.min(4, s * 1.2))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <ZoomIn size={18} />
            </button>
            <button onClick={() => setScale(s => Math.max(0.01, s / 1.2))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <ZoomOut size={18} />
            </button>
        </div>

        <svg className="w-full h-full block touch-none">
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                <rect x={0} y={0} width={sheet.width} height={sheet.height} fill="#1e293b" className="drop-shadow-2xl" />
                <defs>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                    </pattern>
                </defs>
                <rect x="0" y="0" width={sheet.width} height={sheet.height} fill="url(#grid)" />
                <rect x={0} y={0} width={sheet.width} height={sheet.height} fill="none" stroke="#475569" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                {sheet.placedParts.map((part, i) => {
                    return (
                        <g key={i} transform={`translate(${part.x}, ${part.y})`}>
                            <g transform={`translate(${part.visualOffsetX}, ${part.visualOffsetY}) rotate(${part.rotation}) translate(${-part.width / 2}, ${-part.height / 2})`}>
                                {part.path ? (
                                    <path 
                                        d={part.path} 
                                        fill={part.color} 
                                        stroke="rgba(255,255,255,0.8)" 
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        className="hover:opacity-90 transition-opacity"
                                    />
                                ) : (
                                    <rect width={part.width} height={part.height} fill={part.color} stroke="rgba(255,255,255,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                )}
                                
                                {/* Label Centered on Part */}
                                <text 
                                    x={part.width / 2} 
                                    y={part.height / 2} 
                                    textAnchor="middle" 
                                    dominantBaseline="middle" 
                                    fill="white" 
                                    fontSize={Math.min(part.width, part.height) / 4}
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none', textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                                    transform={`rotate(${-part.rotation}, ${part.width/2}, ${part.height/2})`} 
                                >
                                    {i + 1}
                                </text>
                            </g>
                        </g>
                    );
                })}

                <g transform="translate(0, -20)">{ticksX}</g>
                <g transform="translate(-20, 0)">{ticksY}</g>
            </g>
        </svg>

        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded border border-slate-700 text-xs font-mono text-slate-300 pointer-events-none">
            Zoom: {(scale * 100).toFixed(0)}% | X: {offset.x.toFixed(0)} Y: {offset.y.toFixed(0)}
        </div>
    </div>
  );
});

NestingCanvas.displayName = "NestingCanvas";
