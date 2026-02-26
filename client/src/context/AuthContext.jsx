import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Set axios defaults globally
axios.defaults.withCredentials = true;

// Add a request interceptor to include the token in headers if it exists
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data } = await axios.get('/api/auth/me');
            setUser(data);
        } catch (error) {
            console.error("Auth verification failed:", error.response?.status);
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post('/api/auth/login', { email, password });
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            setUser(data);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
            localStorage.removeItem('authToken');
            setUser(null);
            toast.success('Logged out');
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if the server logout fails, clear local state
            localStorage.removeItem('authToken');
            setUser(null);
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
