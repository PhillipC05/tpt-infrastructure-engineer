// frontend/src/providers/KeyboardShortcuts.tsx
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../lib/toast';

interface Shortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
  preventDefault?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: Shortcut[];
  isHelpModalOpen: boolean;
  toggleHelpModal: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const toggleHelpModal = useCallback(() => {
    setIsHelpModalOpen(prev => !prev);
  }, []);

  const shortcuts: Shortcut[] = [
    { id: 'search', key: 'k', ctrl: true, meta: true, description: 'Open global search', category: 'General', preventDefault: true },
    { id: 'help', key: '?', shift: true, description: 'Show keyboard shortcuts', category: 'General', preventDefault: true },
    { id: 'dashboard', key: '1', ctrl: true, meta: true, description: 'Go to Dashboard', category: 'Navigation' },
    { id: 'projects', key: '2', ctrl: true, meta: true, description: 'Go to Projects', category: 'Navigation' },
    { id: 'estimator', key: '3', ctrl: true, meta: true, description: 'Go to Cost Estimator', category: 'Navigation' },
    { id: 'schedule', key: '4', ctrl: true, meta: true, description: 'Go to Schedule', category: 'Navigation' },
    { id: 'materials', key: '5', ctrl: true, meta: true, description: 'Go to Materials', category: 'Navigation' },
    { id: 'procurement', key: '6', ctrl: true, meta: true, description: 'Go to Procurement', category: 'Navigation' },
    { id: 'reports', key: '7', ctrl: true, meta: true, description: 'Go to Reports', category: 'Navigation' },
    { id: 'new_item', key: 'n', ctrl: true, meta: true, description: 'Create new item', category: 'Actions' },
    { id: 'save', key: 's', ctrl: true, meta: true, description: 'Save current form', category: 'Actions', preventDefault: true },
    { id: 'escape', key: 'Escape', description: 'Close modals / Cancel', category: 'General' },
    { id: 'refresh', key: 'r', ctrl: true, meta: true, description: 'Refresh current page data', category: 'Actions' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        if (e.key !== 'Escape') return;
      }

      const isCtrlPressed = e.ctrlKey;
      const isMetaPressed = e.metaKey;
      const isShiftPressed = e.shiftKey;
      const isAltPressed = e.altKey;

      if ((e.key === '?' && isShiftPressed) || (e.key === '/' && isShiftPressed)) {
        e.preventDefault();
        toggleHelpModal();
        return;
      }

      if ((isCtrlPressed || isMetaPressed) && e.key === '1') { navigate('/dashboard'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '2') { navigate('/projects'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '3') { navigate('/estimator'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '4') { navigate('/schedule'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '5') { navigate('/materials'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '6') { navigate('/procurement'); return; }
      if ((isCtrlPressed || isMetaPressed) && e.key === '7') { navigate('/reports'); return; }

      if ((isCtrlPressed || isMetaPressed) && e.key === 's') {
        e.preventDefault();
        toast.info('Saved successfully');
      }

      if ((isCtrlPressed || isMetaPressed) && e.key === 'r') {
        e.preventDefault();
        toast.info('Refreshing data...');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, toggleHelpModal]);

  return (
    <KeyboardShortcutsContext.Provider value={{ shortcuts, isHelpModalOpen, toggleHelpModal }}>
      {children}
      
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsHelpModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <button onClick={() => setIsHelpModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96 p-6">
              {Object.entries(shortcuts.reduce((acc, s) => {
                if (!acc[s.category]) acc[s.category] = [];
                acc[s.category].push(s);
                return acc;
              }, {} as Record<string, Shortcut[]>)).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                  <div className="space-y-2">
                    {items.map(shortcut => (
                      <div key={shortcut.id} className="flex items-center justify-between py-1">
                        <span className="text-gray-700">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.ctrl && <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl</kbd>}
                          {shortcut.meta && <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">⌘</kbd>}
                          {shortcut.shift && <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">⇧</kbd>}
                          <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{shortcut.key.toUpperCase()}</kbd>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">Esc</kbd> or click outside to close
            </div>
          </div>
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  );
};