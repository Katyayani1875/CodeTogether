// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const HomePage = () => {
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleCreateRoom = async () => {
        try {
            const response = await api.post('/api/v1/rooms', { name: `${user.username}'s Room` });
            const { roomId } = response.data.data;
            navigate(`/room/${roomId}`);
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room.');
        }
    };

    const handleJoinRoom = () => {
        if (roomIdToJoin.trim()) {
            navigate(`/room/${roomIdToJoin}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="absolute top-4 right-4 flex items-center gap-4">
                <span className="text-lg">Welcome, {user?.username}!</span>
                <button onClick={logout} className="px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">Logout</button>
            </div>
            <div className="text-center">
                <h1 className="text-5xl font-extrabold mb-8">LiveCodeHub</h1>
                <div className="space-y-4">
                    <button onClick={handleCreateRoom} className="w-full max-w-xs px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                        Create a New Room
                    </button>
                    <div className="flex flex-col items-center space-y-2">
                        <input
                            type="text"
                            value={roomIdToJoin}
                            onChange={(e) => setRoomIdToJoin(e.target.value)}
                            placeholder="Enter Room ID to Join"
                            className="w-full max-w-xs px-4 py-3 text-center text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={handleJoinRoom} className="w-full max-w-xs px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;