import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface ParseResult {
  positions: Float32Array
  colors: Float32Array | null
  count: number
  hasColor: boolean
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
}

function parseCSV(text: string): ParseResult | string {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return 'CSV must have at least a header row and one data row.'

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const xi = headers.findIndex(h => h === 'x')
  const yi = headers.findIndex(h => h === 'y')
  const zi = headers.findIndex(h => h === 'z')
  if (xi < 0 || yi < 0 || zi < 0) return 'CSV must have X, Y, Z column headers.'

  const ri = headers.findIndex(h => h === 'r' || h === 'red')
  const gi = headers.findIndex(h => h === 'g' || h === 'green')
  const bi = headers.findIndex(h => h === 'b' || h === 'blue')
  const ii = headers.findIndex(h => h === 'intensity' || h === 'i')
  const hasColor = ri >= 0 && gi >= 0 && bi >= 0

  const MAX_POINTS = 200_000
  const dataLines = lines.slice(1, MAX_POINTS + 1)
  const count = dataLines.length

  const positions = new Float32Array(count * 3)
  const colors    = new Float32Array(count * 3)

  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

  let valid = 0
  for (const line of dataLines) {
    const cols = line.split(',')
    const x = parseFloat(cols[xi])
    const y = parseFloat(cols[yi])
    const z = parseFloat(cols[zi])
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue

    positions[valid * 3]     = x
    positions[valid * 3 + 1] = z  // map Z→Y for Three.js (Z-up → Y-up)
    positions[valid * 3 + 2] = -y

    if (hasColor) {
      colors[valid * 3]     = parseFloat(cols[ri]) / 255
      colors[valid * 3 + 1] = parseFloat(cols[gi]) / 255
      colors[valid * 3 + 2] = parseFloat(cols[bi]) / 255
    } else if (ii >= 0) {
      const intensity = Math.min(1, parseFloat(cols[ii]) / 255 || 0.5)
      colors[valid * 3]     = intensity
      colors[valid * 3 + 1] = intensity
      colors[valid * 3 + 2] = intensity
    } else {
      // Height-based color: blue (low) → green → red (high)
      colors[valid * 3]     = 0
      colors[valid * 3 + 1] = 0
      colors[valid * 3 + 2] = 0 // set after bounds computed
    }

    min.set(Math.min(min.x, x), Math.min(min.y, z), Math.min(min.z, -y))
    max.set(Math.max(max.x, x), Math.max(max.y, z), Math.max(max.z, -y))

    valid++
  }

  // Apply height-based colour if no explicit colour
  if (!hasColor && ii < 0) {
    const rangeY = max.y - min.y || 1
    for (let j = 0; j < valid; j++) {
      const t = (positions[j * 3 + 1] - min.y) / rangeY
      // Heatmap: blue→cyan→green→yellow→red
      if (t < 0.25) {
        colors[j * 3]     = 0;      colors[j * 3 + 1] = t * 4;     colors[j * 3 + 2] = 1
      } else if (t < 0.5) {
        colors[j * 3]     = 0;      colors[j * 3 + 1] = 1;          colors[j * 3 + 2] = 1 - (t - 0.25) * 4
      } else if (t < 0.75) {
        colors[j * 3]     = (t - 0.5) * 4; colors[j * 3 + 1] = 1;  colors[j * 3 + 2] = 0
      } else {
        colors[j * 3]     = 1;      colors[j * 3 + 1] = 1 - (t - 0.75) * 4; colors[j * 3 + 2] = 0
      }
    }
  }

  return {
    positions: positions.slice(0, valid * 3),
    colors: colors.slice(0, valid * 3),
    count: valid,
    hasColor: hasColor || ii >= 0 || true,
    bounds: { min, max },
  }
}

const DEMO_CSV = `X,Y,Z
0,0,0
1,0,0.1
2,0,0.3
3,0,0.2
0,1,0.2
1,1,1.5
2,1,1.6
3,1,0.3
0,2,0.1
1,2,0.4
2,2,0.5
3,2,0.1
0,3,0
1,3,0.2
2,3,0.1
3,3,0`

const DroneViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef     = useRef<THREE.Scene | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef  = useRef<OrbitControls | null>(null)
  const pointsRef    = useRef<THREE.Points | null>(null)
  const animRef      = useRef<number>(0)

  const [status, setStatus]     = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [info, setInfo]         = useState<string>('')
  const [pointSize, setPointSize] = useState(2)

  // Three.js scene init
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(0x111827)
    sceneRef.current = scene

    const camera   = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.001, 5000)
    camera.position.set(5, 5, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controlsRef.current      = controls

    scene.add(new THREE.GridHelper(20, 20, 0x374151, 0x1f2937))
    scene.add(new THREE.AxesHelper(2))
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!el) return
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  const loadPoints = useCallback((result: ParseResult) => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!scene || !camera || !controls) return

    if (pointsRef.current) {
      scene.remove(pointsRef.current)
      pointsRef.current.geometry.dispose()
      ;(pointsRef.current.material as THREE.PointsMaterial).dispose()
      pointsRef.current = null
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(result.positions, 3))
    if (result.colors) geo.setAttribute('color', new THREE.BufferAttribute(result.colors, 3))

    const mat = new THREE.PointsMaterial({
      size: pointSize * 0.01,
      vertexColors: true,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geo, mat)
    scene.add(points)
    pointsRef.current = points

    // Frame the point cloud
    const center = new THREE.Vector3().addVectors(result.bounds.min, result.bounds.max).multiplyScalar(0.5)
    const span   = result.bounds.max.distanceTo(result.bounds.min)
    controls.target.copy(center)
    camera.position.copy(center).add(new THREE.Vector3(span * 0.8, span * 0.6, span * 0.8))
    controls.update()
  }, [pointSize])

  // Update point size without reloading
  useEffect(() => {
    if (pointsRef.current) {
      (pointsRef.current.material as THREE.PointsMaterial).size = pointSize * 0.01
    }
  }, [pointSize])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const result = parseCSV(text)
      if (typeof result === 'string') {
        setStatus('error')
        setInfo(result)
      } else {
        loadPoints(result)
        setStatus('loaded')
        setInfo(`${result.count.toLocaleString()} points loaded from ${file.name}`)
      }
    }
    reader.readAsText(file)
  }

  function loadDemo() {
    const result = parseCSV(DEMO_CSV)
    if (typeof result !== 'string') {
      loadPoints(result)
      setStatus('loaded')
      setInfo(`${result.count} demo points loaded (4×4 terrain grid)`)
    }
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 shrink-0 bg-gray-800 text-gray-200 flex flex-col p-4 gap-4 overflow-y-auto">
        <div>
          <h2 className="text-white font-bold text-base">Drone Point Cloud</h2>
          <p className="text-xs text-gray-400 mt-0.5">CSV X,Y,Z (+ optional R,G,B)</p>
        </div>

        <label className="flex flex-col gap-1 cursor-pointer">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Load CSV file</span>
          <div className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg text-center">
            📁 Choose File
          </div>
          <input type="file" accept=".csv,.txt" onChange={handleFile} className="sr-only" />
        </label>

        <button onClick={loadDemo}
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg text-center"
        >
          🏔 Load Demo Terrain
        </button>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide block mb-1">
            Point size: {pointSize}
          </label>
          <input
            type="range" min={1} max={10} value={pointSize}
            onChange={e => setPointSize(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {status !== 'idle' && (
          <div className={`text-xs px-3 py-2 rounded-lg ${
            status === 'error'   ? 'bg-red-900/50 text-red-300'
            : status === 'loading' ? 'bg-gray-700 text-gray-300'
            : 'bg-green-900/50 text-green-300'
          }`}>
            {status === 'loading' ? '⏳ Loading...' : status === 'error' ? `❌ ${info}` : `✅ ${info}`}
          </div>
        )}

        <div className="bg-gray-700/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
          <div className="font-semibold text-gray-300 mb-1">Controls</div>
          <div>🖱 Left drag — orbit</div>
          <div>🖱 Right drag — pan</div>
          <div>🖱 Scroll — zoom</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
          <div className="font-semibold text-gray-300 mb-1">CSV Format</div>
          <div className="font-mono bg-gray-800 p-2 rounded text-xs">
            X,Y,Z<br/>
            1.0,2.0,3.5<br/>
            ...
          </div>
          <div className="mt-1">Optional: R,G,B (0–255) or I (intensity)</div>
          <div>Max 200k points</div>
        </div>
      </div>

      {/* Viewport */}
      <div ref={containerRef} className="flex-1 relative">
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">🚁</div>
              <div className="text-lg font-semibold">Upload a CSV point cloud</div>
              <div className="text-sm mt-1">or load the demo terrain</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DroneViewer
