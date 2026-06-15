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

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    api.getMaterials()
      .then(({ data }) => setMaterials(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
        <Button variant="primary">Add Material</Button>
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
    </div>
  );
}
