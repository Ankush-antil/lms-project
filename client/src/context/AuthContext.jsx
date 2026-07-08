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

const saveAccountToList = (token, userInfo) => {
    if (!token || !userInfo) return;
    try {
        const existingStr = localStorage.getItem('lmsSavedAccounts');
        let accounts = existingStr ? JSON.parse(existingStr) : [];
        if (!Array.isArray(accounts)) accounts = [];
        
        // Remove duplicate
        accounts = accounts.filter(acc => acc.user?._id !== userInfo._id && acc.user?.email !== userInfo.email);
        
        accounts.unshift({ token, user: userInfo });
        localStorage.setItem('lmsSavedAccounts', JSON.stringify(accounts));
    } catch (e) {
        console.error("Error saving account to list:", e);
    }
};

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
            saveAccountToList(token, data);
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
                saveAccountToList(data.token, data);
            }
            setUser(data);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const switchAccount = (token, userInfo) => {
        if (!token) return;
        localStorage.setItem('authToken', token);
        // Do not call setUser here to prevent intermediate client-side redirects before full page reload
        toast.success(`Switched to ${userInfo.name || userInfo.email}`);
        
        if (userInfo.role === 'Student') {
            window.location.href = '/student/tests';
        } else if (userInfo.role === 'Admin') {
            window.location.href = '/admin';
        } else if (userInfo.role === 'Teacher') {
            window.location.href = '/teacher';
        } else if (userInfo.role === 'Editor') {
            window.location.href = '/editor';
        } else if (userInfo.role === 'Institute') {
            window.location.href = '/institute';
        } else {
            window.location.href = '/';
        }
    };

    const removeAccount = (email) => {
        try {
            const existingStr = localStorage.getItem('lmsSavedAccounts');
            let accounts = existingStr ? JSON.parse(existingStr) : [];
            if (Array.isArray(accounts)) {
                accounts = accounts.filter(acc => acc.user?.email !== email);
                localStorage.setItem('lmsSavedAccounts', JSON.stringify(accounts));
            }
            toast.success(`Removed account: ${email}`);
            
            // If the active account was removed, log out
            if (user?.email === email) {
                logout();
            } else {
                window.location.reload();
            }
        } catch (e) {
            console.error("Error removing account:", e);
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            const currentToken = localStorage.getItem('authToken');
            localStorage.removeItem('authToken');
            setUser(null);
            
            // Remove from saved list
            try {
                const existingStr = localStorage.getItem('lmsSavedAccounts');
                let accounts = existingStr ? JSON.parse(existingStr) : [];
                if (Array.isArray(accounts)) {
                    accounts = accounts.filter(acc => acc.token !== currentToken);
                    localStorage.setItem('lmsSavedAccounts', JSON.stringify(accounts));
                    
                    // If another account is saved, auto switch to it
                    if (accounts.length > 0) {
                        localStorage.setItem('authToken', accounts[0].token);
                        const nextUser = accounts[0].user;
                        if (nextUser && nextUser.role === 'Student') {
                            window.location.href = '/student/tests';
                        } else if (nextUser && nextUser.role === 'Admin') {
                            window.location.href = '/admin';
                        } else if (nextUser && nextUser.role === 'Teacher') {
                            window.location.href = '/teacher';
                        } else if (nextUser && nextUser.role === 'Editor') {
                            window.location.href = '/editor';
                        } else if (nextUser && nextUser.role === 'Institute') {
                            window.location.href = '/institute';
                        } else {
                            window.location.href = '/';
                        }
                        return;
                    }
                }
            } catch (e) {
                console.error("Error in logout account adjustment:", e);
            }
            
            toast.success('Logged out');
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, refreshUser: fetchUser, switchAccount, removeAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
