import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartslope_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized & 403 Forbidden globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        console.warn('Session expired or unauthorized token. Clearing local authentication context.');
        localStorage.removeItem('smartslope_token');
        localStorage.removeItem('smartslope_user');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then(res => res.data),
  register: (userData) => api.post('/auth/register', userData).then(res => res.data),
  me: () => api.get('/auth/me').then(res => res.data),
};

export const sitesApi = {
  getAll: () => api.get('/sites').then(res => res.data),
  getById: (id) => api.get(`/sites/${id}`).then(res => res.data),
  create: (data) => api.post('/sites', data).then(res => res.data),
  update: (id, data) => api.put(`/sites/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/sites/${id}`).then(res => res.data),
};

export const sensorDataApi = {
  getAll: () => api.get('/sensor-data').then(res => res.data),
  getById: (id) => api.get(`/sensor-data/${id}`).then(res => res.data),
  create: (data) => api.post('/sensor-data', data).then(res => res.data),
  update: (id, data) => api.put(`/sensor-data/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/sensor-data/${id}`).then(res => res.data),
};

export const predictionApi = {
  getAll: () => api.get('/predictions').then(res => res.data),
  getById: (id) => api.get(`/predictions/${id}`).then(res => res.data),
  getBySiteId: (siteId) => api.get(`/predictions/site/${siteId}`).then(res => res.data),
  create: (data) => api.post('/predictions', data).then(res => res.data),
  evaluateSite: (siteId, data = {}) => api.post(`/predictions/evaluate/${siteId}`, data || {}).then(res => res.data),
  analyzeLocation: (data) => api.post('/predictions/analyze-location', data).then(res => res.data),
  predictCustom: (data) => api.post('/predictions/analyze-location', data).then(res => res.data),
};

export const fetchLocationWeather = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,soil_moisture_0_to_7cm`
    );
    const data = await res.json();
    if (data && data.current) {
      const c = data.current;
      const soilMoisturePct = c.soil_moisture_0_to_7cm != null ? Math.round(c.soil_moisture_0_to_7cm * 100) : 35;
      return {
        rainfall: c.precipitation != null ? c.precipitation : 0.0,
        soilMoisture: soilMoisturePct,
        temperature: c.temperature_2m != null ? c.temperature_2m : 25.0,
        humidity: c.relative_humidity_2m != null ? c.relative_humidity_2m : 65.0,
      };
    }
  } catch (err) {
    console.warn("Open-Meteo weather fetch warning:", err);
  }
  return { rainfall: 0.0, soilMoisture: 30.0, temperature: 25.0, humidity: 65.0 };
};

export const alertApi = {
  getAll: () => api.get('/alerts').then(res => res.data),
  getById: (id) => api.get(`/alerts/${id}`).then(res => res.data),
  create: (data) => api.post('/alerts', data).then(res => res.data),
  update: (id, data) => api.put(`/alerts/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/alerts/${id}`).then(res => res.data),
};

export const historyApi = {
  getAll: () => api.get('/history').then(res => res.data),
  getById: (id) => api.get(`/history/${id}`).then(res => res.data),
  create: (data) => api.post('/history', data).then(res => res.data),
  update: (id, data) => api.put(`/history/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/history/${id}`).then(res => res.data),
};

export const userApi = {
  getAll: () => api.get('/users').then(res => res.data),
  getById: (id) => api.get(`/users/${id}`).then(res => res.data),
  create: (data) => api.post('/users', data).then(res => res.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(res => res.data),
  approve: (id, role, active = true) => api.put(`/users/${id}/approve`, { assignedRole: role, active }).then(res => res.data),
  delete: (id) => api.delete(`/users/${id}`).then(res => res.data),
};

export const inspectionsApi = {
  getAll: () => api.get('/inspections').then(res => res.data),
  getById: (id) => api.get(`/inspections/${id}`).then(res => res.data),
  create: (data) => api.post('/inspections', data).then(res => res.data),
  update: (id, data) => api.put(`/inspections/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/inspections/${id}`).then(res => res.data),
};

export const incidentsApi = {
  getAll: () => api.get('/incidents').then(res => res.data),
  getById: (id) => api.get(`/incidents/${id}`).then(res => res.data),
  create: (data) => api.post('/incidents', data).then(res => res.data),
  update: (id, data) => api.put(`/incidents/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/incidents/${id}`).then(res => res.data),
};

export default api;
