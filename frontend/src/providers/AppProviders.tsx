// frontend/src/providers/AppProviders.tsx
import { type ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { KeyboardShortcutsProvider } from './KeyboardShortcuts';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const fetchCurrentUser = useAuthStore(state => state.fetchCurrentUser);
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    const initializeApp = async () => {
      if (checkAuth()) {
        await fetchCurrentUser();
      }
      setIsInitializing(false);
    };

    initializeApp();
  }, [fetchCurrentUser, checkAuth]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TPT Infrastructure Engineer...</p>
        </div>
      </div>
    );
  }

  return (
    <KeyboardShortcutsProvider>
      {children}
    </KeyboardShortcutsProvider>
  );
};