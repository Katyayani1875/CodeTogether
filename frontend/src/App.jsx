// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomPage from './pages/RoomPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="bg-gray-900 text-white min-h-screen">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        
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