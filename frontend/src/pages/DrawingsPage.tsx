import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<Drawing[]>([
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
          <Button variant="outline">Import DXF/DWG</Button>
          <Button variant="primary">New Drawing</Button>
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
    </div>
  );
}