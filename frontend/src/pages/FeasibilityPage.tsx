import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface FactorScore {
  name: string;
  score: number;
  max: number;
  status: 'pass' | 'warning' | 'fail';
  notes: string;
}

export default function FeasibilityPage() {
  const [factors] = useState<FactorScore[]>([
    { name: 'Geotechnical Suitability', score: 78, max: 100, status: 'pass', notes: 'Suitable founding conditions identified' },
    { name: 'Environmental Impact', score: 56, max: 100, status: 'warning', notes: 'Minor vegetation clearance required' },
    { name: 'Hydrological Risk', score: 92, max: 100, status: 'pass', notes: 'Outside 100 year flood plain' },
    { name: 'Traffic Access', score: 42, max: 100, status: 'warning', notes: 'Access road widening recommended' },
    { name: 'Utility Availability', score: 85, max: 100, status: 'pass', notes: 'All services within 200m' },
    { name: 'Regulatory Compliance', score: 68, max: 100, status: 'warning', notes: 'Resource consent required' },
    { name: 'Land Ownership', score: 100, max: 100, status: 'pass', notes: 'Clear title confirmed' },
  ]);

  const overallScore = Math.round(factors.reduce((sum, f) => sum + (f.score / f.max) * 100, 0) / factors.length);
  const passCount = factors.filter(f => f.status === 'pass').length;
  const warningCount = factors.filter(f => f.status === 'warning').length;

  const statusColors = {
    pass: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    fail: 'bg-red-100 text-red-700 border-red-200',
  };

  const barColors = {
    pass: 'bg-green-500',
    warning: 'bg-yellow-500',
    fail: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feasibility Analysis</h1>
          <p className="text-gray-500 mt-1">Site assessment and risk analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
          <Button variant="primary">Run Analysis</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overall Feasibility Score</p>
            <p className="text-3xl font-bold text-blue-600">{overallScore}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {overallScore >= 70 ? 'Feasible - proceed to detailed design' : 'Conditional feasibility'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Passed Criteria</p>
            <p className="text-3xl font-bold text-green-600">{passCount}</p>
            <p className="text-sm text-gray-500 mt-1">of {factors.length} assessment factors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Warnings</p>
            <p className="text-3xl font-bold text-yellow-600">{warningCount}</p>
            <p className="text-sm text-gray-500 mt-1">items requiring mitigation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Factors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.map((factor) => (
            <div key={factor.name} className={`p-4 rounded-lg border ${statusColors[factor.status]} border-opacity-30`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{factor.name}</p>
                  <p className="text-sm opacity-75">{factor.notes}</p>
                </div>
                <span className="text-lg font-bold">{factor.score}/{factor.max}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${barColors[factor.status]}`} style={{ width: `${(factor.score / factor.max) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}