import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Viewer3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ifcInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front' | 'side'>('perspective');
  const [zoom, setZoom] = useState(100);

  function resetView() {
    setViewMode('perspective');
    setZoom(100);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Simple wireframe demo
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        
        // Draw 3D perspective cube
        const cx = 400;
        const cy = 220;
        const size = 120;
        const offset = 40;
        
        // Front face
        ctx.strokeRect(cx - size/2, cy - size/2, size, size);
        // Back face
        ctx.strokeRect(cx - size/2 + offset, cy - size/2 - offset, size, size);
        // Connecting lines
        ctx.beginPath();
        ctx.moveTo(cx - size/2, cy - size/2);
        ctx.lineTo(cx - size/2 + offset, cy - size/2 - offset);
        ctx.moveTo(cx + size/2, cy - size/2);
        ctx.lineTo(cx + size/2 + offset, cy - size/2 - offset);
        ctx.moveTo(cx - size/2, cy + size/2);
        ctx.lineTo(cx - size/2 + offset, cy + size/2 - offset);
        ctx.moveTo(cx + size/2, cy + size/2);
        ctx.lineTo(cx + size/2 + offset, cy + size/2 - offset);
        ctx.stroke();
        
        ctx.fillStyle = '#111827';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('3D Viewport Placeholder - Three.js integration ready', cx, cy + size + 40);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">3D Model Viewer</h1>
          <p className="text-gray-500 mt-1">BIM and 3D model visualisation</p>
        </div>
        <div className="flex gap-2">
          <input ref={ifcInputRef} type="file" accept=".ifc" className="hidden" onChange={e => { if (e.target.files?.[0]) alert(`Loading IFC: ${e.target.files[0].name}`); e.target.value = ''; }} />
          <input ref={modelInputRef} type="file" accept=".ifc,.obj,.gltf,.glb" className="hidden" onChange={e => { if (e.target.files?.[0]) alert(`Uploading: ${e.target.files[0].name}`); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => ifcInputRef.current?.click()}>Import IFC</Button>
          <Button variant="primary" onClick={() => modelInputRef.current?.click()}>Upload Model</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['perspective', 'top', 'front', 'side'] as const).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))}>Zoom -</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))}>Zoom +</Button>
        <Button variant="outline" size="sm" onClick={resetView}>Reset View</Button>
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>Fullscreen</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div ref={containerRef} className="relative bg-gray-100" style={{ height: '480px' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={480}
            className="w-full h-full"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Properties</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Filename</span>
              <span>bridge-model.ifc</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Elements</span>
              <span>12,458</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Size</span>
              <span>45.2 MB</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Layers</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Structural</span>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Architectural</span>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>MEP Services</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Tree</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-1">
              <li className="font-medium">🔲 Superstructure</li>
              <li className="pl-4 text-gray-600">🔹 Deck Slab</li>
              <li className="pl-4 text-gray-600">🔹 Main Girders</li>
              <li className="font-medium">🔲 Substructure</li>
              <li className="pl-4 text-gray-600">🔹 Abutments</li>
              <li className="pl-4 text-gray-600">🔹 Piers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}