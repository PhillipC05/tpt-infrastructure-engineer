import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type SensorStatus = 'OK' | 'WARNING' | 'CRITICAL'

interface SensorDef {
  id: string
  label: string
  unit: string
  project_id: string | null
  warning_high: number | null
  critical_high: number | null
  warning_low: number | null
  critical_low: number | null
  is_active: boolean
}

interface Reading {
  id: number
  value: number
  recorded_at: string
}

interface SensorState extends SensorDef {
  readings: Reading[]
  status: SensorStatus
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatus(def: SensorDef, val: number): SensorStatus {
  if (def.critical_high !== null && val >= def.critical_high) return 'CRITICAL'
  if (def.critical_low  !== null && val <= def.critical_low)  return 'CRITICAL'
  if (def.warning_high  !== null && val >= def.warning_high)  return 'WARNING'
  if (def.warning_low   !== null && val <= def.warning_low)   return 'WARNING'
  return 'OK'
}

const STATUS_COLORS: Record<SensorStatus, string> = {
  OK:       'text-green-700 bg-green-100 border-green-300',
  WARNING:  'text-amber-700 bg-amber-100 border-amber-300',
  CRITICAL: 'text-red-700   bg-red-100   border-red-300',
}
const LINE_COLORS: Record<SensorStatus, string> = {
  OK: '#22c55e', WARNING: '#f59e0b', CRITICAL: '#ef4444',
}

// ── Sensor Card ───────────────────────────────────────────────────────────────
function SensorCard({ sensor, selected, onClick }: { sensor: SensorState; selected: boolean; onClick: () => void }) {
  const latest = sensor.readings.length > 0 ? sensor.readings[sensor.readings.length - 1].value : null
  const color = STATUS_COLORS[sensor.status]
  const decimals = sensor.unit === 'mm/s' || sensor.unit === 'm' ? 2 : 1

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selected ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${color}`}
    >
      <div className="flex justify-between items-start">
        <div className="text-xs font-semibold opacity-80 max-w-[70%] leading-tight">{sensor.label}</div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${color}`}>{sensor.status}</span>
      </div>
      <div className="text-2xl font-black mt-2">
        {latest !== null ? latest.toFixed(decimals) : '—'}
        <span className="text-sm font-normal ml-1">{sensor.unit}</span>
      </div>
    </button>
  )
}

