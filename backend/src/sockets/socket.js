// src/sockets/socket.js
import { Server } from 'socket.io';
import registerRoomHandlers from './handlers/room.handler.js';
import registerEditorHandlers from './handlers/editor.handler.js';
import { Room } from '../models/room.model.js';

export const initializeSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.id}`);

        registerRoomHandlers(io, socket);
        registerEditorHandlers(io, socket);

        socket.on('disconnecting', () => {
            const rooms = Object.keys(socket.rooms);
            // The first room is always the socket's own ID, so we ignore it
            rooms.forEach(roomId => {
                if (roomId !== socket.id) {
                    socket.to(roomId).emit('user-left', { userId: socket.id });
                }
            });
        });

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });

    return io;
};