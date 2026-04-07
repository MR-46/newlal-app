// src/utils/api.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('nl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nl_token');
      localStorage.removeItem('nl_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
