// src/app.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // Make sure dotenv is configured early

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// --- THIS IS THE SECTION TO FIX ---
// Make sure these imports have the .js extension
import authRouter from './api/auth.routes.js';
import roomRouter from './api/room.routes.js';

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