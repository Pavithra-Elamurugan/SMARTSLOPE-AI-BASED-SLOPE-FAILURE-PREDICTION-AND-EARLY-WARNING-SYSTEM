import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';
const FASTAPI_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fastApi = axios.create({
  baseURL: FASTAPI_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT Bearer token (except login & register)
api.interceptors.request.use(
  (config) => {
    if (config.url && (config.url.includes('/auth/login') || config.url.includes('/auth/register'))) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }
    const token = localStorage.getItem('smartslope_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle timeout, network errors, 401, 403, 404, and 500 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.customMessage = 'Server request timed out. Please check backend connection.';
    } else if (!error.response) {
      error.customMessage = 'Network error: Cannot connect to SmartSlope API. Please verify the server is online.';
    } else {
      const status = error.response.status;
      if (status === 401) {
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          console.warn('Session expired or unauthorized token. Clearing local authentication context.');
          localStorage.removeItem('smartslope_token');
          localStorage.removeItem('smartslope_user');
          window.location.href = '/login';
        }
      } else if (status === 403) {
        error.customMessage = error.response.data?.message || 'Access denied. You do not have permission for this operation.';
      } else if (status === 404) {
        error.customMessage = error.response.data?.message || 'Requested resource not found on server.';
      } else if (status >= 500) {
        error.customMessage = error.response.data?.message || 'Internal server error occurred. Please try again later.';
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
  evaluateSite: async (siteId, data = {}) => {
    const r24 = data.rainfall24h != null ? Number(data.rainfall24h) : (data.rainfall_24h != null ? Number(data.rainfall_24h) : null);
    const r72 = data.rainfall72h != null ? Number(data.rainfall72h) : (data.rainfall_72h != null ? Number(data.rainfall_72h) : null);

    const payload = {
      monitoring_site_id: siteId ? Number(siteId) : 1,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      rainfall: data.rainfall != null ? Number(data.rainfall) : 0.0,
      rainfall24h: r24,
      rainfall_24h: r24,
      rainfall72h: r72,
      rainfall_72h: r72,
      humidity: data.humidity != null ? Number(data.humidity) : null,
      temperature: data.temperature != null ? Number(data.temperature) : null,
      wind_speed: data.windSpeed != null ? Number(data.windSpeed) : (data.wind_speed != null ? Number(data.wind_speed) : null),
      windSpeed: data.windSpeed != null ? Number(data.windSpeed) : null,
      pressure: data.surfacePressure != null ? Number(data.surfacePressure) : (data.pressure != null ? Number(data.pressure) : null),
      surface_pressure: data.surfacePressure != null ? Number(data.surfacePressure) : null,
      surfacePressure: data.surfacePressure != null ? Number(data.surfacePressure) : null,
      soil_moisture: data.soilMoisture != null ? Number(data.soilMoisture) : null,
      soilMoisture: data.soilMoisture != null ? Number(data.soilMoisture) : null,
      elevation: data.elevation != null ? Number(data.elevation) : null,
      slope_angle: data.slopeAngle != null ? Number(data.slopeAngle) : null,
      slopeAngle: data.slopeAngle != null ? Number(data.slopeAngle) : null,
      soil_type: data.soilType || data.soil_type || null,
      soilType: data.soilType || data.soil_type || null,
    };
    console.log("================ [PREDICT REQUEST SNAPSHOT] ================");
    console.log("JSON sent to /predict:", JSON.stringify(payload, null, 2));
    console.log("Displayed Values Comparison:", {
      latitude: payload.latitude,
      longitude: payload.longitude,
      rainfall: payload.rainfall,
      rainfall24h: payload.rainfall24h,
      rainfall72h: payload.rainfall72h,
      soilMoisture: payload.soilMoisture,
      elevation: payload.elevation,
      slopeAngle: payload.slopeAngle,
      temperature: payload.temperature,
      humidity: payload.humidity,
      windSpeed: payload.windSpeed,
      surfacePressure: payload.surfacePressure
    });
    console.log("============================================================");

    const res = await fastApi.post('/predict', payload);
    console.log("================ [PREDICT RESPONSE SNAPSHOT] ===============");
    console.log("FastAPI Response:", res.data);
    console.log("============================================================");
    return res.data;
  },
  analyzeLocation: async (data = {}) => {
    console.log("[REACT -> FASTAPI PREDICT] Analyze location payload:", {
      rainfall: data.rainfall,
      rainfall24h: data.rainfall24h,
      rainfall72h: data.rainfall72h,
      latitude: data.latitude,
      longitude: data.longitude,
    });
    const res = await fastApi.post('/predict', data);
    return res.data;
  },
  predictCustom: async (data = {}) => {
    console.log("[REACT -> FASTAPI PREDICT] Predict custom payload:", {
      rainfall: data.rainfall,
      rainfall24h: data.rainfall24h,
      rainfall72h: data.rainfall72h,
    });
    const res = await fastApi.post('/predict', data);
    return res.data;
  },
};

export const getWmoWeatherCondition = (code) => {
  if (code == null) return "Unavailable";
  const wmoMap = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail"
  };
  return wmoMap[code] || `Weather Code ${code}`;
};

export const fetchDemSlope = async (lat, lng) => {
  try {
    const delta = 0.001;
    const lats = [lat, lat + delta, lat - delta, lat, lat].map((n) => n.toFixed(6)).join(",");
    const lngs = [lng, lng, lng, lng + delta, lng - delta].map((n) => n.toFixed(6)).join(",");
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
    if (!res.ok) return null;
    const data = await res.json();
    const elevs = data?.elevation;
    if (!elevs || elevs.length < 5) return null;
    const [z0, zN, zS, zE, zW] = elevs;
    const distY = delta * 111120.0;
    const distX = delta * 111120.0 * Math.cos((lat * Math.PI) / 180.0);
    const dzdx = (zE - zW) / (2.0 * distX);
    const dzdy = (zN - zS) / (2.0 * distY);
    const gradient = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
    const slopeDeg = (Math.atan(gradient) * 180.0) / Math.PI;
    return Math.round(slopeDeg * 100) / 100;
  } catch (err) {
    console.warn("DEM slope calculation error:", err);
    return null;
  }
};

export const fetchLocationWeather = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,surface_pressure,soil_moisture_0_to_7cm&hourly=precipitation,soil_moisture_0_to_7cm&past_days=3`
    );
    if (!res.ok) {
      throw new Error(`Open-Meteo API HTTP error: ${res.status}`);
    }
    const data = await res.json();
    const demSlopeAngle = await fetchDemSlope(lat, lng);

    if (data && data.current) {
      const c = data.current;
      const soilMoisturePct = c.soil_moisture_0_to_7cm != null ? Math.round(c.soil_moisture_0_to_7cm * 100) : null;

      // Calculate real 24h and 72h accumulated rainfall from Open-Meteo hourly history
      let rainfall24h = 0;
      let rainfall72h = 0;
      if (data.hourly && Array.isArray(data.hourly.precipitation) && Array.isArray(data.hourly.time)) {
        const times = data.hourly.time;
        const precArr = data.hourly.precipitation;

        let currHourStr = "";
        if (data.current && data.current.time) {
          currHourStr = data.current.time.substring(0, 13);
        } else {
          currHourStr = new Date().toISOString().substring(0, 13);
        }

        let currIdx = times.findIndex(t => t.startsWith(currHourStr));
        if (currIdx === -1) {
          const nowIso = new Date().toISOString();
          for (let i = times.length - 1; i >= 0; i--) {
            if (times[i] <= nowIso) {
              currIdx = i;
              break;
            }
          }
        }
        if (currIdx === -1) {
          currIdx = Math.min(71, times.length - 1);
        }

        const past24 = precArr.slice(Math.max(0, currIdx - 23), currIdx + 1);
        rainfall24h = past24.reduce((sum, val) => sum + (val || 0), 0);

        const past72 = precArr.slice(Math.max(0, currIdx - 71), currIdx + 1);
        rainfall72h = past72.reduce((sum, val) => sum + (val || 0), 0);
      }

      return {
        rainfall: c.precipitation != null ? Number(c.precipitation) : 0,
        rainfall24h: Math.round(rainfall24h * 10) / 10,
        rainfall72h: Math.round(rainfall72h * 10) / 10,
        humidity: c.relative_humidity_2m != null ? Number(c.relative_humidity_2m) : null,
        temperature: c.temperature_2m != null ? Number(c.temperature_2m) : null,
        condition: getWmoWeatherCondition(c.weather_code),
        windSpeed: c.wind_speed_10m != null ? Number(c.wind_speed_10m) : null,
        surfacePressure: c.surface_pressure != null ? Number(c.surface_pressure) : null,
        soilMoisture: soilMoisturePct,
        elevation: data.elevation != null ? Number(data.elevation) : null,
        demSlopeAngle: demSlopeAngle,
        source: "Live Open-Meteo API",
        weatherCode: c.weather_code
      };
    }
  } catch (err) {
    console.warn("Open-Meteo weather fetch error:", err);
    throw err;
  }
  throw new Error("No weather data returned from Open-Meteo API.");
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
