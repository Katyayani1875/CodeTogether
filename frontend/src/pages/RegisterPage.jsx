// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Use our central axios instance

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username || !email || !password) {
            setError('All fields are required.');
            return;
        }
        try {
            await api.post('/api/v1/auth/register', { username, email, password });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center text-white">Register for LiveCodeHub</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Register</button>
                </form>
                <p className="text-sm text-center text-gray-400">
                    Already have an account? <Link to="/login" className="font-medium text-blue-400 hover:underline">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;