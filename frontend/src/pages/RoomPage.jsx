import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import useSound from 'use-sound';
import joinSound from '/sounds/join.mp3';
import leaveSound from '/sounds/leave.mp3';
import { 
  FiMessageSquare, 
  FiCode, 
  FiCopy, 
  FiLogOut, 
  FiChevronLeft, 
  FiChevronRight,
  FiUsers,
  FiClock,
  FiType
} from 'react-icons/fi';

import Editor from '../components/Editor';
import { socket } from '../sockets/socket';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const generateColor = (str) => {
    if (!str) return '#3b82f6';
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

    // State
    const [participants, setParticipants] = useState([]);
    const [editorTypingUsers, setEditorTypingUsers] = useState([]);
    const [chatTypingUsers, setChatTypingUsers] = useState([]);
    const [code, setCode] = useState('// Loading collaborative space...');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('editor');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

     const [playJoinSound] = useSound(joinSound, { volume: 0.25 });
  const [playLeaveSound] = useSound(leaveSound, { volume: 0.25 });

  // Inside your socket effect, modify the handlers:
  useEffect(() => {
    // ... other socket setup code ...

    const onUserJoined = ({ username, userId }) => {
      playJoinSound(); // Play sound when user joins
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'join',
        username,
        userId,
        timestamp: new Date()
      }]);
      toast(`${username} joined the room`, {
        icon: '👋',
        position: 'top-right'
      });
    };

    const onUserLeft = ({ username, userId }) => {
      playLeaveSound(); // Play sound when user leaves
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'leave',
        username,
        userId,
        timestamp: new Date()
      }]);
      toast(`${username} left the room`, {
        icon: '🚪',
        position: 'top-right'
      });
    };

    // Socket event listeners
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);

    return () => {
      // Cleanup
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
    };
  }, [playJoinSound, playLeaveSound]);
    // Refs
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const remoteDecorationsRef = useRef(new Map());
    const chatContainerRef = useRef(null);
    const editorTypingTimeoutRef = useRef(null);
    const chatTypingTimeoutRef = useRef(null);
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Memos
    const userColors = useMemo(() => {
        const colors = {};
        participants.forEach(p => {
            if (p?._id) colors[p._id] = generateColor(p._id);
        });
        return colors;
    }, [participants]);

    const updateRemoteDecorations = useCallback((type, remoteUser, range) => {
        if (!editorRef.current || !monacoRef.current || !remoteUser || !remoteUser._id) return;

        const decorationKey = `${type}-${remoteUser._id}`;
        const userColor = generateColor(remoteUser._id);

        // Clean up any old decoration and its associated style tag
        if (remoteDecorationsRef.current.has(decorationKey)) {
            const oldDecoration = remoteDecorationsRef.current.get(decorationKey);
            editorRef.current.deltaDecorations([oldDecoration.id], []);
            if (oldDecoration.styleElement && document.head.contains(oldDecoration.styleElement)) {
                document.head.removeChild(oldDecoration.styleElement);
            }
            remoteDecorationsRef.current.delete(decorationKey);
        }

        const isRangeEmpty = !range || (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn);
        if (isRangeEmpty && type !== 'cursor') {
            return;
        }

        const newDecoration = {
            range: new monacoRef.current.Range(
                range.startLineNumber, range.startColumn,
                range.endLineNumber, range.endColumn
            ),
            options: {}
        };

        const styleElement = document.createElement('style');

        if (type === 'cursor') {
            const uniqueCursorClassName = `remote-cursor-${remoteUser._id}`;
            newDecoration.options.className = uniqueCursorClassName;
            newDecoration.options.inlineClassName = 'this-class-is-for-rendering-only'; 

            styleElement.innerHTML = `
                .${uniqueCursorClassName} {
                    border-left: 2px solid ${userColor};
                }
                .${uniqueCursorClassName}::after {
                    content: '${remoteUser.username.replace(/'/g, "\\'")}';
                    position: absolute;
                    background-color: ${userColor};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: sans-serif;
                    white-space: nowrap;
                    transform: translateY(-100%);
                    margin-left: 2px;
                    z-index: 99;
                }
            `;
        } else { // type === 'selection'
            const uniqueSelectionClassName = `remote-selection-${remoteUser._id}`;
            newDecoration.options.className = uniqueSelectionClassName;
            styleElement.innerHTML = `
                .${uniqueSelectionClassName} {
                    background-color: ${userColor}33;
                }
            `;
        }

        document.head.appendChild(styleElement);
        const decorations = editorRef.current.deltaDecorations([], [newDecoration]);
        
        remoteDecorationsRef.current.set(decorationKey, {
            id: decorations[0],
            styleElement: styleElement
        });
    }, []);

    // Effects
    useEffect(() => {
        if (!user?._id) {
            navigate('/login');
            return;
        }

        // Fetch initial room data
        const fetchRoomData = async () => {
            try {
                const { data } = await api.get(`/api/v1/rooms/${roomId}`);
                setCode(data.data?.codeContent || '// Start coding!');
                setIsLoading(false);
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to join the room.';
                setError(errorMessage);
                toast.error(errorMessage);
                setIsLoading(false);
                navigate('/');
            }
        };

        // Socket event handlers
        const onConnect = () => {
            socket.emit('join-room', { roomId });
            toast.success('Connected to room!', { id: 'conn-status' });
        };
        
        const onDisconnect = () => toast.error('Disconnected from server.', { id: 'conn-status' });
        
        const onUpdateParticipants = (updatedParticipants) => {
            const validParticipants = (updatedParticipants || [])
                .filter(p => p?._id)
                .reduce((acc, current) => {
                    const x = acc.find(item => item._id === current._id);
                    if (!x) return acc.concat([current]);
                    return acc;
                }, []);
            setParticipants(validParticipants);
        };
        
        const onCodeChanged = ({ newCode, changedBy }) => {
            if (changedBy?._id !== user._id) setCode(newCode);
        };
        
        const onNewMessage = (message) => {
            if (message.user && message.text) {
                const messageWithId = { 
                    ...message, 
                    id: Date.now() + Math.random(),
                    timestamp: message.timestamp || Date.now()
                };
                setMessages(prev => [...prev, messageWithId]);
                
                if (activeTabRef.current !== 'chat' && message.user._id !== user._id) {
                    setUnreadMessages(prev => prev + 1);
                }
            }
        };
        
        const onEditorTypingStart = ({ username }) => {
            if (username !== user.username) {
                setEditorTypingUsers(prev => [...new Set([...prev, username])]);
            }
        };
        
        const onEditorTypingStop = ({ username }) => {
            setEditorTypingUsers(prev => prev.filter(u => u !== username));
        };
        
        const onChatTypingStart = ({ username }) => {
            if (username !== user.username) {
                setChatTypingUsers(prev => [...new Set([...prev, username])]);
            }
        };
        
        const onChatTypingStop = ({ username }) => {
            setChatTypingUsers(prev => prev.filter(u => u !== username));
        };

        const onCursorChanged = ({ user: remoteUser, cursorPosition }) => {
            if (remoteUser?._id !== user._id) {
                updateRemoteDecorations('cursor', remoteUser, cursorPosition);
            }
        };

        const onSelectionChanged = ({ user: remoteUser, selection }) => {
            if (remoteUser?._id !== user._id) {
                updateRemoteDecorations('selection', remoteUser, selection);
            }
        };
        
        const onCursorRemoved = ({ userId }) => {
            updateRemoteDecorations('cursor', { _id: userId }, null);
            updateRemoteDecorations('selection', { _id: userId }, null);
        };

        const onExistingCursors = ({ cursors }) => {
            cursors.forEach(({ user, position }) => {
                updateRemoteDecorations('cursor', user, position);
            });
        };

        // Initialize room and socket
        fetchRoomData();

        // Socket setup
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('update-participants', onUpdateParticipants);
        socket.on('code-changed', onCodeChanged);
        socket.on('new-message', onNewMessage);
        socket.on('user-typing-start', onEditorTypingStart);
        socket.on('user-typing-stop', onEditorTypingStop);
        socket.on('chat-typing-start', onChatTypingStart);
        socket.on('chat-typing-stop', onChatTypingStop);
        socket.on('cursor-changed', onCursorChanged);
        socket.on('selection-changed', onSelectionChanged);
        socket.on('cursor-removed', onCursorRemoved);
        socket.on('existing-cursors', onExistingCursors);
        socket.connect();

        // Request existing cursors
        socket.emit('request-cursors', { roomId });

        // Cleanup
        return () => {
            // Clean up all remote decorations
            remoteDecorationsRef.current.forEach(decoration => {
                if (decoration.styleElement && document.head.contains(decoration.styleElement)) {
                    document.head.removeChild(decoration.styleElement);
                }
            });
            remoteDecorationsRef.current.clear();

            // Remove socket listeners
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('update-participants', onUpdateParticipants);
            socket.off('code-changed', onCodeChanged);
            socket.off('new-message', onNewMessage);
            socket.off('user-typing-start', onEditorTypingStart);
            socket.off('user-typing-stop', onEditorTypingStop);
            socket.off('chat-typing-start', onChatTypingStart);
            socket.off('chat-typing-stop', onChatTypingStop);
            socket.off('cursor-changed', onCursorChanged);
            socket.off('selection-changed', onSelectionChanged);
            socket.off('cursor-removed', onCursorRemoved);
            socket.off('existing-cursors', onExistingCursors);
            
            if (socket.connected) {
                socket.emit('leave-room', { roomId });
                socket.emit('cursor-remove', {
                    roomId,
                    userId: user._id
                });
                socket.disconnect();
            }
        };
    }, [roomId, user, navigate, updateRemoteDecorations]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, chatTypingUsers]);

    useEffect(() => {
        if (activeTab === 'chat') {
            setUnreadMessages(0);
        }
    }, [activeTab]);

    // Handlers
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        editor.onDidChangeCursorPosition((e) => {
            if (e?.position && socket.connected) {
                socket.emit('cursor-change', { 
                    roomId, 
                    cursorPosition: e.position,
                    user: {
                        _id: user._id,
                        username: user.username
                    }
                });
            }
        });

        editor.onDidChangeCursorSelection((e) => {
            if (socket.connected) {
                if (e?.selection && !e.selection.isEmpty()) {
                    socket.emit('selection-change', { 
                        roomId,
                        selection: e.selection,
                        user: {
                            _id: user._id,
                            username: user.username
                        }
                    });
                } else {
                    // Clear selection when empty
                    socket.emit('selection-change', {
                        roomId,
                        selection: null,
                        user: {
                            _id: user._id,
                            username: user.username
                        }
                    });
                }
            }
        });
    };

