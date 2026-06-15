<<<<<<< Updated upstream
// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ToastContainer } from './components/ToastContainer';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import EstimatorPage from './pages/EstimatorPage';
import SchedulePage from './pages/SchedulePage';
import MaterialsPage from './pages/MaterialsPage';
import FeasibilityPage from './pages/FeasibilityPage';
import ReportsPage from './pages/ReportsPage';
import ProcurementPage from './pages/ProcurementPage';
import DrawingsPage from './pages/DrawingsPage';
import Viewer3DPage from './pages/Viewer3DPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <AppProviders>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="feasibility" element={<FeasibilityPage />} />
          <Route path="estimator" element={<EstimatorPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="drawings" element={<DrawingsPage />} />
          <Route path="viewer3d" element={<Viewer3DPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}

export default App;
=======
import { useState } from 'react'
import AiAssistant from './components/AiAssistant'
import CarbonDashboard from './components/CarbonDashboard'
import ComplianceChecker from './components/ComplianceChecker'
import CostAnomalyDetector from './components/CostAnomalyDetector'
import CostEstimator from './components/CostEstimator'
import DesignComparison from './components/DesignComparison'
import DesignGenerator from './components/DesignGenerator'
import DigitalTwinDashboard from './components/DigitalTwinDashboard'
import DrawingBoard from './components/DrawingBoard'
import DroneViewer from './components/DroneViewer'
import DxfImporter from './components/DxfImporter'
import GanttChart from './components/GanttChart'
import IfcImporter from './components/IfcImporter'
import MaterialsDatabase from './components/MaterialsDatabase'
import ProcurementManager from './components/ProcurementManager'
import QRSiteSign from './components/QRSiteSign'
import ReportGenerator from './components/ReportGenerator'
import SceneViewer3D from './components/SceneViewer3D'

type ModuleId =
  | 'dashboard'
  | 'drawing'
  | 'scene3d'
  | 'design'
  | 'comparison'
  | 'dxf'
  | 'ifc'
  | 'drone'
  | 'materials'
  | 'estimator'
  | 'anomaly'
  | 'gantt'
  | 'procurement'
  | 'reports'
  | 'carbon'
  | 'compliance'
  | 'qrsign'
  | 'assistant'
  | 'digitaltwin'

interface NavItem {
  id: ModuleId
  label: string
  icon: string
  group: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',           icon: '🏠', group: 'Overview' },
  { id: 'assistant',   label: 'AI Assistant',         icon: '💬', group: 'Overview' },
  { id: 'digitaltwin', label: 'Digital Twin',         icon: '📡', group: 'Overview' },
  { id: 'drawing',     label: '2D Drawing Board',     icon: '✏️', group: 'Design' },
  { id: 'scene3d',     label: '3D Viewer',            icon: '🧊', group: 'Design' },
  { id: 'design',      label: 'AI Design Generator',  icon: '🤖', group: 'Design' },
  { id: 'comparison',  label: 'Design Comparison',    icon: '⚖️', group: 'Design' },
  { id: 'compliance',  label: 'Compliance Checker',   icon: '📋', group: 'Design' },
  { id: 'dxf',         label: 'DXF Importer',         icon: '📐', group: 'Design' },
  { id: 'ifc',         label: 'IFC / BIM Importer',   icon: '🏗️', group: 'Design' },
  { id: 'drone',       label: 'Drone Point Cloud',    icon: '🚁', group: 'Design' },
  { id: 'materials',   label: 'Materials Database',   icon: '🪨', group: 'Estimation' },
  { id: 'estimator',   label: 'Cost Estimator',       icon: '💰', group: 'Estimation' },
  { id: 'anomaly',     label: 'Cost Anomaly Detector', icon: '🔍', group: 'Estimation' },
  { id: 'gantt',       label: 'CPM Scheduler',        icon: '📅', group: 'Planning' },
  { id: 'procurement', label: 'Procurement',          icon: '🛒', group: 'Procurement' },
  { id: 'reports',     label: 'Report Generator',     icon: '📄', group: 'Reporting' },
  { id: 'carbon',      label: 'Carbon Dashboard',     icon: '🌱', group: 'Reporting' },
  { id: 'qrsign',      label: 'QR Site Sign',         icon: '📱', group: 'Reporting' },
]

const STAT_CARDS = [
  { label: 'Active Projects',  value: '—',   icon: '📁', color: 'bg-blue-50 border-blue-200' },
  { label: 'Open Estimates',   value: '—',   icon: '💰', color: 'bg-green-50 border-green-200' },
  { label: 'Pending POs',      value: '—',   icon: '🛒', color: 'bg-amber-50 border-amber-200' },
  { label: 'Reports Generated', value: '—',  icon: '📄', color: 'bg-purple-50 border-purple-200' },
]

function Dashboard({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">TPT Infrastructure Engineer</h1>
        <p className="text-gray-500 mt-1">End-to-end platform for infrastructure planning, design, costing and reporting</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        {STAT_CARDS.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
      <div className="grid grid-cols-3 gap-4">
        {NAV_ITEMS.filter(n => n.id !== 'dashboard').map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <span className="text-3xl">{item.icon}</span>
            <div>
              <div className="font-semibold text-gray-800 group-hover:text-blue-600">{item.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.group}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')

  const groups = [...new Set(NAV_ITEMS.map(n => n.group))]

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="text-white font-bold text-base leading-tight">TPT Infrastructure</div>
          <div className="text-gray-500 text-xs mt-0.5">Engineer Platform</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {groups.map(group => (
            <div key={group} className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">{group}</div>
              {NAV_ITEMS.filter(n => n.group === group).map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeModule === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
          v1.0.0 · MIT License
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {activeModule === 'dashboard'   && <Dashboard onNavigate={setActiveModule} />}
        {activeModule === 'assistant'   && <AiAssistant />}
        {activeModule === 'digitaltwin' && <DigitalTwinDashboard />}
        {activeModule === 'drawing'     && <DrawingBoard />}
        {activeModule === 'scene3d'     && <SceneViewer3D />}
        {activeModule === 'design'      && <DesignGenerator />}
        {activeModule === 'comparison'  && <DesignComparison />}
        {activeModule === 'compliance'  && <ComplianceChecker />}
        {activeModule === 'dxf'         && <DxfImporter />}
        {activeModule === 'ifc'         && <IfcImporter />}
        {activeModule === 'drone'       && <DroneViewer />}
        {activeModule === 'materials'   && <MaterialsDatabase />}
        {activeModule === 'estimator'   && <CostEstimator />}
        {activeModule === 'anomaly'     && <CostAnomalyDetector />}
        {activeModule === 'gantt'       && <GanttChart />}
        {activeModule === 'procurement' && <ProcurementManager />}
        {activeModule === 'reports'     && <ReportGenerator />}
        {activeModule === 'carbon'      && <CarbonDashboard />}
        {activeModule === 'qrsign'      && <QRSiteSign />}
      </main>
    </div>
  )
}
>>>>>>> Stashed changes
