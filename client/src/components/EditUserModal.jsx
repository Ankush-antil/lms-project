import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, Save, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

const DEFAULT_STUDENT_CONTROLS = {
    myActivity: {
        enabled: true,
        mode: 'hide',
        inbox: {
            upcoming: true,
            submitted: true,
            returned: true,
            evaluated: true,
            expired: true,
            studyMaterial: true,
            tools: true,
            analytics: true
        }
    },
    dashboard: {
        enabled: true,
        mode: 'hide'
    },
    feePortal: {
        enabled: true,
        mode: 'hide'
    },
    tools: {
        enabled: true,
        mode: 'hide',
        voiceRecorder: true,
        videoRecorder: true,
        fileUploader: true,
        notesWriting: true,
        screenshotTool: true,
        screenRecorder: true,
        webCalling: true
    },
    chat: {
        enabled: true,
        mode: 'hide',
        audioCall: true,
        videoCall: true,
        chatWithTeacher: true,
        chatWithAdmin: true,
        chatWithEditor: true
    }
};

const EditUserModal = ({ user, isOpen, onClose, onSuccess }) => {
    const { user: currentUser } = useAuth();
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
        section: '',
        callEnabled: false,
        studentAssignmentMode: 'all',
        assignedSections: [],
        assignedStudents: [],
        controls: DEFAULT_STUDENT_CONTROLS
    });
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    const [courseStudents, setCourseStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setSubjectDropdownOpen(false);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '', // Keep empty unless changing
                course: user.role === 'Student'
                    ? (user.studentProfile?.course?._id || user.studentProfile?.course || '')
                    : (user.teacherProfile?.assignedCourses?.[0]?._id || user.teacherProfile?.assignedCourses?.[0] || ''),
                institute: user.institute?._id || user.institute || (currentUser && currentUser.institute ? (typeof currentUser.institute === 'object' ? currentUser.institute._id : currentUser.institute) : ''),
                subjects: user.role === 'Teacher' ? (user.teacherProfile?.subjects?.join(', ') || '') : '',
                subject: user.role === 'Student' ? (user.studentProfile?.subject || '') : '',
                mobileNumber: user.mobileNumber || '',
                batch: user.role === 'Student' ? (user.studentProfile?.batch || '') : '',
                section: user.role === 'Student' ? (user.studentProfile?.section || '') : '',
                callEnabled: user.callEnabled || false,
                studentAssignmentMode: user.role === 'Teacher' ? (user.teacherProfile?.studentAssignmentMode || 'all') : 'all',
                assignedSections: user.role === 'Teacher' ? (user.teacherProfile?.assignedSections || []) : [],
                assignedStudents: user.role === 'Teacher' ? (user.teacherProfile?.assignedStudents?.map(s => s._id || s) || []) : [],
                controls: user.role === 'Student' && user.studentProfile?.controls ? user.studentProfile.controls : DEFAULT_STUDENT_CONTROLS
            });
            setError('');
            setActiveTab('basic');

            const fetchData = async () => {
                try {
                    const [instRes, courseRes] = await Promise.all([
                        axios.get('/api/setup/institutes'),
                        axios.get('/api/setup/courses')
                    ]);
                    setInstitutes(instRes.data);
                    setCourses(courseRes.data);
                } catch (error) {
                    console.error("Error fetching setup data:", error);
                }
            };
            fetchData();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (formData.course && user?.role === 'Teacher') {
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
    }, [formData.course, user]);

    const renderStudentControls = () => {
        const updateControl = (section, field, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (field === 'inbox') {
                    newControls.myActivity = {
                        ...newControls.myActivity,
                        inbox: {
                            ...newControls.myActivity.inbox,
                            ...value
                        }
                    };
                } else if (field === 'enabled' || field === 'mode') {
                    newControls[section] = {
                        ...newControls[section],
                        [field]: value
                    };
                } else {
                    newControls[section] = {
                        ...newControls[section],
                        [field]: value
                    };
                }
                return { ...prev, controls: newControls };
            });
        };

        const controls = formData.controls || DEFAULT_STUDENT_CONTROLS;

        return (
            <div className="space-y-6 animate-fade-in pb-4">
                {/* 1. My Activity */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ctrl_myActivity"
                                checked={controls.myActivity?.enabled !== false}
                                onChange={e => updateControl('myActivity', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="ctrl_myActivity" className="text-sm font-black text-slate-800 cursor-pointer select-none">1. My Activity</label>
                        </div>
                        {controls.myActivity?.enabled !== false && (
                            <select
                                value={controls.myActivity?.mode || 'hide'}
                                onChange={e => updateControl('myActivity', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                            >
                                <option value="hide">Hide</option>
                                <option value="disable">Disable</option>
                            </select>
                        )}
                    </div>
                    {controls.myActivity?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Inbox Tabs Visible</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'upcoming', label: 'Upcoming' },
                                    { id: 'submitted', label: 'Submitted' },
                                    { id: 'returned', label: 'Returned' },
                                    { id: 'evaluated', label: 'Evaluated' },
                                    { id: 'expired', label: 'Expired' },
                                    { id: 'studyMaterial', label: 'Study Material' },
                                    { id: 'tools', label: 'Tools' },
                                    { id: 'analytics', label: 'Analytics' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.myActivity?.inbox?.[item.id] !== false}
                                            onChange={e => updateControl('myActivity', 'inbox', { [item.id]: e.target.checked })}
                                            className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Dashboard */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ctrl_dashboard"
                            checked={controls.dashboard?.enabled !== false}
                            onChange={e => updateControl('dashboard', 'enabled', e.target.checked)}
                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                        />
                        <label htmlFor="ctrl_dashboard" className="text-sm font-black text-slate-800 cursor-pointer select-none">2. Dashboard</label>
                    </div>
                    {controls.dashboard?.enabled !== false && (
                        <select
                            value={controls.dashboard?.mode || 'hide'}
                            onChange={e => updateControl('dashboard', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    )}
                </div>

                {/* 3. Fee Portal */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ctrl_feePortal"
                            checked={controls.feePortal?.enabled !== false}
                            onChange={e => updateControl('feePortal', 'enabled', e.target.checked)}
                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                        />
                        <label htmlFor="ctrl_feePortal" className="text-sm font-black text-slate-800 cursor-pointer select-none">3. Fee Portal</label>
                    </div>
                    {controls.feePortal?.enabled !== false && (
                        <select
                            value={controls.feePortal?.mode || 'hide'}
                            onChange={e => updateControl('feePortal', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    )}
                </div>

                {/* 4. Tools */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ctrl_tools"
                                checked={controls.tools?.enabled !== false}
                                onChange={e => updateControl('tools', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="ctrl_tools" className="text-sm font-black text-slate-800 cursor-pointer select-none">4. Tools</label>
                        </div>
                        {controls.tools?.enabled !== false && (
                            <select
                                value={controls.tools?.mode || 'hide'}
                                onChange={e => updateControl('tools', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                            >
                                <option value="hide">Hide</option>
                                <option value="disable">Disable</option>
                            </select>
                        )}
                    </div>
                    {controls.tools?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Available Tools</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'voiceRecorder', label: 'Voice Recorder' },
                                    { id: 'videoRecorder', label: 'Video Recorder' },
                                    { id: 'fileUploader', label: 'File Uploader' },
                                    { id: 'notesWriting', label: 'Notes Writing' },
                                    { id: 'screenshotTool', label: 'Screenshot Tool' },
                                    { id: 'screenRecorder', label: 'Screen Recorder' },
                                    { id: 'webCalling', label: 'Web Calling' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.tools?.[item.id] !== false}
                                            onChange={e => updateControl('tools', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Chat */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ctrl_chat"
                                checked={controls.chat?.enabled !== false}
                                onChange={e => updateControl('chat', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="ctrl_chat" className="text-sm font-black text-slate-800 cursor-pointer select-none">5. Chat</label>
                        </div>
                        {controls.chat?.enabled !== false && (
                            <select
                                value={controls.chat?.mode || 'hide'}
                                onChange={e => updateControl('chat', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                            >
                                <option value="hide">Hide</option>
                                <option value="disable">Disable</option>
                            </select>
                        )}
                    </div>
                    {controls.chat?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-4">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Call Functions</span>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.chat?.audioCall !== false}
                                            onChange={e => updateControl('chat', 'audioCall', e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">Audio Call</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.chat?.videoCall !== false}
                                            onChange={e => updateControl('chat', 'videoCall', e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">Video Call</span>
                                    </label>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Allowed Contacts (Talk to)</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'chatWithTeacher', label: 'Teachers' },
                                        { id: 'chatWithAdmin', label: 'Admins' },
                                        { id: 'chatWithEditor', label: 'Editors' }
                                    ].map(item => (
                                        <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={controls.chat?.[item.id] !== false}
                                                onChange={e => updateControl('chat', item.id, e.target.checked)}
                                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {



            const payload = {
                name: formData.name,
                email: formData.email,
                institute: formData.institute,
                course: formData.course,
                subject: formData.subject,
                subjects: formData.subjects,
                mobileNumber: formData.mobileNumber,
                batch: formData.batch,
                section: formData.section,
                callEnabled: formData.callEnabled,
                studentAssignmentMode: formData.studentAssignmentMode,
                assignedSections: formData.assignedSections,
                assignedStudents: formData.assignedStudents,
                controls: formData.controls
            };

            if (formData.password.trim()) {
                payload.password = formData.password;
            }

            await axios.put(`/api/users/${user._id}`, payload);

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Error updating user');
        } finally {
            setLoading(false);
        }
    };

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

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className={`${user.role === 'Student' ? 'bg-[#0b1329]' : 'h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'} relative flex-shrink-0 px-6 pt-5 pb-0`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium font-black text-white tracking-tight">
                            Edit {user.role}: {user.name}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {user.role === 'Student' && (
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('basic')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                                    activeTab === 'basic'
                                        ? 'bg-white text-[#0b1329]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Basic Info
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('controls')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                                    activeTab === 'controls'
                                        ? 'bg-white text-[#0b1329]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Feature Controls
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-shake">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        {user.role === 'Student' && activeTab === 'controls' ? (
                            renderStudentControls()
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {currentUser?.role === 'Institute' || currentUser?.role === 'Editor' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                                            <div className="w-full bg-slate-100/70 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-500 cursor-not-allowed">
                                                {user.institute?.name || (typeof user.institute === 'string' ? user.institute : 'Assigned Institute')}
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

                                {user.role === 'Student' && (
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
                                                    disabled={currentUser?.role !== 'Institute' && currentUser?.role !== 'Editor' && !formData.institute}
                                                >
                                                    <option value="">Select Course</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
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
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Section</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                    value={formData.section}
                                                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {user.role === 'Teacher' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Assigned Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    value={formData.course}
                                                    onChange={e => setFormData({ ...formData, course: e.target.value, subjects: '' })}
                                                    disabled={currentUser?.role !== 'Institute' && currentUser?.role !== 'Editor' && !formData.institute}
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
                                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-4 w-4 accent-indigo-600 cursor-pointer"
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
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Update Password (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Leave blank to keep current"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save size={18} />
                            )}
                            {loading ? 'Saving Changes...' : 'Update Details'}
                        </button>
                    </form>
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

export default EditUserModal;
