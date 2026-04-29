import axios from 'axios';

const api = axios.create({
  baseURL: 'https://controle-dp-backend.onrender.com/api',
  timeout: 60000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    if (!config._retry && (!err.response || err.code === 'ECONNABORTED')) {
      config._retry = true;
      await new Promise(r => setTimeout(r, 5000));
      return api(config);
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('dp_token');
      localStorage.removeItem('dp_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
