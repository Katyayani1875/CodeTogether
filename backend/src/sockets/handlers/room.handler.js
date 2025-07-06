// src/sockets/handlers/room.handler.js
import { Room } from '../../models/room.model.js';

// Track active users in memory for faster access
const activeUsers = new Map();

// Optimized function to broadcast participant updates
const broadcastParticipants = async (io, roomId) => {
    try {
        const room = await Room.findOne({ roomId })
            .populate({
                path: 'participants.user',
                select: 'username _id role'
            })
            .lean();

        if (!room) return;

        // Transform participants data
        const participants = room.participants.map(p => ({
            ...p.user,
            role: p.role
        }));

        // Update in-memory tracking
        activeUsers.set(roomId, participants);

        // Broadcast to all in the room
        io.to(roomId).emit('update-participants', participants);
        console.log(`[Room ${roomId}] Participants updated:`, participants.length);
    } catch (error) {
        console.error(`[Room ${roomId}] Broadcast error:`, error);
    }
};

// Handle user joining a room
const handleJoinRoom = async (io, socket, roomId) => {
    if (!roomId || !socket.user?._id) return false;

    try {
        // Add user to room in database
        const updatedRoom = await Room.findOneAndUpdate(
            { roomId },
            { 
                $addToSet: { 
                    participants: { 
                        user: socket.user._id,
                        role: 'participant' 
                    } 
                } 
            },
            { 
                upsert: true,
                new: true,
                setDefaultsOnInsert: true 
            }
        ).populate('participants.user');

        // Join the socket.io room
        socket.join(roomId);
        console.log(`[Join] ${socket.user.username} joined ${roomId}`);

        // Broadcast updated participant list
        await broadcastParticipants(io, roomId);
        return true;
    } catch (error) {
        console.error(`[Join Error] ${socket.user.username} to ${roomId}:`, error);
        return false;
    }
};

// Handle user leaving a room
const handleLeaveRoom = async (io, socket, roomId) => {
    if (!roomId || !socket.user?._id) return;

    try {
        // Remove user from room in database
        await Room.findOneAndUpdate(
            { roomId },
            { $pull: { participants: { user: socket.user._id } } }
        );

        // Leave the socket.io room
        socket.leave(roomId);
        console.log(`[Leave] ${socket.user.username} left ${roomId}`);

        // Broadcast updated participant list
        await broadcastParticipants(io, roomId);
    } catch (error) {
        console.error(`[Leave Error] ${socket.user.username} from ${roomId}:`, error);
    }
};

export default (io, socket) => {
    // User joins a room
    socket.on('join-room', async ({ roomId }) => {
        await handleJoinRoom(io, socket, roomId);
    });

    // User leaves a room (intentional)
    socket.on('leave-room', async ({ roomId }) => {
        await handleLeaveRoom(io, socket, roomId);
    });

    // User disconnects (network issues, closed tab)
    socket.on('disconnecting', async () => {
        const rooms = Array.from(socket.rooms).filter(id => id !== socket.id);
        await Promise.all(
            rooms.map(roomId => handleLeaveRoom(io, socket, roomId))
        );
    });

    // Periodically clean up empty rooms (optional)
    setInterval(async () => {
        try {
            const emptyRooms = await Room.find({
                'participants.0': { $exists: false }
            });
            
            if (emptyRooms.length > 0) {
                await Room.deleteMany({
                    _id: { $in: emptyRooms.map(r => r._id) }
                });
                console.log(`[Cleanup] Removed ${emptyRooms.length} empty rooms`);
            }
        } catch (error) {
            console.error('[Cleanup Error]:', error);
        }
    }, 3600000); // Run hourly
};
// // src/sockets/handlers/room.handler.js
// import { Room } from '../../models/room.model.js';

// // Helper function to get the current list of participants and broadcast it.
// // This is the key to solving the real-time update issue.
// const getParticipantsAndBroadcast = async (io, roomId) => {
//     try {
//         const room = await Room.findOne({ roomId }).populate({
//             path: 'participants.user',
//             select: 'username _id role' // Select only the fields needed by the frontend
//         });

//         if (room) {
//             // Transform the data to match the frontend's expectation
//             const participants = room.participants.map(p => ({
//                 ...p.user.toObject(),
//                 role: p.role,
//             }));
            
//             // io.in(roomId).emit(...) sends the event to EVERYONE in the room.
//             io.in(roomId).emit('update-participants', participants);
//             console.log(`[Broadcast] Updated participants for room ${roomId}`);
//         }
//     } catch (error) {
//         console.error(`Error broadcasting participants for room ${roomId}:`, error);
//     }
// };

// export default (io, socket) => {
//     // When a user's client says they want to join a room
//     const joinRoomHandler = async ({ roomId }) => {
//         if (!roomId || !socket.user) return;

//         // The user's socket joins the Socket.IO room
//         socket.join(roomId);
//         console.log(`User ${socket.user.username} (Socket: ${socket.id}) joined room: ${roomId}`);

//         // THE FIX: After joining, immediately get the new full list and broadcast it.
//         await getParticipantsAndBroadcast(io, roomId);
//     };

//     // When a user's client says they are leaving (e.g., clicking "Leave Room")
//     const leaveRoomHandler = async ({ roomId }) => {
//         if (!roomId || !socket.user) return;
        
//         socket.leave(roomId);
//         console.log(`User ${socket.user.username} (Socket: ${socket.id}) explicitly left room: ${roomId}`);
        
//         // After leaving, broadcast the updated participant list.
//         await getParticipantsAndBroadcast(io, roomId);
//     };

//     // When a user disconnects entirely (e.g., closes the browser tab)
//     const disconnectHandler = async () => {
//         // socket.rooms contains all rooms the socket was in.
//         for (const roomId of socket.rooms) {
//             // The first room is always the socket's own ID, so we skip it.
//             if (roomId !== socket.id) {
//                 // For every "real" room they were in, update the participant list.
//                 await getParticipantsAndBroadcast(io, roomId);
//             }
//         }
//     };

//     // Register all the event listeners for this socket
//     socket.on('join-room', joinRoomHandler);
//     socket.on('leave-room', leaveRoomHandler);
//     // 'disconnecting' is a reliable event that fires just before a user disconnects.
//     socket.on('disconnecting', disconnectHandler);
// };