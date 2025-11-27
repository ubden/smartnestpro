import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { SHAPE_LIBRARY, getShapesByCategory, ShapeTemplate } from '../constants/shapeLibrary';

interface ShapeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shape: ShapeTemplate) => void;
}

export const ShapeLibraryModal: React.FC<ShapeLibraryModalProps> = ({ isOpen, onClose, onSelectShape }) => {
  if (!isOpen) return null;

  const shapesByCategory = getShapesByCategory();

  const handleSelect = (shape: ShapeTemplate) => {
    onSelectShape(shape);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Şekil Kütüphanesi</h2>
            <p className="text-xs text-slate-400 mt-1">Hazır geometrik şekillerden birini seçin</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {Object.entries(shapesByCategory).map(([category, shapes]) => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                {category}
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shapes.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => handleSelect(shape)}
                    className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-lg p-4 transition-all hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105"
                  >
                    {/* Shape Preview */}
                    <div className="w-full aspect-square bg-slate-900/50 rounded-lg mb-3 flex items-center justify-center p-3 border border-slate-700/50 group-hover:border-slate-600">
                      <svg
                        viewBox={`0 0 ${shape.width} ${shape.height}`}
                        className="w-full h-full"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      >
                        <path
                          d={shape.path}
                          fill="rgba(99, 102, 241, 0.2)"
                          stroke="rgb(99, 102, 241)"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>
                    
                    {/* Shape Info */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white mb-1">
                        {shape.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {shape.width} × {shape.height}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Toplam {SHAPE_LIBRARY.length} şekil mevcut
            </p>
            <p className="text-[10px] text-slate-600">
              Powered by <span className="text-indigo-400 font-semibold">Ubden<sup>®</sup></span>
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
};

