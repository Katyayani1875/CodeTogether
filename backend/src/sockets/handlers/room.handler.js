// src/sockets/handlers/room.handler.js
export default (io, socket) => {
    const joinRoomHandler = (data) => {
        const { roomId, user } = data;
        console.log(`User ${user?.username || 'Anonymous'} joined room: ${roomId}`);
        socket.join(roomId);

        // Notify others in the room that a new user has joined
        socket.to(roomId).emit('user-joined', { userId: socket.id, user });
    };

    socket.on('join-room', joinRoomHandler);
};