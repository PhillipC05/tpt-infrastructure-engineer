import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  category: string;
}

interface Project {
  id: string;
  name: string;
}

const EMPTY_ITEM = {
  description: '',
  quantity: '',
  unit: 'm²',
  rate: '',
  category: 'General',
};

export default function EstimatorPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects(0, 100).then(({ data }) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    api.getProjectEstimates(selectedProjectId)
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  function openModal() {
    setItemForm(EMPTY_ITEM);
    setItemError(null);
    setShowModal(true);
  }

  async function handleAddItem() {
    if (!itemForm.description.trim()) { setItemError('Description is required.'); return; }
    const qty = parseFloat(itemForm.quantity);
    const rate = parseFloat(itemForm.rate);
    if (isNaN(qty) || qty <= 0) { setItemError('Enter a valid quantity.'); return; }
    if (isNaN(rate) || rate < 0) { setItemError('Enter a valid rate.'); return; }
    setSaving(true);
    setItemError(null);
    try {
      await api.createEstimateItem(selectedProjectId, {
        description: itemForm.description.trim(),
        quantity: qty,
        unit: itemForm.unit,
        rate,
        amount: qty * rate,
        category: itemForm.category || 'General',
      });
      setShowModal(false);
      const updated = await api.getProjectEstimates(selectedProjectId);
      setItems(updated);
    } catch (e: any) {
      setItemError(e?.response?.data?.detail ?? 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  }

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
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => window.print()}>Export PDF</Button>
          <Button variant="primary" onClick={openModal} disabled={!selectedProjectId}>Add Item</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

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
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {selectedProjectId
              ? 'No estimate items for this project. Add your first item.'
              : 'Select a project to view its estimate.'}
          </div>
        ) : (
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
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Estimate Item</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {itemError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{itemError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={itemForm.description}
                  onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Concrete footing"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={itemForm.quantity}
                    onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="m²"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={itemForm.rate}
                    onChange={e => setItemForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={itemForm.category}
                  onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Earthworks"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {itemForm.quantity && itemForm.rate && (
                <div className="bg-blue-50 rounded-md px-3 py-2 text-sm text-blue-700">
                  Amount: {formatCurrency(parseFloat(itemForm.quantity) * parseFloat(itemForm.rate))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddItem} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
