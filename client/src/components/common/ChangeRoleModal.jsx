import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, RefreshCw, Send, Shield, User, GraduationCap, CheckCircle, Edit, Briefcase, Calculator, Megaphone, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const roleIcons = {
    Admin: Shield,
    Teacher: CheckCircle,
    Student: GraduationCap,
    Editor: Edit,
    Institute: Shield,
    Accountant: Calculator,
    Marketer: Megaphone,
    Staff: Briefcase,
    Parent: Heart
};

const ChangeRoleModal = ({ isOpen, onClose }) => {
    const { user, refreshUser, switchAccount } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [requestedRole, setRequestedRole] = useState('');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    const allRoles = ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent'];
    
    // Admin gets all roles; others get allowedRoles (or at least their current role)
    const hasAdminPrivilege = user?.role === 'Admin' || (user?.allowedRoles && user.allowedRoles.includes('Admin'));
    
    const allowedRoles = hasAdminPrivilege 
        ? allRoles 
        : (user?.allowedRoles && user.allowedRoles.length > 0 ? user.allowedRoles : [user?.role]);

    // Roles that can be requested (not already allowed, and not Admin)
    const requestableRoles = allRoles.filter(role => role !== 'Admin' && !allowedRoles.includes(role));

    // Fetch existing requests for user
    const fetchUserRequests = async () => {
        try {
            setLoadingRequests(true);
            const { data } = await axios.get('/api/users/role-requests?myRequests=true');
            setPendingRequests(data || []);
        } catch (error) {
            console.error("Error fetching user requests:", error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const fetchCourses = async () => {
                try {
                    const { data } = await axios.get('/api/setup/courses');
                    setCourses(data || []);
                } catch (error) {
                    console.error("Failed to load courses:", error);
                }
            };
            fetchCourses();
            fetchUserRequests();
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleSwitchRole = async (targetRole) => {
        if (targetRole === user.role) return;
        setSubmitting(true);
        try {
            const { data } = await axios.put('/api/users/switch-role', { newRole: targetRole });
            toast.success(`Active role switched to ${targetRole}`);
            
            // Reload user session and redirect using AuthContext helper
            const token = localStorage.getItem('authToken');
            if (token && switchAccount) {
                await switchAccount(token, data.user);
            } else {
                await refreshUser();
                window.location.reload();
            }
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error switching role');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestRole = async (e) => {
        e.preventDefault();
        if (!requestedRole) return;
        if (requestedRole === 'Student' && !selectedCourse) {
            toast.error('Please select a course');
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await axios.post('/api/users/role-requests', { 
                requestedRole, 
                courseId: requestedRole === 'Student' ? selectedCourse : undefined 
            });
            toast.success(data.message || 'Request submitted successfully');
            setRequestedRole('');
            setSelectedCourse('');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-[#0b1329] text-white px-6 py-5 flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-lg flex items-center gap-2">
                            <RefreshCw className="animate-spin-slow" size={20} />
                            Change Active Role
                        </h3>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Account: {user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Switch Role Section */}
                    <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Allowed Roles</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {allowedRoles.map((roleName) => {
                                const Icon = roleIcons[roleName] || User;
                                const isActive = roleName === user.role;
                                return (
                                    <button
                                        key={roleName}
                                        disabled={submitting}
                                        onClick={() => handleSwitchRole(roleName)}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left font-bold text-xs transition-all ${
                                            isActive
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-100'
                                                : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200 hover:bg-slate-50/50'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs">{roleName}</p>
                                            <p className="text-[8px] opacity-75 font-semibold uppercase mt-0.5">{isActive ? 'Active' : 'Switch'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Request Role Section (For non-admins) */}
                    {!hasAdminPrivilege && requestableRoles.length > 0 && (
                        <div className="border-t border-slate-100 pt-5">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Request New Role</h4>
                            <form onSubmit={handleRequestRole} className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select Role</label>
                                    <select
                                        value={requestedRole}
                                        onChange={(e) => {
                                            setRequestedRole(e.target.value);
                                            if (e.target.value !== 'Student') setSelectedCourse('');
                                        }}
                                        disabled={submitting}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 bg-white"
                                        required
                                    >
                                        <option value="">Select a role to add...</option>
                                        {requestableRoles.map((roleName) => (
                                            <option key={roleName} value={roleName}>
                                                {roleName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {requestedRole === 'Student' && (
                                    <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select Course</label>
                                        <select
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            disabled={submitting}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 bg-white"
                                            required
                                        >
                                            <option value="">Choose a course...</option>
                                            {courses.map((course) => (
                                                <option key={course._id} value={course._id}>
                                                    {course.name} ({course.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || !requestedRole || (requestedRole === 'Student' && !selectedCourse)}
                                    className="w-full py-3 bg-[#0b1329] text-white rounded-2xl hover:bg-[#152244] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#0b1329]/15 disabled:opacity-50 disabled:pointer-events-none mt-1"
                                >
                                    <Send size={14} />
                                    Submit Request
                                </button>
                            </form>
                            <p className="text-[9px] text-slate-400 mt-2 font-bold leading-normal">
                                * Your request will be sent to the {user.institute ? 'Institute' : 'Admin'} for review. Once approved, the role will appear in your Allowed Roles list.
                            </p>
                        </div>
                    )}

                    {/* My Requests Section */}
                    {pendingRequests.length > 0 && (
                        <div className="border-t border-slate-100 pt-5 mt-5">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Request Status</h4>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                {pendingRequests.map((req) => (
                                    <div key={req._id} className="p-3 bg-slate-50 border border-slate-150/60 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                Requested: {req.requestedRole}
                                            </span>
                                            {req.course && (
                                                <span className="text-[10px] text-slate-500 font-bold uppercase truncate mt-0.5">
                                                    Course: {req.course?.name || req.course}
                                                </span>
                                            )}
                                            <span className="text-[9px] text-slate-400 mt-0.5">
                                                Submitted {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                            req.status === 'Approved'
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : req.status === 'Rejected'
                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangeRoleModal;