// ── Add Sensor Modal ──────────────────────────────────────────────────────────
function AddSensorModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: SensorDef) => void }) {
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState('')
  const [warningHigh, setWarningHigh] = useState('')
  const [criticalHigh, setCriticalHigh] = useState('')
  const [warningLow, setWarningLow] = useState('')
  const [criticalLow, setCriticalLow] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    setError(null)
    try {
      const s = await api.createSensor({
        label: label.trim(),
        unit: unit.trim(),
        warning_high: warningHigh ? parseFloat(warningHigh) : null,
        critical_high: criticalHigh ? parseFloat(criticalHigh) : null,
        warning_low: warningLow ? parseFloat(warningLow) : null,
        critical_low: criticalLow ? parseFloat(criticalLow) : null,
      })
      onCreated(s)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create sensor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Add Sensor</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
              <input required type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Ambient Temperature"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
                placeholder="e.g. °C, %, mm/s"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-1">Alert Thresholds (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Warning High', value: warningHigh, set: setWarningHigh },
              { label: 'Critical High', value: criticalHigh, set: setCriticalHigh },
              { label: 'Warning Low', value: warningLow, set: setWarningLow },
              { label: 'Critical Low', value: criticalLow, set: setCriticalLow },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="number" step="any" value={f.value} onChange={e => f.set(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !label.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40">
              {saving ? 'Saving…' : 'Add Sensor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Manual Reading Modal ──────────────────────────────────────────────────────
function AddReadingModal({
  sensors,
  onClose,
  onAdded,
}: {
  sensors: SensorDef[]
  onClose: () => void
  onAdded: (sensorId: string, reading: Reading) => void
}) {
  const [sensorId, setSensorId] = useState(sensors[0]?.id ?? '')
  const [value, setValue] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sensorId || value === '') return
    setSaving(true)
    setError(null)
    try {
      const r = await api.addSensorReading(sensorId, {
        value: parseFloat(value),
        recorded_at: recordedAt || undefined,
      })
      onAdded(sensorId, r)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to add reading.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Add Manual Reading</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sensor</label>
            <select value={sensorId} onChange={e => setSensorId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {sensors.map(s => <option key={s.id} value={s.id}>{s.label} ({s.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value <span className="text-red-500">*</span></label>
            <input required type="number" step="any" value={value} onChange={e => setValue(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Timestamp <span className="text-gray-400 font-normal">(leave blank = now)</span></label>
            <input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !sensorId || value === ''}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40">
              {saving ? 'Saving…' : 'Add Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CSV Import Panel ──────────────────────────────────────────────────────────
function ImportPanel({ sensors, onImported }: { sensors: SensorDef[]; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.importSensorData(fd)
      setResult(res)
      if (res.imported > 0) onImported()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const exampleSensorId = sensors[0]?.id ?? '<sensor-id>'

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">CSV Format</p>
        <p className="font-mono text-xs">sensor_id,value,recorded_at</p>
        <p className="font-mono text-xs">{exampleSensorId},23.5,2026-06-17T09:00:00Z</p>
        <p className="font-mono text-xs">{exampleSensorId},24.1</p>
        <p className="text-xs mt-2 text-blue-600">recorded_at is optional — omit to use current time.</p>
      </div>

      {sensors.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700 text-sm mb-2">Your sensor IDs</p>
          {sensors.map(s => (
            <div key={s.id} className="flex gap-2">
              <span className="font-mono text-gray-800">{s.id}</span>
              <span>— {s.label} ({s.unit})</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-gray-300 file:text-sm file:text-gray-700 file:bg-white hover:file:bg-gray-50"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
        >
          {uploading ? 'Uploading…' : 'Import'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
      {result && (
        <div className="space-y-2">
          <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">
            {result.imported} reading{result.imported !== 1 ? 's' : ''} imported.
          </div>
          {result.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-0.5">
              <p className="font-medium mb-1">{result.errors.length} row error{result.errors.length !== 1 ? 's' : ''}:</p>
              {result.errors.map((e, i) => <p key={i} className="font-mono">{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type Tab = 'Live Feed' | 'Configure' | 'Import'

const DigitalTwinDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('Live Feed')
  const [sensors, setSensors] = useState<SensorState[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [showAddSensor, setShowAddSensor] = useState(false)
  const [showAddReading, setShowAddReading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchReadings = useCallback(async (defs: SensorDef[]) => {
    const updated = await Promise.all(
      defs.map(async def => {
        const readings: Reading[] = await api.getSensorReadings(def.id, 60).catch(() => [])
        const latest = readings.length > 0 ? readings[readings.length - 1].value : 0
        return { ...def, readings, status: getStatus(def, latest) } as SensorState
      })
    )
    setSensors(updated)
    if (updated.length > 0 && !selected) setSelected(updated[0].id)
  }, [selected])

  const load = useCallback(async () => {
    try {
      const defs: SensorDef[] = await api.getSensors()
      await fetchReadings(defs)
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false)
    }
  }, [fetchReadings])

  useEffect(() => {
    load()
  }, [load])

  // Poll every 15 s when on Live Feed tab
  useEffect(() => {
    if (tab !== 'Live Feed' || sensors.length === 0) return
    pollRef.current = setInterval(() => {
      fetchReadings(sensors.map(s => s as SensorDef))
    }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [tab, sensors, fetchReadings])

  const activeSensor = sensors.find(s => s.id === selected)
  const critCount = sensors.filter(s => s.status === 'CRITICAL').length
  const warnCount = sensors.filter(s => s.status === 'WARNING').length

  const chartData = activeSensor
    ? activeSensor.readings.map((r, i) => ({ t: i, value: r.value, ts: r.recorded_at }))
    : []

  function handleSensorCreated(def: SensorDef) {
    const next: SensorState = { ...def, readings: [], status: 'OK' }
    setSensors(prev => [...prev, next])
    setSelected(def.id)
    setShowAddSensor(false)
    setTab('Live Feed')
  }

  function handleReadingAdded(sensorId: string, reading: Reading) {
    setSensors(prev => prev.map(s => {
      if (s.id !== sensorId) return s
      const readings = [...s.readings, reading].slice(-60)
      const latest = reading.value
      return { ...s, readings, status: getStatus(s, latest) }
    }))
    setShowAddReading(false)
  }

  async function handleDeleteSensor(id: string) {
    if (!confirm('Delete this sensor and all its readings?')) return
    await api.deleteSensor(id).catch(() => {})
    setSensors(prev => prev.filter(s => s.id !== id))
    if (selected === id) setSelected(sensors.find(s => s.id !== id)?.id ?? null)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Digital Twin Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">IoT sensor telemetry · {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} · refreshes every 15 s</p>
          </div>
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full border border-red-300 animate-pulse">
                {critCount} CRITICAL
              </div>
            )}
            {warnCount > 0 && (
              <div className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-300">
                {warnCount} WARNING
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['Live Feed', 'Configure', 'Import'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Live Feed */}
        {tab === 'Live Feed' && (
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : sensors.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📡</p>
              <p className="font-medium text-gray-700">No sensors configured yet</p>
              <p className="text-sm mt-1 mb-4">Add sensors in the Configure tab, then import or manually enter readings.</p>
              <button onClick={() => setTab('Configure')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                Configure Sensors
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-5">
              {/* Sensor grid */}
              <div className="col-span-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {sensors.map(s => (
                    <SensorCard key={s.id} sensor={s} selected={selected === s.id} onClick={() => setSelected(s.id)} />
                  ))}
                </div>
                <button onClick={() => setShowAddReading(true)}
                  className="w-full py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">
                  + Add Manual Reading
                </button>
              </div>

              {/* Detail panel */}
              <div className="col-span-7 space-y-4">
                {activeSensor && (
                  <>
                    <div className={`rounded-xl border-2 p-5 ${STATUS_COLORS[activeSensor.status]}`}>
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-lg">{activeSensor.label}</div>
                        <div className="text-right">
                          <div className="text-4xl font-black">
                            {activeSensor.readings.length > 0
                              ? activeSensor.readings[activeSensor.readings.length - 1].value.toFixed(2)
                              : '—'}
                            <span className="text-lg font-normal ml-1">{activeSensor.unit}</span>
                          </div>
                          {activeSensor.readings.length > 0 && (
                            <div className="text-xs mt-1 opacity-70">
                              Range: {Math.min(...activeSensor.readings.map(r => r.value)).toFixed(2)} –{' '}
                              {Math.max(...activeSensor.readings.map(r => r.value)).toFixed(2)} {activeSensor.unit}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 text-sm font-medium flex flex-wrap gap-4">
                        {activeSensor.warning_high  !== null && <span>⚠ High: {activeSensor.warning_high} {activeSensor.unit}</span>}
                        {activeSensor.critical_high !== null && <span>Critical: {activeSensor.critical_high} {activeSensor.unit}</span>}
                        {activeSensor.warning_low   !== null && <span>⚠ Low: {activeSensor.warning_low} {activeSensor.unit}</span>}
                        {activeSensor.critical_low  !== null && <span>Critical: {activeSensor.critical_low} {activeSensor.unit}</span>}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-5">
                      <h3 className="font-semibold text-gray-700 mb-1">{activeSensor.label} — last {activeSensor.readings.length} readings</h3>
                      {activeSensor.readings.length === 0 ? (
                        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                          No readings yet. Add one manually or import a CSV.
                        </div>
                      ) : (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={v => String(v)} />
                              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip
                                formatter={(v: number) => [`${v.toFixed(2)} ${activeSensor.unit}`, activeSensor.label]}
                                labelFormatter={(_l, payload) => payload?.[0]?.payload?.ts
                                  ? new Date(payload[0].payload.ts).toLocaleString('en-NZ')
                                  : ''}
                              />
                              <Line type="monotone" dataKey="value" dot={false} strokeWidth={2}
                                stroke={LINE_COLORS[activeSensor.status]} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Event log */}
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="font-semibold text-gray-700 mb-3">System Log</h3>
                      <div className="space-y-1.5 text-xs font-mono max-h-32 overflow-y-auto">
                        {sensors.filter(s => s.status !== 'OK').map(s => {
                          const latest = s.readings.length > 0 ? s.readings[s.readings.length - 1] : null
                          return (
                            <div key={s.id} className={s.status === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}>
                              <span className="text-gray-400">
                                {latest ? new Date(latest.recorded_at).toLocaleTimeString('en-NZ') : '—'}
                              </span>{' '}
                              [{s.status}] {s.label}: {latest ? `${latest.value.toFixed(2)} ${s.unit}` : 'no data'}
                            </div>
                          )
                        })}
                        <div className="text-gray-400">
                          [{new Date().toLocaleTimeString('en-NZ')}] [INFO] {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} active
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}

        {/* Configure */}
        {tab === 'Configure' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Sensor Definitions</h3>
              <button onClick={() => setShowAddSensor(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                + Add Sensor
              </button>
            </div>

            {sensors.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                No sensors configured. Click "Add Sensor" to create one.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Label</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Unit</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Warn High</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Crit High</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Warn Low</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Crit Low</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Readings</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{s.label}</td>
                        <td className="py-3 px-4 text-gray-600">{s.unit || '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.warning_high ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.critical_high ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.warning_low ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.critical_low ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.readings.length}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleDeleteSensor(s.id)}
                            className="text-xs text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Import */}
        {tab === 'Import' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Import Sensor Data</h3>
              {sensors.length > 0 && (
                <button onClick={() => setShowAddReading(true)}
                  className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
                  + Manual Reading
                </button>
              )}
            </div>
            {sensors.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                Configure at least one sensor before importing data.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <ImportPanel sensors={sensors} onImported={load} />
              </div>
            )}
          </div>
        )}
      </div>

      {showAddSensor && <AddSensorModal onClose={() => setShowAddSensor(false)} onCreated={handleSensorCreated} />}
      {showAddReading && sensors.length > 0 && (
        <AddReadingModal
          sensors={sensors}
          onClose={() => setShowAddReading(false)}
          onAdded={handleReadingAdded}
        />
      )}
    </div>
  )
}

export default DigitalTwinDashboard
