import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Lock, Save, Camera, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingPlaceholder from '../components/common/LoadingPlaceholder';

const ProfilePage = () => {
    const { user: currentUser } = useAuth();
    const userInfo = currentUser;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobileNumber: '',
        callEnabled: false
    });
    const [teacherData, setTeacherData] = useState({ students: [], sections: [] });


    const role = userInfo?.role || 'User';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                
                const { data } = await axios.get('/api/users/profile');
                setUser(data);
                setFormData({
                    name: data.name,
                    email: data.email,
                    password: '',
                    confirmPassword: '',
                    mobileNumber: data.mobileNumber || '',
                    callEnabled: data.callEnabled || false
                });

                if (data.role === 'Teacher') {
                    try {
                        const { data: studentsRes } = await axios.get('/api/users/teacher-students');
                        const uniqueSecs = [...new Set(studentsRes.map(s => s.studentProfile?.section).filter(Boolean))];
                        setTeacherData({
                            students: studentsRes,
                            sections: uniqueSecs
                        });
                    } catch (err) {
                        console.error("Error fetching teacher students:", err);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile details.");
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setSaving(true);
            
            const { data } = await axios.put('/api/users/profile', {
                name: formData.name,
                email: formData.email,
                avatar: user.avatar, // Include the current/new avatar
                password: formData.password,
                mobileNumber: formData.mobileNumber,
                callEnabled: formData.callEnabled
            });

            // Update local storage so the header updates immediately
            const updatedInfo = { 
                ...userInfo, 
                name: data.name, 
                email: data.email, 
                avatar: data.avatar,
                mobileNumber: data.mobileNumber,
                callEnabled: data.callEnabled
            };
            localStorage.setItem('userInfo', JSON.stringify(updatedInfo));

            setUser(data);
            setMessage("Profile updated successfully!");
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            setSaving(false);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update profile.");
            setSaving(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Image size should be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setUser({ ...user, avatar: reader.result });
            };
        }
    };

    if (loading) return (
        <DashboardLayout role={role}>
            <LoadingPlaceholder />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role={role}>
            <div className="max-w-4xl mx-auto pb-12">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Side: Avatar & Basic Info */}
                    <div className="w-full md:w-1/3 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                            <div className="relative inline-block mb-6">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-5xl font-bold shadow-lg ring-4 ring-indigo-50 mx-auto overflow-hidden">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user.name[0]
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer">
                                    <Camera size={18} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                            <p className="text-slate-500 text-sm mt-1">{user.role}</p>

                            <div className="mt-8 pt-6 border-t border-slate-50 text-left space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Institution</p>
                                    <p className="text-sm font-semibold text-slate-700">{user.institute?.name || 'Not assigned'}</p>
                                </div>
                                {user.role === 'Student' && (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Course</p>
                                            <p className="text-sm font-semibold text-slate-700">{user.studentProfile?.course?.name || 'Not enrolled'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Subject</p>
                                            <p className="text-sm font-semibold text-slate-700">{user.studentProfile?.subject || 'Not assigned'}</p>
                                        </div>
                                    </>
                                )}
                                {user.role === 'Teacher' && (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Course</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {user.teacherProfile?.assignedCourses?.map(c => c.name || c).join(', ') || 'Not assigned'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Subjects</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {user.teacherProfile?.subjects?.join(', ') || 'Not assigned'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Sections</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {user.teacherProfile?.studentAssignmentMode === 'all' 
                                                    ? 'All Sections' 
                                                    : (user.teacherProfile?.assignedSections?.join(', ') || 'None')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {user.role === 'Teacher' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">
                                    My Assigned Scope
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assigned Sections</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {teacherData.sections.length > 0 ? (
                                                teacherData.sections.map((sec, idx) => (
                                                    <span key={idx} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase">
                                                        Section {sec}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 font-semibold italic">No sections found</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                            Students under me ({teacherData.students.length})
                                        </p>
                                        {teacherData.students.length > 0 ? (
                                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                                {teacherData.students.map((student) => (
                                                    <div key={student._id} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-xs uppercase shadow-sm">
                                                            {student.name[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-700 truncate" title={student.name}>{student.name}</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold truncate">{student.studentProfile?.course?.name || 'General'}</p>
                                                        </div>
                                                        {student.studentProfile?.section && (
                                                            <span className="px-1.5 py-0.5 bg-violet-50 text-violet-750 text-[9px] font-black uppercase rounded">
                                                                Sec {student.studentProfile.section}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-semibold italic">No students assigned</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Edit Form */}
                    <div className="w-full md:w-2/3">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-slate-800">Account Settings</h3>
                                <ShieldCheck className="text-emerald-500" size={24} />
                            </div>

                            {message && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100 animate-fade-in">{message}</div>}
                            {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-fade-in">{error}</div>}

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number</label>
                                    <input
                                        type="tel"
                                        name="mobileNumber"
                                        value={formData.mobileNumber}
                                        onChange={handleChange}
                                        placeholder="+91 98765"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    />
                                </div>

                                {(user.role === 'Student' || user.role === 'Teacher') && (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="callEnabled"
                                            name="callEnabled"
                                            checked={formData.callEnabled}
                                            onChange={e => setFormData({ ...formData, callEnabled: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="callEnabled" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                            Allow Web Calling
                                        </label>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-50">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4">Update Password</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Confirm New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">Leave blank to keep your current password.</p>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProfilePage;
