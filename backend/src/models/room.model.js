// src/models/room.model.js
import mongoose, { Schema } from 'mongoose';

const participantSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['editor', 'viewer'], // 'edit' and 'read-only' roles
        default: 'viewer',
    }
}, { _id: false });

const roomSchema = new Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Room'
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: [participantSchema],
    // For Phase 1 & 2, we use a single code content field.
    // In Phase 3, this would be replaced by a reference to a file structure model.
    codeContent: {
        type: String,
        default: `// Welcome to LiveCodeHub!\n// Start coding collaboratively.`
    },
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);