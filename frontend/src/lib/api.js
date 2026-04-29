import axios from 'axios';

const api = axios.create({
  baseURL: 'https://controle-dp-backend.onrender.com/api',
  timeout: 60000, // 60s para aguentar o cold start do Render free
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
    // Tenta 1 vez a mais se for timeout ou ERR_FAILED (cold start)
    if (!config._retry && (!err.response || err.code === 'ECONNABORTED')) {
      config._retry = true;
      await new Promise(r => setTimeout(r, 5000)); // espera 5s
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
