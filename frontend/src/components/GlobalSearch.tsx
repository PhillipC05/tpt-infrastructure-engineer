// frontend/src/components/GlobalSearch.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'module' | 'action' | 'document';
  path: string;
  icon: string;
  keywords: string[];
}

const searchIndex: SearchResult[] = [
  { id: '1', title: 'Dashboard', description: 'Overview & system metrics', type: 'page', path: '/dashboard', icon: '📊', keywords: ['home', 'overview', 'stats', 'metrics'] },
  { id: '2', title: 'Projects', description: 'Manage construction projects', type: 'page', path: '/projects', icon: '🏗️', keywords: ['project', 'job', 'site', 'construction'] },
  { id: '3', title: 'Cost Estimator', description: 'Calculate material & labor costs', type: 'module', path: '/estimator', icon: '💰', keywords: ['cost', 'estimate', 'budget', 'calculate', 'pricing'] },
  { id: '4', title: 'Schedule', description: 'Gantt chart & timeline management', type: 'module', path: '/schedule', icon: '📅', keywords: ['schedule', 'timeline', 'gantt', 'planning', 'dates'] },
  { id: '5', title: 'Materials Database', description: 'Browse construction materials', type: 'module', path: '/materials', icon: '🧱', keywords: ['material', 'inventory', 'supplies', 'stock'] },
  { id: '6', title: 'Procurement', description: 'Purchase orders & suppliers', type: 'module', path: '/procurement', icon: '📦', keywords: ['procurement', 'purchase', 'order', 'supplier', 'vendor'] },
  { id: '7', title: '3D Viewer', description: 'View BIM & design models', type: 'module', path: '/viewer', icon: '🎯', keywords: ['3d', 'bim', 'model', 'ifc', 'design'] },
  { id: '8', title: 'Drawings', description: 'CAD drawings & blueprints', type: 'module', path: '/drawings', icon: '📐', keywords: ['drawing', 'cad', 'blueprint', 'dxf', 'plan'] },
  { id: '9', title: 'Feasibility Analysis', description: 'Site analysis & risk assessment', type: 'module', path: '/feasibility', icon: '🔍', keywords: ['feasibility', 'analysis', 'risk', 'site', 'assessment'] },
  { id: '10', title: 'Reports', description: 'Generate & export reports', type: 'module', path: '/reports', icon: '📑', keywords: ['report', 'export', 'pdf', 'analytics', 'document'] },
  { id: '11', title: 'Settings', description: 'Account & application settings', type: 'page', path: '/settings', icon: '⚙️', keywords: ['settings', 'preferences', 'account', 'config'] },
  { id: '12', title: 'Generate Estimate', description: 'Create new cost estimate', type: 'action', path: '/estimator/new', icon: '➕', keywords: ['new', 'create', 'estimate', 'add'] },
  { id: '13', title: 'Audit Logs', description: 'View system activity history', type: 'module', path: '/audit', icon: '📋', keywords: ['audit', 'log', 'history', 'activity', 'changes'] },
];

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filterResults = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const matched = searchIndex.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(k => k.includes(lowerQuery))
    );

    setResults(matched.slice(0, 8));
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    filterResults(query);
  }, [query, filterResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          navigate(results[selectedIndex].path);
          setIsOpen(false);
          setQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 text-sm w-full max-w-sm transition-colors"
        aria-label="Open global search (Ctrl+K)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="px-2 py-0.5 bg-white rounded text-xs font-medium border border-gray-300">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, actions, pages..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
            autoComplete="off"
            aria-label="Global search input"
          />
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto py-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => {
                  navigate(result.path);
                  setIsOpen(false);
                  setQuery('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl w-8 text-center">{result.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.title}</div>
                  <div className="text-xs text-gray-500 truncate">{result.description}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  result.type === 'page' ? 'bg-gray-100 text-gray-600' :
                  result.type === 'module' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {result.type}
                </span>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No results found</p>
            <p className="text-sm">Try different keywords</p>
          </div>
        )}

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">↵</kbd> Select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};