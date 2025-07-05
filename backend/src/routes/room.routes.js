// src/api/room.routes.js
import { Router } from 'express';
import {
    createRoom,
    getRoomDetails,
    getMyRooms,
    addUserToRoom,
    removeUserFromRoom,
    exportRoomAsZip
} from '../controllers/room.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes in this file are protected and require a logged-in user
router.use(verifyJWT);

// Route to create a new room and get a list of the user's rooms
router.route('/')
    .post(createRoom)
    .get(getMyRooms);

// Routes for a specific room
router.route('/:roomId')
    .get(getRoomDetails);

// Route for user management in a room
router.route('/:roomId/participants')
    .post(addUserToRoom);

router.route('/:roomId/participants/remove')
    .post(removeUserFromRoom);

// Route for exporting code
router.route('/:roomId/export')
    .get(exportRoomAsZip);

export default router;