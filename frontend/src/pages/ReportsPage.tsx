import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';

interface Report {
  id: string;
  name: string;
  type: 'feasibility' | 'cost' | 'schedule' | 'procurement' | 'risk';
  status: 'draft' | 'generated' | 'approved';
  created_at: string;
  author: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([
    { id: '1', name: 'Southern Highway Feasibility Study', type: 'feasibility', status: 'approved', created_at: '2026-04-15', author: 'A. Davis' },
    { id: '2', name: 'Q2 Cost Variance Report', type: 'cost', status: 'generated', created_at: '2026-04-20', author: 'S. Lee' },
    { id: '3', name: 'Construction Schedule Baseline', type: 'schedule', status: 'approved', created_at: '2026-04-10', author: 'M. Chen' },
    { id: '4', name: 'Subcontractor Tender Package', type: 'procurement', status: 'draft', created_at: '2026-04-21', author: 'T. Williams' },
    { id: '5', name: 'Geotechnical Risk Assessment', type: 'risk', status: 'generated', created_at: '2026-04-18', author: 'K. Robinson' },
  ]);

  const typeLabels = {
    feasibility: 'Feasibility Report',
    cost: 'Cost Report',
    schedule: 'Schedule Report',
    procurement: 'Procurement Report',
    risk: 'Risk Report',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    generated: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
  };

  const typeColors = {
    feasibility: 'border-blue-500 bg-blue-50',
    cost: 'border-green-500 bg-green-50',
    schedule: 'border-purple-500 bg-purple-50',
    procurement: 'border-orange-500 bg-orange-50',
    risk: 'border-red-500 bg-red-50',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Generate and manage project documentation</p>
        </div>
        <Button variant="primary">New Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(typeLabels).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter(r => r.type === key).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className={`border-l-4 ${typeColors[report.type]}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{report.name}</CardTitle>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[report.status]}`}>
                  {report.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{typeLabels[report.type]}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Created: {formatDate(report.created_at)}</span>
                <span>{report.author}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">View</Button>
                <Button variant="ghost" size="sm">Download</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}