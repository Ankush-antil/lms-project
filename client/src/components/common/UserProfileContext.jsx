import React, { createContext, useContext, useState } from 'react';
import UserProfileModal from './UserProfileModal';

const UserProfileContext = createContext();

export const UserProfileProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState(null);

    const openProfile = (id) => {
        setUserId(id);
        setIsOpen(true);
    };

    const closeProfile = () => {
        setIsOpen(false);
        setUserId(null);
    };

    return (
        <UserProfileContext.Provider value={{ openProfile }}>
            {children}
            <UserProfileModal
                userId={userId}
                isOpen={isOpen}
                onClose={closeProfile}
            />
        </UserProfileContext.Provider>
    );
};

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};
