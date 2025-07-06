import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AuthCallbackPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            // Set token in localStorage to be used by our API interceptor
            localStorage.setItem('token', token);
            // We need to fetch the user's data now that we have the token
            api.get('/api/v1/users/me') // Assuming you have a route to get the current user
                .then(response => {
                    const user = response.data.data;
                    login(user, token); // Update auth context
                    navigate('/'); // Redirect to homepage
                })
                .catch(err => {
                    console.error("Failed to fetch user after OAuth", err);
                    navigate('/login');
                });
        } else {
            // No token found, redirect to login
            navigate('/login');
        }
    }, [location, navigate, login]);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
            <div className="text-white text-xl">Authenticating...</div>
        </div>
    );
};

export default AuthCallbackPage;