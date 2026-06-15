{/* frontend/src/components/KeyboardShortcutsHelp.tsx */}
import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

const shortcuts = [
  { category: 'General', items: [
    { keys: ['Ctrl', 'S'], action: 'Save current project' },
    { keys: ['Ctrl', 'Z'], action: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
    { keys: ['Ctrl', 'F'], action: 'Global search' },
    { keys: ['Ctrl', 'P'], action: 'Print / Export' },
    { keys: ['?'], action: 'Show keyboard shortcuts' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['Alt', '1'], action: 'Dashboard' },
    { keys: ['Alt', '2'], action: 'Projects' },
    { keys: ['Alt', '3'], action: 'Drawing Board' },
    { keys: ['Alt', '4'], action: 'Estimates' },
    { keys: ['Alt', '5'], action: 'Schedule' },
    { keys: ['Alt', '6'], action: 'Reports' },
  ]},
  { category: 'Drawing Tools', items: [
    { keys: ['V'], action: 'Select tool' },
    { keys: ['P'], action: 'Pen tool' },
    { keys: ['L'], action: 'Line tool' },
    { keys: ['R'], action: 'Rectangle tool' },
    { keys: ['C'], action: 'Circle tool' },
    { keys: ['T'], action: 'Text tool' },
    { keys: ['Space'], action: 'Pan mode' },
    { keys: ['+'], action: 'Zoom in' },
    { keys: ['-'], action: 'Zoom out' },
  ]},
];

export const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !isOpen) {
        setIsOpen(true);
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Keyboard Shortcuts"
      >
        <Keyboard size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcuts.map(category => (
                  <div key={category.category}>
                    <h4 className="font-semibold text-gray-900 mb-3">{category.category}</h4>
                    <div className="space-y-2">
                      {category.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.action}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((key, j) => (
                              <React.Fragment key={j}>
                                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">{key}</kbd>
                                {j < item.keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">ESC</kbd> or click outside to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};