const handleCodeChange = (newCode) => {
    if (newCode !== undefined) {
        setCode(newCode);
        socket.emit('code-change', { 
            roomId, 
            newCode,
            changedBy: {
                _id: user._id,
                username: user.username
            }
        });

        // Typing indicator - ensure we're using the correct event name
        if (editorTypingTimeoutRef.current) {
            clearTimeout(editorTypingTimeoutRef.current);
        } else {
            socket.emit('user-typing-start', { 
                roomId,
                username: user.username  // Make sure this matches backend expectation
            });
        }

        editorTypingTimeoutRef.current = setTimeout(() => {
            socket.emit('user-typing-stop', { 
                roomId,
                username: user.username
            });
            editorTypingTimeoutRef.current = null;
        }, 1500);
    }
};
    const handleMessageChange = (e) => {
        const message = e.target.value;
        setNewMessage(message);
        
        if (message.trim()) {
            if (chatTypingTimeoutRef.current) clearTimeout(chatTypingTimeoutRef.current);
            
            socket.emit('chat-typing-start', { 
                roomId,
                username: user.username
            });
            
            chatTypingTimeoutRef.current = setTimeout(() => {
                socket.emit('chat-typing-stop', { 
                    roomId,
                    username: user.username
                });
            }, 2000);
        } else {
            socket.emit('chat-typing-stop', { 
                roomId,
                username: user.username
            });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket.connected) {
            socket.emit('send-message', { 
                roomId, 
                message: newMessage,
                user: {
                    _id: user._id,
                    username: user.username
                }
            });
            setNewMessage('');
            if (chatTypingTimeoutRef.current) clearTimeout(chatTypingTimeoutRef.current);
            socket.emit('chat-typing-stop', { 
                roomId,
                username: user.username
            });
        } else if (!socket.connected) {
            toast.error("You are currently disconnected. Please check your connection.");
        }
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        toast.success('Room ID copied to clipboard!', {
            icon: '📋',
            style: {
                borderRadius: '10px',
                background: '#1e293b',
                color: '#fff',
            },
        });
    };

    const leaveRoom = () => {
        if (socket.connected) {
            socket.emit('leave-room', { roomId });
            socket.emit('cursor-remove', {
                roomId,
                userId: user._id
            });
        }
        navigate('/');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-300 text-lg font-medium">Loading collaborative space...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center p-8 max-w-md bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Connection Error</h2>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg text-white font-medium transition-all duration-300 transform hover:scale-105"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
            {/* Sidebar */}
            <motion.div
                animate={{ width: sidebarCollapsed ? '0px' : '20rem' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`h-full bg-gray-800/80 backdrop-blur-sm flex-shrink-0 border-r border-gray-700/50 overflow-hidden flex flex-col ${sidebarCollapsed ? 'w-0' : 'w-80'}`}
            >
                <div className="p-5 border-b border-gray-700/50 min-w-[20rem]">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">CodeCollab</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300">
                                v1.0
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            <FiUsers className="text-gray-500" />
                            {participants.length} {participants.length === 1 ? 'member' : 'members'}
                        </p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            <FiClock className="text-gray-500" />
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-3 min-w-[20rem]">
                    <motion.button 
                        onClick={copyRoomId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <FiCopy className="text-lg" />
                        Copy Invite Link
                    </motion.button>
                    <motion.button 
                        onClick={leaveRoom}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-red-600/90 to-red-500/90 hover:from-red-500/90 hover:to-red-400/90 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <FiLogOut className="text-lg" />
                        Leave Room
                    </motion.button>
                </div>

                <div className="border-t border-gray-700/50 p-5 flex-1 flex flex-col overflow-hidden min-w-[20rem]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                            Active Members
                        </h3>
                        <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full">
                            {participants.length} online
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence>
                            {participants.map((participant) => (
                                <motion.div
                                    key={participant._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                                        participant?._id === user?._id 
                                            ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-700/30' 
                                            : 'hover:bg-gray-700/30'
                                    }`}
                                >
                                    <div className="relative">
                                        <div 
                                            style={{ backgroundColor: userColors[participant?._id] || '#3b82f6' }}
                                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                                        >
                                            {participant?.username?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                                            editorTypingUsers.includes(participant?.username) 
                                                ? 'bg-yellow-400 animate-pulse' 
                                                : socket.connected 
                                                    ? 'bg-green-500' 
                                                    : 'bg-gray-500'
                                        }`}></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="truncate font-medium text-gray-100">
                                                {participant?.username || 'Unknown'}
                                                {participant?._id === user?._id && (
                                                    <span className="ml-2 text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">You</span>
                                                )}
                                            </p>
                                            {editorTypingUsers.includes(participant?.username) && (
                                                <FiType className="text-yellow-400 animate-pulse text-sm" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 capitalize">{participant?.role || 'participant'}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative">
                {/* Sidebar Toggle */}
                <motion.button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute z-20 top-1/2 -translate-y-1/2 -ml-3 bg-gray-700/80 hover:bg-gray-600/80 backdrop-blur-sm p-2 rounded-full transition-all shadow-lg border border-gray-600/50"
                    data-tooltip-id="sidebar-toggle"
                    data-tooltip-content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {sidebarCollapsed ? (
                        <FiChevronRight className="text-gray-300" />
                    ) : (
                        <FiChevronLeft className="text-gray-300" />
                    )}
                </motion.button>
                <Tooltip id="sidebar-toggle" place="right" effect="solid" className="z-50" />

                {/* Tabs */}
                <div className="flex border-b border-gray-800/50 bg-gray-800/30 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-6 py-3.5 font-medium text-sm flex items-center gap-2 transition-all ${
                            activeTab === 'editor' 
                                ? 'text-blue-400 border-b-2 border-blue-400 bg-gradient-to-t from-blue-900/10 to-transparent' 
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/20'
                        }`}
                    >
                        <FiCode className="text-lg" />
                        Editor
                        {editorTypingUsers.length > 0 && activeTab !== 'editor' && (
                            <span className="ml-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                {editorTypingUsers.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-6 py-3.5 font-medium text-sm flex items-center gap-2 transition-all ${
                            activeTab === 'chat' 
                                ? 'text-blue-400 border-b-2 border-blue-400 bg-gradient-to-t from-blue-900/10 to-transparent' 
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/20'
                        }`}
                    >
                        <FiMessageSquare className="text-lg" />
                        Chat
                        {unreadMessages > 0 && (
                            <span className="ml-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'editor' ? (
                        <div className="relative h-full">
                            <Editor 
                                value={code} 
                                onChange={handleCodeChange}
                                onMount={handleEditorDidMount}
                            />
                            
                            {/* Editor Typing Indicator */}
                            {editorTypingUsers.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute bottom-20 right-5 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700 shadow-xl flex items-center gap-3 z-10"
                                >
                                    <div className="flex -space-x-2">
                                        {editorTypingUsers.slice(0, 3).map(username => {
                                            const participant = participants.find(p => p.username === username);
                                            return (
                                                <div 
                                                    key={username}
                                                    style={{ 
                                                        backgroundColor: participant ? userColors[participant._id] : '#3b82f6',
                                                        border: '2px solid rgba(30, 41, 59, 0.9)'
                                                    }}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md"
                                                >
                                                    {username.charAt(0).toUpperCase()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-sm text-gray-300 whitespace-nowrap">
                                            {editorTypingUsers.slice(0, 3).join(', ')}
                                            {editorTypingUsers.length > 3 ? ` +${editorTypingUsers.length - 3}` : ''}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col bg-gray-900/30">
                            {/* Messages */}
                            <div 
                                ref={chatContainerRef} 
                                className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
                            >
                                <AnimatePresence>
                                    {messages.map((msg) => {
                                        const messageUser = msg?.user || {};
                                        const username = messageUser.username || 'Unknown';
                                        const userId = messageUser._id || `unknown-${msg.id}`;
                                        const userColor = userColors[userId] || '#3b82f6';
                                        const isCurrentUser = userId === user?._id;
                                        
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                layout
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                                            >
                                                <div 
                                                    style={{ backgroundColor: userColor }} 
                                                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg shadow-md"
                                                >
                                                    {username.charAt(0).toUpperCase()}
                                                </div>
                                                <motion.div 
                                                    className={`p-4 rounded-xl max-w-lg shadow-md ${
                                                        isCurrentUser 
                                                            ? 'bg-gradient-to-r from-blue-600/90 to-blue-500/90 rounded-br-none' 
                                                            : 'bg-gray-800 rounded-bl-none'
                                                    }`}
                                                    whileHover={{ scale: 1.02 }}
                                                >
                                                    <div className="flex items-baseline gap-2">
                                                        <p style={{ color: userColor }} className="font-bold text-sm">
                                                            {username}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <p className="text-white mt-1.5 break-words">{msg.text}</p>
                                                </motion.div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                
                                {/* Chat Typing indicators */}
                                {chatTypingUsers.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center bg-gray-800">
                                            <div className="flex space-x-1.5">
                                                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gray-800 rounded-bl-none max-w-lg shadow-md">
                                            <p className="text-sm text-gray-400">
                                                {chatTypingUsers.slice(0, 3).join(', ')}
                                                {chatTypingUsers.length > 3 ? ` and ${chatTypingUsers.length - 3} more` : ''} typing...
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t border-gray-800/50 bg-gray-800/30 backdrop-blur-sm">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 w-full">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={handleMessageChange}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-3 bg-gray-800/80 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-gray-500 transition-all"
                                    />
                                    <motion.button
                                        type="submit"
                                        disabled={!newMessage.trim() || !socket.connected}
                                        whileHover={{ scale: !newMessage.trim() || !socket.connected ? 1 : 1.05 }}
                                        whileTap={{ scale: !newMessage.trim() || !socket.connected ? 1 : 0.95 }}
                                        className={`px-5 py-3 rounded-xl transition-all ${
                                            !newMessage.trim() || !socket.connected
                                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg'
                                        }`}
                                    >
                                        Send
                                    </motion.button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-2.5 text-xs text-gray-400 flex items-center justify-between border-t border-gray-700/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${socket.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {socket.connected ? 'Connected to server' : 'Disconnected from server'}
                        </div>
                        {editorTypingUsers.length > 0 && activeTab === 'editor' && (
                            <div className="flex items-center gap-1.5">
                                <FiType className="text-yellow-400 animate-pulse" />
                                <span className="truncate max-w-xs">
                                    {editorTypingUsers.slice(0, 3).join(', ')}
                                    {editorTypingUsers.length > 3 ? ` and ${editorTypingUsers.length - 3} more typing...` : ' typing...'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden md:inline">
                            Room ID: {roomId}
                        </span>
                        <span className="text-gray-500">|</span>
                        <span>
                            {currentTime.toLocaleString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Global Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(30, 41, 59, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.7);
                }
            `}</style>
        </div>
    );
};

export default RoomPage;