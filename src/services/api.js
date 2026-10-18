import axios from 'axios';
import { mockAdapter } from './mock/index';

const USE_MOCK = false; // Toggle this to switch between real and mock backend

// Keep local development on the same backend port as the maintained frontend.
// Deriving the hostname also makes the app work through localhost, 127.0.0.1,
// or another device on the same LAN without source-code changes.
const configuredApiUrl = import.meta.env?.VITE_API_URL?.trim();
const localApiPort = import.meta.env?.VITE_API_PORT?.trim() || '8001';
export const API_BASE_URL = configuredApiUrl?.replace(/\/+$/, '') || `${window.location.protocol}//${window.location.hostname}:${localApiPort}`;

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Mock Adapter Logic
if (USE_MOCK) {
    API.defaults.adapter = mockAdapter;
}

// Add a request interceptor to include the token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = `Cannot reach the backend at ${API_BASE_URL}. Start the backend server and try again.`;
    }
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized access - clearing token");
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');

      const publicPaths = ['/', '/explore', '/login', '/register', '/forgot-password', '/verify-email', '/alumni/register', '/admin/login'];
      const isPublicPath = publicPaths.includes(window.location.pathname);
      if (!isPublicPath) {
        window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default API;
