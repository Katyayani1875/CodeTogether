// src/models/room.model.js
import mongoose, { Schema } from 'mongoose';

const participantSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        // index: true  // Added index for faster queries
    },
    role: {
        type: String,
        enum: ['editor', 'viewer'],
        default: 'viewer',
        validate: {
            validator: function(v) {
                // Owner should always be an editor
                return !(this.user.equals(this.parent().owner) && v !== 'editor');
            },
            message: 'Room owner must be an editor'
        }
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const roomSchema = new Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function(v) {
                return /^[a-zA-Z0-9-_]{6,}$/.test(v);
            },
            message: 'Room ID must be at least 6 characters and contain only letters, numbers, hyphens, and underscores'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
        default: 'Untitled Room'
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true  // Owner cannot be changed after creation
    },
    participants: {
        type: [participantSchema],
        validate: {
            validator: function(v) {
                // Ensure owner is always in participants
                return v.some(p => p.user.equals(this.owner));
            },
            message: 'Room owner must be a participant'
        }
    },
    codeContent: {
        type: String,
        default: `// Welcome to LiveCodeHub!\n// Start coding collaboratively.`,
        maxlength: 1000000  // ~1MB limit
    },
    lastModifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    settings: {
        isPublic: {
            type: Boolean,
            default: false
        },
        allowGuestEdits: {
            type: Boolean,
            default: false
        },
        language: {
            type: String,
            default: 'javascript',
            enum: ['javascript', 'python', 'java', 'c', 'cpp', 'html', 'css', 'typescript']
        }
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster participant lookups
roomSchema.index({ 'participants.user': 1 });

// Virtual for active participant count
roomSchema.virtual('activeParticipants').get(function() {
    return this.participants.filter(p => 
        p.lastActive > new Date(Date.now() - 300000) // 5 minutes threshold
    ).length;
});

// Pre-save hook to ensure owner is always an editor
roomSchema.pre('save', function(next) {
    const ownerParticipant = this.participants.find(p => p.user.equals(this.owner));
    if (ownerParticipant && ownerParticipant.role !== 'editor') {
        ownerParticipant.role = 'editor';
    }
    next();
});

// Method to add participant with role checking
roomSchema.methods.addParticipant = function(userId, role = 'viewer') {
    if (this.participants.some(p => p.user.equals(userId))) {
        throw new Error('User already in room');
    }
    this.participants.push({ user: userId, role });
    return this.save();
};

// Method to remove participant with owner protection
roomSchema.methods.removeParticipant = function(userId) {
    if (this.owner.equals(userId)) {
        throw new Error('Cannot remove room owner');
    }
    this.participants = this.participants.filter(p => !p.user.equals(userId));
    return this.save();
};

// Method to update participant role
roomSchema.methods.updateParticipantRole = function(userId, newRole) {
    if (this.owner.equals(userId) && newRole !== 'editor') {
        throw new Error('Owner must remain an editor');
    }
    const participant = this.participants.find(p => p.user.equals(userId));
    if (!participant) throw new Error('Participant not found');
    participant.role = newRole;
    return this.save();
};

// Static method for room cleanup
roomSchema.statics.cleanupEmptyRooms = async function() {
    const cutoff = new Date(Date.now() - 86400000); // 24 hours
    return this.deleteMany({
        updatedAt: { $lt: cutoff },
        $or: [
            { participants: { $size: 0 } },
            { participants: { $exists: false } }
        ]
    });
};

export const Room = mongoose.model('Room', roomSchema);
// // src/models/room.model.js
// import mongoose, { Schema } from 'mongoose';

// const participantSchema = new Schema({
//     user: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//     },
//     role: {
//         type: String,
//         enum: ['editor', 'viewer'], // 'edit' and 'read-only' roles
//         default: 'viewer',
//     }
// }, { _id: false });

// const roomSchema = new Schema({
//     roomId: {
//         type: String,
//         required: true,
//         unique: true,
//         index: true,
//     },
//     name: {
//         type: String,
//         required: true,
//         trim: true,
//         default: 'Untitled Room'
//     },
//     owner: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//     },
//     participants: [participantSchema],
//     // For Phase 1 & 2, we use a single code content field.
//     // In Phase 3, this would be replaced by a reference to a file structure model.
//     codeContent: {
//         type: String,
//         default: `// Welcome to LiveCodeHub!\n// Start coding collaboratively.`
//     },
//     lastModifiedBy: {
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     }
// }, { timestamps: true });

// export const Room = mongoose.model('Room', roomSchema);