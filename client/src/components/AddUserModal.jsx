import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddUserModal = ({ isOpen, onClose, role, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        course: '',
        institute: '',
        subjects: '',
        subject: '',
        mobileNumber: '',
        batch: '',
        callEnabled: true,
        studentAssignmentMode: 'all',
        assignedSections: [],
        assignedStudents: []
    });
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [sectionPreview, setSectionPreview] = useState('');

    const [courseStudents, setCourseStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        if (formData.course && role === 'Student') {
            axios.get(`/api/setup/courses/${formData.course}/section-preview`)
                .then(res => setSectionPreview(res.data.section))
                .catch(() => setSectionPreview('A'));
        } else {
            setSectionPreview('');
        }
    }, [formData.course, role]);

    useEffect(() => {
        if (formData.course && role === 'Teacher') {
            const fetchCourseStudents = async () => {
                try {
                    setLoadingStudents(true);
                    const { data } = await axios.get(`/api/users?role=Student&course=${formData.course}`);
                    setCourseStudents(data);
                } catch (error) {
                    console.error("Error fetching course students:", error);
                } finally {
                    setLoadingStudents(false);
                }
            };
            fetchCourseStudents();
        } else {
            setCourseStudents([]);
        }
    }, [formData.course, role]);

    useEffect(() => {
        if (isOpen) {
            // Auto-generate a password on open
            const randomPass = Math.random().toString(36).slice(-8);
            const userInstId = user && user.institute 
                ? (typeof user.institute === 'object' ? user.institute._id : user.institute) 
                : '';
            setFormData({
                name: '',
                email: '',
                password: randomPass,
                course: '',
                institute: userInstId,
                subjects: '',
                subject: '',
                mobileNumber: '',
                batch: '',
                callEnabled: true,
                studentAssignmentMode: 'all',
                assignedSections: [],
                assignedStudents: []
            });
            setCreatedUser(null);
            setSubjectDropdownOpen(false);

            // Fetch Setup Data
            const fetchData = async () => {
                try {
                    const instRes = await axios.get('/api/setup/institutes');
                    setInstitutes(instRes.data);

                    const courseRes = await axios.get('/api/setup/courses');
                    setCourses(courseRes.data);
                } catch (error) {
                    console.error("Error fetching setup data:", error);
                }
            };
            fetchData();
        }
    }, [isOpen, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            const payload = { ...formData, role: role };
            await axios.post('/api/users', payload);

            setCreatedUser({ ...payload }); // Store to show success screen
            if (onSuccess) onSuccess(); // Refresh stats on dashboard
            setLoading(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating user');
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = `LMS Login Credentials:\nRole: ${role}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filter courses if institute selected
    const filteredCourses = formData.institute
        ? courses.filter(c => c.institute?._id === formData.institute || c.institute === formData.institute)
        : courses;

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    const uniqueSections = useMemo(() => {
        const secs = courseStudents.map(s => s.studentProfile?.section).filter(Boolean);
        const unique = [...new Set(secs)].sort();
        return unique.length > 0 ? unique : ['A', 'B', 'C'];
    }, [courseStudents]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-20 bg-blue-500 relative">
                    <div className="absolute inset-0 flex items-center px-5">
                        <h3 className="text-xl font-medium font-black text-white tracking-tight">
                            {createdUser ? 'Success!' : `Add New ${role}`}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {!createdUser ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                {user?.role === 'Institute' || user?.role === 'Editor' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                                            <div className="w-full bg-slate-100/70 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-500 cursor-not-allowed">
                                                {user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Assigned Institute')}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                required
                                                value={formData.institute}
                                                onChange={e => setFormData({ ...formData, institute: e.target.value, course: '' })}
                                            >
                                                <option value="">Select Institute</option>
                                                {institutes.map(inst => (
                                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Mobile Number</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.mobileNumber}
                                            onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                            placeholder="+91 98765"
                                        />
                                    </div>
                                </div>



                                {role === 'Student' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    required
                                                    value={formData.course}
                                                    onChange={e => {
                                                        const courseId = e.target.value;
                                                        const selectedCourseObj = courses.find(c => c._id === courseId);
                                                        const defaultSubjects = selectedCourseObj ? (selectedCourseObj.subjects || []).join(', ') : '';
                                                        setFormData({ 
                                                            ...formData, 
                                                            course: courseId, 
                                                            subject: defaultSubjects 
                                                        });
                                                    }}
                                                    disabled={user?.role !== 'Institute' && user?.role !== 'Editor' && !formData.institute}
                                                >
                                                    <option value="">Select Course</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
                                                {sectionPreview && (
                                                    <span className="text-[10px] text-violet-600 font-bold block mt-1.5 ml-1">
                                                        Auto-assigned: Section {sectionPreview}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Subject(s)</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all disabled:opacity-50"
                                                    value={formData.subject}
                                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                    placeholder="e.g. Maths, Science, English"
                                                    disabled={!formData.course}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Batch / Session</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                    value={formData.batch}
                                                    onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                                    placeholder="e.g. 2024-25"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {role === 'Teacher' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Assigned Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    value={formData.course}
                                                    onChange={e => setFormData({ ...formData, course: e.target.value, subjects: '' })}
                                                    disabled={user?.role !== 'Institute' && user?.role !== 'Editor' && !formData.institute}
                                                >
                                                    <option value="">Select Course</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Teaching Subjects</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (availableSubjects.length > 0) {
                                                            setSubjectDropdownOpen(!subjectDropdownOpen);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-750 flex justify-between items-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-left disabled:opacity-50"
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
                                                    <p className="mt-1.5 text-[10px] text-slate-400 italic">Select a course to view available subjects.</p>
                                                )}
                                            </div>
                                        </div>

                                        {formData.course && (
                                            <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-150 space-y-4 mt-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-3 block">Student Assignment Mode</label>
                                                    <div className="flex gap-4">
                                                        {[
                                                            { id: 'all', label: 'All Students' },
                                                            { id: 'section', label: 'Section Wise' },
                                                            { id: 'selected', label: 'Selected Students' }
                                                        ].map(mode => (
                                                            <label key={mode.id} className="flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="radio"
                                                                    name="studentAssignmentMode"
                                                                    checked={formData.studentAssignmentMode === mode.id}
                                                                    onChange={() => setFormData({ ...formData, studentAssignmentMode: mode.id })}
                                                                    className="text-indigo-650 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                                                                />
                                                                <span className="text-xs font-bold text-slate-700">{mode.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                {formData.studentAssignmentMode === 'section' && (
                                                    <div className="animate-fade-in space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Sections</label>
                                                        <div className="flex flex-wrap gap-3">
                                                            {uniqueSections.map(sec => {
                                                                const isChecked = formData.assignedSections.includes(sec);
                                                                return (
                                                                    <label key={sec} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-150 text-xs font-bold text-slate-700 select-none hover:bg-slate-50">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                const newSecs = isChecked
                                                                                    ? formData.assignedSections.filter(s => s !== sec)
                                                                                    : [...formData.assignedSections, sec];
                                                                                setFormData({ ...formData, assignedSections: newSecs });
                                                                            }}
                                                                            className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                                                        />
                                                                        <span>Section {sec}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {formData.studentAssignmentMode === 'selected' && (
                                                    <div className="animate-fade-in space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Students ({formData.assignedStudents.length} selected)</label>
                                                        {loadingStudents ? (
                                                            <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                                                                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                                <span>Loading course students...</span>
                                                            </div>
                                                        ) : courseStudents.length === 0 ? (
                                                            <p className="text-xs text-slate-450 italic">No students enrolled in this course yet.</p>
                                                        ) : (
                                                            <div className="border border-slate-150 rounded-2xl bg-white max-h-[160px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                                {courseStudents.map(student => {
                                                                    const studentId = student._id || student;
                                                                    const isChecked = formData.assignedStudents.includes(studentId);
                                                                    return (
                                                                        <label key={studentId} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer select-none">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                                                                    {student.name[0].toUpperCase()}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <p className="text-xs font-bold text-slate-700 truncate">{student.name}</p>
                                                                                    <p className="text-[9px] text-slate-400 truncate">Section: {student.studentProfile?.section || 'None'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => {
                                                                                    const newStudents = isChecked
                                                                                        ? formData.assignedStudents.filter(id => id !== studentId)
                                                                                        : [...formData.assignedStudents, studentId];
                                                                                    setFormData({ ...formData, assignedStudents: newStudents });
                                                                                }}
                                                                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Temporary Password</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-indigo-600 outline-none"
                                        value={formData.password}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {loading ? 'Creating Account...' : `Create ${role}`}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto rotate-12 group hover:rotate-0 transition-transform duration-500">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">User Created!</h4>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Account for <span className="text-slate-800 font-bold">{createdUser.name}</span> is ready.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4 relative overflow-hidden">
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute top-4 right-4 p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all active:scale-90"
                                    title="Copy to Clipboard"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Login Email</span>
                                    <p className="font-mono text-slate-800 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100">{createdUser.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Temporary Password</span>
                                    <p className="font-mono text-indigo-600 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100">{createdUser.password}</p>
                                </div>
                            </div>

                            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
                                Done
                            </button>
                        </div>
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

export default AddUserModal;
