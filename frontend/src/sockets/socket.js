// src/sockets/socket.js
import { io } from 'socket.io-client';

// USE THIS SYNTAX FOR VITE
const URL = import.meta.env.VITE_BACKEND_URL;

export const socket = io(URL, {
    autoConnect: false,
});