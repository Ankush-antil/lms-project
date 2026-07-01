import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ArrowLeft, Mail, BookOpen, Award, User, Lock, Save, Edit2, X, Check, Camera } from 'lucide-react';

const StudentDetails = () => {
    const { user: currentUser } = useAuth();
    const userInfo = currentUser;
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [user, setUser] = useState(null);
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        institute: '',
        course: '',
        subject: '',
        status: 'Active',
        avatar: '',
        mobileNumber: '',
        batch: '',
        callEnabled: false
    });

    const fetchData = async () => {
        try {

            

            const [userRes, instRes, courseRes] = await Promise.all([
                axios.get(`/api/users/${id}`),
                axios.get('/api/setup/institutes'),
                axios.get('/api/setup/courses')
            ]);

            setUser(userRes.data);
            setInstitutes(instRes.data);
            setCourses(courseRes.data);

            setFormData({
                name: userRes.data.name,
                email: userRes.data.email,
                password: '',
                institute: userRes.data.institute?._id || userRes.data.institute || '',
                course: userRes.data.studentProfile?.course?._id || userRes.data.studentProfile?.course || '',
                subject: userRes.data.studentProfile?.subject || '',
                status: userRes.data.status || 'Active',
                avatar: userRes.data.avatar || '',
                mobileNumber: userRes.data.mobileNumber || '',
                batch: userRes.data.studentProfile?.batch || '',
                callEnabled: userRes.data.callEnabled || false
            });

            setLoading(false);
        } catch (error) {
            console.error("Error fetching student details:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            const payload = { ...formData };
            if (!payload.password) delete payload.password; // Don't send empty password

            await axios.put(`/api/users/${id}`, payload);
            setEditMode(false);
            toast.success('Student profile updated successfully');
            fetchData(); // Refresh data
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Error updating profile';
            toast.error(message);
            setLoading(false);
        }
    };

    if (loading && !user) return <div className="p-10 text-center animate-pulse text-indigo-600 font-bold">Loading Academic Profile...</div>;

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/students')}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Profile</h1>
                        <p className="text-slate-500 text-sm font-medium">Manage and monitor student credentials.</p>
                    </div>
                </div>
                {!editMode ? (
                    <button
                        onClick={() => setEditMode(true)}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-bold text-sm flex items-center gap-2"
                    >
                        <Edit2 size={18} /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setEditMode(false)}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <X size={18} /> Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Identity */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-[0.05]"></div>

                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-200 relative z-10 border-4 border-white overflow-hidden">
                                {formData.avatar ? (
                                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            {editMode && (
                                <label className="absolute bottom-0 right-0 z-20 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-all border-2 border-white">
                                    <Camera size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-2xl font-black text-slate-800">{user?.name}</h2>
                            <p className="text-slate-400 font-mono text-xs mt-1 uppercase tracking-widest">ID: {user?._id?.slice(-8)}</p>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-center gap-2 relative z-10">
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-indigo-100">
                                {user?.studentProfile?.course?.name || 'No Course'}
                            </span>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${user?.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                {user?.status || 'Active'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-indigo-400 mb-6">Contact Matrix</h3>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500 transition-colors">
                                    <Mail size={18} className="text-indigo-400 group-hover:text-white" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Digital Mail</p>
                                    <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500 transition-colors">
                                    <User size={18} className="text-indigo-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Role</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-tighter">Verified {user?.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500 transition-colors">
                                    <Phone size={18} className="text-indigo-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Contact</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-tighter">{user?.mobileNumber || 'No Mobile'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Information & Forms */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        {!editMode ? (
                            <div className="p-8 space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                                        <Award size={22} className="text-indigo-600" />
                                        Academic Foundation
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <BookOpen size={14} /> Course Program
                                            </p>
                                            <p className="text-lg font-bold text-slate-800">{user?.studentProfile?.course?.name || 'Not Enrolled'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Award size={14} /> Registered Institute
                                            </p>
                                            <p className="text-lg font-bold text-slate-800">{user?.institute?.name || 'Unassigned'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Subject</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {user?.studentProfile?.subject
                                                    ? <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-base font-bold">{user.studentProfile.subject}</span>
                                                    : <span className="text-slate-400 italic text-sm">No subject assigned</span>}
                                            </p>
                                        </div>
                                         <div className="space-y-1">
                                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Batch/Session</p>
                                             <p className="text-lg font-bold text-slate-800">{user?.studentProfile?.batch || 'N/A'}</p>
                                         </div>
                                         <div className="space-y-1">
                                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calling Status</p>
                                             <p className="text-lg font-bold text-slate-800">
                                                 {user?.callEnabled ? (
                                                     <span className="text-emerald-600 font-extrabold uppercase text-xs">Enabled</span>
                                                 ) : (
                                                     <span className="text-slate-400 font-extrabold uppercase text-xs">Disabled</span>
                                                 )}
                                             </p>
                                         </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-emerald-500">Security Status</p>
                                            <div className="flex items-center gap-2 py-1">
                                                <Check size={16} className="text-emerald-500" />
                                                <p className="text-sm font-bold text-slate-700 tracking-tight">Access Token Valid</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-slate-50 italic text-slate-400 text-sm font-medium">
                                    Last synchronized with core database: {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdate} className="p-8 space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Editing Academic Profile</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Display Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Email Identity</label>
                                        <input
                                            type="email"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Assigned Institute</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.institute}
                                            onChange={e => setFormData({ ...formData, institute: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Institute</option>
                                            {institutes.map(inst => (
                                                <option key={inst._id} value={inst._id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Academic Program</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.course}
                                            onChange={e => setFormData({ ...formData, course: e.target.value, subject: '' })}
                                        >
                                            <option value="">Select Course</option>
                                            {courses.map(course => (
                                                <option key={course._id} value={course._id}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            📚 Assigned Subject
                                        </label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800 appearance-none cursor-pointer disabled:opacity-50"
                                            required
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            disabled={!formData.course}
                                        >
                                            <option value="">Select Subject</option>
                                            {availableSubjects.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            📞 Mobile Contact
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.mobileNumber}
                                            onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                            placeholder="+91 98765"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            🎓 Batch / Session
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all text-slate-800"
                                            value={formData.batch}
                                            onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                            placeholder="e.g. 2024-25"
                                        />
                                    </div>
                                    <div className="space-y-2 flex items-center gap-3 mt-6 pl-2">
                                        <input
                                            type="checkbox"
                                            id="studentCallEnabled"
                                            checked={formData.callEnabled}
                                            onChange={e => setFormData({ ...formData, callEnabled: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="studentCallEnabled" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                            Allow Web Calling
                                        </label>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <Lock size={12} /> Reset Security Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Leave empty to keep current password"
                                            className="w-full px-5 py-4 bg-indigo-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all placeholder:text-indigo-200"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save size={18} /> Push Synchronized Changes
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDetails;
