import axios from 'axios';
import toast from 'react-hot-toast';

const TOKEN_KEY = 'pp_token';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach Bearer token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Demo expired → redirect to demo-expired page
    if (err.response?.status === 403 && err.response?.data?.code === 'demo_expired') {
      if (!window.location.pathname.includes('/demo-expired')) {
        window.location.href = '/demo-expired';
      }
      return Promise.reject(err);
    }

    // Expired / invalid token → clear session and redirect to login
    if (err.response?.status === 401) {
      const code = err.response?.data?.code;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('pp_user');
      if (!window.location.pathname.includes('/login')) {
        if (code === 'SESSION_REPLACED') {
          toast.error('کسی دوسری ڈیوائس پر لاگ ان ہوا — آپ کا سیشن ختم ہو گیا۔', { duration: 5000 });
        }
        setTimeout(() => { window.location.href = '/login'; }, code === 'SESSION_REPLACED' ? 1500 : 0);
      }
      return Promise.reject(err);
    }

    const message = err.response?.data?.error || err.message || 'Something went wrong';
    if (err.response?.status !== 404) toast.error(message);
    return Promise.reject(err);
  }
);

export default client;
