import React, { useState, useCallback } from 'react';
import axios from 'axios';

const MaterialCategory = {
  CONCRETE:   'concrete',
  STEEL:      'steel',
  TIMBER:     'timber',
  AGGREGATES: 'aggregates',
  ASPHALT:    'asphalt',
  MASONRY:    'masonry',
  COMPOSITE:  'composite',
} as const;
type MaterialCategory = typeof MaterialCategory[keyof typeof MaterialCategory];

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

interface LivePrice {
  unit_cost: number;
  change_pct: number;
  direction: 'up' | 'down';
}

const BASE_MATERIALS: Material[] = [
  { id: 'conc_20mpa',       name: 'Concrete 20 MPa',        category: MaterialCategory.CONCRETE,   unit_cost: 320,  strength: 20,  density: 2400, carbon_footprint: 0.18, standards: ['AS 1379', 'NZS 3101'] },
  { id: 'conc_25mpa',       name: 'Concrete 25 MPa',        category: MaterialCategory.CONCRETE,   unit_cost: 345,  strength: 25,  density: 2400, carbon_footprint: 0.19, standards: ['AS 1379', 'NZS 3101'] },
  { id: 'conc_30mpa',       name: 'Concrete 30 MPa',        category: MaterialCategory.CONCRETE,   unit_cost: 375,  strength: 30,  density: 2400, carbon_footprint: 0.20, standards: ['AS 1379', 'NZS 3101'] },
  { id: 'steel_rebar_16mm', name: 'Reinforcing Steel 16mm', category: MaterialCategory.STEEL,      unit_cost: 3.20, strength: 500, density: 7850, carbon_footprint: 2.1,  standards: ['AS/NZS 4671'] },
  { id: 'timber_pine_rg15', name: 'Pine Radiata RG15',      category: MaterialCategory.TIMBER,     unit_cost: 1850, strength: 15,  density: 450,  carbon_footprint: -0.8, standards: ['AS/NZS 1748'] },
  { id: 'aggregate_gap20',  name: 'Gap 20 Basecourse',      category: MaterialCategory.AGGREGATES, unit_cost: 42,   strength: 80,  density: 2000, carbon_footprint: 0.03, standards: ['AS/NZS 2758'] },
];

function PriceChangeChip({ pct, direction }: { pct: number; direction: 'up' | 'down' }) {
  const up = direction === 'up';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${
      up ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

const MaterialsDatabase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [searchTerm, setSearchTerm]             = useState('');
  const [livePrices, setLivePrices]             = useState<Record<string, LivePrice>>({});
  const [lastUpdated, setLastUpdated]           = useState<string | null>(null);
  const [refreshing, setRefreshing]             = useState(false);
  const [priceSource, setPriceSource]           = useState<string>('');

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('tpt_token');
      const { data } = await axios.get('/api/materials/prices/live', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setLivePrices(data.prices);
      setLastUpdated(data.timestamp);
      setPriceSource(data.source);
    } catch {
      // silently ignore — base prices remain shown
    } finally {
      setRefreshing(false);
    }
  }, []);

  const categories = Object.values(MaterialCategory);
  const filteredMaterials = BASE_MATERIALS.filter(m =>
    (!selectedCategory || m.category === selectedCategory) &&
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayCost = (m: Material) =>
    livePrices[m.id] ? livePrices[m.id].unit_cost : m.unit_cost;

  const formatTs = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Materials Database</h2>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={refreshPrices}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                refreshing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Fetching...' : 'Refresh Prices'}
            </button>
            {lastUpdated && (
              <div className="text-xs text-gray-400 text-right">
                <span className="font-medium text-green-600">● Live</span>
                {' '}· Updated {formatTs(lastUpdated)}
                <br />
                <span className="text-gray-400">{priceSource}</span>
              </div>
            )}
          </div>
        </div>

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
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left p-3 rounded transition-colors capitalize ${selectedCategory === cat ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {cat.replace('_', ' ')}
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
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>

              <div className="space-y-3">
                {filteredMaterials.map(material => {
                  const live = livePrices[material.id];
                  const cost = displayCost(material);
                  return (
                    <div key={material.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{material.category.replace('_', ' ')}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className={`font-semibold text-lg ${live ? 'text-blue-700' : 'text-gray-800'}`}>
                              ${cost.toLocaleString(undefined, { minimumFractionDigits: cost < 10 ? 2 : 0, maximumFractionDigits: cost < 10 ? 2 : 0 })}
                            </div>
                            {live && <PriceChangeChip pct={live.change_pct} direction={live.direction} />}
                          </div>
                          <div className="text-xs text-gray-500">
                            {live ? 'live price / unit' : 'base price / unit'}
                          </div>
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
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialsDatabase;
