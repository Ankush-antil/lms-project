import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ArrowLeft, Mail, BookOpen, GraduationCap, User, Lock, Save, Edit2, X, Check, Award, Camera } from 'lucide-react';

const TeacherDetails = () => {
    const { user: currentUser } = useAuth();
    const userInfo = currentUser;
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [user, setUser] = useState(null);
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        institute: '',
        course: '', // Primary course
        subjects: '',
        status: 'Active',
        avatar: '',
        mobileNumber: '',
        callEnabled: false
    });

    const fetchData = async () => {
        try {

            

            const [userRes, instRes, courseRes] = await Promise.all([
                axios.get(`/api/users/${id}`),
                axios.get('/api/setup/institutes'),
                axios.get('/api/setup/courses')
            ]);

            const teacher = userRes.data;
            setUser(teacher);
            setInstitutes(instRes.data);
            setCourses(courseRes.data);

            setFormData({
                name: teacher.name,
                email: teacher.email,
                password: '',
                institute: teacher.institute?._id || teacher.institute || '',
                course: teacher.teacherProfile?.assignedCourses?.[0]?._id || teacher.teacherProfile?.assignedCourses?.[0] || '',
                subjects: teacher.teacherProfile?.subjects?.join(', ') || '',
                status: teacher.status || 'Active',
                avatar: teacher.avatar || '',
                mobileNumber: teacher.mobileNumber || '',
                callEnabled: teacher.callEnabled || false
            });

            setLoading(false);
        } catch (error) {
            console.error("Error fetching teacher details:", error);
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
            if (!payload.password) delete payload.password;

            await axios.put(`/api/users/${id}`, payload);
            setEditMode(false);
            toast.success('Teacher profile updated successfully');
            fetchData();
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Error updating teacher profile';
            toast.error(message);
            setLoading(false);
        }
    };

    if (loading && !user) return <div className="p-10 text-center animate-pulse text-indigo-600 font-bold">Loading Faculty Profile...</div>;

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty Profile</h1>
                        <p className="text-slate-500 text-sm font-medium">Coordinate faculty assignments and credentials.</p>
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
                    <button
                        onClick={() => setEditMode(false)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                        <X size={18} /> Cancel
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Faculty Identity */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-[0.05]"></div>

                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-emerald-200 relative z-10 border-4 border-white overflow-hidden">
                                {formData.avatar ? (
                                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            {editMode && (
                                <label className="absolute bottom-0 right-0 z-20 p-2.5 bg-emerald-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-all border-2 border-white">
                                    <Camera size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-2xl font-black text-slate-800">{user?.name}</h2>
                            <p className="text-slate-400 font-mono text-xs mt-1 uppercase tracking-widest">Faculty ID: {user?._id?.slice(-8)}</p>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-center gap-2 relative z-10">
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-100">
                                {user?.teacherProfile?.subjects?.[0] || 'Unspecialized'}
                            </span>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${user?.status === 'Active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                {user?.status || 'Active'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200">
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-emerald-400 mb-6">Credential Center</h3>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                                    <Mail size={18} className="text-emerald-400 group-hover:text-white" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Communication</p>
                                    <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                                    <Award size={18} className="text-emerald-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Experience</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-tighter">Verified Instructor</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                                    <Phone size={18} className="text-emerald-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Contact</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-tighter">{user?.mobileNumber || 'No Mobile'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Deployment Details & Forms */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        {!editMode ? (
                            <div className="p-8 space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                                        <GraduationCap size={22} className="text-emerald-600" />
                                        Deployment Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <BookOpen size={14} /> Assigned Courses
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {user?.teacherProfile?.assignedCourses?.map(c => (
                                                    <span key={c._id} className="px-3 py-1 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-100">
                                                        {c.name}
                                                    </span>
                                                ))}
                                                {(!user?.teacherProfile?.assignedCourses || user.teacherProfile.assignedCourses.length === 0) && (
                                                    <p className="text-sm font-bold text-slate-800">None Assigned</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Award size={14} /> Primary Institute
                                            </p>
                                            <p className="text-lg font-bold text-slate-800">{user?.institute?.name || 'Unassigned'}</p>
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Specialized Subjects</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {user?.teacherProfile?.subjects?.map(sub => (
                                                    <span key={sub} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                                        {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Sections</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {user?.teacherProfile?.studentAssignmentMode === 'all' ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                                                        All Sections (General Access)
                                                    </span>
                                                ) : user?.teacherProfile?.studentAssignmentMode === 'selected' ? (
                                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                                                        Specific Selected Students
                                                    </span>
                                                ) : user?.teacherProfile?.assignedSections && user.teacherProfile.assignedSections.length > 0 ? (
                                                    user.teacherProfile.assignedSections.map(sec => (
                                                        <span key={sec} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 uppercase">
                                                            Section {sec}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No assigned sections</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calling Status</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {user?.callEnabled ? (
                                                    <span className="text-emerald-600 font-extrabold uppercase text-xs">Enabled</span>
                                                ) : (
                                                    <span className="text-slate-400 font-extrabold uppercase text-xs">Disabled</span>
                                                )}
                                            </p>
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
                                    <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter text-emerald-600">Sync Faculty Credentials</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Display Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-slate-800"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-slate-800"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Assigned Institute</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-slate-800"
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
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Assigned Course</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-slate-800"
                                            value={formData.course}
                                            onChange={e => setFormData({ ...formData, course: e.target.value, subjects: '' })}
                                        >
                                            <option value="">Select Course</option>
                                            {courses.map(course => (
                                                <option key={course._id} value={course._id}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Teaching Subjects</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (availableSubjects.length > 0) {
                                                    setSubjectDropdownOpen(!subjectDropdownOpen);
                                                }
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl flex justify-between items-center outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-left text-slate-800 disabled:opacity-50"
                                            disabled={availableSubjects.length === 0}
                                        >
                                            <span className="truncate">
                                                {formData.subjects 
                                                    ? (formData.subjects.split(',').map(s => s.trim()).filter(Boolean).join(', '))
                                                    : "Select Subjects"
                                                }
                                            </span>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {subjectDropdownOpen && availableSubjects.length > 0 && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setSubjectDropdownOpen(false)} />
                                                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 max-h-[180px] overflow-y-auto custom-scrollbar p-2">
                                                    {availableSubjects.map(sub => {
                                                        const currentSubjects = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                        const isChecked = currentSubjects.includes(sub);
                                                        return (
                                                            <label key={sub} className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 transition-all select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        let newSubjects;
                                                                        if (isChecked) {
                                                                            newSubjects = currentSubjects.filter(s => s !== sub);
                                                                        } else {
                                                                            newSubjects = [...currentSubjects, sub];
                                                                        }
                                                                        setFormData({ ...formData, subjects: newSubjects.join(', ') });
                                                                    }}
                                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 accent-indigo-600 cursor-pointer"
                                                                />
                                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                                    {sub}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                        {availableSubjects.length === 0 && (
                                            <p className="mt-1.5 text-[10px] text-slate-400 italic ml-2">Select a course to view available subjects.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            📞 Mobile Contact
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all text-slate-800"
                                            value={formData.mobileNumber}
                                            onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                            placeholder="+91 98765"
                                        />
                                    </div>
                                    <div className="space-y-2 flex items-center gap-3 mt-6 pl-2">
                                        <input
                                            type="checkbox"
                                            id="teacherCallEnabled"
                                            checked={formData.callEnabled}
                                            onChange={e => setFormData({ ...formData, callEnabled: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                        />
                                        <label htmlFor="teacherCallEnabled" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                            Allow Web Calling
                                        </label>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <Lock size={12} /> Force Password Update
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Leave blank to keep current credential"
                                            className="w-full px-5 py-4 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all placeholder:text-emerald-200"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save size={18} /> Update Faculty Credentials
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

export default TeacherDetails;
