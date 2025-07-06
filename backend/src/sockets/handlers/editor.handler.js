import { Room } from '../../models/room.model.js';
import { fileURLToPath } from 'url';
const debounceTimers = new Map();
const activeCursors = new Map();

export default (io, socket) => {
    // --- Code Change Handler (with debouncing) ---
    const codeChangeHandler = async ({ roomId, newCode }) => {
        if (typeof newCode !== 'string') return;

        // Broadcast change instantly for real-time experience
        socket.to(roomId).emit('code-changed', {
            newCode,
            changedBy: { _id: socket.user._id, username: socket.user.username }
        });

        // Debounce the database save operation
        if (debounceTimers.has(roomId)) {
            clearTimeout(debounceTimers.get(roomId));
        }

        const timer = setTimeout(async () => {
            try {
                await Room.findOneAndUpdate(
                    { roomId },
                    { 
                        codeContent: newCode,
                        lastModifiedBy: socket.user._id
                    }
                );
                io.in(roomId).emit('code-saved', { 
                    timestamp: new Date(),
                    savedBy: { _id: socket.user._id, username: socket.user.username }
                });
            } catch (error) {
                console.error(`[DB Error] Failed to save code for room ${roomId}:`, error);
                socket.emit('error', { 
                    message: 'Failed to save changes',
                    roomId
                });
            } finally {
                debounceTimers.delete(roomId);
            }
        }, 1500);

        debounceTimers.set(roomId, timer);
    };

    // --- Cursor Position Handler ---
    const cursorChangeHandler = ({ roomId, cursorPosition, isTyping = false }) => {
        if (!roomId || !cursorPosition) return;

        // Initialize room cursor map if it doesn't exist
        if (!activeCursors.has(roomId)) {
            activeCursors.set(roomId, new Map());
        }
        
        const cursorData = {
            position: cursorPosition,
            user: { _id: socket.user._id, username: socket.user.username },
            isTyping,
            lastUpdated: Date.now()
        };
        
        // Update cursor data for this user
        activeCursors.get(roomId).set(socket.user._id, cursorData);

        // Broadcast to other users in the room
        socket.to(roomId).emit('cursor-changed', cursorData);
    };

    // --- Selection Change Handler ---
    const selectionChangeHandler = ({ roomId, selection }) => {
        if (!roomId) return;

        socket.to(roomId).emit('selection-changed', {
            user: { _id: socket.user._id, username: socket.user.username },
            selection: selection || null
        });
    };

    // --- Typing Indicators ---
   const startTypingHandler = ({ roomId, username }) => {
    // Update cursor typing state
    if (!activeCursors.has(roomId)) {
        activeCursors.set(roomId, new Map());
    }
    
    const cursorData = {
        position: null, // or maintain last known position
        user: { _id: socket.user._id, username: username || socket.user.username },
        isTyping: true,
        lastUpdated: Date.now()
    };
    
    activeCursors.get(roomId).set(socket.user._id, cursorData);
    
    // Broadcast to room
    socket.to(roomId).emit('user-typing-start', { 
        userId: socket.user._id,
        username: username || socket.user.username
    });
};

const stopTypingHandler = ({ roomId, username }) => {
    if (activeCursors.has(roomId)) {
        const cursorData = activeCursors.get(roomId).get(socket.user._id);
        if (cursorData) {
            cursorData.isTyping = false;
            cursorData.lastUpdated = Date.now();
        }
    }
    
    socket.to(roomId).emit('user-typing-stop', { 
        userId: socket.user._id,
        username: username || socket.user.username
    });
};
const joinRoomHandler = ({ roomId }) => {
    // Notify room about new user (except the joiner)
    socket.to(roomId).emit('user-joined', {
        userId: socket.user._id,
        username: socket.user.username,
        timestamp: new Date()
    });
    
    // Send current participants to the new user
    if (activeCursors.has(roomId)) {
        const participants = Array.from(activeCursors.get(roomId).values())
            .map(c => c.user)
            .filter(u => u._id !== socket.user._id);
        
        socket.emit('current-participants', participants);
    }
};

const leaveRoomHandler = ({ roomId }) => {
    socket.to(roomId).emit('user-left', {
        userId: socket.user._id,
        username: socket.user.username,
        timestamp: new Date()
    });
    
    // Clean up cursors
    if (activeCursors.has(roomId)) {
        activeCursors.get(roomId).delete(socket.user._id);
    }
};


    // --- Cleanup Handler ---
    const cleanupHandler = () => {
        activeCursors.forEach((roomCursors, roomId) => {
            if (roomCursors.has(socket.user._id)) {
                roomCursors.delete(socket.user._id);
                io.to(roomId).emit('cursor-removed', {
                    userId: socket.user._id
                });
            }
        });
    };

    // --- Request Cursors Handler ---
    socket.on('request-cursors', ({ roomId }) => {
        if (activeCursors.has(roomId)) {
            const cursors = Array.from(activeCursors.get(roomId).values())
                .filter(cursor => cursor.user._id !== socket.user._id);
            
            socket.emit('existing-cursors', {
                roomId,
                cursors
            });
        }
    });

    // Register event listeners
    socket.on('code-change', codeChangeHandler);
    socket.on('cursor-change', cursorChangeHandler);
    socket.on('selection-change', selectionChangeHandler);
    socket.on('user-typing-start', startTypingHandler);  // Changed from 'start-typing'
    socket.on('user-typing-stop', stopTypingHandler);
    socket.on('join-room', joinRoomHandler);
    socket.on('leave-room', leaveRoomHandler);
    socket.on('disconnect', cleanupHandler);

    // Clean up inactive cursors every 30 seconds
    setInterval(() => {
        const now = Date.now();
        activeCursors.forEach((roomCursors, roomId) => {
            roomCursors.forEach((cursorData, userId) => {
                if (now - cursorData.lastUpdated > 30000) {
                    roomCursors.delete(userId);
                    io.to(roomId).emit('cursor-removed', { userId });
                }
            });
        });
    }, 30000);
};