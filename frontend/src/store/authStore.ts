// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { api, type User, type LoginCredentials, type AuthResponse } from '../lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<User | null>;
  checkAuth: () => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.login(credentials);
      const user = await api.getCurrentUser();
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      
      return response;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    
    try {
      const user = await api.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return user;
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      return null;
    }
  },

  checkAuth: () => {
    return api.isAuthenticated();
  },

  clearError: () => {
    set({ error: null });
  }
}));