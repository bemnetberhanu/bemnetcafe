import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  role: null,       // 'admin' | 'manager' | null
  initialized: false,

  // Called on app start — loads persisted auth from SecureStore
  init: async () => {
    try {
      const [token, userJson, role] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync('role'),
      ]);
      if (!token) {
        await Promise.all([
          SecureStore.deleteItemAsync('user'),
          SecureStore.deleteItemAsync('role'),
        ]);
        set({ token: null, user: null, role: null, initialized: true });
        return;
      }
      set({
        token,
        user: userJson ? JSON.parse(userJson) : null,
        role: role || null,
        initialized: true,
      });
    } catch (_) {
      set({ initialized: true });
    }
  },

  // Admin JWT login
  loginAdmin: async (user, token) => {
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
      SecureStore.setItemAsync('role', 'admin'),
    ]);
    set({ user, token, role: 'admin' });
  },

  loginManager: async (user, token) => {
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
      SecureStore.setItemAsync('role', 'manager'),
    ]);
    set({ user, token, role: 'manager' });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('role'),
    ]);
    set({ user: null, token: null, role: null });
  },

  isAdmin: () => get().role === 'admin',
  isManager: () => get().role === 'manager',
  isAuthenticated: () => get().role !== null,
}));

export default useAuthStore;
