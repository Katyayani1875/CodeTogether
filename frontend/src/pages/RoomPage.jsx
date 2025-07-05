// src/pages/RoomPage.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '../components/Editor';
import { socket } from '../sockets/socket';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

// --- HELPER FUNCTION for generating consistent user colors ---
const generateColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
};

const RoomPage = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [participants, setParticipants] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [code, setCode] = useState('// Welcome! Initializing your collaborative space...');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const typingTimeoutRef = useRef(null);

    const userColors = useMemo(() => {
        const colors = {};
        participants.forEach(p => {
            if (!colors[p._id]) {
                colors[p._id] = generateColor(p.username);
            }
        });
        return colors;
    }, [participants]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const initRoom = async () => {
            try {
                const { data } = await api.get(`/api/v1/rooms/${roomId}`);
                setCode(data.data.codeContent);

                // --- SOCKET CONNECTION AND EVENT LISTENERS ---
                socket.connect();

                socket.on('connect', () => {
                    toast.success('Connected in real-time!', { id: 'connection-status' });
                    socket.emit('join-room', { roomId });
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket connection error:', err.message);
                    toast.error('Connection failed. Please check your network.', { id: 'connection-status' });
                    navigate('/');
                });

                socket.on('update-participants', (updatedParticipants) => {
                    setParticipants(updatedParticipants);
                });

                socket.on('code-changed', ({ newCode }) => {
                    setCode(newCode);
                });

                socket.on('user-typing-start', ({ userId, username }) => {
                    if (userId !== user._id) {
                        setTypingUsers(prev => [...new Set([...prev, username])]);
                    }
                });

                socket.on('user-typing-stop', ({ userId }) => {
                    const typingUser = participants.find(p => p._id === userId);
                    if (typingUser) {
                        setTypingUsers(prev => prev.filter(u => u !== typingUser.username));
                    }
                });

            } catch (err) {
                console.error('Room initialization failed:', err);
                const errorMessage = err.response?.data?.message || 'Failed to join the room.';
                setError(errorMessage);
                toast.error(errorMessage);
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };

        initRoom();

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('update-participants');
            socket.off('code-changed');
            socket.off('user-typing-start');
            socket.off('user-typing-stop');
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, [roomId, user, navigate]);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        socket.emit('code-change', { roomId, newCode });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('start-typing', { roomId });
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop-typing', { roomId });
        }, 1500);
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        toast.success('Room ID copied!', { icon: '📋' });
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <h2 className="text-2xl text-red-500">{error}</h2>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            <motion.div
                animate={{ width: sidebarCollapsed ? 0 : '18rem' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="bg-gray-800 flex flex-col border-r border-gray-700/50 flex-shrink-0"
            >
                <div className="p-4 flex flex-col h-full overflow-hidden">
                    <div className="border-b border-gray-700 pb-4 mb-4">
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">CodeTogether</h1>
                    </div>

                    <div className="space-y-3 mb-4">
                        <button onClick={copyRoomId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">Copy Room ID</button>
                        <button onClick={() => navigate('/')} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">Leave Room</button>
                    </div>

                    <h3 className="font-semibold text-gray-300 mb-2">Participants ({participants.length})</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <AnimatePresence>
                            {participants.map((p) => (
                                <motion.div
                                    key={p._id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex items-center gap-3 p-2 rounded-md mb-2"
                                >
                                    <div className="relative">
                                        <div style={{ backgroundColor: userColors[p._id] }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                                            {p.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${typingUsers.includes(p.username) ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{p.username}{p._id === user._id ? ' (You)' : ''}</p>
                                        <p className="text-xs text-gray-400 capitalize">{p.role}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-hidden relative">
                    <Editor value={code} onChange={handleCodeChange} />
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="absolute top-4 -left-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-all"
                        data-tooltip-id="sidebar-toggle"
                        data-tooltip-content={sidebarCollapsed ? "Expand" : "Collapse"}
                    >
                       {/* Icon can be added here */}
                    </button>
                    <Tooltip id="sidebar-toggle" place="right" />
                </div>
                <div className="bg-gray-800/50 border-t border-gray-700/50 px-4 py-1 text-xs text-gray-400 flex items-center justify-between">
                    <div>
                        {typingUsers.length > 0
                            ? `${typingUsers.join(', ')} is typing...`
                            : `Participants: ${participants.length}`
                        }
                    </div>
                    <div>{socket.connected ? 'Status: Connected' : 'Status: Disconnected'}</div>
                </div>
            </div>
        </div>
    );
};

export default RoomPage;