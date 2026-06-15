import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type SensorStatus = 'OK' | 'WARNING' | 'CRITICAL'

interface Sensor {
  id: string
  label: string
  unit: string
  value: number
  history: number[]
  status: SensorStatus
  icon: string
}

interface SensorDef {
  id: string
  label: string
  unit: string
  icon: string
  base: number
  noise: number
  warningHigh?: number
  criticalHigh?: number
  warningLow?: number
  criticalLow?: number
  spike?: { chance: number; magnitude: number }
}

const SENSOR_DEFS: SensorDef[] = [
  { id: 'temp',        label: 'Ambient Temperature', unit: '°C',   icon: '🌡️', base: 18,   noise: 1.5, warningHigh: 35,  criticalHigh: 45 },
  { id: 'humidity',    label: 'Relative Humidity',   unit: '%',    icon: '💧', base: 65,   noise: 4,   warningHigh: 85 },
  { id: 'pressure',    label: 'Atm. Pressure',       unit: 'hPa',  icon: '🔵', base: 1013, noise: 3 },
  { id: 'vibration',   label: 'Vibration',           unit: 'mm/s', icon: '📳', base: 1.5,  noise: 0.5, warningHigh: 10, criticalHigh: 25, spike: { chance: 0.08, magnitude: 12 } },
  { id: 'soil_moist',  label: 'Soil Moisture',       unit: '%',    icon: '🌱', base: 32,   noise: 2 },
  { id: 'groundwater', label: 'Groundwater Depth',   unit: 'm',    icon: '⬇️', base: 2.5,  noise: 0.15, warningLow: 1.0, criticalLow: 0.5 },
]

const HISTORY_SIZE = 30

function simulate(def: SensorDef, prev: number): number {
  let val = prev + (Math.random() - 0.5) * def.noise * 2
  if (def.spike && Math.random() < def.spike.chance) val += def.spike.magnitude * Math.random()
  val = val * 0.85 + def.base * 0.15 // mean-revert
  return +val.toFixed(2)
}

function getStatus(def: SensorDef, val: number): SensorStatus {
  if (def.criticalHigh !== undefined && val >= def.criticalHigh) return 'CRITICAL'
  if (def.criticalLow  !== undefined && val <= def.criticalLow)  return 'CRITICAL'
  if (def.warningHigh  !== undefined && val >= def.warningHigh)  return 'WARNING'
  if (def.warningLow   !== undefined && val <= def.warningLow)   return 'WARNING'
  return 'OK'
}

function initSensors(): Sensor[] {
  return SENSOR_DEFS.map(def => {
    const history = Array.from({ length: HISTORY_SIZE }, () =>
      +(def.base + (Math.random() - 0.5) * def.noise * 2).toFixed(2)
    )
    const value = history[history.length - 1]
    return { id: def.id, label: def.label, unit: def.unit, icon: def.icon,
             value, history, status: getStatus(def, value) }
  })
}

const STATUS_COLORS: Record<SensorStatus, string> = {
  OK:       'text-green-700 bg-green-100 border-green-300',
  WARNING:  'text-amber-700 bg-amber-100 border-amber-300',
  CRITICAL: 'text-red-700   bg-red-100   border-red-300',
}

const LINE_COLORS: Record<SensorStatus, string> = {
  OK: '#22c55e', WARNING: '#f59e0b', CRITICAL: '#ef4444',
}

interface SensorCardProps {
  sensor: Sensor
  selected: boolean
  onClick: () => void
}

function SensorCard({ sensor, selected, onClick }: SensorCardProps) {
  const color = STATUS_COLORS[sensor.status]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        selected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
      } ${color}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg">{sensor.icon}</div>
          <div className="text-xs font-semibold mt-1 opacity-80">{sensor.label}</div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
          {sensor.status}
        </span>
      </div>
      <div className="text-2xl font-black mt-2">
        {sensor.value.toFixed(sensor.unit === 'mm/s' || sensor.unit === 'm' ? 2 : 0)}
        <span className="text-sm font-normal ml-1">{sensor.unit}</span>
      </div>
    </button>
  )
}

