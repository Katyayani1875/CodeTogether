// src/server.js
import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { initializeSocketIO } from './sockets/socket.js';

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
const io = initializeSocketIO(server);

connectDB()
.then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port: ${PORT}`);
    });
})
.catch((err) => {
    console.error("MONGO db connection failed !!! ", err);
    process.exit(1);
});