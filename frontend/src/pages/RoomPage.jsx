// src/pages/RoomPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '../components/Editor';
import { socket } from '../sockets/socket';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const RoomPage = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [code, setCode] = useState('// Loading...');
    const codeRef = useRef(code);

    useEffect(() => {
        // This function fetches the initial state of the room
        const init = async () => {
            try {
                // Get the room's current code from the database
                const response = await api.get(`/api/v1/rooms/${roomId}`);
                const initialCode = response.data.data.codeContent;
                setCode(initialCode);
                codeRef.current = initialCode;

                // Establish socket connection
                socket.connect();

                // Listen for connection errors
                socket.on('connect_error', (err) => handleErrors(err));
                socket.on('connect_failed', (err) => handleErrors(err));

                function handleErrors(err) {
                    console.error('Socket connection error:', err);
                    alert('Could not connect to the collaboration server.');
                    navigate('/');
                }

                // Emit 'join-room' to the server
                socket.emit('join-room', { roomId, user });

                // Listener for when a new user joins
                socket.on('user-joined', ({ user, userId, clients: updatedClients }) => {
                    console.log(`${user.username} joined!`);
                    // Here you might show a toast notification
                    setClients(updatedClients); // Assuming the backend sends the full list
                });
                
                // Listener for code changes from others
                socket.on('code-changed', ({ newCode }) => {
                    if (newCode !== codeRef.current) {
                        setCode(newCode);
                        codeRef.current = newCode;
                    }
                });

                // Listener for when a user leaves
                socket.on('user-left', ({ userId, clients: updatedClients }) => {
                     // Here you might show a toast notification
                    setClients(updatedClients);
                });

            } catch (error) {
                console.error("Failed to join room:", error);
                alert('Room not found or you do not have access.');
                navigate('/');
            }
        };

        init();

        // Cleanup function: This is CRITICAL for preventing memory leaks.
        return () => {
            socket.off('connect_error');
            socket.off('connect_failed');
            socket.off('user-joined');
            socket.off('code-changed');
            socket.off('user-left');
            socket.disconnect();
        };
    }, [roomId, user, navigate]);


    const onCodeChange = (newCode) => {
        setCode(newCode);
        codeRef.current = newCode;
        socket.emit('code-change', { roomId, newCode });
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        alert('Room ID copied to clipboard!');
    };

    return (
        <div className="flex h-screen">
            <div className="w-64 bg-gray-800 p-4 flex flex-col">
                <h2 className="text-xl font-bold mb-4">LiveCodeHub</h2>
                <div className="mb-4">
                    <button onClick={copyRoomId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2">
                        Copy Room ID
                    </button>
                    <button onClick={() => navigate('/')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        Leave Room
                    </button>
                </div>
                <h3 className="text-lg font-semibold mb-2">Connected Users</h3>
                <div className="flex-grow">
                    {/* Placeholder for user list. We will make this dynamic in the next phase */}
                    <p className="text-gray-400">{user?.username} (You)</p>
                </div>
            </div>
            <div className="flex-grow">
                <Editor value={code} onChange={onCodeChange} />
            </div>
        </div>
    );
};

export default RoomPage;