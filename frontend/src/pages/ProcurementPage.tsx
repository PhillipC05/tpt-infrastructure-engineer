import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatCurrency } from '../lib/utils';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  items: number;
  total: number;
  status: 'draft' | 'approved' | 'ordered' | 'received';
  delivery_date: string;
}

export default function ProcurementPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    { id: '1', po_number: 'PO-2026-0012', supplier: 'Fulton Hogan', items: 12, total: 124560, status: 'ordered', delivery_date: '2026-04-28' },
    { id: '2', po_number: 'PO-2026-0011', supplier: 'Pacific Steel', items: 4, total: 87230, status: 'approved', delivery_date: '2026-04-30' },
    { id: '3', po_number: 'PO-2026-0010', supplier: 'Marley Pipe Systems', items: 8, total: 34875, status: 'received', delivery_date: '2026-04-20' },
    { id: '4', po_number: 'PO-2026-0009', supplier: 'Higgins Construction', items: 3, total: 198500, status: 'draft', delivery_date: '2026-05-05' },
  ]);

  const totalSpend = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const pending = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'approved').length;

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    approved: 'bg-blue-100 text-blue-700',
    ordered: 'bg-yellow-100 text-yellow-700',
    received: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-gray-500 mt-1">Purchase orders and supplier management</p>
        </div>
        <Button variant="primary">Create Purchase Order</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Spend</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Received</p>
            <p className="text-2xl font-bold text-green-600">{purchaseOrders.filter(po => po.status === 'received').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Active Suppliers</p>
            <p className="text-2xl font-bold text-blue-600">12</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">PO Number</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Items</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Delivery</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{po.po_number}</td>
                  <td className="py-3 px-4 text-gray-600">{po.supplier}</td>
                  <td className="py-3 px-4 text-right">{po.items}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(po.total)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(po.delivery_date)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm">View</Button>
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