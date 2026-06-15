{/* frontend/src/components/FilePreviewViewer.tsx */}
import React, { useState } from 'react';
import { X, Download, Share2, Maximize2, FileText, Image, FileSpreadsheet, File, ChevronLeft, ChevronRight } from 'lucide-react';

interface FileItem {
  id: number;
  name: string;
  type: 'image' | 'pdf' | 'document' | 'drawing' | 'other';
  size: string;
  uploaded: string;
  url: string;
}

const mockFiles: FileItem[] = [
  { id: 1, name: 'Site_Plan_v3.dwg', type: 'drawing', size: '2.4 MB', uploaded: '2026-04-20', url: '' },
  { id: 2, name: 'Geotechnical_Report.pdf', type: 'pdf', size: '5.1 MB', uploaded: '2026-04-19', url: '' },
  { id: 3, name: 'Aerial_Survey.jpg', type: 'image', size: '8.7 MB', uploaded: '2026-04-18', url: '' },
  { id: 4, name: 'Quantity_Takeoff.xlsx', type: 'document', size: '1.2 MB', uploaded: '2026-04-17', url: '' },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'image': return <Image className="text-green-600" size={32} />;
    case 'pdf': return <FileText className="text-red-600" size={32} />;
    case 'drawing': return <File className="text-blue-600" size={32} />;
    case 'document': return <FileSpreadsheet className="text-green-700" size={32} />;
    default: return <File className="text-gray-500" size={32} />;
  }
};

export const FilePreviewViewer: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedFile = mockFiles[selectedIndex];

  return (
    <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {getFileIcon(selectedFile.type)}
          <div>
            <div className="font-medium">{selectedFile.name}</div>
            <div className="text-xs text-gray-400">{selectedFile.size} • Uploaded {selectedFile.uploaded}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded hover:bg-gray-700" title="Download">
            <Download size={18} />
          </button>
          <button className="p-2 rounded hover:bg-gray-700" title="Share">
            <Share2 size={18} />
          </button>
          <button className="p-2 rounded hover:bg-gray-700" title="Fullscreen">
            <Maximize2 size={18} />
          </button>
          <button className="p-2 rounded hover:bg-gray-700" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative h-[500px] flex items-center justify-center bg-gray-950">
        {/* Navigation arrows */}
        <button
          onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
          className="absolute left-4 p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30"
          disabled={selectedIndex === 0}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center">
          {getFileIcon(selectedFile.type)}
          <p className="mt-4 text-gray-400">Preview not available for this file type</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium">
            Download File
          </button>
        </div>

        <button
          onClick={() => setSelectedIndex(Math.min(mockFiles.length - 1, selectedIndex + 1))}
          className="absolute right-4 p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30"
          disabled={selectedIndex === mockFiles.length - 1}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex items-center gap-2 p-3 bg-gray-800 border-t border-gray-700 overflow-x-auto">
        {mockFiles.map((file, index) => (
          <button
            key={file.id}
            onClick={() => setSelectedIndex(index)}
            className={`flex-shrink-0 p-3 rounded-lg ${
              index === selectedIndex ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {getFileIcon(file.type)}
            <div className="text-xs mt-1 w-20 truncate">{file.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};