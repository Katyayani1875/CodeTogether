// src/App.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomPage from './pages/RoomPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { Toaster } from 'react-hot-toast';

function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right" 
                toastOptions={{
                    success: {
                        style: {
                            background: '#1F2937', 
                            color: '#FFFFFF',     
                            border: '1px solid #374151',
                        },
                    },
                    error: {
                        style: {
                            background: '#371B1B', 
                            color: '#F87171',     
                            border: '1px solid #7f1d1d',
                        },
                    },
                }}
            />

            <Router>
                <div className="bg-gray-900 text-white min-h-screen">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/auth/callback" element={<AuthCallbackPage />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/room/:roomId" element={<RoomPage />} />
                        </Route>
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;