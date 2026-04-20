import React, { useState, useRef } from 'react';
import DxfParser from 'dxf-parser';

interface DxfImporterProps {
  onImport: (entities: any[]) => void;
}

const DxfImporter: React.FC<DxfImporterProps> = ({ onImport }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportStatus(`Reading ${file.name}...`);

    try {
      const text = await file.text();
      const parser = new DxfParser();
      const dxf = parser.parseSync(text);

      if (dxf && dxf.entities) {
        setImportStatus(`Successfully parsed ${dxf.entities.length} entities`);
        onImport(dxf.entities);
      } else {
        setImportStatus('No entities found in file');
      }
    } catch (error) {
      setImportStatus(`Error parsing DXF: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">DXF / DWG Import</h3>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf,.dwg"
          onChange={handleFileUpload}
          className="hidden"
          id="dxf-upload"
          disabled={isLoading}
        />
        <label 
          htmlFor="dxf-upload" 
          className={`cursor-pointer ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="text-4xl mb-2">📄</div>
          <div className="text-sm font-medium text-gray-600">
            {isLoading ? 'Importing...' : 'Click to upload DXF file'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Supports AutoCAD DXF format
          </div>
        </label>
      </div>

      {importStatus && (
        <div className={`mt-3 text-sm ${importStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {importStatus}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>Supported entity types:</p>
        <ul className="mt-1 list-disc list-inside">
          <li>LINE, POLYLINE, LWPOLYLINE</li>
          <li>ARC, CIRCLE, ELLIPSE</li>
          <li>TEXT, MTEXT</li>
          <li>DIMENSION</li>
        </ul>
      </div>
    </div>
  );
};

export default DxfImporter;