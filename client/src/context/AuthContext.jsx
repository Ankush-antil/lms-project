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
        try {
            setLoading(true);
            const { data } = await axios.get('/api/auth/me');
            setUser(data);
            
            // Sync token to localStorage if we got it back or if we can read it
            const storedToken = localStorage.getItem('authToken') || data.token;
            if (storedToken) {
                localStorage.setItem('authToken', storedToken);
                saveAccountToList(storedToken, data);
            }
        } catch (error) {
            console.error("Auth verification failed:", error.response?.status);
            localStorage.removeItem('authToken');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tokenParam = queryParams.get('token');
        if (tokenParam) {
            console.log('[AuthContext] Auto-authenticating from URL token parameter');
            localStorage.setItem('authToken', tokenParam);
            queryParams.delete('token');
            const newSearch = queryParams.toString();
            const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }

        // Validate saved accounts in localStorage on startup to prune deleted/inactive users
        const validateSavedAccounts = async () => {
            try {
                const existingStr = localStorage.getItem('lmsSavedAccounts');
                if (existingStr) {
                    const accounts = JSON.parse(existingStr);
                    if (Array.isArray(accounts) && accounts.length > 0) {
                        const emails = accounts.map(acc => acc.user?.email).filter(Boolean);
                        if (emails.length > 0) {
                            const { data } = await axios.post('/api/auth/validate-accounts', { emails });
                            if (data && Array.isArray(data.activeEmails)) {
                                const activeMap = new Set(data.activeEmails.map(e => e.toLowerCase()));
                                const filtered = accounts.filter(acc => acc.user?.email && activeMap.has(acc.user.email.toLowerCase()));
                                localStorage.setItem('lmsSavedAccounts', JSON.stringify(filtered));
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to validate saved accounts:", e);
            }
        };

        validateSavedAccounts();
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

    const switchAccount = async (token, userInfo) => {
        if (!token) return;
        
        try {
            // Update the cross-subdomain HTTP-only cookie on the backend
            await axios.post('/api/auth/set-token-cookie', { token });
        } catch (e) {
            console.error("Failed to sync switchAccount cookie on server:", e);
        }

        localStorage.setItem('authToken', token);
        toast.success(`Switched to ${userInfo.name || userInfo.email}`);
        
        // Define redirect path
        const roleSubdomains = {
            Admin: 'admin',
            Teacher: 'teacher',
            Student: 'student',
            Editor: 'editor',
            Institute: 'institute',
            Accountant: 'account',
            Marketer: 'marketer',
            Staff: 'admin',
            Parent: 'parent',
            Guest: 'guest'
        };

        const subdomain = roleSubdomains[userInfo.role] || 'www';
        const redirectPath = userInfo.role === 'Student' ? '/student/tests' : (userInfo.role === 'Staff' ? '/admin' : `/${userInfo.role.toLowerCase()}`);
        
        const hostname = window.location.hostname;
        const isLocalHost = hostname.includes('localhost') || hostname === '127.0.0.1' || hostname.startsWith('dev.') || hostname.includes('pinggy') || hostname.includes('lhr.life') || hostname.includes('loca.lt') || hostname.includes('serveo');

        if (isLocalHost || subdomain === 'www') {
            window.location.href = redirectPath;
        } else {
            const targetUrl = `${window.location.protocol}//${subdomain}.digitalstudyacademy.com${redirectPath}?token=${encodeURIComponent(token)}`;
            window.location.href = targetUrl;
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
                        } else if (nextUser && nextUser.role === 'Accountant') {
                            window.location.href = '/accountant/fee-portal';
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
