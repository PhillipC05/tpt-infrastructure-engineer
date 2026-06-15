import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, IText, Line, PencilBrush } from 'fabric';
import { Square, Circle as CircleIcon, MousePointer2, Type, PenTool, Trash2, RotateCcw, RotateCw, Download, Layers, Grid3X3, Minus } from 'lucide-react';

type Tool = 'select' | 'pen' | 'line' | 'rectangle' | 'circle' | 'text';

export const DrawingBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<Rect | Circle | Line | null>(null);

  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#f8fafc',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    saveHistory();

    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    return () => {
      canvas.off('object:added', saveHistory);
      canvas.off('object:modified', saveHistory);
      canvas.off('object:removed', saveHistory);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [saveHistory]);

  // Apply the active tool to the canvas whenever it changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset state
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';

    // Remove any in-progress shape listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = '#1e3a5f';
      return;
    }

    if (activeTool === 'text') {
      canvas.defaultCursor = 'text';
      canvas.selection = false;
      canvas.on('mouse:down', (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const text = new IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fill: '#1e3a5f',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
      });
      return;
    }

    if (activeTool === 'select') return;

    // Shape tools: rectangle, circle, line
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';

    canvas.on('mouse:down', (opt) => {
      const pointer = canvas.getPointer(opt.e);
      isDrawingRef.current = true;
      startPointRef.current = { x: pointer.x, y: pointer.y };

      if (activeTool === 'rectangle') {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#1e3a5f',
          strokeWidth: 2,
        });
        activeShapeRef.current = rect;
        canvas.add(rect);
      } else if (activeTool === 'circle') {
        const circle = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: 'transparent',
          stroke: '#1e3a5f',
          strokeWidth: 2,
        });
        activeShapeRef.current = circle;
        canvas.add(circle);
      } else if (activeTool === 'line') {
        const line = new Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          { stroke: '#1e3a5f', strokeWidth: 2, selectable: false }
        );
        activeShapeRef.current = line;
        canvas.add(line);
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawingRef.current || !startPointRef.current || !activeShapeRef.current) return;
      const pointer = canvas.getPointer(opt.e);
      const { x: ox, y: oy } = startPointRef.current;

      if (activeTool === 'rectangle') {
        const rect = activeShapeRef.current as Rect;
        const w = pointer.x - ox;
        const h = pointer.y - oy;
        rect.set({
          left: w < 0 ? pointer.x : ox,
          top: h < 0 ? pointer.y : oy,
          width: Math.abs(w),
          height: Math.abs(h),
        });
      } else if (activeTool === 'circle') {
        const circ = activeShapeRef.current as Circle;
        const radius = Math.sqrt(Math.pow(pointer.x - ox, 2) + Math.pow(pointer.y - oy, 2)) / 2;
        circ.set({
          left: Math.min(ox, pointer.x),
          top: Math.min(oy, pointer.y),
          radius,
        });
      } else if (activeTool === 'line') {
        const line = activeShapeRef.current as Line;
        line.set({ x2: pointer.x, y2: pointer.y });
      }

      canvas.renderAll();
    });

    canvas.on('mouse:up', () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (activeShapeRef.current) {
        activeShapeRef.current.setCoords();
        activeShapeRef.current = null;
      }
      startPointRef.current = null;
    });
  }, [activeTool]);

  // Sync zoom slider to canvas
  useEffect(() => {
    fabricRef.current?.setZoom(zoom);
    fabricRef.current?.renderAll();
  }, [zoom]);

  function undo() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.off('object:added', saveHistory);
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
      canvas.on('object:added', saveHistory);
    });
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.off('object:added', saveHistory);
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
      canvas.on('object:added', saveHistory);
    });
  }

  function clearCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';
    canvas.renderAll();
  }

  function downloadCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'drawing.png';
    a.click();
  }

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pen', icon: PenTool, label: 'Free Draw' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
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

        <button onClick={undo} className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Undo (Ctrl+Z)">
          <RotateCcw size={20} />
        </button>
        <button onClick={redo} className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Redo (Ctrl+Y)">
          <RotateCw size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Toggle Grid">
          <Grid3X3 size={20} />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Layers">
          <Layers size={20} />
        </button>

        <div className="flex-1" />

        <button onClick={downloadCanvas} className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="Download PNG">
          <Download size={20} />
        </button>
        <button onClick={clearCanvas} className="p-2 rounded-md text-red-400 hover:bg-red-50" title="Clear canvas">
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
          <div>
            <p className="text-xs text-gray-500 mb-1">Active tool</p>
            <p className="text-sm font-medium text-gray-700 capitalize">{activeTool}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
