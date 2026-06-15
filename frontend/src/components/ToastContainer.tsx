// frontend/src/components/ToastContainer.tsx
import { useToastStore } from '../lib/toast';

const toastStyles = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800'
};

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center min-w-[320px] px-4 py-3 border-l-4 rounded shadow-lg ${toastStyles[toast.type]}`}
          role="alert"
        >
          <span className="flex-shrink-0 mr-3 text-lg font-bold">
            {toastIcons[toast.type]}
          </span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 font-bold text-opacity-70 hover:text-opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};