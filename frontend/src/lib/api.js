import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `https://${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3001/api';

console.log('API URL:', BASE);

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dp_token');
      localStorage.removeItem('dp_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
