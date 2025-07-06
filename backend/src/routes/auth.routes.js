// src/api/auth.routes.js
import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/auth.controller.js';
import passport from 'passport';

const router = Router();
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        // User is authenticated by passport, available as req.user
        const accessToken = req.user.generateAccessToken();
        // Redirect back to the frontend with the token
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
    }
);
export default router;