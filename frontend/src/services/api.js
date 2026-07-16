import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: BASE_URL,
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('rapido_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = async (userId, password) => {
    const response = await api.post('/auth/login', {
        user_id: userId,
        password,
    });
    return response.data;
};

// ── Rides ─────────────────────────────────────────────────────────────────────
export const requestRide = async (pickupLat, pickupLng) => {
    const response = await api.post('/rides/request', {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
    });
    return response.data;
};

export const getRide = async (rideId) => {
    const response = await api.get(`/rides/${rideId}`);
    return response.data;
};

// ── Drivers ───────────────────────────────────────────────────────────────────
export const getNearbyDrivers = async (lat, lng, radiusKm = 5.0) => {
    const response = await api.get('/drivers/nearby', {
        params: { lat, lng, radius_km: radiusKm },
    });
    return response.data;
};

export default api;