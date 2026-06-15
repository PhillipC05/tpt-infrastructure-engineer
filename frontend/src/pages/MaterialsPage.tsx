import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: 'm' | 'm2' | 'm3' | 'kg' | 'ea' | 't';
  unit_cost: number;
  supplier: string;
  grade?: string;
  carbon_footprint?: number;
  availability: 'in_stock' | 'limited' | 'order_only';
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([
    { id: '1', name: 'Structural Steel - Grade 300', category: 'Steel', unit: 'kg', unit_cost: 2.85, supplier: 'Steelcorp NZ', grade: '300', carbon_footprint: 1.85, availability: 'in_stock' },
    { id: '2', name: 'Ready Mix Concrete 25MPa', category: 'Concrete', unit: 'm3', unit_cost: 245.00, supplier: 'Fulton Hogan', grade: '25MPa', carbon_footprint: 280, availability: 'in_stock' },
    { id: '3', name: 'Reinforcing Bar 16mm', category: 'Steel', unit: 'm', unit_cost: 12.40, supplier: 'Pacific Steel', grade: '500E', carbon_footprint: 2.1, availability: 'limited' },
    { id: '4', name: 'Asphalt AC14', category: 'Roading', unit: 't', unit_cost: 195.00, supplier: 'Downer', availability: 'in_stock' },
    { id: '5', name: 'Drainage Pipe 300mm PVC', category: 'Drainage', unit: 'm', unit_cost: 87.50, supplier: 'Marley', carbon_footprint: 4.2, availability: 'order_only' },
  ]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = ['all', 'Steel', 'Concrete', 'Timber', 'Roading', 'Drainage', 'Electrical'];

  const filtered = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const statusColors = {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((material) => (
          <Card key={material.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{material.name}</CardTitle>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[material.availability]}`}>
                  {material.availability.replace('_', ' ')}
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
    </div>
  );
}