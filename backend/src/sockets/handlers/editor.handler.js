// src/sockets/handlers/editor.handler.js
export default (io, socket) => {
    const codeChangeHandler = (data) => {
        const { roomId, newCode } = data;
        // Broadcast the change to everyone in the room except the sender
        socket.to(roomId).emit('code-changed', { newCode });
    };

    const cursorChangeHandler = (data) => {
        const { roomId, cursorPosition, user } = data;
        // Broadcast cursor position to others
        socket.to(roomId).emit('cursor-changed', { userId: socket.id, cursorPosition, user });
    };

    socket.on('code-change', codeChangeHandler);
    socket.on('cursor-change', cursorChangeHandler); // For Phase 2, but good to have the event name
};