import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();

// Axios base URL
axios.defaults.baseURL = API_URL;

// Token interceptor
axios.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const saveAccountToList = async (token, userInfo) => {
    if (!token || !userInfo) return;
    try {
        const existingStr = await SecureStore.getItemAsync('lmsSavedAccounts');
        let accounts = existingStr ? JSON.parse(existingStr) : [];
        if (!Array.isArray(accounts)) accounts = [];
        
        // Remove duplicate
        accounts = accounts.filter(acc => acc.user?._id !== userInfo._id && acc.user?.email !== userInfo.email);
        
        // Store only essential user fields to avoid SecureStore 2048 byte limit on Android
        const lightweightUser = {
            _id: userInfo._id,
            name: userInfo.name,
            email: userInfo.email,
            role: userInfo.role,
            allowedRoles: userInfo.allowedRoles
        };
        
        accounts.unshift({ token, user: lightweightUser });
        await SecureStore.setItemAsync('lmsSavedAccounts', JSON.stringify(accounts));
    } catch (e) {
        console.error("Error saving account to list:", e);
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savedAccounts, setSavedAccounts] = useState([]);

    const fetchUser = async () => {
        try {
            const savedStr = await SecureStore.getItemAsync('lmsSavedAccounts');
            if (savedStr) {
                setSavedAccounts(JSON.parse(savedStr));
            }
        } catch (e) {
            console.error('Error loading saved accounts list:', e);
        }

        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.get('/auth/me');
            setUser(data);
            await saveAccountToList(token, data);
        } catch (error) {
            if (error.response?.status === 401) {
                await SecureStore.deleteItemAsync('authToken');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    await SecureStore.deleteItemAsync('authToken');
                    setUser(null);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const login = async (email, password) => {
        const { data } = await axios.post('/auth/login', { email, password });
        if (data.token) {
            await SecureStore.setItemAsync('authToken', data.token);
            await saveAccountToList(data.token, data);
            
            const savedStr = await SecureStore.getItemAsync('lmsSavedAccounts');
            if (savedStr) {
                setSavedAccounts(JSON.parse(savedStr));
            }
        }
        setUser(data);
        return data;
    };

    const switchAccount = async (token, userInfo) => {
        if (!token) return;
        await SecureStore.setItemAsync('authToken', token);
        setUser(userInfo);
    };

    const logout = async () => {
        const currentToken = await SecureStore.getItemAsync('authToken');
        try {
            await axios.post('/auth/logout');
        } catch (e) {}
        await SecureStore.deleteItemAsync('authToken');
        setUser(null);

        try {
            const existingStr = await SecureStore.getItemAsync('lmsSavedAccounts');
            let accounts = existingStr ? JSON.parse(existingStr) : [];
            if (Array.isArray(accounts)) {
                accounts = accounts.filter(acc => acc.token !== currentToken);
                await SecureStore.setItemAsync('lmsSavedAccounts', JSON.stringify(accounts));
                setSavedAccounts(accounts);
                
                if (accounts.length > 0) {
                    await SecureStore.setItemAsync('authToken', accounts[0].token);
                    setUser(accounts[0].user);
                }
            }
        } catch (e) {
            console.error("Error in logout account adjustment:", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, refreshUser: fetchUser, savedAccounts, switchAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
