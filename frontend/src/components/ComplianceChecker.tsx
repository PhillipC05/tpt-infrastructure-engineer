import React, { useState } from 'react'

type Severity = 'pass' | 'warning' | 'fail'

interface CheckResult {
  code: string
  name: string
  standard: string
  severity: Severity
  message: string
}

interface Report {
  design_type: string
  total_checks: number
  passed: number
  warnings: number
  failures: number
  compliance_score: number
  overall: Severity
  results: CheckResult[]
}

// ── Rule implementations (mirror of backend/compliance.py) ───────────────────

function ok(cond: boolean): Severity { return cond ? 'pass' : 'fail' }

function checkRetainingWall(p: Record<string, number | boolean>): CheckResult[] {
  const h = Number(p.height ?? 2)
  const emb = Number(p.embedment_depth ?? h * 0.3)
  const drain = Boolean(p.drainage_layer ?? true)
  const surcharge = Number(p.surcharge_kpa ?? 5)
  const ot = Number(p.overturning_ratio ?? 1.5)
  const sl = Number(p.sliding_ratio ?? 1.5)
  const eng = Boolean(p.engineer_reviewed ?? (h <= 1.5))

  return [
    { code: 'AS4678-E1',  name: 'Embedment depth',      standard: 'AS 4678-2002 §4.3',
      severity: ok(emb >= h * 0.3),
      message: `Embedment ${emb.toFixed(2)} m ${emb >= h * 0.3 ? '≥' : '<'} required ${(h * 0.3).toFixed(2)} m (30% of height)` },

    { code: 'AS4678-D1',  name: 'Drainage layer',        standard: 'AS 4678-2002 §5.2',
      severity: drain ? 'pass' : 'fail',
      message: drain ? 'Drainage layer present' : 'Drainage layer behind wall is mandatory' },

    { code: 'AS4678-S1',  name: 'Minimum surcharge',     standard: 'AS 4678-2002 §3.4',
      severity: surcharge >= 5 ? 'pass' : 'warning',
      message: `Surcharge ${surcharge} kPa ${surcharge >= 5 ? '≥' : '<'} 5 kPa residential minimum` },

    { code: 'AS4678-OT1', name: 'Overturning stability', standard: 'AS 4678-2002 §6.2',
      severity: ok(ot >= 1.5),
      message: `Overturning ratio ${ot.toFixed(2)} ${ot >= 1.5 ? '≥' : '<'} 1.5 minimum` },

    { code: 'AS4678-SL1', name: 'Sliding stability',     standard: 'AS 4678-2002 §6.3',
      severity: ok(sl >= 1.5),
      message: `Sliding ratio ${sl.toFixed(2)} ${sl >= 1.5 ? '≥' : '<'} 1.5 minimum` },

    { code: 'AS4678-EN1', name: 'Engineer sign-off',     standard: 'AS 4678-2002 §1.2',
      severity: eng ? 'pass' : (h > 1.5 ? 'fail' : 'warning'),
      message: `Walls > 1.5 m must be signed off by a CPEng. Height = ${h} m.` },
  ]
}

