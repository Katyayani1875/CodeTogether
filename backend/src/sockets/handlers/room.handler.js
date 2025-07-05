// src/sockets/handlers/room.handler.js
import { Room } from '../../models/room.model.js';

// This map helps us know which user left when a socket disconnects.
const socketToUserMap = new Map();

// Helper function to get the full participant list and broadcast it to everyone.
const getParticipantsAndBroadcast = async (io, roomId) => {
    try {
        const room = await Room.findOne({ roomId }).populate('participants.user', 'username email role');
        if (room) {
            const participants = room.participants.map(p => ({
                _id: p.user._id,
                username: p.user.username,
                email: p.user.email,
                role: p.role,
            }));
            // io.in() sends the message to EVERYONE in the room, including the original sender.
            io.in(roomId).emit('update-participants', participants);
        }
    } catch (error) {
        console.error(`Error broadcasting participants for room ${roomId}:`, error);
    }
};

export default (io, socket) => {
    // Handler for when a user joins a room
    const joinRoomHandler = async ({ roomId }) => {
        if (!roomId || !socket.user) return; // Validation

        socketToUserMap.set(socket.id, socket.user);
        socket.join(roomId);

        console.log(`User ${socket.user.username} (Socket: ${socket.id}) joined room: ${roomId}`);
        
        // Broadcast the full, updated participant list to everyone in the room.
        await getParticipantsAndBroadcast(io, roomId);
    };

    // Handler for when a user disconnects (closes tab, etc.)
    const disconnectHandler = async () => {
        const rooms = Array.from(socket.rooms);
        
        rooms.forEach(async (roomId) => {
            // The first room is always the socket's own ID, so we skip it.
            if (roomId !== socket.id) {
                console.log(`User ${socket.user.username} (Socket: ${socket.id}) left room: ${roomId}`);
                // Update the participant list for the room the user was in.
                await getParticipantsAndBroadcast(io, roomId);
            }
        });
        socketToUserMap.delete(socket.id); // Clean up the map
    };

    // Register event listeners
    socket.on('join-room', joinRoomHandler);
    // 'disconnecting' is more reliable than 'disconnect' for this use case
    socket.on('disconnecting', disconnectHandler);
};