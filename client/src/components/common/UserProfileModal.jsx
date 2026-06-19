import { useAuth } from '../../context/AuthContext';
import React, { useEffect, useState } from 'react';

import { X, Mail, Shield, Book, Building, Calendar, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { createPortal } from 'react-dom';

const UserProfileModal = ({ userId, isOpen, onClose }) => {
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        if (isOpen && userId) {
            const fetchUserDetails = async () => {
                try {
                    setLoading(true);
                    setUser(null); // Clear previous data
                    setError(null);


                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        throw new Error("No authentication token found");
                    }



                    // Safely extract the ID. Handles string ID or User Object
                    let actualId = userId;
                    if (userId && typeof userId === 'object') {
                        actualId = userId._id || userId.id;
                    }

                    // Select the correct endpoint.
                    const endpoint = actualId ? `/api/users/view/${actualId}` : '/api/users/profile';

                    const { data } = await axios.get(endpoint);

                    if (isMounted) {
                        setUser(data);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Error fetching user details:", err);
                    if (isMounted) {
                        setError(err.response?.data?.message || err.message || "Failed to load user details");
                        setLoading(false);
                    }
                }
            };
            fetchUserDetails();
        }

        return () => { isMounted = false; };
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[85vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header/Banner */}
                <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-8 -mt-14 text-center overflow-y-auto flex-1 custom-scrollbar">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-xl mx-auto overflow-hidden bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-400 text-3xl">
                            {loading ? (
                                <div className="animate-pulse w-full h-full bg-slate-200"></div>
                            ) : user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || '?'
                            )}
                        </div>
                        {!loading && user?.role === 'Admin' && (
                            <div className="absolute bottom-1 right-1 p-2 bg-amber-400 text-white rounded-full shadow-lg ring-4 ring-white">
                                <Shield size={14} fill="currentColor" />
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="mt-4 space-y-3">
                            <div className="h-6 bg-slate-100 animate-pulse rounded-full w-40 mx-auto"></div>
                            <div className="h-4 bg-slate-100 animate-pulse rounded-full w-24 mx-auto"></div>
                        </div>
                    ) : error ? (
                        <div className="mt-4 p-5 bg-red-50 rounded-3xl border border-red-100">
                            <p className="text-red-600 font-bold mb-2">Error Loading Profile</p>
                            <p className="text-sm text-red-500">{error}</p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-xl text-xs"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="mt-4 text-xl font-black text-slate-800 tracking-tight">{user?.name}</h2>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${user?.role === 'Admin' ? 'bg-amber-100 text-amber-700' :
                                    user?.role === 'Teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {user?.role}
                                </span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {user?._id?.slice(-6)}</span>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Mail size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Phone size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Mobile</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">{user?.mobileNumber || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Building size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Institution</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">{user?.institute?.name || user?.institute || 'Not assigned'}</p>
                                    </div>
                                </div>

                                {user?.role === 'Student' && (
                                    <>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                            <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Book size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Course</p>
                                                <p className="text-sm font-bold text-slate-700 truncate">{user?.studentProfile?.course?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                            <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Book size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Subject</p>
                                                <p className="text-sm font-bold text-slate-700 truncate">{user?.studentProfile?.subject || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {user?.role === 'Teacher' && (
                                    <>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                            <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Book size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Course</p>
                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                    {user?.teacherProfile?.assignedCourses?.map(c => c.name || c).join(', ') || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 flex flex-col gap-1.5">
                                            <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Book size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Subjects</p>
                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                    {user?.teacherProfile?.subjects?.join(', ') || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm">
                                        <Calendar size={14} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Joined</p>
                                        <p className="text-sm font-bold text-slate-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm">
                                        <Shield size={14} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                                        <p className="text-sm font-bold text-emerald-600">Active</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-6 w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 text-sm"
                            >
                                Close Profile
                            </button>
                        </>
                    )}
                </div>
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>,
        document.body
    );
};

export default UserProfileModal;
