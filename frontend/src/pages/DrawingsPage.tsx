import { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDate } from '../lib/utils';

interface Drawing {
  id: string;
  name: string;
  filename: string;
  project_id: string;
  project_name: string;
  revision: string;
  status: 'draft' | 'review' | 'approved';
  drawing_type: 'architectural' | 'structural' | 'civil' | 'mechanical';
  created_at: string;
  file_size: number;
}

const EMPTY_DRAWING = { name: '', drawing_type: 'civil' as const };

export default function DrawingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDrawing, setNewDrawing] = useState(EMPTY_DRAWING);
  const [drawings] = useState<Drawing[]>([
    {
      id: '1',
      name: 'Site Layout Plan',
      filename: 'site-layout-2026.dwg',
      project_id: 'p1',
      project_name: 'Southern Highway Extension',
      revision: 'B',
      status: 'approved',
      drawing_type: 'civil',
      created_at: '2026-04-18',
      file_size: 2456789
    },
    {
      id: '2',
      name: 'Bridge Structural Design',
      filename: 'bridge-structure-rev3.dxf',
      project_id: 'p2',
      project_name: 'Bridge Rehabilitation',
      revision: '3',
      status: 'review',
      drawing_type: 'structural',
      created_at: '2026-04-20',
      file_size: 5678123
    },
    {
      id: '3',
      name: 'Water Treatment Plant',
      filename: 'wtp-piping.ifc',
      project_id: 'p3',
      project_name: 'Water Treatment Plant',
      revision: 'A',
      status: 'draft',
      drawing_type: 'mechanical',
      created_at: '2026-04-21',
      file_size: 12456789
    },
  ]);
  const [search, setSearch] = useState('');

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
  };

  const typeIcons = {
    architectural: '🏠',
    structural: '🏗️',
    civil: '🛣️',
    mechanical: '⚙️',
  };

  const filteredDrawings = drawings.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.project_name.toLowerCase().includes(search.toLowerCase())
  );

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024*1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drawings</h1>
          <p className="text-gray-500 mt-1">Manage CAD drawings and BIM models</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".dxf,.dwg,.ifc" className="hidden" onChange={e => { if (e.target.files?.[0]) alert(`Importing: ${e.target.files[0].name}`); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Import DXF/DWG</Button>
          <Button variant="primary" onClick={() => { setNewDrawing(EMPTY_DRAWING); setShowModal(true); }}>New Drawing</Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Drawing</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Revision</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Size</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Updated</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrawings.map((drawing) => (
                <tr key={drawing.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{typeIcons[drawing.drawing_type]}</span>
                      <div>
                        <p className="font-medium text-gray-900">{drawing.name}</p>
                        <p className="text-xs text-gray-500">{drawing.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{drawing.project_name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {drawing.revision}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[drawing.status]}`}>
                      {drawing.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 capitalize">{drawing.drawing_type}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatFileSize(drawing.file_size)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDate(drawing.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm">Open</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Drawing</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drawing Name</label>
                <input type="text" value={newDrawing.name} onChange={e => setNewDrawing(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Site Layout Plan" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={newDrawing.drawing_type} onChange={e => setNewDrawing(d => ({ ...d, drawing_type: e.target.value as any }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="architectural">Architectural</option>
                  <option value="structural">Structural</option>
                  <option value="civil">Civil</option>
                  <option value="mechanical">Mechanical</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Create Drawing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}