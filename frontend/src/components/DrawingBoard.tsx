{/* frontend/src/components/DrawingBoard.tsx */}
import React, { useRef, useEffect, useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Square, Circle, MousePointer2, Type, PenTool, Trash2, RotateCcw, RotateCw, Download, Layers, Grid3X3 } from 'lucide-react';

export const DrawingBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new FabricCanvas(canvasRef.current, {
        width: 1200,
        height: 800,
        backgroundColor: '#f8fafc',
        selection: true,
        preserveObjectStacking: true
      });

      // Initialize grid
      fabricRef.current?.setZoom(1);
    }

    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pen', icon: PenTool, label: 'Free Draw' },
    { id: 'line', icon: Square, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <div className="flex h-full bg-gray-50">
      {/* Toolbar */}
      <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 rounded-md ${
              activeTool === tool.id 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} />
          </button>
        ))}

        <div className="h-px bg-gray-200 w-10 my-2" />

        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Undo">
          <RotateCcw size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Redo">
          <RotateCw size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Grid">
          <Grid3X3 size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Layers">
          <Layers size={20} />
        </button>

        <div className="flex-1" />

        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Download">
          <Download size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Clear">
          <Trash2 size={20} />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden inline-block">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Properties</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zoom Level</label>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">{Math.round(zoom * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};