const DigitalTwinDashboard: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>(initSensors)
  const [selected, setSelected]   = useState<string>('temp')
  const [running, setRunning]      = useState(true)
  const [tickCount, setTickCount]  = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    setSensors(prev => prev.map(s => {
      const def = SENSOR_DEFS.find(d => d.id === s.id)!
      const newVal = simulate(def, s.value)
      const newHistory = [...s.history.slice(1), newVal]
      return { ...s, value: newVal, history: newHistory, status: getStatus(def, newVal) }
    }))
    setTickCount(c => c + 1)
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 2000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  const activeSensor = sensors.find(s => s.id === selected)!
  const def = SENSOR_DEFS.find(d => d.id === selected)!

  const chartData = activeSensor.history.map((v, i) => ({
    t: i - (HISTORY_SIZE - 1),
    value: v,
  }))

  const critCount = sensors.filter(s => s.status === 'CRITICAL').length
  const warnCount = sensors.filter(s => s.status === 'WARNING').length

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Digital Twin Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Live IoT sensor telemetry — simulated at 2 s intervals</p>
          </div>
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full border border-red-300 animate-pulse">
                🚨 {critCount} CRITICAL
              </div>
            )}
            {warnCount > 0 && (
              <div className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-300">
                ⚠️ {warnCount} WARNING
              </div>
            )}
            <button
              onClick={() => setRunning(r => !r)}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                running
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {running ? '⏸ Pause' : '▶ Resume'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Sensor grid */}
          <div className="col-span-5 grid grid-cols-2 gap-3">
            {sensors.map(s => (
              <SensorCard key={s.id} sensor={s}
                selected={selected === s.id}
                onClick={() => setSelected(s.id)} />
            ))}
          </div>

          {/* Detail panel */}
          <div className="col-span-7 space-y-4">
            {activeSensor && (
              <>
                <div className={`rounded-xl border-2 p-5 ${STATUS_COLORS[activeSensor.status]}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl">{activeSensor.icon}</div>
                      <div className="font-bold text-lg mt-1">{activeSensor.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black">
                        {activeSensor.value.toFixed(
                          activeSensor.unit === 'mm/s' || activeSensor.unit === 'm' ? 2 : 0
                        )}
                        <span className="text-lg font-normal ml-1">{activeSensor.unit}</span>
                      </div>
                      <div className="text-xs mt-1 opacity-70">
                        Range: {Math.min(...activeSensor.history).toFixed(1)} – {Math.max(...activeSensor.history).toFixed(1)} {activeSensor.unit}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm font-medium flex gap-6">
                    {def.warningHigh  !== undefined && <span>⚠ High: {def.warningHigh} {activeSensor.unit}</span>}
                    {def.criticalHigh !== undefined && <span>🚨 Critical: {def.criticalHigh} {activeSensor.unit}</span>}
                    {def.warningLow   !== undefined && <span>⚠ Low: {def.warningLow} {activeSensor.unit}</span>}
                    {def.criticalLow  !== undefined && <span>🚨 Critical: {def.criticalLow} {activeSensor.unit}</span>}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="font-semibold text-gray-700 mb-1">
                    {activeSensor.label} — Last {HISTORY_SIZE} readings
                  </h3>
                  <div className="text-xs text-gray-400 mb-4">Tick #{tickCount} · updates every 2 s</div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={v => `${v}s`} />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip
                          formatter={(v: number) => [`${v.toFixed(2)} ${activeSensor.unit}`, activeSensor.label]}
                          labelFormatter={l => `${l}s ago`}
                        />
                        <Line type="monotone" dataKey="value" dot={false} strokeWidth={2}
                          stroke={LINE_COLORS[activeSensor.status]} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Event log */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">System Log</h3>
                  <div className="space-y-1.5 text-xs font-mono max-h-32 overflow-y-auto">
                    {sensors
                      .filter(s => s.status !== 'OK')
                      .map(s => (
                        <div key={s.id} className={`flex gap-2 ${
                          s.status === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          <span className="text-gray-400">{new Date().toLocaleTimeString('en-NZ')}</span>
                          <span>[{s.status}]</span>
                          <span>{s.label}: {s.value.toFixed(2)} {s.unit}</span>
                        </div>
                      ))}
                    <div className="text-gray-400 flex gap-2">
                      <span>{new Date().toLocaleTimeString('en-NZ')}</span>
                      <span>[INFO]</span>
                      <span>All {sensors.length} sensors active · tick #{tickCount}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DigitalTwinDashboard
