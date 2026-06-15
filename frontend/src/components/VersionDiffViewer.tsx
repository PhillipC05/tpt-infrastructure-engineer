// frontend/src/components/VersionDiffViewer.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Version {
  id: string;
  version_number: number;
  created_at: string;
  data: Record<string, unknown>;
}

interface DiffChange {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  type: 'added' | 'removed' | 'modified';
}

function diffVersions(older: Record<string, unknown>, newer: Record<string, unknown>): DiffChange[] {
  const allKeys = new Set([...Object.keys(older), ...Object.keys(newer)]);
  const changes: DiffChange[] = [];
  for (const key of allKeys) {
    if (!(key in older)) {
      changes.push({ field: key, oldValue: '—', newValue: String(newer[key] ?? ''), type: 'added' });
    } else if (!(key in newer)) {
      changes.push({ field: key, oldValue: String(older[key] ?? ''), newValue: '—', type: 'removed' });
    } else if (String(older[key]) !== String(newer[key])) {
      changes.push({ field: key, oldValue: String(older[key] ?? ''), newValue: String(newer[key] ?? ''), type: 'modified' });
    }
  }
  return changes;
}

interface Props {
  projectId?: string;
}

export const VersionDiffViewer: React.FC<Props> = ({ projectId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [leftVersion, setLeftVersion] = useState('');
  const [rightVersion, setRightVersion] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'unified' | 'inline'>('inline');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.getProjectVersions(projectId)
      .then(data => {
        setVersions(data);
        if (data.length >= 2) {
          setLeftVersion(data[1].id);
          setRightVersion(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const leftVer = versions.find(v => v.id === leftVersion);
  const rightVer = versions.find(v => v.id === rightVersion);
  const diffData: DiffChange[] =
    leftVer && rightVer ? diffVersions(leftVer.data as Record<string, unknown>, rightVer.data as Record<string, unknown>) : [];

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleString('en-NZ', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-50 border-l-4 border-green-500';
      case 'removed': return 'bg-red-50 border-l-4 border-red-500';
      case 'modified': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-gray-50';
    }
  };

  if (!projectId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        Select a project to view version history.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        Loading versions…
      </div>
    );
  }

  if (versions.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        {versions.length === 0 ? 'No version history found.' : 'At least two versions are needed to compare.'}
      </div>
    );
  }

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
              {versions.map(v => (
                <option key={v.id} value={v.id}>v{v.version_number} — {formatDate(v.created_at)}</option>
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
              {versions.map(v => (
                <option key={v.id} value={v.id}>v{v.version_number} — {formatDate(v.created_at)}</option>
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
        {diffData.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No differences found between these versions.</div>
        )}
        {diffData.map((change, index) => (
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
        <span>Showing {diffData.length} change{diffData.length !== 1 ? 's' : ''} between versions</span>
      </div>
    </div>
  );
};