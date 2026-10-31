import axios from 'axios';

/**
 * Resolves the API base URL from Vite environment variables.
 * - In local development with Vite dev server proxy: defaults to '/api'
 * - In production (e.g. deployed on Netlify): uses VITE_API_URL, automatically ensuring '/api' path suffix
 *   regardless of whether the user specified "https://advd-api.onrender.com" or "https://advd-api.onrender.com/api".
 */
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: Attach JWT token and active workspace ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('advd_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeWorkspaceId = localStorage.getItem('advd_active_workspace_id');
    if (activeWorkspaceId) {
      config.headers['x-workspace-id'] = activeWorkspaceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle automatic token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('advd_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('advd_access_token');
        localStorage.removeItem('advd_refresh_token');
        localStorage.removeItem('advd_active_workspace_id');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        localStorage.setItem('advd_access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('advd_refresh_token', newRefreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        localStorage.removeItem('advd_access_token');
        localStorage.removeItem('advd_refresh_token');
        localStorage.removeItem('advd_active_workspace_id');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