function checkStripFoundation(p: Record<string, number>): CheckResult[] {
  const w = Number(p.width ?? 0.6)
  const d = Number(p.depth ?? 0.8)
  const t = Number(p.wall_thickness ?? 0.2)
  const bc = Number(p.bearing_capacity_kpa ?? 100)
  const load = Number(p.load_kn_per_m ?? 100)
  const ab = w > 0 ? load / w : 0

  return [
    { code: 'AS2870-W1',  name: 'Minimum footing width',  standard: 'AS 2870-2011 §4.3',
      severity: ok(w >= t * 3),
      message: `Width ${w} m ${w >= t * 3 ? '≥' : '<'} 3× wall thickness (${(t * 3).toFixed(2)} m)` },

    { code: 'AS2870-D1',  name: 'Minimum footing depth',  standard: 'AS 2870-2011 §4.4',
      severity: ok(d >= 0.3),
      message: `Depth ${d} m ${d >= 0.3 ? '≥' : '<'} 300 mm minimum` },

    { code: 'AS2870-B1',  name: 'Bearing capacity',       standard: 'AS 2870-2011 §5.2',
      severity: ok(ab <= bc),
      message: `Actual bearing ${ab.toFixed(1)} kPa ${ab <= bc ? '≤' : '>'} allowable ${bc} kPa` },

    { code: 'AS2870-FR1', name: 'Frost depth (NZ)',        standard: 'NZS 3604:2011 §6.2',
      severity: d >= 0.45 ? 'pass' : 'warning',
      message: `Depth ${d} m ${d >= 0.45 ? '≥' : '<'} 450 mm frost-free minimum (NZ cold regions)` },
  ]
}

function checkBoxCulvert(p: Record<string, number>): CheckResult[] {
  const span = Number(p.span ?? 2.4)
  const hi   = Number(p.height ?? 1.8)
  const cov  = Number(p.cover ?? 1.0)
  const hr   = Number(p.headroom_ratio ?? 0.75)

  return [
    { code: 'AS1597-C1', name: 'Minimum cover',              standard: 'AS/NZS 1597.2 §4.2',
      severity: ok(cov >= 0.3),
      message: `Fill cover ${cov} m ${cov >= 0.3 ? '≥' : '<'} 300 mm minimum` },

    { code: 'AS1597-H1', name: 'Headroom ratio',             standard: 'AS/NZS 1597.2 §6.3',
      severity: hr <= 0.75 ? 'pass' : 'warning',
      message: `Design flow occupies ${(hr * 100).toFixed(0)}% of capacity (recommended ≤ 75%)` },

    { code: 'AS1597-A1', name: 'Minimum aperture (maint.)', standard: 'AS/NZS 1597.2 §3.1',
      severity: span >= 0.6 && hi >= 0.6 ? 'pass' : 'warning',
      message: `Span ${span} m × height ${hi} m — apertures < 600 mm are not maintainable` },
  ]
}

function checkStormwaterPipe(p: Record<string, number>): CheckResult[] {
  const dia  = Number(p.diameter_mm ?? 300)
  const slp  = Number(p.slope_percent ?? 1.0)
  const dep  = Number(p.depth_m ?? 0.6)
  const minS = 100 / dia

  return [
    { code: 'AS3500-S1',  name: 'Self-cleansing slope',  standard: 'AS/NZS 3500.3 §8.4',
      severity: ok(slp >= minS),
      message: `Slope ${slp.toFixed(2)}% ${slp >= minS ? '≥' : '<'} ${minS.toFixed(2)}% min for DN${Math.round(dia)}` },

    { code: 'AS3500-D1',  name: 'Minimum cover depth',   standard: 'AS/NZS 3500.3 §10.2',
      severity: dep >= 0.45 ? 'pass' : 'warning',
      message: `Cover depth ${dep} m ${dep >= 0.45 ? '≥' : '<'} 450 mm minimum` },

    { code: 'AS3500-DI1', name: 'Minimum pipe diameter', standard: 'AS/NZS 3500.3 §5.1',
      severity: ok(dia >= 100),
      message: `Diameter ${Math.round(dia)} mm ${dia >= 100 ? '≥' : '<'} DN100 minimum` },
  ]
}

