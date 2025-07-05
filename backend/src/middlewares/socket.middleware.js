// src/middlewares/socket.middleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const verifySocketJWT = async (socket, next) => {
    // The token is sent from the frontend in the 'auth' object upon connection
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password");

        if (!user) {
            return next(new Error('Authentication error: Invalid user.'));
        }

        // Attach the user to the socket object for use in all event handlers
        socket.user = user;
        next();
    } catch (error) {
        return next(new Error('Authentication error: Token is not valid.'));
    }
};