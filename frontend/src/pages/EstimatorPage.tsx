import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  category: string;
}

export default function EstimatorPage() {
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', description: 'Site Clearance & Earthworks', quantity: 1250, unit: 'm³', rate: 42.50, amount: 53125, category: 'Earthworks' },
    { id: '2', description: 'Reinforced Concrete Foundations', quantity: 185, unit: 'm³', rate: 385.00, amount: 71225, category: 'Concrete' },
    { id: '3', description: 'Structural Steel Fabrication', quantity: 42, unit: 't', rate: 2950.00, amount: 123900, category: 'Steel' },
    { id: '4', description: 'Asphalt Pavement AC14', quantity: 850, unit: 'm²', rate: 145.00, amount: 123250, category: 'Roading' },
  ]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const overhead = total * 0.12;
  const profit = total * 0.08;
  const grandTotal = total + overhead + profit;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Estimator</h1>
          <p className="text-gray-500 mt-1">Project cost breakdown and quantity takeoff</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export PDF</Button>
          <Button variant="primary">Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Direct Cost</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overhead (12%)</p>
            <p className="text-2xl font-bold text-gray-600">{formatCurrency(overhead)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Profit Margin (8%)</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(profit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Grand Total</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Item</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Qty</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unit</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{item.description}</td>
                  <td className="py-3 px-4 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(item.rate)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="py-3 px-4 text-right text-gray-700">Total Direct Cost</td>
                <td className="py-3 px-4 text-right">{formatCurrency(total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}