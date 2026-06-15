import React, { useState } from 'react'

// Seed baselines — NZD/unit, NZ market mid-2026 (mirrors backend/anomaly.py)
const BASELINES: Record<string, { mean: number; std: number; unit: string; label: string }> = {
  conc_20mpa:               { mean: 320,  std: 28,   unit: 'm³', label: 'Concrete 20 MPa' },
  conc_25mpa:               { mean: 345,  std: 30,   unit: 'm³', label: 'Concrete 25 MPa' },
  conc_30mpa:               { mean: 375,  std: 33,   unit: 'm³', label: 'Concrete 30 MPa' },
  steel_rebar_16mm:         { mean: 3.20, std: 0.40, unit: 'kg', label: 'Rebar 16 mm'     },
  timber_pine_rg15:         { mean: 1850, std: 180,  unit: 'm³', label: 'Pine RG15'        },
  aggregate_gap20:          { mean: 42,   std: 5,    unit: 't',  label: 'Aggregate GAP20'  },
  labour_civil_foreman:     { mean: 95,   std: 10,   unit: 'hr', label: 'Foreman'           },
  labour_civil_operator:    { mean: 75,   std: 8,    unit: 'hr', label: 'Operator'          },
  labour_civil_labourer:    { mean: 48,   std: 6,    unit: 'hr', label: 'Labourer'          },
  labour_concrete_finisher: { mean: 72,   std: 8,    unit: 'hr', label: 'Concrete Finisher' },
  plant_excavator_20t:      { mean: 185,  std: 20,   unit: 'hr', label: 'Excavator 20t'     },
  plant_dumper_6t:          { mean: 95,   std: 12,   unit: 'hr', label: 'Dumper 6t'         },
  plant_roller_10t:         { mean: 85,   std: 10,   unit: 'hr', label: 'Roller 10t'        },
}

const Z_THRESHOLD = 2.0

interface AnomalyRow {
  itemId: string
  label: string
  rate: number
  mean: number
  std: number
  unit: string
  z: number
  pctDiff: number
  status: 'anomaly' | 'normal' | 'no_baseline'
}

function analyse(rates: Record<string, number>): AnomalyRow[] {
  return Object.entries(rates).map(([itemId, rate]) => {
    const b = BASELINES[itemId]
    if (!b) return { itemId, label: itemId, rate, mean: 0, std: 0, unit: '', z: 0, pctDiff: 0, status: 'no_baseline' as const }
    const z = (rate - b.mean) / (b.std || 1)
    const pctDiff = ((rate - b.mean) / b.mean) * 100
    return {
      itemId, label: b.label, rate, mean: b.mean, std: b.std, unit: b.unit,
      z: +z.toFixed(2), pctDiff: +pctDiff.toFixed(1),
      status: Math.abs(z) >= Z_THRESHOLD ? 'anomaly' : 'normal',
    }
  })
}

const EXAMPLE_RATES: Record<string, number> = {
  conc_25mpa:           345,
  steel_rebar_16mm:     5.10,   // anomaly — high
  labour_civil_foreman: 93,
  labour_civil_labourer: 46,
  plant_excavator_20t:  250,    // anomaly — high
  aggregate_gap20:      41,
}

function StatusBadge({ status, z }: { status: AnomalyRow['status']; z: number }) {
  if (status === 'anomaly') {
    const dir = z > 0 ? '▲ HIGH' : '▼ LOW'
    return <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">{dir}</span>
  }
  if (status === 'normal') return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">Normal</span>
  return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">No baseline</span>
}

function ZBar({ z }: { z: number }) {
  const abs = Math.min(Math.abs(z), 4)
  const pct = (abs / 4) * 100
  const color = abs >= Z_THRESHOLD ? 'bg-red-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-600">{z > 0 ? '+' : ''}{z}σ</span>
    </div>
  )
}

