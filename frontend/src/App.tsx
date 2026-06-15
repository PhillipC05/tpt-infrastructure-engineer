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
