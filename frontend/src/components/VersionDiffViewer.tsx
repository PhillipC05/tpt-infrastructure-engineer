// frontend/src/components/VersionDiffViewer.tsx
import React, { useState } from 'react';

interface Version {
  id: string;
  version: string;
  author: string;
  timestamp: string;
  note: string;
}

interface DiffChange {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  type: 'added' | 'removed' | 'modified';
}

const mockVersions: Version[] = [
  { id: 'v4', version: '4.0', author: 'Phillip C', timestamp: '2026-04-22 10:30', note: 'Final structural adjustments' },
  { id: 'v3', version: '3.0', author: 'John D', timestamp: '2026-04-21 16:45', note: 'Updated material costs' },
  { id: 'v2', version: '2.0', author: 'Sarah M', timestamp: '2026-04-20 09:15', note: 'Added contingency allowance' },
  { id: 'v1', version: '1.0', author: 'System', timestamp: '2026-04-19 14:00', note: 'Initial estimate created' },
];

const mockDiffData: DiffChange[] = [
  { field: 'Total Estimated Cost', oldValue: 125000, newValue: 132500, type: 'modified' },
  { field: 'Contingency %', oldValue: 5, newValue: 7.5, type: 'modified' },
  { field: 'Concrete Volume (m³)', oldValue: 42, newValue: 48, type: 'modified' },
  { field: 'Steel Reinforcement (ton)', oldValue: 12, newValue: 14.5, type: 'modified' },
  { field: 'Construction Duration', oldValue: '12 weeks', newValue: '14 weeks', type: 'modified' },
  { field: 'Risk Rating', oldValue: 'Low', newValue: 'Medium', type: 'modified' },
];

export const VersionDiffViewer: React.FC = () => {
  const [leftVersion, setLeftVersion] = useState(mockVersions[1].id);
  const [rightVersion, setRightVersion] = useState(mockVersions[0].id);
  const [viewMode, setViewMode] = useState<'split' | 'unified' | 'inline'>('inline');

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-50 border-l-4 border-green-500';
      case 'removed': return 'bg-red-50 border-l-4 border-red-500';
      case 'modified': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Version Comparison</h3>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Compare</label>
            <select
              value={leftVersion}
              onChange={(e) => setLeftVersion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              {mockVersions.map(v => (
                <option key={v.id} value={v.id}>Version {v.version} - {v.author}</option>
              ))}
            </select>
          </div>
          
          <div className="text-gray-400 pt-5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Against</label>
            <select
              value={rightVersion}
              onChange={(e) => setRightVersion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              {mockVersions.map(v => (
                <option key={v.id} value={v.id}>Version {v.version} - {v.author}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['inline', 'split', 'unified'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {mockDiffData.map((change, index) => (
          <div key={index} className={`px-4 py-3 ${getChangeColor(change.type)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">{change.field}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                change.type === 'added' ? 'bg-green-100 text-green-700' :
                change.type === 'removed' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {change.type.toUpperCase()}
              </span>
            </div>
            
            {viewMode === 'inline' && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-red-600 line-through">{String(change.oldValue)}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="text-green-600 font-medium">{String(change.newValue)}</span>
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Old Value</div>
                  <div className="text-red-600">{String(change.oldValue)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">New Value</div>
                  <div className="text-green-600">{String(change.newValue)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Showing {mockDiffData.length} changes between versions</span>
          <button className="text-blue-600 hover:text-blue-700 font-medium">Restore this version</button>
        </div>
      </div>
    </div>
  );
};