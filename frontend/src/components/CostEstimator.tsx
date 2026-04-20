import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CostEstimate {
  total_materials: number;
  total_labour: number;
  total_plant: number;
  subtotal: number;
  overhead: number;
  profit_margin: number;
  contingency: number;
  total_cost: number;
  carbon_footprint: number;
}

const CostEstimator: React.FC = () => {
  const [wallHeight, setWallHeight] = useState(3.0);
  const [wallLength, setWallLength] = useState(20.0);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateEstimate = async () => {
    setIsCalculating(true);
    
    // Simulate backend calculation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const materials = {
      conc_25mpa: wallHeight * wallLength * 0.4 * 345,
      steel_rebar_16mm: wallLength * 22 * 3.20,
      aggregate_gap20: wallLength * 1.8 * 42
    };
    
    const labour = {
      foreman: wallLength * 1.2 * 95,
      operator: wallLength * 0.8 * 75,
      finisher: wallLength * 1.0 * 72,
      labourer: wallLength * 2.5 * 48
    };
    
    const plant = {
      excavator: wallLength * 0.3 * 185,
      dumper: wallLength * 0.2 * 95
    };

    const totalMaterials = Object.values(materials).reduce((a, b) => a + b, 0);
    const totalLabour = Object.values(labour).reduce((a, b) => a + b, 0);
    const totalPlant = Object.values(plant).reduce((a, b) => a + b, 0);
    
    const subtotal = totalMaterials + totalLabour + totalPlant;
    const overhead = subtotal * 0.12;
    const profit = (subtotal + overhead) * 0.10;
    const contingency = (subtotal + overhead + profit) * 0.05;

    setEstimate({
      total_materials: totalMaterials,
      total_labour: totalLabour,
      total_plant: totalPlant,
      subtotal,
      overhead,
      profit_margin: profit,
      contingency,
      total_cost: subtotal + overhead + profit + contingency,
      carbon_footprint: wallHeight * wallLength * 0.18
    });
    
    setIsCalculating(false);
  };

  const chartData = estimate ? [
    { name: 'Materials', value: estimate.total_materials },
    { name: 'Labour', value: estimate.total_labour },
    { name: 'Plant', value: estimate.total_plant },
    { name: 'Overhead', value: estimate.overhead },
    { name: 'Profit', value: estimate.profit_margin },
    { name: 'Contingency', value: estimate.contingency }
  ] : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cost Estimator</h2>

        <div className="grid grid-cols-12 gap-6">
          {/* Input Parameters */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Design Parameters</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Wall Height (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Wall Length (m)</label>
                  <input
                    type="number"
                    step="1"
                    value={wallLength}
                    onChange={(e) => setWallLength(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <button
                  onClick={calculateEstimate}
                  disabled={isCalculating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded mt-4 disabled:opacity-50"
                >
                  {isCalculating ? 'Calculating...' : 'Generate Estimate'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="col-span-8">
            {estimate ? (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-sm text-gray-500">Total Cost</div>
                    <div className="text-2xl font-bold text-blue-600">${estimate.total_cost.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-sm text-gray-500">Materials</div>
                    <div className="text-xl font-semibold">${estimate.total_materials.toFixed(0)}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-sm text-gray-500">Labour</div>
                    <div className="text-xl font-semibold">${estimate.total_labour.toFixed(0)}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-sm text-gray-500">Carbon Footprint</div>
                    <div className="text-xl font-semibold text-green-600">{estimate.carbon_footprint.toFixed(1)} tCO₂</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Cost Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📊</div>
                <div className="text-gray-500">Enter design parameters and click Generate Estimate</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostEstimator;