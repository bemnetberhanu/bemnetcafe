import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the signed-in user's JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const role = await SecureStore.getItemAsync('role');
    if (role === 'manager') {
      const token = await SecureStore.getItemAsync('token');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      const token = await SecureStore.getItemAsync('token');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {
    // SecureStore unavailable (e.g. web preview) — proceed unauthenticated
  }
  return config;
});

// Handle 401 — auth store handles the sign-out
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('role');
      } catch (_) {}
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (current_password, new_password) =>
    api.post('/auth/change-password', { current_password, new_password }),
};

export const menuApi = {
  getAll: () => api.get('/menu'),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  remove: (id) => api.delete(`/menu/${id}`),
};

export const ingredientsApi = {
  getAll: () => api.get('/ingredients'),
  create: (data) => api.post('/ingredients', data),
  update: (id, data) => api.put(`/ingredients/${id}`, data),
  remove: (id) => api.delete(`/ingredients/${id}`),
};

export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
};

export const purchasesApi = {
  getAll: () => api.get('/purchases'),
  create: (data) => api.post('/purchases', data),
};

export const expensesApi = {
  getAll: () => api.get('/expenses'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
};

export const analyticsApi = {
  daily: (date) => api.get('/analytics/daily-summary', { params: { date } }),
  financial: (start_date, end_date, group_by) =>
    api.get('/analytics/financial', { params: { start_date, end_date, group_by } }),
  ranking: (days) => api.get('/analytics/ranking', { params: { days } }),
  patterns: (days) => api.get('/analytics/patterns', { params: { days } }),
};

export const notificationsApi = {
  getAll: (limit = 30) => api.get('/notifications', { params: { limit } }),
  getUnreadCount: () => api.get('/notifications/unread'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/all/read'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, new_password) =>
    api.patch(`/users/${id}/reset-password`, { new_password }),
  remove: (id) => api.delete(`/users/${id}`),
};
