import React, { useState } from 'react';
import { MaterialCategory } from '../../../backend/materials';

interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit_cost: number;
  strength: number;
  density: number;
  carbon_footprint: number;
  standards: string[];
}

const MaterialsDatabase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const mockMaterials: Material[] = [
    { id: 'conc_20mpa', name: 'Concrete 20 MPa', category: MaterialCategory.CONCRETE, unit_cost: 320, strength: 20, density: 2400, carbon_footprint: 0.18, standards: ['AS 1379', 'NZS 3101'] },
    { id: 'conc_25mpa', name: 'Concrete 25 MPa', category: MaterialCategory.CONCRETE, unit_cost: 345, strength: 25, density: 2400, carbon_footprint: 0.19, standards: ['AS 1379', 'NZS 3101'] },
    { id: 'conc_30mpa', name: 'Concrete 30 MPa', category: MaterialCategory.CONCRETE, unit_cost: 375, strength: 30, density: 2400, carbon_footprint: 0.20, standards: ['AS 1379', 'NZS 3101'] },
    { id: 'steel_rebar_16mm', name: 'Reinforcing Steel 16mm', category: MaterialCategory.STEEL, unit_cost: 3.20, strength: 500, density: 7850, carbon_footprint: 2.1, standards: ['AS/NZS 4671'] },
    { id: 'timber_pine_rg15', name: 'Pine Radiata RG15', category: MaterialCategory.TIMBER, unit_cost: 1850, strength: 15, density: 450, carbon_footprint: -0.8, standards: ['AS/NZS 1748'] },
    { id: 'aggregate_gap20', name: 'Gap 20 Basecourse', category: MaterialCategory.AGGREGATES, unit_cost: 42, strength: 80, density: 2000, carbon_footprint: 0.03, standards: ['AS/NZS 2758'] },
  ];

  const categories = Object.values(MaterialCategory);
  const filteredMaterials = mockMaterials.filter(m => 
    (!selectedCategory || m.category === selectedCategory) &&
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Materials Database</h2>

        <div className="grid grid-cols-12 gap-6">
          {/* Category Filter */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left p-3 rounded transition-colors ${!selectedCategory ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  All Materials
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left p-3 rounded transition-colors capitalize ${selectedCategory === category ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {category.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Materials List */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>

              <div className="space-y-3">
                {filteredMaterials.map(material => (
                  <div key={material.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{material.category.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${material.unit_cost.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">per unit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Strength</div>
                        <div className="font-medium">{material.strength} MPa</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Density</div>
                        <div className="font-medium">{material.density} kg/m³</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Carbon</div>
                        <div className={`font-medium ${material.carbon_footprint < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {material.carbon_footprint > 0 ? '+' : ''}{material.carbon_footprint} tCO₂
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Standards</div>
                        <div className="font-medium">{material.standards.length} certs</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialsDatabase;