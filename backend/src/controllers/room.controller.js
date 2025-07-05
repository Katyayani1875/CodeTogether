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
 * @param {object} req - Express request object. User is attached from verifyJWT.
 * @param {object} res - Express response object
 * @returns {json} A new room object
 */
const createRoom = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const roomId = uuidV4();
    const owner = req.user._id;

    // The creator is the owner and is automatically an editor.
    const newRoom = await Room.create({
        name: name || `Room-${roomId.split('-')[0]}`,
        roomId,
        owner,
        participants: [{ user: owner, role: 'editor' }]
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newRoom, "Room created successfully"));
});

/**
 * @description Gets details of a specific room if the user is a participant
 * @param {object} req - Express request object. Contains roomId in params.
 * @param {object} res - Express response object
 * @returns {json} The room object with populated participant details
 */
const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate({
        path: 'participants.user',
        select: 'username email' // Select fields to return for participants
    }).populate('owner', 'username email');

    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    // Check if the requesting user is a participant of the room
    const isParticipant = room.participants.some(p => p.user._id.equals(req.user._id));

    if (!isParticipant) {
        throw new ApiError(403, "Forbidden. You are not a member of this room.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, room, "Room details fetched successfully"));
});

/**
 * @description Gets all rooms for the logged-in user
 * @param {object} req - Express request object. User is attached.
 * @param {object} res - Express response object
 * @returns {json} An array of rooms the user is a part of
 */
const getMyRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({ "participants.user": req.user._id })
        .populate('owner', 'username')
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, rooms, "User's rooms fetched successfully"));
});

/**
 * @description Adds a user to a room. Only the room owner can perform this action.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {json} Success message
 */
const addUserToRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { email, role } = req.body;

    const room = await Room.findOne({ roomId });

    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    // Authorization: Only the owner can add users
    if (!room.owner.equals(req.user._id)) {
        throw new ApiError(403, "Forbidden. Only the room owner can add users.");
    }
    
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
        throw new ApiError(404, "User with this email not found");
    }

    // Check if user is already a participant
    const isAlreadyParticipant = room.participants.some(p => p.user.equals(userToAdd._id));
    if (isAlreadyParticipant) {
        throw new ApiError(409, "User is already in this room.");
    }

    room.participants.push({ user: userToAdd._id, role: role || 'viewer' });
    await room.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User added to the room successfully"));
});

/**
 * @description Removes a user from a room. Only the room owner can perform this.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {json} Success message
 */
const removeUserFromRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { userIdToRemove } = req.body;

    if (!userIdToRemove) {
        throw new ApiError(400, "User ID to remove is required.");
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    // Authorization: Only the owner can remove users
    if (!room.owner.equals(req.user._id)) {
        throw new ApiError(403, "Forbidden. Only the room owner can remove users.");
    }

    // The owner cannot remove themselves
    if (room.owner.equals(userIdToRemove)) {
        throw new ApiError(400, "The room owner cannot be removed.");
    }

    // Pull the user from the participants array
    room.participants = room.participants.filter(p => !p.user.equals(userIdToRemove));
    await room.save();
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User removed from the room successfully"));
});


/**
 * @description Exports the room's code as a ZIP file.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {file} A zip file containing the code
 */
const exportRoomAsZip = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    // Authorization: Only participants can export
    const isParticipant = room.participants.some(p => p.user.equals(req.user._id));
    if (!isParticipant) {
        throw new ApiError(403, "Forbidden. You are not a member of this room.");
    }

    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`${room.name.replace(/\s+/g, '_') || 'code'}.zip`);
    archive.pipe(res);

    // In a future multi-file system, you would loop through files here.
    // For now, we add the single `codeContent` field.
    archive.append(room.codeContent, { name: 'code.js' }); // Assuming JS, can be dynamic later

    await archive.finalize();
});

export {
    createRoom,
    getRoomDetails,
    getMyRooms,
    addUserToRoom,
    removeUserFromRoom,
    exportRoomAsZip,
};