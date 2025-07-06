import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Handle OAuth redirect errors
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(error === 'access_denied' 
                ? 'Google login was cancelled' 
                : 'Failed to authenticate with Google');
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const response = await api.post('/api/v1/auth/login', { email, password });
            const { user, accessToken } = response.data.data;
            login(user, accessToken);
            toast.success(`Welcome back, ${user.username}!`);
            navigate('/');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Store current path for redirect after login
        sessionStorage.setItem('preAuthPath', window.location.pathname);
        window.location.href = `${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/google`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 space-y-8 bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700"
            >
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-gray-400">
                        Log in to your LiveCodeHub account
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-3 text-red-500 bg-red-500/10 rounded-lg text-center"
                        >
                            {error}
                        </motion.p>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full px-6 py-3 font-medium rounded-lg transition-all ${isLoading 
                            ? 'bg-blue-700 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'}`}
                    >
                        {isLoading ? (
                            <span className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Log In'
                        )}
                    </motion.button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-gray-800/70 px-3 text-sm text-gray-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <motion.button
                    onClick={handleGoogleLogin}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <FcGoogle className="text-xl" />
                    <span>Google</span>
                </motion.button>

                <p className="text-sm text-center text-gray-400">
                    Don't have an account?{' '}
                    <Link 
                        to="/register" 
                        className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Create one
                    </Link>
                </p>

                <div className="text-center text-xs text-gray-500 mt-4">
                    <Link 
                        to="/forgot-password" 
                        className="hover:text-gray-400 transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;