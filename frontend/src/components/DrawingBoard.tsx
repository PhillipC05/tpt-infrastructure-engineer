import React, { useRef, useEffect, useState, useCallback } from 'react';
import { fabric } from 'fabric';

type DrawingTool = 'select' | 'line' | 'rectangle' | 'circle' | 'arc' | 'polygon' | 'dimension' | 'text' | 'annotation' | 'pan';
type UnitSystem = 'metric' | 'imperial';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

interface HistoryState {
  json: string;
  timestamp: number;
}

const DrawingBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [zoom, setZoom] = useState(1);
  const startPoint = useRef<fabric.Point | null>(null);
  const polygonPoints = useRef<fabric.Point[]>([]);

  // Layer Management
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'base', name: 'Base Layer', visible: true, locked: false, color: '#1e293b' },
    { id: 'dimensions', name: 'Dimensions', visible: true, locked: false, color: '#2563eb' },
    { id: 'annotations', name: 'Annotations', visible: true, locked: false, color: '#16a34a' },
  ]);
  const [activeLayer, setActiveLayer] = useState('base');

  // Undo / Redo History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isProcessingHistory = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 300,
      height: window.innerHeight - 100,
      backgroundColor: '#f8fafc',
      selection: activeTool === 'select',
      preserveObjectStacking: true
    });

    fabricRef.current = canvas;

    // Grid rendering
    canvas.on('after:render', () => {
      if (!gridSize) return;
      const ctx = canvas.getContext();
      const w = canvas.getWidth()!;
      const h = canvas.getHeight()!;
      const zoom = canvas.getZoom();
      const grid = gridSize * zoom;

      ctx.save();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;

      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Mouse events for drawing
    canvas.on('mouse:down', (opt) => {
      if (activeTool === 'select' || activeTool === 'pan') return;
      setIsDrawing(true);
      startPoint.current = canvas.getPointer(opt.e, true);

      // Snap point to grid if enabled
      const snapPoint = (point: fabric.Point) => {
        if (!snapEnabled || !gridSize) return point;
        return new fabric.Point(
          Math.round(point.x / gridSize) * gridSize,
          Math.round(point.y / gridSize) * gridSize
        );
      };

      startPoint.current = snapPoint(canvas.getPointer(opt.e, true));

      if (activeTool === 'line') {
        const line = new fabric.Line([startPoint.current.x, startPoint.current.y, startPoint.current.x, startPoint.current.y], {
          stroke: '#1e293b',
          strokeWidth: 2,
          hasControls: true,
          layerId: activeLayer
        });
        canvas.add(line);
        canvas.setActiveObject(line);
      } else if (activeTool === 'rectangle') {
        const rect = new fabric.Rect({
          left: startPoint.current.x,
          top: startPoint.current.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#1e293b',
          strokeWidth: 2,
          layerId: activeLayer
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
      } else if (activeTool === 'circle') {
        const circle = new fabric.Circle({
          left: startPoint.current.x,
          top: startPoint.current.y,
          radius: 0,
          fill: 'transparent',
          stroke: '#1e293b',
          strokeWidth: 2,
          layerId: activeLayer
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
      } else if (activeTool === 'polygon') {
        if (polygonPoints.current.length === 0) {
          polygonPoints.current.push(startPoint.current);
        }
        polygonPoints.current.push(startPoint.current);
      } else if (activeTool === 'dimension') {
        // First point of dimension
        if (!startPoint.current) return;
        
        const dimLine = new fabric.Group([
          new fabric.Line([startPoint.current.x, startPoint.current.y, startPoint.current.x, startPoint.current.y], {
            stroke: '#2563eb',
            strokeWidth: 2
          }),
          new fabric.Line([startPoint.current.x, startPoint.current.y - 5, startPoint.current.x, startPoint.current.y + 5], {
            stroke: '#2563eb',
            strokeWidth: 2
          }),
          new fabric.Line([startPoint.current.x, startPoint.current.y - 5, startPoint.current.x, startPoint.current.y + 5], {
            stroke: '#2563eb',
            strokeWidth: 2
          }),
          new fabric.Text('', {
            fontSize: 12,
            fill: '#2563eb',
            left: startPoint.current.x,
            top: startPoint.current.y - 20
          })
        ], {
          layerId: 'dimensions',
          hasControls: true
        });
        canvas.add(dimLine);
        canvas.setActiveObject(dimLine);
      } else if (activeTool === 'text' || activeTool === 'annotation') {
        const text = new fabric.Textbox(activeTool === 'annotation' ? 'Annotation: ' : '', {
          left: startPoint.current.x,
          top: startPoint.current.y,
          fontSize: 14,
          fill: activeTool === 'annotation' ? '#dc2626' : '#1e293b',
          width: 200,
          editable: true,
          layerId: activeTool === 'annotation' ? 'annotations' : activeLayer
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawing || !startPoint.current) return;
      const pointer = canvas.getPointer(opt.e, true);
      
      // Snap to grid
      const snappedPointer = snapEnabled && gridSize 
        ? new fabric.Point(Math.round(pointer.x / gridSize) * gridSize, Math.round(pointer.y / gridSize) * gridSize)
        : pointer;

      const activeObject = canvas.getActiveObject();

      if (activeTool === 'line' && activeObject && activeObject.type === 'line') {
        (activeObject as fabric.Line).set({ x2: snappedPointer.x, y2: snappedPointer.y });
        canvas.renderAll();
      } else if (activeTool === 'rectangle' && activeObject && activeObject.type === 'rect') {
        (activeObject as fabric.Rect).set({
          width: Math.abs(snappedPointer.x - startPoint.current.x),
          height: Math.abs(snappedPointer.y - startPoint.current.y),
          left: Math.min(startPoint.current.x, snappedPointer.x),
          top: Math.min(startPoint.current.y, snappedPointer.y)
        });
        canvas.renderAll();
      } else if (activeTool === 'circle' && activeObject && activeObject.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(snappedPointer.x - startPoint.current.x, 2) + 
          Math.pow(snappedPointer.y - startPoint.current.y, 2)
        );
        (activeObject as fabric.Circle).set({ radius: radius });
        canvas.renderAll();
      } else if (activeTool === 'dimension' && activeObject && activeObject.type === 'group') {
        const objects = (activeObject as fabric.Group).getObjects();
        const mainLine = objects[0] as fabric.Line;
        const endTick = objects[2] as fabric.Line;
        const label = objects[3] as fabric.Text;
        
        const distance = Math.sqrt(
          Math.pow(snappedPointer.x - startPoint.current.x, 2) + 
          Math.pow(snappedPointer.y - startPoint.current.y, 2)
        );
        
        mainLine.set({ x2: snappedPointer.x, y2: snappedPointer.y });
        endTick.set({ 
          left: snappedPointer.x - 3, 
          top: snappedPointer.y - 5,
          x2: snappedPointer.x + 3,
          y2: snappedPointer.y + 5
        });
        
        const unitLabel = unitSystem === 'metric' ? ' mm' : ' in';
        label.set({
          text: `${Math.round(distance)}${unitLabel}`,
          left: (startPoint.current.x + snappedPointer.x) / 2 - 20,
          top: Math.min(startPoint.current.y, snappedPointer.y) - 25
        });
        
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      setIsDrawing(false);
      startPoint.current = null;
    });

    window.addEventListener('resize', () => {
      canvas.setWidth(window.innerWidth - 300);
      canvas.setHeight(window.innerHeight - 100);
      canvas.renderAll();
    });

    // History tracking
    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    return () => {
      canvas.dispose();
    };
  }, []);

  // History Management
  const saveHistory = useCallback(() => {
    if (isProcessingHistory.current || !fabricRef.current) return;
    
    const json = JSON.stringify(fabricRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ json, timestamp: Date.now() });
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0 || !fabricRef.current) return;
    
    isProcessingHistory.current = true;
    fabricRef.current.loadFromJSON(history[historyIndex - 1].json, () => {
      fabricRef.current!.renderAll();
      setHistoryIndex(historyIndex - 1);
      isProcessingHistory.current = false;
    });
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !fabricRef.current) return;
    
    isProcessingHistory.current = true;
    fabricRef.current.loadFromJSON(history[historyIndex + 1].json, () => {
      fabricRef.current!.renderAll();
      setHistoryIndex(historyIndex + 1);
      isProcessingHistory.current = false;
    });
  }, [history, historyIndex]);

  const tools: { id: DrawingTool; name: string; icon: string }[] = [
    { id: 'select', name: 'Select', icon: '↖' },
    { id: 'line', name: 'Line', icon: '╱' },
    { id: 'rectangle', name: 'Rectangle', icon: '▢' },
    { id: 'circle', name: 'Circle', icon: '○' },
    { id: 'polygon', name: 'Polygon', icon: '⬡' },
    { id: 'dimension', name: 'Dimension', icon: '⇄' },
    { id: 'text', name: 'Text', icon: 'T' },
    { id: 'annotation', name: 'Annotation', icon: '📝' },
    { id: 'pan', name: 'Pan', icon: '✥' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="w-16 bg-gray-800 flex flex-col p-2 gap-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-12 h-12 rounded flex items-center justify-center text-white text-xl transition-colors ${
              activeTool === tool.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}

        <div className="mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`w-12 h-12 rounded flex items-center justify-center text-white transition-colors ${
              snapEnabled ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Snap to Grid"
          >
            ⊞
          </button>
          
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="w-12 h-12 rounded flex items-center justify-center text-white transition-colors bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
            title="Undo"
          >
            ↩
          </button>
          
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="w-12 h-12 rounded flex items-center justify-center text-white transition-colors bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
            title="Redo"
          >
            ↪
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden">
        <canvas ref={canvasRef} />
      </div>

      {/* Properties Panel */}
        <div className="w-64 bg-white border-l border-gray-200 p-4">
        <h3 className="font-semibold text-gray-700 mb-4">Drawing Board</h3>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">File Import</h4>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".dxf"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const text = await e.target.files[0].text();
                  // DXF entities will be parsed and added to canvas
                }
              }}
              className="hidden"
              id="dxf-import"
            />
            <label htmlFor="dxf-import" className="cursor-pointer">
              <div className="text-xl mb-1">📄</div>
              <div className="text-xs text-gray-600">Import DXF File</div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Grid Size</label>
            <input
              type="number"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Tool</h4>
            <p className="text-blue-600">{tools.find(t => t.id === activeTool)?.name}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Unit System</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setUnitSystem('metric')}
                className={`flex-1 py-1 rounded text-sm ${unitSystem === 'metric' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Metric
              </button>
              <button
                onClick={() => setUnitSystem('imperial')}
                className={`flex-1 py-1 rounded text-sm ${unitSystem === 'imperial' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Imperial
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Layers</h4>
            <div className="space-y-2">
              {layers.map(layer => (
                <div 
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                    activeLayer === layer.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
                    <span className="text-sm">{layer.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="text-xs px-1 opacity-70 hover:opacity-100">
                      {layer.visible ? '👁' : '👁‍🗨'}
                    </button>
                    <button className="text-xs px-1 opacity-70 hover:opacity-100">
                      {layer.locked ? '🔒' : '🔓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingBoard;