// src/controllers/room.controller.js
import { v4 as uuidV4 } from 'uuid';
import archiver from 'archiver';
import { Room } from '../models/room.model.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * @description Creates a new collaborative room
 */
const createRoom = asyncHandler(async (req, res) => {
    // This controller is fine as it uses Room.create(), which triggers schema validation.
    const { name, language } = req.body;
    const roomId = uuidV4();
    const owner = req.user._id;

    const newRoom = await Room.create({
        name: name || `Room-${roomId.split('-')[0]}`,
        roomId,
        owner,
        participants: [{ user: owner, role: 'editor' }], // pre-save hook will ensure this is valid
        'settings.language': language || 'javascript'
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newRoom, "Room created successfully"));
});

/**
 * @description Gets details of a specific room. If the user is not a participant,
 *              it adds them to the room automatically using the model's method.
 */
const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    let room = await Room.findOne({ roomId });

    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    const isParticipant = room.participants.some(p => p.user.equals(req.user._id));

    if (!isParticipant) {
        // --- REFACTORED: Use the custom model method ---
        // This is safer as it uses the logic defined in your schema.
        try {
            await room.addParticipant(req.user._id, 'editor'); // Let's make new joiners editors
            console.log(`User ${req.user.username} was automatically added to room ${roomId}`);
        } catch (error) {
            // This will catch errors like "User already in room" if there's a race condition.
            console.error("Error adding participant:", error.message);
            // We can ignore the error and proceed, as the user might have been added in another request.
        }
    }

    // Now, populate the details and return.
    const populatedRoom = await Room.findOne({ roomId }).populate({
        path: 'participants.user',
        select: 'username email avatar role' // Added avatar and role
    }).populate('owner', 'username email avatar');

    return res
        .status(200)
        .json(new ApiResponse(200, populatedRoom, "Room details fetched successfully"));
});

/**
 * @description Gets all rooms for the logged-in user
 */
const getMyRooms = asyncHandler(async (req, res) => {
    // This controller is fine, no changes needed.
    const rooms = await Room.find({ "participants.user": req.user._id })
        .populate('owner', 'username')
        .sort({ updatedAt: -1 }); // Sort by most recently active

    return res
        .status(200)
        .json(new ApiResponse(200, rooms, "User's rooms fetched successfully"));
});

/**
 * @description Adds a user to a room by the owner.
 */
const addUserToRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { email, role } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.owner.equals(req.user._id)) {
        throw new ApiError(403, "Forbidden. Only the room owner can add users.");
    }
    
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) throw new ApiError(404, "User with this email not found");

    // --- REFACTORED: Use the custom model method ---
    try {
        await room.addParticipant(userToAdd._id, role || 'viewer');
    } catch (error) {
        // The model method throws an error if the user is already in the room.
        throw new ApiError(409, error.message);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User added to the room successfully"));
});

/**
 * @description Removes a user from a room by the owner.
 */
const removeUserFromRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { userIdToRemove } = req.body;

    if (!userIdToRemove) throw new ApiError(400, "User ID to remove is required.");

    const room = await Room.findOne({ roomId });
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.owner.equals(req.user._id)) {
        throw new ApiError(403, "Forbidden. Only the room owner can remove users.");
    }

    // --- REFACTORED: Use the custom model method ---
    try {
        await room.removeParticipant(userIdToRemove);
    } catch (error) {
        // The model method throws an error if trying to remove the owner.
        throw new ApiError(400, error.message);
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User removed from the room successfully"));
});

/**
 * @description Updates the role of a participant in a room.
 */
const updateRole = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { userIdToUpdate, newRole } = req.body;

    if (!userIdToUpdate || !newRole) {
        throw new ApiError(400, "User ID and new role are required.");
    }

    const room = await Room.findOne({ roomId });
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.owner.equals(req.user._id)) {
        throw new ApiError(403, "Forbidden. Only the room owner can change roles.");
    }
    
    // --- REFACTORED: Use the custom model method ---
    try {
        await room.updateParticipantRole(userIdToUpdate, newRole);
    } catch (error) {
        throw new ApiError(400, error.message);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Participant role updated successfully."));
});


/**
 * @description Exports the room's code as a ZIP file.
 */
const exportRoomAsZip = asyncHandler(async (req, res) => {
    // This controller is fine, no refactoring needed as it's not modifying the room doc.
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) throw new ApiError(404, "Room not found");

    const isParticipant = room.participants.some(p => p.user.equals(req.user._id));
    if (!isParticipant) throw new ApiError(403, "Forbidden. You are not a member of this room.");

    const archive = archiver('zip', { zlib: { level: 9 } });
    const language = room.settings?.language || 'javascript';
    const extensionMap = {
        'javascript': 'js', 'python': 'py', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'html': 'html', 'css': 'css', 'typescript': 'ts'
    };
    const fileExtension = extensionMap[language] || 'txt';


    res.attachment(`${room.name.replace(/\s+/g, '_') || 'code'}.zip`);
    archive.pipe(res);
    archive.append(room.codeContent, { name: `main.${fileExtension}` });
    await archive.finalize();
});

export {
    createRoom,
    getRoomDetails,
    getMyRooms,
    addUserToRoom,
    removeUserFromRoom,
    updateRole, // Don't forget to export the new controller
    exportRoomAsZip,
};