function runReport(designType: string, params: Record<string, number | boolean>): Report {
  const dispatch: Record<string, (p: Record<string, number | boolean>) => CheckResult[]> = {
    retaining_wall:   checkRetainingWall,
    strip_foundation: p => checkStripFoundation(p as Record<string, number>),
    box_culvert:      p => checkBoxCulvert(p as Record<string, number>),
    stormwater_pipe:  p => checkStormwaterPipe(p as Record<string, number>),
  }
  const results = dispatch[designType](params)
  const passed   = results.filter(r => r.severity === 'pass').length
  const warnings = results.filter(r => r.severity === 'warning').length
  const failures = results.filter(r => r.severity === 'fail').length
  return {
    design_type: designType,
    total_checks: results.length,
    passed, warnings, failures,
    compliance_score: results.length ? Math.round(100 * passed / results.length) : 0,
    overall: failures ? 'fail' : warnings ? 'warning' : 'pass',
    results,
  }
}

// ── UI definitions ───────────────────────────────────────────────────────────

const TYPES = [
  { id: 'retaining_wall',   label: 'Retaining Wall',    std: 'AS 4678-2002' },
  { id: 'strip_foundation', label: 'Strip Foundation',  std: 'AS 2870-2011' },
  { id: 'box_culvert',      label: 'Box Culvert',       std: 'AS/NZS 1597'  },
  { id: 'stormwater_pipe',  label: 'Stormwater Pipe',   std: 'AS/NZS 3500.3' },
]

type ParamDef = { key: string; label: string; unit: string; def: number; step: number }
type BoolDef  = { key: string; label: string }

const NUM_PARAMS: Record<string, ParamDef[]> = {
  retaining_wall: [
    { key: 'height',            label: 'Wall height',        unit: 'm',   def: 2.0,  step: 0.1  },
    { key: 'embedment_depth',   label: 'Embedment depth',    unit: 'm',   def: 0.6,  step: 0.05 },
    { key: 'surcharge_kpa',     label: 'Surcharge',          unit: 'kPa', def: 5.0,  step: 0.5  },
    { key: 'overturning_ratio', label: 'Overturning ratio',  unit: '',    def: 1.5,  step: 0.05 },
    { key: 'sliding_ratio',     label: 'Sliding ratio',      unit: '',    def: 1.5,  step: 0.05 },
  ],
  strip_foundation: [
    { key: 'width',                label: 'Footing width',      unit: 'm',   def: 0.6,  step: 0.05 },
    { key: 'depth',                label: 'Footing depth',      unit: 'm',   def: 0.8,  step: 0.05 },
    { key: 'wall_thickness',       label: 'Wall thickness',     unit: 'm',   def: 0.2,  step: 0.05 },
    { key: 'bearing_capacity_kpa', label: 'Allowable bearing',  unit: 'kPa', def: 100,  step: 5    },
    { key: 'load_kn_per_m',        label: 'Applied load',       unit: 'kN/m', def: 100, step: 5   },
  ],
  box_culvert: [
    { key: 'span',           label: 'Span (internal)',    unit: 'm', def: 2.4,  step: 0.1  },
    { key: 'height',         label: 'Height (internal)',  unit: 'm', def: 1.8,  step: 0.1  },
    { key: 'cover',          label: 'Fill cover',         unit: 'm', def: 1.0,  step: 0.1  },
    { key: 'headroom_ratio', label: 'Headroom ratio',     unit: '',  def: 0.75, step: 0.05 },
  ],
  stormwater_pipe: [
    { key: 'diameter_mm',    label: 'Pipe diameter',      unit: 'mm', def: 300,  step: 50   },
    { key: 'slope_percent',  label: 'Slope',              unit: '%',  def: 1.0,  step: 0.1  },
    { key: 'depth_m',        label: 'Cover depth',        unit: 'm',  def: 0.6,  step: 0.05 },
  ],
}

const BOOL_PARAMS: Record<string, BoolDef[]> = {
  retaining_wall: [
    { key: 'drainage_layer',    label: 'Drainage layer present'         },
    { key: 'engineer_reviewed', label: 'CPEng sign-off obtained'        },
  ],
}

