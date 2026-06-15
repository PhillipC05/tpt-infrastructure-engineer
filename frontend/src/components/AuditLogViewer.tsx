{/* frontend/src/components/AuditLogViewer.tsx */}
import React, { useState } from 'react';
import { Search, Filter, User, FileEdit, Trash2, Eye, Download, Plus } from 'lucide-react';

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'download';
  resource: string;
  details: string;
  ipAddress: string;
}

const mockAuditLogs: AuditEntry[] = [
  { id: 1, timestamp: '2026-04-23 09:24:12', user: 'Phillip C', action: 'update', resource: 'Project #123', details: 'Updated cost estimate', ipAddress: '192.168.1.45' },
  { id: 2, timestamp: '2026-04-23 08:52:47', user: 'Sarah M', action: 'create', resource: 'Drawing #456', details: 'Uploaded site_plan.dwg', ipAddress: '192.168.1.67' },
  { id: 3, timestamp: '2026-04-23 08:15:33', user: 'John D', action: 'delete', resource: 'Material #789', details: 'Removed obsolete material', ipAddress: '192.168.1.22' },
  { id: 4, timestamp: '2026-04-23 07:41:09', user: 'System', action: 'download', resource: 'Report #321', details: 'Generated feasibility report', ipAddress: '127.0.0.1' },
  { id: 5, timestamp: '2026-04-22 16:32:55', user: 'Phillip C', action: 'view', resource: 'Project #123', details: 'Viewed project timeline', ipAddress: '192.168.1.45' },
];

const getActionIcon = (action: string) => {
  switch (action) {
    case 'create': return <Plus className="text-green-600" size={16} />;
    case 'update': return <FileEdit className="text-blue-600" size={16} />;
    case 'delete': return <Trash2 className="text-red-600" size={16} />;
    case 'view': return <Eye className="text-gray-600" size={16} />;
    case 'download': return <Download className="text-purple-600" size={16} />;
    default: return null;
  }
};

export const AuditLogViewer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">Audit Log</h3>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
            <option value="download">Download</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Resource</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
              <th className="px-4 py-3 text-left font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{log.user}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.action)}
                    <span className="capitalize text-gray-700">{log.action}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{log.resource}</td>
                <td className="px-4 py-3 text-gray-600">{log.details}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};