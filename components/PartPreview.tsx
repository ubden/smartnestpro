import React from 'react';
import { Part } from '../types';

interface PartPreviewProps {
  width: number;
  height: number;
  color: string;
  path?: string;
}

export const PartPreview: React.FC<PartPreviewProps> = ({ width, height, color, path }) => {
  // Calculate viewbox to center the part
  const viewBox = `0 0 ${width} ${height}`;
  
  return (
    <div className="w-12 h-12 bg-slate-900/50 rounded border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-1">
      <svg 
        viewBox={viewBox} 
        className="w-full h-full drop-shadow-sm filter"
        preserveAspectRatio="xMidYMid meet"
      >
        {path ? (
          <path 
            d={path} 
            fill={color} 
            fillOpacity={0.8} 
            stroke={color} 
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect 
            width={width} 
            height={height} 
            fill={color} 
            fillOpacity={0.8}
            rx={width * 0.05}
          />
        )}
      </svg>
    </div>
  );
};