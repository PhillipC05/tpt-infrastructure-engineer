// frontend/src/components/layout/AppLayout.tsx
import { type ReactNode, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  HomeIcon,
  CubeIcon,
  CalculatorIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  icon: ReactNode;
  path: string;
}

export const AppLayout = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems: NavItem[] = [
    { name: 'Dashboard', icon: <HomeIcon className="w-5 h-5" />, path: '/dashboard' },
    { name: 'Projects', icon: <CubeIcon className="w-5 h-5" />, path: '/projects' },
    { name: 'Estimator', icon: <CalculatorIcon className="w-5 h-5" />, path: '/estimator' },
    { name: 'Schedule', icon: <CalendarIcon className="w-5 h-5" />, path: '/schedule' },
    { name: 'Reports', icon: <DocumentTextIcon className="w-5 h-5" />, path: '/reports' },
    { name: 'Procurement', icon: <ShoppingCartIcon className="w-5 h-5" />, path: '/procurement' },
    { name: 'Settings', icon: <CogIcon className="w-5 h-5" />, path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className={`font-bold text-blue-600 ${sidebarOpen ? 'text-xl' : 'text-center text-sm'}`}>
            {sidebarOpen ? 'TPT Engineer' : 'TPT'}
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="ml-3 text-sm">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3 text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};