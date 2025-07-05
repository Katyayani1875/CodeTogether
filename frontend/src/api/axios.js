// src/api/axios.js
import axios from 'axios';

const api = axios.create({
    // USE THIS SYNTAX FOR VITE
    baseURL: import.meta.env.VITE_BACKEND_URL, 
});

// Interceptor to add the auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;