const CostAnomalyDetector: React.FC = () => {
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(EXAMPLE_RATES).map(([k, v]) => [k, String(v)]))
  )
  const [result, setResult] = useState<AnomalyRow[] | null>(null)
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [customRate, setCustomRate] = useState<string>('')

  function runAnalysis() {
    const parsed: Record<string, number> = {}
    Object.entries(rates).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) parsed[k] = n
    })
    const rows = analyse(parsed)
    rows.sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    setResult(rows)
  }

  function addItem() {
    if (!selectedItem || !customRate) return
    setRates(r => ({ ...r, [selectedItem]: customRate }))
    setSelectedItem('')
    setCustomRate('')
  }

  function removeItem(key: string) {
    setRates(r => { const n = { ...r }; delete n[key]; return n })
    if (result) setResult(res => res?.filter(row => row.itemId !== key) ?? null)
  }

  const anomalies = result?.filter(r => r.status === 'anomaly') ?? []
  const normal    = result?.filter(r => r.status === 'normal')  ?? []

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Cost Anomaly Detector</h2>
        <p className="text-sm text-gray-500 mb-6">Z-score analysis of unit rates against NZ market baselines (threshold: ±{Z_THRESHOLD}σ)</p>

        <div className="grid grid-cols-12 gap-6">
          {/* Input panel */}
          <div className="col-span-4 space-y-4">
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Unit Rates to Check</h3>

              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {Object.entries(rates).map(([key, val]) => {
                  const b = BASELINES[key]
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 truncate">{b?.label ?? key}</div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" value={val}
                            onChange={e => setRates(r => ({ ...r, [key]: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-gray-400 shrink-0">
                            ${b?.mean.toFixed(2)}/{b?.unit ?? ''}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(key)}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0"
                        aria-label="Remove">×</button>
                    </div>
                  )
                })}
              </div>

              <div className="border-t pt-3 space-y-2">
                <select
                  value={selectedItem}
                  onChange={e => setSelectedItem(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">+ Add item...</option>
                  {Object.entries(BASELINES)
                    .filter(([k]) => !(k in rates))
                    .map(([k, b]) => (
                      <option key={k} value={k}>{b.label} (baseline ${b.mean}/{b.unit})</option>
                    ))}
                </select>
                {selectedItem && (
                  <div className="flex gap-2">
                    <input
                      type="number" placeholder="Unit rate ($)"
                      value={customRate}
                      onChange={e => setCustomRate(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={addItem}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm font-medium">
                      Add
                    </button>
                  </div>
                )}
              </div>

              <button onClick={runAnalysis}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
              >
                Analyse Rates
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-700">
              <div className="font-semibold mb-1">How it works</div>
              A Z-score measures how many standard deviations a rate is from the historical mean.
              Items with |Z| ≥ {Z_THRESHOLD} are flagged as potential anomalies for review.
            </div>
          </div>

          {/* Results */}
          <div className="col-span-8">
            {result ? (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800">{result.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Items checked</div>
                  </div>
                  <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{anomalies.length}</div>
                    <div className="text-xs text-red-500 mt-0.5">Anomalies flagged</div>
                  </div>
                  <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{normal.length}</div>
                    <div className="text-xs text-green-500 mt-0.5">Within normal range</div>
                  </div>
                </div>

                {anomalies.length > 0 && (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 px-4 py-2.5">
                      <h3 className="font-semibold text-red-800">⚠ Anomalies Detected — Review Before Submission</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-right px-3 py-2">Rate</th>
                          <th className="text-right px-3 py-2">Baseline</th>
                          <th className="text-right px-3 py-2">Δ%</th>
                          <th className="px-3 py-2">Z-score</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.map(row => (
                          <tr key={row.itemId} className="border-t border-gray-100 bg-red-50/30">
                            <td className="px-4 py-3 font-medium">{row.label}</td>
                            <td className="px-3 py-3 text-right font-mono">${row.rate.toFixed(2)}/{row.unit}</td>
                            <td className="px-3 py-3 text-right text-gray-500">${row.mean.toFixed(2)}</td>
                            <td className={`px-3 py-3 text-right font-semibold ${row.pctDiff > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {row.pctDiff > 0 ? '+' : ''}{row.pctDiff}%
                            </td>
                            <td className="px-3 py-3"><ZBar z={row.z} /></td>
                            <td className="px-3 py-3"><StatusBadge status={row.status} z={row.z} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {normal.length > 0 && (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-green-50 border-b border-green-100 px-4 py-2.5">
                      <h3 className="font-semibold text-green-800">✅ Within Normal Range</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-right px-3 py-2">Rate</th>
                          <th className="text-right px-3 py-2">Baseline</th>
                          <th className="text-right px-3 py-2">Δ%</th>
                          <th className="px-3 py-2">Z-score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normal.map(row => (
                          <tr key={row.itemId} className="border-t border-gray-100">
                            <td className="px-4 py-2.5 font-medium">{row.label}</td>
                            <td className="px-3 py-2.5 text-right font-mono">${row.rate.toFixed(2)}/{row.unit}</td>
                            <td className="px-3 py-2.5 text-right text-gray-500">${row.mean.toFixed(2)}</td>
                            <td className={`px-3 py-2.5 text-right ${row.pctDiff > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {row.pctDiff > 0 ? '+' : ''}{row.pctDiff}%
                            </td>
                            <td className="px-3 py-2.5"><ZBar z={row.z} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <div className="text-gray-500">Enter unit rates and click Analyse to detect anomalies</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CostAnomalyDetector
