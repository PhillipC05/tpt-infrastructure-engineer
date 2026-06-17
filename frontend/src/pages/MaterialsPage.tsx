import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  supplier: string;
  grade?: string;
  carbon_footprint?: number;
  availability: 'in_stock' | 'limited' | 'order_only';
}

const EMPTY_FORM = {
  name: '',
  category: '',
  unit: '',
  unit_cost: '',
  supplier: '',
  grade: '',
  availability: 'in_stock' as const,
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  function loadMaterials() {
    api.getMaterials()
      .then(({ data }) => setMaterials(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.category.trim()) { setFormError('Category is required.'); return; }
    if (!form.unit.trim()) { setFormError('Unit is required.'); return; }
    const cost = parseFloat(form.unit_cost);
    if (isNaN(cost) || cost < 0) { setFormError('Enter a valid unit cost.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      await api.createMaterial({
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        unit_cost: cost,
        supplier: form.supplier || 'Unknown',
        grade: form.grade || undefined,
        availability: form.availability,
      });
      setShowModal(false);
      setLoading(true);
      loadMaterials();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail ?? 'Failed to add material.');
    } finally {
      setSaving(false);
    }
  }

  const categories = ['all', ...Array.from(new Set(materials.map(m => m.category))).sort()];

  const filtered = materials.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const statusColors: Record<string, string> = {
    in_stock: 'bg-green-100 text-green-700',
    limited: 'bg-yellow-100 text-yellow-700',
    order_only: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials Database</h1>
          <p className="text-gray-500 mt-1">Browse construction materials with pricing and properties</p>
        </div>
        <Button variant="primary" onClick={openModal}>Add Material</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className="whitespace-nowrap"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {materials.length === 0
            ? 'No materials in the database yet. Add your first material to get started.'
            : 'No materials match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((material) => (
            <Card key={material.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{material.name}</CardTitle>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[material.availability] ?? 'bg-gray-100 text-gray-700'}`}>
                    {material.availability.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{material.category} • {material.supplier}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Unit Cost</p>
                    <p className="font-medium">{formatCurrency(material.unit_cost)} / {material.unit}</p>
                  </div>
                  {material.grade && (
                    <div>
                      <p className="text-gray-500">Grade</p>
                      <p className="font-medium">{material.grade}</p>
                    </div>
                  )}
                  {material.carbon_footprint && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Carbon Footprint</p>
                      <p className="font-medium">{material.carbon_footprint} kg CO₂/{material.unit}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Material</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Concrete 30 MPa" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Concrete" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit <span className="text-red-500">*</span></label>
                  <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. m³" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost <span className="text-red-500">*</span></label>
                  <input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" min="0" step="0.01" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input type="text" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. 30 MPa" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <select value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value as any }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="in_stock">In Stock</option>
                    <option value="limited">Limited</option>
                    <option value="order_only">Order Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
