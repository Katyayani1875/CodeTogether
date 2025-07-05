// src/sockets/socket.js
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL;

export const socket = io(URL, {
    autoConnect: false,
    // --- NEW: Provide the auth token for the backend middleware ---
    auth: (cb) => {
        // Get the token from localStorage when the socket tries to connect
        const token = localStorage.getItem('token');
        cb({ token });
    }
});