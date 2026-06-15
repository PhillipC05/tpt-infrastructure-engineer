import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'

// kgCO2e emission factors — NZ, mid-2026
const EF = {
  diesel_L: 2.68,
  petrol_L: 2.31,
  electricity_kWh: 0.091, // NZ grid average (high renewables)
  concrete_m3: 300,
  steel_kg: 1.8,
  timber_m3: 30,
  transport_tkm: 0.12,
}

// NZ construction benchmark per $1M contract value (kgCO2e)
const BENCH = { scope1: 12000, scope2: 3500, scope3: 85000, total: 100500 }

function fmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

interface Scope1 { diesel_L: number; petrol_L: number }
interface Scope2 { electricity_kWh: number }
interface Scope3 { concrete_m3: number; steel_kg: number; timber_m3: number; transport_tkm: number }

function NumberField({
  label, value, setter, unit,
}: { label: string; value: number; setter: (v: number) => void; unit: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} value={value}
          onChange={e => setter(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  )
}

const CarbonDashboard: React.FC = () => {
  const [scope1, setScope1] = useState<Scope1>({ diesel_L: 5000, petrol_L: 500 })
  const [scope2, setScope2] = useState<Scope2>({ electricity_kWh: 8000 })
  const [scope3, setScope3] = useState<Scope3>({
    concrete_m3: 120, steel_kg: 8000, timber_m3: 15, transport_tkm: 45000,
  })

  const s1 = scope1.diesel_L * EF.diesel_L + scope1.petrol_L * EF.petrol_L
  const s2 = scope2.electricity_kWh * EF.electricity_kWh
  const s3 =
    scope3.concrete_m3 * EF.concrete_m3 +
    scope3.steel_kg * EF.steel_kg +
    scope3.timber_m3 * EF.timber_m3 +
    scope3.transport_tkm * EF.transport_tkm
  const total = s1 + s2 + s3
  const pct = total > 0 ? ((total - BENCH.total) / BENCH.total) * 100 : 0
  const rating = pct < -20 ? 'A+' : pct < -10 ? 'A' : pct < 0 ? 'B' : pct < 15 ? 'C' : 'D'
  const ratingColor = ['A+', 'A'].includes(rating) ? 'text-green-600'
    : rating === 'B' ? 'text-blue-600'
    : rating === 'C' ? 'text-amber-600'
    : 'text-red-600'

  const barData = [
    { name: 'Scope 1', project: Math.round(s1), benchmark: BENCH.scope1 },
    { name: 'Scope 2', project: Math.round(s2), benchmark: BENCH.scope2 },
    { name: 'Scope 3', project: Math.round(s3), benchmark: BENCH.scope3 },
    { name: 'Total',   project: Math.round(total), benchmark: BENCH.total },
  ]

  const radarData = [
    { axis: 'Diesel',       value: Math.min(120, (scope1.diesel_L * EF.diesel_L / BENCH.scope1) * 100) },
    { axis: 'Electricity',  value: Math.min(120, (s2 / BENCH.scope2) * 100) },
    { axis: 'Concrete',     value: Math.min(120, (scope3.concrete_m3 * EF.concrete_m3 / (BENCH.scope3 * 0.35)) * 100) },
    { axis: 'Steel',        value: Math.min(120, (scope3.steel_kg * EF.steel_kg / (BENCH.scope3 * 0.45)) * 100) },
    { axis: 'Transport',    value: Math.min(120, (scope3.transport_tkm * EF.transport_tkm / (BENCH.scope3 * 0.14)) * 100) },
  ]

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Carbon Dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">Scope 1 / 2 / 3 GHG tracking vs NZ construction benchmark</p>

        <div className="grid grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="col-span-4 space-y-4">
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">Scope 1</span>
                Direct Emissions
              </h3>
              <div className="space-y-3">
                <NumberField label="Diesel fuel" value={scope1.diesel_L}
                  setter={v => setScope1(s => ({ ...s, diesel_L: v }))} unit="L" />
                <NumberField label="Petrol fuel" value={scope1.petrol_L}
                  setter={v => setScope1(s => ({ ...s, petrol_L: v }))} unit="L" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">Scope 2</span>
                Indirect Energy
              </h3>
              <NumberField label="Grid electricity (NZ 0.091 kgCO₂e/kWh)"
                value={scope2.electricity_kWh}
                setter={v => setScope2({ electricity_kWh: v })} unit="kWh" />
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">Scope 3</span>
                Value Chain
              </h3>
              <div className="space-y-3">
                <NumberField label="Concrete (OPC, 300 kgCO₂e/m³)"
                  value={scope3.concrete_m3}
                  setter={v => setScope3(s => ({ ...s, concrete_m3: v }))} unit="m³" />
                <NumberField label="Steel (1.8 kgCO₂e/kg)"
                  value={scope3.steel_kg}
                  setter={v => setScope3(s => ({ ...s, steel_kg: v }))} unit="kg" />
                <NumberField label="Timber (30 kgCO₂e/m³)"
                  value={scope3.timber_m3}
                  setter={v => setScope3(s => ({ ...s, timber_m3: v }))} unit="m³" />
                <NumberField label="Freight transport (0.12 kgCO₂e/t·km)"
                  value={scope3.transport_tkm}
                  setter={v => setScope3(s => ({ ...s, transport_tkm: v }))} unit="t·km" />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="col-span-8 space-y-5">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total',   val: total, color: 'bg-gray-50 border-gray-200' },
                { label: 'Scope 1', val: s1,    color: 'bg-red-50 border-red-200' },
                { label: 'Scope 2', val: s2,    color: 'bg-amber-50 border-amber-200' },
                { label: 'Scope 3', val: s3,    color: 'bg-blue-50 border-blue-200' },
              ].map(c => (
                <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                  <div className="text-xs text-gray-500">{c.label}</div>
                  <div className="text-xl font-bold text-gray-800">{fmt(c.val)}</div>
                  <div className="text-xs text-gray-400">kgCO₂e</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-4 flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500 mb-1">vs NZ Benchmark ({fmt(BENCH.total)} kg)</div>
                <div className={`text-3xl font-bold ${pct > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white rounded-xl border p-4 flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500 mb-1">Carbon Rating</div>
                <div className={`text-5xl font-black ${ratingColor}`}>{rating}</div>
                <div className="text-xs text-gray-400 mt-1">A+ = &gt;20% below benchmark</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Project vs NZ Benchmark (kgCO₂e)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString() + ' kg', '']} />
                    <Legend />
                    <Bar dataKey="project"   name="This Project"  fill="#3b82f6" />
                    <Bar dataKey="benchmark" name="NZ Benchmark"  fill="#d1d5db" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Emission Source Profile (% of benchmark)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 120]} tick={{ fontSize: 9 }} />
                    <Radar name="Project" dataKey="value"
                      stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarbonDashboard
