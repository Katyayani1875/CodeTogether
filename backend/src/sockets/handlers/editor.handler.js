// src/sockets/handlers/editor.handler.js
import { Room } from '../../models/room.model.js';

// Map to hold debounce timers for each room, preventing excessive DB writes.
const debounceTimers = new Map();

export default (io, socket) => {
    // Handler for when code is changed in the editor
    const codeChangeHandler = async ({ roomId, newCode }) => {
        if (typeof newCode !== 'string') return; // Basic input validation

        // Broadcast change instantly for a fluid real-time experience
        socket.to(roomId).emit('code-changed', {
            newCode,
            changedBy: { _id: socket.user._id, username: socket.user.username }, // Metadata
        });

        // Clear any existing timer for this room to reset the debounce period
        if (debounceTimers.has(roomId)) {
            clearTimeout(debounceTimers.get(roomId));
        }

        // Set a new timer to save the code after the user stops typing
        const timer = setTimeout(async () => {
            try {
                await Room.findOneAndUpdate(
                    { roomId },
                    { 
                        codeContent: newCode,
                        lastModifiedBy: socket.user._id // Track who made the last change
                    }
                );
                io.in(roomId).emit('code-saved', { timestamp: new Date() }); // Notify clients of save
                console.log(`[DB Write] Room ${roomId} saved by ${socket.user.username}.`);
            } catch (error) {
                console.error(`[DB Error] Failed to save code for room ${roomId}:`, error);
                // Optionally emit a save error to the client
                socket.emit('error', { message: 'Failed to save your changes.' });
            } finally {
                debounceTimers.delete(roomId); // Clean up the timer from the map
            }
        }, 1500); // Wait 1.5 seconds after the last keystroke to save

        debounceTimers.set(roomId, timer);
    };

    // Handler for real-time cursor position synchronization
    const cursorChangeHandler = ({ roomId, cursorPosition }) => {
        socket.to(roomId).emit('cursor-changed', {
            user: { _id: socket.user._id, username: socket.user.username },
            cursorPosition,
        });
    };

    // Handlers for typing indicators
    const startTypingHandler = ({ roomId }) => {
        socket.to(roomId).emit('user-typing-start', { userId: socket.user._id, username: socket.user.username });
    };

    const stopTypingHandler = ({ roomId }) => {
        socket.to(roomId).emit('user-typing-stop', { userId: socket.user._id });
    };

    // Register all event listeners for this socket
    socket.on('code-change', codeChangeHandler);
    socket.on('cursor-change', cursorChangeHandler);
    socket.on('start-typing', startTypingHandler);
    socket.on('stop-typing', stopTypingHandler);
};