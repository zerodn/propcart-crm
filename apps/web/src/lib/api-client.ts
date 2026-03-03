import axios from 'axios';
import { getAccessToken, getRefreshToken, getDeviceHash, setTokens, clearTokens } from './auth';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      const deviceHash = getDeviceHash();

      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/refresh`,
          { refresh_token: refreshToken, device_hash: deviceHash },
        );

        // ResponseInterceptor wraps: { data: { accessToken, refreshToken } }
        const newAccess = data.data?.accessToken ?? data.data?.access_token ?? data.accessToken;
        const newRefresh = data.data?.refreshToken ?? data.data?.refresh_token ?? data.refreshToken;

        if (!newAccess || !newRefresh) {
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        setTokens(newAccess, newRefresh);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