function SeverityBadge({ s }: { s: Severity }) {
  const cls = s === 'pass' ? 'bg-green-100 text-green-800'
    : s === 'warning' ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${cls}`}>{s}</span>
}

const ComplianceChecker: React.FC = () => {
  const [designType, setDesignType] = useState('retaining_wall')
  const [numParams, setNumParams]   = useState<Record<string, number>>({})
  const [boolVals,  setBoolVals]    = useState<Record<string, boolean>>({})
  const [report, setReport]         = useState<Report | null>(null)

  function selectType(id: string) {
    setDesignType(id)
    setNumParams({})
    setBoolVals({})
    setReport(null)
  }

  function runCheck() {
    const numDefs  = NUM_PARAMS[designType]  ?? []
    const boolDefs = BOOL_PARAMS[designType] ?? []
    const merged: Record<string, number | boolean> = {}
    numDefs.forEach(d  => { merged[d.key]  = d.key in numParams ? numParams[d.key] : d.def })
    boolDefs.forEach(d => { merged[d.key]  = d.key in boolVals  ? boolVals[d.key]  : true  })
    setReport(runReport(designType, merged))
  }

  const numDefs  = NUM_PARAMS[designType]  ?? []
  const boolDefs = BOOL_PARAMS[designType] ?? []

  const overallCls = !report ? ''
    : report.overall === 'pass'    ? 'text-green-700 bg-green-50 border-green-300'
    : report.overall === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-300'
    :                                'text-red-700 bg-red-50 border-red-300'

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Compliance Checker</h2>
        <p className="text-sm text-gray-500 mb-6">AS/NZS design validation — all rules run client-side, no backend required</p>

        <div className="grid grid-cols-12 gap-6">
          {/* Left panel */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Design Type</h3>
              <div className="space-y-2 mb-5">
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => selectType(t.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      designType === t.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-gray-400">{t.std}</div>
                  </button>
                ))}
              </div>

              <h3 className="font-semibold text-gray-700 mb-3">Parameters</h3>
              <div className="space-y-3">
                {numDefs.map(d => (
                  <div key={d.key}>
                    <label className="text-xs text-gray-500 block mb-0.5">
                      {d.label}{d.unit ? ` (${d.unit})` : ''}
                    </label>
                    <input
                      type="number" step={d.step}
                      value={d.key in numParams ? numParams[d.key] : d.def}
                      onChange={e => setNumParams(p => ({ ...p, [d.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                {boolDefs.map(d => (
                  <label key={d.key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={d.key in boolVals ? boolVals[d.key] : true}
                      onChange={e => setBoolVals(b => ({ ...b, [d.key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    {d.label}
                  </label>
                ))}
              </div>

              <button onClick={runCheck}
                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
              >
                Run Compliance Check
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="col-span-8">
            {report ? (
              <div className="space-y-3">
                <div className={`border rounded-xl p-5 ${overallCls}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">
                        {report.overall === 'pass'    ? 'Compliant'
                         : report.overall === 'warning' ? 'Compliant with Warnings'
                         : 'Non-Compliant'}
                      </div>
                      <div className="text-sm mt-0.5">
                        {TYPES.find(t => t.id === report.design_type)?.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black">{report.compliance_score}%</div>
                      <div className="text-xs opacity-70">compliance score</div>
                    </div>
                  </div>
                  <div className="flex gap-6 mt-3 text-sm font-medium">
                    <span>✅ {report.passed} passed</span>
                    <span>⚠️ {report.warnings} warnings</span>
                    <span>❌ {report.failures} failed</span>
                  </div>
                </div>

                {report.results.map(r => (
                  <div key={r.code} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">{r.code}</span>
                        <span className="font-medium text-sm text-gray-800">{r.name}</span>
                      </div>
                      <SeverityBadge s={r.severity} />
                    </div>
                    <p className="text-sm text-gray-600">{r.message}</p>
                    <div className="text-xs text-gray-400 mt-1">{r.standard}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <div className="text-gray-500">Select a design type, enter parameters and run the check</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplianceChecker
