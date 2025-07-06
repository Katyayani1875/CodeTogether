// src/app.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // Make sure dotenv is configured early
import passport from 'passport';
import './config/passport.js'; 
const app = express();

app.use(cors({
    // origin: process.env.CORS_ORIGIN,
    origin: '*', // For development, you can use '*' but restrict in production
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(passport.initialize());
// --- THIS IS THE SECTION TO FIX ---
// Make sure these imports have the .js extension
import authRouter from './routes/auth.routes.js';
import roomRouter from './routes/room.routes.js';

// Routes declaration
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/rooms", roomRouter);

// A simple health-check route
app.get('/', (req, res) => {
    res.send('LiveCodeHub Backend is running correctly!');
});

// A central error handling middleware could be added here later
// For now, asyncHandler will pass errors to Express's default handler

export { app };