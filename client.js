// src/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api'   // Replace with your local IP during dev
  : 'https://api.kaiytec.com/api';    // Production URL

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15s timeout for slow connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
client.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

// Handle 401 globally
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('authToken');
      // Navigation to login is handled by auth store listener
    }

    // Network error message
    if (!error.response) {
      error.message = 'No internet connection. Please check your network and try again.';
    }

    return Promise.reject(error);
  }
);

export default client;

// ─────────────────────────────────────────────────────────────

// src/store/authStore.js
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  // Initialize - check stored token
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const { data } = await client.get('/auth/me');
        set({ user: data.user, token, isAuthenticated: true });
      }
    } catch (_) {
      await SecureStore.deleteItemAsync('authToken');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('authToken', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  register: async (userData) => {
    const { data } = await client.post('/auth/register', userData);
    await SecureStore.setItemAsync('authToken', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => set(state => ({
    user: { ...state.user, ...updates }
  })),
}));

export default useAuthStore;
