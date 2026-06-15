import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface BOM {
  id: string;
  title: string;
  project_id: string;
  line_items: any[];
  total_value: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  project_id: string;
  supplier_name: string;
  status: string;
  total_value: number;
  line_items: any[];
  created_at: string;
}

const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  partial_delivery: 'bg-orange-100 text-orange-700',
  fully_delivered: 'bg-green-100 text-green-700',
  invoiced: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const TABS = ['Bill of Materials', 'Purchase Orders'] as const;
type Tab = typeof TABS[number];

export default function ProcurementManager() {
  const [activeTab, setActiveTab] = useState<Tab>('Bill of Materials');
  const [boms, setBoms] = useState<BOM[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getBoms().then(r => r.data).catch(() => []),
      api.getPurchaseOrders().then(r => r.data).catch(() => []),
    ]).then(([b, po]) => {
      setBoms(b);
      setPurchaseOrders(po);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalBOMValue = boms.reduce((s, b) => s + b.total_value, 0);
  const totalPOValue = purchaseOrders.reduce((s, p) => s + p.total_value, 0);
  const approvedPOs = purchaseOrders.filter(p => ['approved', 'sent', 'partial_delivery', 'fully_delivered', 'paid'].includes(p.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Manager</h1>
        <p className="text-gray-500 mt-1">Manage Bill of Materials, Purchase Orders and Budget Tracking</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Total BOM Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBOMValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{boms.length} bill{boms.length !== 1 ? 's' : ''} of materials</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Total PO Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPOValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{purchaseOrders.length} purchase order{purchaseOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Approved POs</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedPOs}</p>
          <p className="text-xs text-gray-400 mt-1">of {purchaseOrders.length} total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : activeTab === 'Bill of Materials' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Bills of Materials</h2>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Generate BOM from Estimate
            </button>
          </div>

          {boms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
              No bills of materials yet. Generate one from an estimate to get started.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Title</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Items</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Value</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map(bom => (
                    <tr key={bom.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{bom.title}</td>
                      <td className="py-3 px-4 text-gray-600">{bom.line_items.length}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(bom.total_value)}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(bom.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="text-xs text-blue-600 hover:underline">View</button>
                          <button className="text-xs text-gray-500 hover:underline">Create PO</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Purchase Orders</h2>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Create Purchase Order
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
              No purchase orders yet.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">PO Number</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Supplier</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Value</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{po.po_number}</td>
                      <td className="py-3 px-4 text-gray-600">{po.supplier_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PO_STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(po.total_value)}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="text-xs text-blue-600 hover:underline">View</button>
                          <button className="text-xs text-gray-500 hover:underline">Record Delivery</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
