import axios from 'axios';

// Base API URL (Development fallback)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Intercept requests to attach JWT Token (fallback for migration)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jianghu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Intercept response to handle 401s via refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

        if (response.data.token) {
           // We might still want to update local storage for smooth transition if needed,
           // but normally cookies handle it now.
           localStorage.setItem('jianghu_token', response.data.token);
           return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, they are truly logged out. Let the UI handle redirect.
        if (typeof window !== 'undefined') {
           localStorage.removeItem('jianghu_token');
           localStorage.removeItem('jianghu_user');
           if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/') {
              window.location.href = '/auth/login';
           }
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
