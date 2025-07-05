// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/api/v1/auth/login', { email, password });
            const { user, accessToken } = response.data.data;
            login(user, accessToken);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check credentials.');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center text-white">Login to LiveCodeHub</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Log In</button>
                </form>
                <p className="text-sm text-center text-gray-400">
                    Don't have an account? <Link to="/register" className="font-medium text-blue-400 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;