import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://manhaj-api-five.vercel.app';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('manhaj_access_token');
  if (token) {
    config.headers.set('x-auth-token', token);
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export { axios };
