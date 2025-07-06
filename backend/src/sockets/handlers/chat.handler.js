// src/sockets/handlers/chat.handler.js

// This handler manages all real-time events related to the chat feature.
export default (io, socket) => {

    // Handles incoming messages and broadcasts them.
    const sendMessageHandler = ({ roomId, message }) => {
        if (!roomId || !message || typeof message !== 'string' || !message.trim()) {
            return; // Ignore invalid messages
        }

        io.in(roomId).emit('new-message', {
            user: {
                _id: socket.user._id,
                username: socket.user.username,
            },
            text: message.trim(),
            timestamp: new Date().toISOString(),
        });
    };

    // --- THE FIX: "is typing..." feature for chat ---
    
    // When a user starts typing in the chat input
    const chatTypingStartHandler = ({ roomId }) => {
        if (!roomId) return;
        socket.to(roomId).emit('chat-typing-start', {
            userId: socket.user._id,
            username: socket.user.username,
        });
    };

    const chatTypingStopHandler = ({ roomId }) => {
        if (!roomId) return;
        socket.to(roomId).emit('chat-typing-stop', {
            userId: socket.user._id,
            username: socket.user.username,
        });
    };
    
    // ... socket.on registrations for all three ...
    socket.on('send-message', sendMessageHandler);
    socket.on('chat-typing-start', chatTypingStartHandler);
    socket.on('chat-typing-stop', chatTypingStopHandler);
};