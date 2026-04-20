import React, { useState, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-three/IfcViewer';

interface IfcImporterProps {
  onModelLoaded: (model: any) => void;
}

const IfcImporter: React.FC<IfcImporterProps> = ({ onModelLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportStatus(`Loading IFC model: ${file.name}...`);

    try {
      if (containerRef.current && !viewerRef.current) {
        viewerRef.current = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new (await import('three')).Color(0xf8fafc)
        });
        viewerRef.current.axes.setAxesAndGrid(true, true);
        viewerRef.current.context.ifcCamera.setNavigationMode('Orbit');
      }

      if (viewerRef.current) {
        const arrayBuffer = await file.arrayBuffer();
        const model = await viewerRef.current.IFC.loadIfc(arrayBuffer, false);
        
        setImportStatus(`Successfully loaded IFC model - ${model.numElements} elements`);
        onModelLoaded(model);
      }
    } catch (error) {
      setImportStatus(`Error loading IFC: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">IFC BIM Import</h3>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept=".ifc"
          onChange={handleFileUpload}
          className="hidden"
          id="ifc-upload"
          disabled={isLoading}
        />
        <label 
          htmlFor="ifc-upload" 
          className={`cursor-pointer ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="text-4xl mb-2">🏗️</div>
          <div className="text-sm font-medium text-gray-600">
            {isLoading ? 'Loading IFC Model...' : 'Click to upload IFC file'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Industry Foundation Classes (IFC)
          </div>
        </label>
      </div>

      {importStatus && (
        <div className={`mt-3 text-sm ${importStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {importStatus}
        </div>
      )}

      <div ref={containerRef} className="mt-4 h-48 bg-gray-50 rounded-lg overflow-hidden" />

      <div className="mt-4 text-xs text-gray-500">
        <p>Supported IFC Versions:</p>
        <ul className="mt-1 list-disc list-inside">
          <li>IFC 2x3</li>
          <li>IFC 4</li>
          <li>IFC 4x3</li>
        </ul>
      </div>
    </div>
  );
};

export default IfcImporter;