// frontend/src/App.tsx
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ToastContainer } from './components/ToastContainer';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';

const EstimatorPage   = lazy(() => import('./pages/EstimatorPage'));
const SchedulePage    = lazy(() => import('./pages/SchedulePage'));
const MaterialsPage   = lazy(() => import('./pages/MaterialsPage'));
const FeasibilityPage = lazy(() => import('./pages/FeasibilityPage'));
const ReportsPage     = lazy(() => import('./pages/ReportsPage'));
const ProcurementPage = lazy(() => import('./pages/ProcurementPage'));
const DrawingsPage    = lazy(() => import('./pages/DrawingsPage'));
const Viewer3DPage    = lazy(() => import('./pages/Viewer3DPage'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const DroneSurveyPage = lazy(() => import('./pages/DroneSurveyPage'));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'));
const QRSignsPage     = lazy(() => import('./pages/QRSignsPage'));

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
          <Route path="drone-survey" element={<DroneSurveyPage />} />
          <Route path="digital-twin" element={<DigitalTwinPage />} />
          <Route path="qr-signs" element={<QRSignsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}

export default App;
