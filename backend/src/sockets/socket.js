// src/sockets/socket.js
import { Server } from 'socket.io';
import registerRoomHandlers from './handlers/room.handler.js';
import registerEditorHandlers from './handlers/editor.handler.js';
import { verifySocketJWT } from '../middlewares/socket.middleware.js'; // --- NEW: Import middleware

export const initializeSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET", "POST"]
        }
    });
    // --- NEW: Use the middleware to authenticate all incoming connections
    io.use(verifySocketJWT);

    io.on('connection', (socket) => {
        // Now, we can be sure that socket.user exists.
        console.log(`✅ Authenticated user connected: ${socket.user.username} (Socket ID: ${socket.id})`);

        registerRoomHandlers(io, socket);
        registerEditorHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.user.username} (Socket ID: ${socket.id})`);
        });
    });

    return io;
};