import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CostPoint { month: string; actual: number; budget: number; }
interface TradePoint { name: string; value: number; color: string; }
interface ProgressPoint { name: string; completed: number; total: number; }

interface Props {
  costData?: CostPoint[];
  tradeBreakdown?: TradePoint[];
  projectProgress?: ProgressPoint[];
}

const DEFAULT_COSTS: CostPoint[] = [
  { month: 'Jan', actual: 120000, budget: 115000 },
  { month: 'Feb', actual: 135000, budget: 130000 },
  { month: 'Mar', actual: 142000, budget: 145000 },
  { month: 'Apr', actual: 158000, budget: 160000 },
  { month: 'May', actual: 172000, budget: 175000 },
  { month: 'Jun', actual: 165000, budget: 170000 },
];

const DEFAULT_TRADES: TradePoint[] = [
  { name: 'Civil', value: 35, color: '#3b82f6' },
  { name: 'Structural', value: 25, color: '#10b981' },
  { name: 'Mechanical', value: 15, color: '#f59e0b' },
  { name: 'Electrical', value: 12, color: '#ef4444' },
  { name: 'Finishes', value: 13, color: '#8b5cf6' },
];

const DEFAULT_PROGRESS: ProgressPoint[] = [
  { name: 'Design', completed: 100, total: 100 },
  { name: 'Procurement', completed: 75, total: 100 },
  { name: 'Construction', completed: 32, total: 100 },
  { name: 'Testing', completed: 0, total: 100 },
];

export const DashboardCharts: React.FC<Props> = ({
  costData = DEFAULT_COSTS,
  tradeBreakdown = DEFAULT_TRADES,
  projectProgress = DEFAULT_PROGRESS,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-5 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Cost Trend</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Actual Cost" />
            <Line type="monotone" dataKey="budget" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Budget" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-5 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Trade Breakdown</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={tradeBreakdown}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {tradeBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-5 rounded-lg border border-gray-200 col-span-1 lg:col-span-2">
        <h4 className="font-semibold text-gray-900 mb-4">Project Progress</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={projectProgress} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
            <Tooltip />
            <Bar dataKey="completed" fill="#3b82f6" name="Completed %" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
