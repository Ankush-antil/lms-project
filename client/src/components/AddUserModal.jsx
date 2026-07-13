import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const DEFAULT_STUDENT_CONTROLS = {
    myActivity: {
        enabled: true,
        mode: 'hide',
        note: '',
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
        mode: 'hide',
        note: ''
    },
    feePortal: {
        enabled: true,
        mode: 'hide',
        note: ''
    },
    tools: {
        enabled: true,
        mode: 'hide',
        note: '',
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
        note: '',
        audioCall: true,
        videoCall: true,
        chatWithTeacher: true,
        chatWithAdmin: true,
        chatWithEditor: true
    }
};

const DEFAULT_TEACHER_CONTROLS = {
    dashboard: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        receivingCalls: true,
        takeAction: true,
        attendance: true,
        contactStudents: true
    },
    studentActivities: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        student: true,
        inbox: true,
        inboxDetails: {
            assign: true,
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
    evaluate: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {}
    },
    snapshots: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        qrAttendance: true
    },
    tools: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        elementsControl: true,
        inputElements: true,
        displayingElements: true,
        recordingElements: true,
        advanceElements: true,
        addons: true,
        theme: true,
        createWithAi: true,
        integrate: true,
        import: true,
        saveAsTemplate: true,
        decideActivity: true,
        templates: true,
        locationLocked: true,
        logicRules: true,
        monitoring: true,
        connectIt: true,
        profileUnderSettings: true,
        moreSettings: true,
        responses: true,
        collaborate: true,
        manageAccess: true,
        publicToWeb: true
    },
    chat: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        audioCall: true,
        videoCall: true,
        chatStudent: true,
        chatEditor: true,
        chatInstitute: true
    }
};
const DEFAULT_EDITOR_CONTROLS = {
    dashboard: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        createCourse: true,
        launchTestBuilder: true
    },
    teachers: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        addNewTeacher: true
    },
    courses: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        addNewCourses: true
    },
    subjects: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        addSubject: true
    },
    activities: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        createNewAssessment: true,
        lmsConnectedTests: true,
        publicWebTests: true,
        draftTests: true
    },
    tools: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {}
    },
    chat: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        teacher: true,
        editor: true,
        students: true
    }
};

const DEFAULT_ACCOUNTANT_CONTROLS = {
    feePortal: {
        enabled: true,
        mode: 'hide',
        note: '',
        collectFee: true,
        editStructure: true,
        deleteTransaction: true,
        googleSheets: true,
        viewReports: true
    },
    chat: {
        enabled: true,
        mode: 'hide',
        note: '',
        subNotes: {},
        teacher: true,
        editor: true,
        students: true,
        chatWithAdmin: true,
        chatWithTeacher: true,
        chatWithEditor: true,
        chatWithStudent: true
    },
    drive: {
        enabled: true,
        mode: 'hide',
        note: '',
        uploadFiles: true,
        deleteFiles: true
    },
    notes: {
        enabled: true,
        mode: 'hide',
        note: '',
        createNotes: true,
        deleteNotes: true
    }
};

const getInboxTabLabel = (key) => {
    const labels = {
        upcoming: 'Upcoming',
        submitted: 'Submitted',
        returned: 'Returned',
        evaluated: 'Evaluated',
        expired: 'Expired',
        studyMaterial: 'Study Material',
        tools: 'Tools',
        analytics: 'Analytics'
    };
    return labels[key] || key;
};

const getToolLabel = (key) => {
    const labels = {
        voiceRecorder: 'Voice Recorder',
        videoRecorder: 'Video Recorder',
        fileUploader: 'File Uploader',
        notesWriting: 'Notes Writing',
        screenshotTool: 'Screenshot Tool',
        screenRecorder: 'Screen Recorder',
        webCalling: 'Web Calling'
    };
    return labels[key] || key;
};

const getChatLabel = (key) => {
    const labels = {
        audioCall: 'Audio Call',
        videoCall: 'Video Call',
        chatWithTeacher: 'Teacher Chat',
        chatWithAdmin: 'Admin Chat',
        chatWithEditor: 'Editor Chat'
    };
    return labels[key] || key;
};

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
        assignedStudents: [],
        controls: DEFAULT_STUDENT_CONTROLS,
        demoCourse: '',
        demoDuration: 1
    });
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [sectionPreview, setSectionPreview] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const [controlsScope, setControlsScope] = useState('single');
    const [selectedPropagationStudents, setSelectedPropagationStudents] = useState([]);

    const [courseStudents, setCourseStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [instituteTeachers, setInstituteTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [instituteDetails, setInstituteDetails] = useState(null);

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
        if (formData.course && (role === 'Teacher' || role === 'Student' || role === 'Editor')) {
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
            setControlsScope('single');
            setSelectedPropagationStudents([]);
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
                assignedStudents: [],
                controls: role === 'Student'
                    ? DEFAULT_STUDENT_CONTROLS
                    : (role === 'Teacher' ? DEFAULT_TEACHER_CONTROLS : (role === 'Editor' ? DEFAULT_EDITOR_CONTROLS : (role === 'Accountant' ? DEFAULT_ACCOUNTANT_CONTROLS : DEFAULT_STUDENT_CONTROLS))),
                parentProfile: {
                    student: ''
                },
                demoCourse: '',
                demoDuration: 1
            });
            setCreatedUser(null);
            setSubjectDropdownOpen(false);
            setActiveTab('basic');

            // Fetch Setup Data
            const fetchData = async () => {
                try {
                    const [instRes, courseRes, singleInstRes, studentsRes] = await Promise.all([
                        axios.get('/api/setup/institutes'),
                        axios.get('/api/setup/courses'),
                        userInstId ? axios.get(`/api/setup/institutes/${userInstId}`) : Promise.resolve({ data: null }),
                        axios.get('/api/users?role=Student')
                    ]);
                    setInstitutes(instRes.data);
                    setCourses(courseRes.data);
                    setAllStudents(studentsRes.data || []);
                    if (singleInstRes && singleInstRes.data) {
                        setInstituteDetails(singleInstRes.data);
                    } else if (instRes.data) {
                        setInstituteDetails(instRes.data.find(i => i._id === userInstId) || instRes.data[0]);
                    }
                } catch (error) {
                    console.error("Error fetching setup data:", error);
                }
            };
            fetchData();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (isOpen && role === 'Teacher') {
            const fetchTeachers = async () => {
                try {
                    setLoadingTeachers(true);
                    const instId = user?.institute?._id || user?.institute || (formData.institute);
                    if (instId) {
                        const { data } = await axios.get(`/api/users?role=Teacher`);
                        setInstituteTeachers(data.filter(t => t.institute?._id === instId || t.institute === instId));
                    }
                } catch (error) {
                    console.error("Error fetching institute teachers:", error);
                } finally {
                    setLoadingTeachers(false);
                }
            };
            fetchTeachers();
        } else {
            setInstituteTeachers([]);
        }
    }, [isOpen, role, formData.institute]);

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

        const updateSubNote = (section, key, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                if (!newControls[section].subNotes) newControls[section].subNotes = {};
                newControls[section].subNotes = {
                    ...newControls[section].subNotes,
                    [key]: value
                };
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
                        <select
                            value={controls.myActivity?.mode || 'hide'}
                            onChange={e => updateControl('myActivity', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    </div>
                    {controls.myActivity?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.myActivity?.note || ''}
                                onChange={e => updateControl('myActivity', 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Please clear your dues to activate)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
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
                            {/* Sub-tab Notes */}
                            {Object.entries(controls.myActivity?.inbox || {}).some(([k, v]) => v === false) && (
                                <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sub-tab Deactivation Reasons</span>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {Object.entries(controls.myActivity?.inbox || {}).map(([key, isEnabled]) => {
                                            if (isEnabled === false) {
                                                const label = getInboxTabLabel(key);
                                                return (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-650 min-w-[120px]">{label}:</span>
                                                        <input
                                                            type="text"
                                                            value={controls.myActivity?.subNotes?.[key] || ''}
                                                            onChange={e => updateSubNote('myActivity', key, e.target.value)}
                                                            placeholder={`Reason for hiding ${label}`}
                                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Dashboard */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
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
                        <select
                            value={controls.dashboard?.mode || 'hide'}
                            onChange={e => updateControl('dashboard', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    </div>
                    {controls.dashboard?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.dashboard?.note || ''}
                                onChange={e => updateControl('dashboard', 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Dashboard access restricted)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* 3. Fee Portal */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
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
                        <select
                            value={controls.feePortal?.mode || 'hide'}
                            onChange={e => updateControl('feePortal', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    </div>
                    {controls.feePortal?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.feePortal?.note || ''}
                                onChange={e => updateControl('feePortal', 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Fees pending - contact accounts)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
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
                        <select
                            value={controls.tools?.mode || 'hide'}
                            onChange={e => updateControl('tools', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    </div>
                    {controls.tools?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.tools?.note || ''}
                                onChange={e => updateControl('tools', 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Tools restricted)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
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
                            {/* Sub-tool Notes */}
                            {Object.entries(controls.tools || {}).some(([k, v]) => ['voiceRecorder', 'videoRecorder', 'fileUploader', 'notesWriting', 'screenshotTool', 'screenRecorder', 'webCalling'].includes(k) && v === false) && (
                                <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sub-tool Deactivation Reasons</span>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {['voiceRecorder', 'videoRecorder', 'fileUploader', 'notesWriting', 'screenshotTool', 'screenRecorder', 'webCalling'].map(key => {
                                            const isEnabled = controls.tools?.[key] !== false;
                                            if (isEnabled === false) {
                                                const label = getToolLabel(key);
                                                return (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-650 min-w-[120px]">{label}:</span>
                                                        <input
                                                            type="text"
                                                            value={controls.tools?.subNotes?.[key] || ''}
                                                            onChange={e => updateSubNote('tools', key, e.target.value)}
                                                            placeholder={`Reason for hiding/disabling ${label}`}
                                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
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
                        <select
                            value={controls.chat?.mode || 'hide'}
                            onChange={e => updateControl('chat', 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                    </div>
                    {controls.chat?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.chat?.note || ''}
                                onChange={e => updateControl('chat', 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Chat restricted)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
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
                            {/* Sub-chat Notes */}
                            {['audioCall', 'videoCall', 'chatWithTeacher', 'chatWithAdmin', 'chatWithEditor'].some(k => controls.chat?.[k] === false) && (
                                <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sub-chat Deactivation Reasons</span>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {['audioCall', 'videoCall', 'chatWithTeacher', 'chatWithAdmin', 'chatWithEditor'].map(key => {
                                            const isEnabled = controls.chat?.[key] !== false;
                                            if (isEnabled === false) {
                                                const label = getChatLabel(key);
                                                return (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-650 min-w-[120px]">{label}:</span>
                                                        <input
                                                            type="text"
                                                            value={controls.chat?.subNotes?.[key] || ''}
                                                            onChange={e => updateSubNote('chat', key, e.target.value)}
                                                            placeholder={`Reason for hiding/disabling ${label}`}
                                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Propagation Scope Selection */}
                <div className="bg-slate-100/70 p-5 rounded-3xl border border-slate-200/60 mt-6 space-y-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Apply These Settings To</span>
                        <p className="text-[10px] text-slate-450 font-semibold leading-normal">Propagate these feature control and note settings to other students in the system.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { value: 'single', label: 'This Student Only' },
                            { value: 'course', label: 'All Students of Course' },
                            { value: 'selected', label: 'Selected Students' },
                            { value: 'all', label: 'All Students of this Institute' }
                        ].map(opt => (
                            <label key={opt.value} className={`flex items-center gap-3 bg-white border rounded-2xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${controlsScope === opt.value ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                                <input
                                    type="radio"
                                    name="controlsScope"
                                    value={opt.value}
                                    checked={controlsScope === opt.value}
                                    onChange={() => setControlsScope(opt.value)}
                                    className="rounded-full border-slate-350 text-[#3E3ADD] focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-750">{opt.label}</span>
                            </label>
                        ))}
                    </div>

                    {controlsScope === 'selected' && (
                        <div className="bg-white border border-slate-200 rounded-3xl p-4 mt-3 space-y-3 max-h-60 overflow-y-auto animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-700">Select Students to Apply Settings</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPropagationStudents(courseStudents.map(s => s._id))}
                                        className="text-[10px] font-bold text-[#3E3ADD] hover:underline cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-350 text-[10px]">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPropagationStudents([])}
                                        className="text-[10px] font-bold text-slate-400 hover:underline cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {loadingStudents ? (
                                <div className="text-xs text-slate-450 text-center py-4">Loading students...</div>
                            ) : courseStudents.length === 0 ? (
                                <div className="text-xs text-slate-450 text-center py-4">No other students in this course.</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {courseStudents.map(student => {
                                        const isChecked = selectedPropagationStudents.includes(student._id);
                                        return (
                                            <label key={student._id} className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-150'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setSelectedPropagationStudents(prev => prev.filter(id => id !== student._id));
                                                        } else {
                                                            setSelectedPropagationStudents(prev => [...prev, student._id]);
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-[#3E3ADD] focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-700 truncate">{student.name}</span>
                                                    <span className="text-[9px] font-semibold text-slate-450">{student.admissionNo || 'No ID'}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTeacherControls = () => {
        const updateControl = (section, field, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (field === 'inboxDetails') {
                    newControls.studentActivities = {
                        ...newControls.studentActivities,
                        inboxDetails: {
                            ...newControls.studentActivities.inboxDetails,
                            ...value
                        }
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

        const updateSubNote = (section, key, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                if (!newControls[section].subNotes) newControls[section].subNotes = {};
                newControls[section].subNotes = {
                    ...newControls[section].subNotes,
                    [key]: value
                };
                return { ...prev, controls: newControls };
            });
        };

        const controls = formData.controls || DEFAULT_TEACHER_CONTROLS;
        const activitiesAllowed = instituteDetails?.controls?.tools || {};

        return (
            <div className="space-y-6 animate-fade-in pb-4">
                {/* 1. Dashboard Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_dashboard"
                                checked={controls.dashboard?.enabled !== false}
                                onChange={e => updateControl('dashboard', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_dashboard" className="text-sm font-black text-slate-800 cursor-pointer">Dashboard Page</label>
                        </div>
                        {controls.dashboard?.enabled === false && (
                            <select
                                value={controls.dashboard?.mode || 'hide'}
                                onChange={e => updateControl('dashboard', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.dashboard?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled? (e.g. Under Maintenance)"
                                value={controls.dashboard?.note || ''}
                                onChange={e => updateControl('dashboard', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}

                    {controls.dashboard?.enabled !== false && (
                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dashboard Sub-activities</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'receivingCalls', label: 'Receiving Calls' },
                                        { id: 'takeAction', label: 'Take Action Button' },
                                        { id: 'attendance', label: 'Attendance Management' },
                                        { id: 'contactStudents', label: 'Contact Students Button' }
                                    ].map(item => (
                                        <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={controls.dashboard?.[item.id] !== false}
                                                onChange={e => updateControl('dashboard', item.id, e.target.checked)}
                                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sub Notes */}
                            {['receivingCalls', 'takeAction', 'attendance', 'contactStudents'].some(k => controls.dashboard?.[k] === false) && (
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sub-dashboard Deactivation Reasons</span>
                                    {['receivingCalls', 'takeAction', 'attendance', 'contactStudents'].map(k => {
                                        if (controls.dashboard?.[k] === false) {
                                            const label = k === 'receivingCalls' ? 'Receiving Calls' : k === 'takeAction' ? 'Take Action' : k === 'attendance' ? 'Attendance' : 'Contact Students';
                                            return (
                                                <div key={k} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-600 min-w-[120px]">{label}:</span>
                                                    <input
                                                        type="text"
                                                        value={controls.dashboard?.subNotes?.[k] || ''}
                                                        onChange={e => updateSubNote('dashboard', k, e.target.value)}
                                                        placeholder={`Reason for hiding/disabling ${label}`}
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Student Activities Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_studentActivities"
                                checked={controls.studentActivities?.enabled !== false}
                                onChange={e => updateControl('studentActivities', 'enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_studentActivities" className="text-sm font-black text-slate-800 cursor-pointer">Student Activities Page</label>
                        </div>
                        {controls.studentActivities?.enabled === false && (
                            <select
                                value={controls.studentActivities?.mode || 'hide'}
                                onChange={e => updateControl('studentActivities', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.studentActivities?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled?"
                                value={controls.studentActivities?.note || ''}
                                onChange={e => updateControl('studentActivities', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}

                    {controls.studentActivities?.enabled !== false && (
                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sections Control</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'student', label: 'Students View' },
                                        { id: 'inbox', label: 'Inbox View' }
                                    ].map(item => (
                                        <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={controls.studentActivities?.[item.id] !== false}
                                                onChange={e => updateControl('studentActivities', item.id, e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {controls.studentActivities?.inbox !== false && (
                                <div className="border-t border-slate-200/60 pt-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Inbox Cards Allowed</span>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'assign', label: 'Assign Test' },
                                            { id: 'upcoming', label: 'Upcoming' },
                                            { id: 'submitted', label: 'Submitted' },
                                            { id: 'returned', label: 'Returned' },
                                            { id: 'evaluated', label: 'Evaluated' },
                                            { id: 'expired', label: 'Expired' },
                                            { id: 'studyMaterial', label: 'Study Material' },
                                            { id: 'tools', label: 'Practice Tools' },
                                            { id: 'analytics', label: 'Analytics' }
                                        ].map(item => (
                                            <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={controls.studentActivities?.inboxDetails?.[item.id] !== false}
                                                    onChange={e => updateControl('studentActivities', 'inboxDetails', { [item.id]: e.target.checked })}
                                                    className="rounded border-slate-300 text-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sub notes */}
                            {['student', 'inbox'].some(k => controls.studentActivities?.[k] === false) && (
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sub-activities Deactivation Reasons</span>
                                    {['student', 'inbox'].map(k => {
                                        if (controls.studentActivities?.[k] === false) {
                                            const label = k === 'student' ? 'Students View' : 'Inbox View';
                                            return (
                                                <div key={k} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-600 min-w-[120px]">{label}:</span>
                                                    <input
                                                        type="text"
                                                        value={controls.studentActivities?.subNotes?.[k] || ''}
                                                        onChange={e => updateSubNote('studentActivities', k, e.target.value)}
                                                        placeholder={`Reason for hiding/disabling ${label}`}
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Evaluate Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_evaluate"
                                checked={controls.evaluate?.enabled !== false}
                                onChange={e => updateControl('evaluate', 'enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_evaluate" className="text-sm font-black text-slate-800 cursor-pointer">Evaluate Page</label>
                        </div>
                        {controls.evaluate?.enabled === false && (
                            <select
                                value={controls.evaluate?.mode || 'hide'}
                                onChange={e => updateControl('evaluate', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.evaluate?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled?"
                                value={controls.evaluate?.note || ''}
                                onChange={e => updateControl('evaluate', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* 4. Snapshots Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_snapshots"
                                checked={controls.snapshots?.enabled !== false}
                                onChange={e => updateControl('snapshots', 'enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_snapshots" className="text-sm font-black text-slate-800 cursor-pointer">Snapshots Page</label>
                        </div>
                        {controls.snapshots?.enabled === false && (
                            <select
                                value={controls.snapshots?.mode || 'hide'}
                                onChange={e => updateControl('snapshots', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.snapshots?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled?"
                                value={controls.snapshots?.note || ''}
                                onChange={e => updateControl('snapshots', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}

                    {controls.snapshots?.enabled !== false && (
                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Snapshots Sub-activities</span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={controls.snapshots?.qrAttendance !== false}
                                        onChange={e => updateControl('snapshots', 'qrAttendance', e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="text-xs font-semibold text-slate-700">QR Attendance View</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Tools Controls (Hierarchical checks from parent Institute) */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_tools"
                                checked={controls.tools?.enabled !== false}
                                onChange={e => updateControl('tools', 'enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_tools" className="text-sm font-black text-slate-800 cursor-pointer">Tools Page</label>
                        </div>
                        {controls.tools?.enabled === false && (
                            <select
                                value={controls.tools?.mode || 'hide'}
                                onChange={e => updateControl('tools', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.tools?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled?"
                                value={controls.tools?.note || ''}
                                onChange={e => updateControl('tools', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}

                    {controls.tools?.enabled !== false && (
                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tools Pages (Inherited from Institute)</span>
                                
                                {(() => {
                                    const isFormBuilderAllowedByInstitute = activitiesAllowed.formBuilderTool !== false;
                                    const isDatabaseAllowedByInstitute = activitiesAllowed.databaseCreatorTool !== false;
                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <label className={`flex items-center gap-2 cursor-pointer select-none p-2 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 transition-all ${!isFormBuilderAllowedByInstitute ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={!isFormBuilderAllowedByInstitute}
                                                        checked={isFormBuilderAllowedByInstitute && controls.tools?.formBuilderTool !== false}
                                                        onChange={e => updateControl('tools', 'formBuilderTool', e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-555 h-3.5 w-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-black text-slate-800 flex flex-col">
                                                        <span>📝 Form Builder Tool</span>
                                                        {!isFormBuilderAllowedByInstitute && <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-none mt-0.5">(Disabled by Admin)</span>}
                                                    </span>
                                                </label>

                                                <label className={`flex items-center gap-2 cursor-pointer select-none p-2 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 transition-all ${!isDatabaseAllowedByInstitute ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={!isDatabaseAllowedByInstitute}
                                                        checked={isDatabaseAllowedByInstitute && controls.tools?.databaseCreatorTool !== false}
                                                        onChange={e => updateControl('tools', 'databaseCreatorTool', e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-555 h-3.5 w-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-black text-slate-800 flex flex-col">
                                                        <span>🗄️ Database Creator Tool</span>
                                                        {!isDatabaseAllowedByInstitute && <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-none mt-0.5">(Disabled by Admin)</span>}
                                                    </span>
                                                </label>
                                            </div>

                                            {isFormBuilderAllowedByInstitute && controls.tools?.formBuilderTool !== false && (
                                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-150/60 space-y-3">
                                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Form Builder Sub-features</span>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'elementsControl', label: 'Elements Control' },
                                                            { id: 'inputElements', label: 'Input Elements' },
                                                            { id: 'displayingElements', label: 'Displaying Elements' },
                                                            { id: 'recordingElements', label: 'Recording Elements' },
                                                            { id: 'advanceElements', label: 'Advance Elements' },
                                                            { id: 'addons', label: 'Add-ons' },
                                                            { id: 'theme', label: 'Theme Styling' },
                                                            { id: 'createWithAi', label: 'Create with AI' },
                                                            { id: 'integrate', label: 'Integrate' },
                                                            { id: 'import', label: 'Import Options' },
                                                            { id: 'saveAsTemplate', label: 'Save As Template' },
                                                            { id: 'decideActivity', label: 'Decide Activity' },
                                                            { id: 'templates', label: 'Use Templates' },
                                                            { id: 'locationLocked', label: 'Location Lock' },
                                                            { id: 'logicRules', label: 'Logic Rules' },
                                                            { id: 'monitoring', label: 'Proctoring/Monitoring' },
                                                            { id: 'connectIt', label: 'Connect It' },
                                                            { id: 'profileUnderSettings', label: 'Settings Profile' },
                                                            { id: 'moreSettings', label: 'More Settings' },
                                                            { id: 'responses', label: 'View Responses' },
                                                            { id: 'collaborate', label: 'Collaborate' },
                                                            { id: 'manageAccess', label: 'Manage Access' },
                                                            { id: 'publicToWeb', label: 'Publish to Web' }
                                                        ].map(item => {
                                                            const isAllowedByInstitute = activitiesAllowed[item.id] !== false;
                                                            return (
                                                                <label key={item.id} className={`flex items-center gap-2 cursor-pointer select-none ${!isAllowedByInstitute ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={!isAllowedByInstitute}
                                                                        checked={isAllowedByInstitute && controls.tools?.[item.id] !== false}
                                                                        onChange={e => updateControl('tools', item.id, e.target.checked)}
                                                                        className="rounded border-slate-300 text-indigo-555 h-3.5 w-3.5 cursor-pointer"
                                                                    />
                                                                    <span className="text-xs font-semibold text-slate-700">
                                                                        {item.label} {!isAllowedByInstitute && <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block leading-none mt-0.5">(Disabled by Admin)</span>}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. Chat Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="t_ctrl_chat"
                                checked={controls.chat?.enabled !== false}
                                onChange={e => updateControl('chat', 'enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="t_ctrl_chat" className="text-sm font-black text-slate-800 cursor-pointer">Chat Platform</label>
                        </div>
                        {controls.chat?.enabled === false && (
                            <select
                                value={controls.chat?.mode || 'hide'}
                                onChange={e => updateControl('chat', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>

                    {controls.chat?.enabled === false && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lock Message Note</label>
                            <input
                                type="text"
                                placeholder="Why is this page hidden/disabled?"
                                value={controls.chat?.note || ''}
                                onChange={e => updateControl('chat', 'note', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}

                    {controls.chat?.enabled !== false && (
                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Chat Options & Calling</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'audioCall', label: 'Audio Call' },
                                        { id: 'videoCall', label: 'Video Call' },
                                        { id: 'chatStudent', label: 'Chat with Students' },
                                        { id: 'chatEditor', label: 'Chat with Editors' },
                                        { id: 'chatInstitute', label: 'Chat with Institute' }
                                    ].map(item => (
                                        <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={controls.chat?.[item.id] !== false}
                                                onChange={e => updateControl('chat', item.id, e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-555 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sub Notes */}
                            {['audioCall', 'videoCall', 'chatStudent', 'chatEditor', 'chatInstitute'].some(k => controls.chat?.[k] === false) && (
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sub-chat Deactivation Reasons</span>
                                    {['audioCall', 'videoCall', 'chatStudent', 'chatEditor', 'chatInstitute'].map(k => {
                                        if (controls.chat?.[k] === false) {
                                            const label = k === 'audioCall' ? 'Audio Call' : k === 'videoCall' ? 'Video Call' : k === 'chatStudent' ? 'Student Chat' : k === 'chatEditor' ? 'Editor Chat' : 'Institute Chat';
                                            return (
                                                <div key={k} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-600 min-w-[120px]">{label}:</span>
                                                    <input
                                                        type="text"
                                                        value={controls.chat?.subNotes?.[k] || ''}
                                                        onChange={e => updateSubNote('chat', k, e.target.value)}
                                                        placeholder={`Reason for hiding/disabling ${label}`}
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Propagation Scope Selection */}
                <div className="bg-slate-100/70 p-5 rounded-3xl border border-slate-200/60 mt-6 space-y-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Apply These Settings To</span>
                        <p className="text-[10px] text-slate-450 font-semibold leading-normal">Propagate these feature control and deactivation note settings to other teachers in the system.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { value: 'single', label: 'This Teacher Only' },
                            { value: 'selected', label: 'Selected Teachers' },
                            { value: 'all', label: 'All Teachers of this Institute' }
                        ].map(opt => (
                            <label key={opt.value} className={`flex items-center gap-3 bg-white border rounded-2xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${controlsScope === opt.value ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                                <input
                                    type="radio"
                                    name="controlsScope"
                                    value={opt.value}
                                    checked={controlsScope === opt.value}
                                    onChange={() => setControlsScope(opt.value)}
                                    className="rounded-full border-slate-355 text-[#3E3ADD] focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-700">{opt.label}</span>
                            </label>
                        ))}
                    </div>

                    {controlsScope === 'selected' && (
                        <div className="bg-white border border-slate-200 rounded-3xl p-4 mt-3 space-y-3 max-h-60 overflow-y-auto animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-700">Select Teachers to Apply Settings</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPropagationStudents(instituteTeachers.map(t => t._id))}
                                        className="text-[10px] font-bold text-[#3E3ADD] hover:underline cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-300 text-[10px]">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPropagationStudents([])}
                                        className="text-[10px] font-bold text-slate-400 hover:underline cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {loadingTeachers ? (
                                <div className="text-xs text-slate-400 text-center py-4">Loading teachers...</div>
                            ) : instituteTeachers.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-4">No other teachers in this institute.</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {instituteTeachers.map(teacher => {
                                        const isChecked = selectedPropagationStudents.includes(teacher._id);
                                        return (
                                            <label key={teacher._id} className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-150'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setSelectedPropagationStudents(prev => prev.filter(id => id !== teacher._id));
                                                        } else {
                                                            setSelectedPropagationStudents(prev => [...prev, teacher._id]);
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-[#3E3ADD] focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-700 truncate">{teacher.name}</span>
                                                    <span className="text-[9px] font-semibold text-slate-450 truncate">{teacher.email}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEditorControls = () => {
        const updateControl = (section, field, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                newControls[section] = {
                    ...newControls[section],
                    [field]: value
                };
                return { ...prev, controls: newControls };
            });
        };

        const controls = formData.controls || DEFAULT_EDITOR_CONTROLS;

        return (
            <div className="space-y-6 animate-fade-in pb-4">
                {/* 1. Dashboard Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_dashboard"
                                checked={controls.dashboard?.enabled !== false}
                                onChange={e => updateControl('dashboard', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_dashboard" className="text-sm font-black text-slate-800 cursor-pointer select-none">Dashboard Page</label>
                        </div>
                        {controls.dashboard?.enabled === false && (
                            <select
                                value={controls.dashboard?.mode || 'hide'}
                                onChange={e => updateControl('dashboard', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.dashboard?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.dashboard?.note || ''}
                                onChange={e => updateControl('dashboard', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.dashboard?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'createCourse', label: 'Create Course' },
                                    { id: 'launchTestBuilder', label: 'Launch Test Builder' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.dashboard?.[item.id] !== false}
                                            onChange={e => updateControl('dashboard', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Teachers Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_teachers"
                                checked={controls.teachers?.enabled !== false}
                                onChange={e => updateControl('teachers', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_teachers" className="text-sm font-black text-slate-800 cursor-pointer select-none">Teachers Page</label>
                        </div>
                        {controls.teachers?.enabled === false && (
                            <select
                                value={controls.teachers?.mode || 'hide'}
                                onChange={e => updateControl('teachers', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.teachers?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.teachers?.note || ''}
                                onChange={e => updateControl('teachers', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.teachers?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'addNewTeacher', label: 'Add New Teacher' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.teachers?.[item.id] !== false}
                                            onChange={e => updateControl('teachers', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Courses Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_courses"
                                checked={controls.courses?.enabled !== false}
                                onChange={e => updateControl('courses', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_courses" className="text-sm font-black text-slate-800 cursor-pointer select-none">Courses Page</label>
                        </div>
                        {controls.courses?.enabled === false && (
                            <select
                                value={controls.courses?.mode || 'hide'}
                                onChange={e => updateControl('courses', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.courses?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.courses?.note || ''}
                                onChange={e => updateControl('courses', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.courses?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'addNewCourses', label: 'Add New Courses' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.courses?.[item.id] !== false}
                                            onChange={e => updateControl('courses', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Subjects Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_subjects"
                                checked={controls.subjects?.enabled !== false}
                                onChange={e => updateControl('subjects', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_subjects" className="text-sm font-black text-slate-800 cursor-pointer select-none">Subjects Page</label>
                        </div>
                        {controls.subjects?.enabled === false && (
                            <select
                                value={controls.subjects?.mode || 'hide'}
                                onChange={e => updateControl('subjects', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.subjects?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.subjects?.note || ''}
                                onChange={e => updateControl('subjects', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.subjects?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'addSubject', label: 'Add Subject' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.subjects?.[item.id] !== false}
                                            onChange={e => updateControl('subjects', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Activities Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_activities"
                                checked={controls.activities?.enabled !== false}
                                onChange={e => updateControl('activities', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_activities" className="text-sm font-black text-slate-800 cursor-pointer select-none">Activities Page</label>
                        </div>
                        {controls.activities?.enabled === false && (
                            <select
                                value={controls.activities?.mode || 'hide'}
                                onChange={e => updateControl('activities', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.activities?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.activities?.note || ''}
                                onChange={e => updateControl('activities', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.activities?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'createNewAssessment', label: 'Create New Assessment' },
                                    { id: 'lmsConnectedTests', label: 'LMS Connected Tests' },
                                    { id: 'publicWebTests', label: 'Public Web Tests' },
                                    { id: 'draftTests', label: 'Draft Tests' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.activities?.[item.id] !== false}
                                            onChange={e => updateControl('activities', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. Tools Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_tools"
                                checked={controls.tools?.enabled !== false}
                                onChange={e => updateControl('tools', 'enabled', e.target.checked)}
                                className="rounded border-slate-355 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_tools" className="text-sm font-black text-slate-800 cursor-pointer select-none">Tools Page</label>
                        </div>
                        {controls.tools?.enabled === false && (
                            <select
                                value={controls.tools?.mode || 'hide'}
                                onChange={e => updateControl('tools', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.tools?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.tools?.note || ''}
                                onChange={e => updateControl('tools', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* 7. Chat Controls */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="e_ctrl_chat"
                                checked={controls.chat?.enabled !== false}
                                onChange={e => updateControl('chat', 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor="e_ctrl_chat" className="text-sm font-black text-slate-800 cursor-pointer select-none">Chat Page</label>
                        </div>
                        {controls.chat?.enabled === false && (
                            <select
                                value={controls.chat?.mode || 'hide'}
                                onChange={e => updateControl('chat', 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {controls.chat?.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={controls.chat?.note || ''}
                                onChange={e => updateControl('chat', 'note', e.target.value)}
                                placeholder="Enter reason"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {controls.chat?.enabled !== false && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-controls</span>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'teacher', label: 'Teacher Chat' },
                                    { id: 'editor', label: 'Editor Chat' },
                                    { id: 'students', label: 'Student Chat' }
                                ].map(item => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={controls.chat?.[item.id] !== false}
                                            onChange={e => updateControl('chat', item.id, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-750">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAccountantControls = () => {
        const updateControl = (section, field, value) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                newControls[section] = {
                    ...newControls[section],
                    [field]: value
                };
                return { ...prev, controls: newControls };
            });
        };

        const controls = formData.controls || DEFAULT_ACCOUNTANT_CONTROLS;

        const subControlOptions = {
            feePortal: [
                { key: 'collectFee', label: 'Record Collections / Collect Fee' },
                { key: 'editStructure', label: 'Setup Student Fee Structure' },
                { key: 'deleteTransaction', label: 'Delete recorded Transactions' },
                { key: 'googleSheets', label: 'Google Sheets Sync Integration' },
                { key: 'viewReports', label: 'Financial Reports & Charts' }
            ],
            chat: [
                { key: 'chatWithAdmin', label: 'Chat with Institute Admins' },
                { key: 'chatWithTeacher', label: 'Chat with Faculty Teachers' },
                { key: 'chatWithEditor', label: 'Chat with Fellow Editors' },
                { key: 'chatWithStudent', label: 'Chat with Enrolled Students' }
            ],
            drive: [
                { key: 'uploadFiles', label: 'Upload files and directories' },
                { key: 'deleteFiles', label: 'Delete files and directories' }
            ],
            notes: [
                { key: 'createNotes', label: 'Create and edit notes' },
                { key: 'deleteNotes', label: 'Delete notes' }
            ]
        };

        const renderControlCard = (key, label, checkboxId) => {
            const ctrl = controls[key] || { enabled: true, mode: 'hide', note: '' };
            const subs = subControlOptions[key] || [];

            return (
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={checkboxId}
                                checked={ctrl.enabled !== false}
                                onChange={e => updateControl(key, 'enabled', e.target.checked)}
                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4.5 w-4.5 cursor-pointer"
                            />
                            <label htmlFor={checkboxId} className="text-sm font-black text-slate-800 cursor-pointer select-none">{label}</label>
                        </div>
                        {ctrl.enabled === false && (
                            <select
                                value={ctrl.mode || 'hide'}
                                onChange={e => updateControl(key, 'mode', e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="hide">Hide completely</option>
                                <option value="disable">Show as disabled</option>
                            </select>
                        )}
                    </div>
                    {ctrl.enabled === false && (
                        <div className="w-full animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                            <input
                                type="text"
                                value={ctrl.note || ''}
                                onChange={e => updateControl(key, 'note', e.target.value)}
                                placeholder="Enter reason (e.g. Please clear your dues to activate)"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    )}
                    {ctrl.enabled !== false && subs.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Available Actions / Tabs</span>
                            <div className="grid grid-cols-2 gap-3">
                                {subs.map(sub => (
                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={ctrl[sub.key] !== false}
                                            onChange={e => updateControl(key, sub.key, e.target.checked)}
                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{sub.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-fade-in pb-4">
                {renderControlCard('feePortal', 'Fee Portal Access', 'e_ctrl_fee')}
                {renderControlCard('chat', 'Chat Page Access', 'e_ctrl_chat')}
                {renderControlCard('drive', 'Shared Drive Access', 'e_ctrl_drive')}
                {renderControlCard('notes', 'Personal Notes Access', 'e_ctrl_notes')}
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            const payload = { 
                ...formData, 
                role: role, 
                controlsScope: controlsScope, 
                selectedPropagationStudents: selectedPropagationStudents 
            };
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
    const filteredCourses = (formData.institute
        ? courses.filter(c => c.institute?._id === formData.institute || c.institute === formData.institute)
        : courses).filter(c => role === 'Guest' ? c.isDemo === true : !c.isDemo);

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    const uniqueSections = useMemo(() => {
        const secs = courseStudents.map(s => s.studentProfile?.section).filter(Boolean);
        const unique = [...new Set(secs)].sort();
        return unique.length > 0 ? unique : ['A', 'B', 'C'];
    }, [courseStudents]);

    const handleNextTab = (e) => {
        if (e) e.preventDefault();
        
        // Validate name
        if (!formData.name || !formData.name.trim()) {
            toast.error("Please enter full name");
            return;
        }

        // Validate institute (if Admin is adding)
        if (user?.role === 'Admin' && !formData.institute) {
            toast.error("Please select institute");
            return;
        }

        // Validate email
        if (!formData.email || !formData.email.trim()) {
            toast.error("Please enter email address");
            return;
        }

        // Validate email format basic regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            toast.error("Please enter a valid email address");
            return;
        }

        // Validate course & subjects for student
        if (role === 'Student') {
            if (!formData.course) {
                toast.error("Please select a course");
                return;
            }
            if (!formData.subject || !formData.subject.trim()) {
                toast.error("Please specify subjects");
                return;
            }
        }

        // Validate assigned course for teacher
        if (role === 'Teacher') {
            if (!formData.course) {
                toast.error("Please select an assigned course");
                return;
            }
            if (!formData.subjects || !formData.subjects.trim()) {
                toast.error("Please select at least one teaching subject");
                return;
            }
        }

        setActiveTab('controls');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className={`${role === 'Student' || role === 'Guest' ? 'bg-[#0b1329]' : 'h-24 bg-blue-500'} relative flex-shrink-0 px-6 pt-5 pb-0`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium font-black text-white tracking-tight">
                            {createdUser ? 'Success!' : `Add New ${role}`}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {(role === 'Student' || role === 'Teacher' || role === 'Editor' || role === 'Accountant') && !createdUser && (
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('basic')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
                                    activeTab === 'basic'
                                        ? 'bg-white text-[#0b1329]'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
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
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Feature Controls
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {!createdUser ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {activeTab === 'controls' ? (
                                role === 'Student' ? renderStudentControls() : (role === 'Teacher' ? renderTeacherControls() : (role === 'Editor' ? renderEditorControls() : renderAccountantControls()))
                            ) : (
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

                                    {role === 'Guest' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Demo Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                    required
                                                    value={formData.demoCourse}
                                                    onChange={e => setFormData({ ...formData, demoCourse: e.target.value })}
                                                >
                                                    <option value="">Select Demo Course</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Demo Duration</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                    required
                                                    value={formData.demoDuration}
                                                    onChange={e => setFormData({ ...formData, demoDuration: parseInt(e.target.value) })}
                                                >
                                                    <option value="1">1 Day</option>
                                                    <option value="2">2 Days</option>
                                                    <option value="3">3 Days</option>
                                                    <option value="5">5 Days</option>
                                                    <option value="7">7 Days</option>
                                                    <option value="10">10 Days</option>
                                                    <option value="15">15 Days</option>
                                                    <option value="30">30 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {role === 'Parent' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Linked Student</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                    required
                                                    value={formData.parentProfile?.student || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        parentProfile: {
                                                            ...formData.parentProfile,
                                                            student: e.target.value
                                                        }
                                                    })}
                                                >
                                                    <option value="">Select Enrolled Student</option>
                                                    {allStudents.map(student => (
                                                        <option key={student._id} value={student._id}>
                                                            {student.name} ({student.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

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
                                                    {(() => {
                                                        const selectedCourse = courses.find(c => c._id === formData.course);
                                                        const subjectsList = selectedCourse?.subjects || [];
                                                        if (!formData.course) {
                                                            return (
                                                                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-400 opacity-60 select-none">
                                                                    Select a course first
                                                                </div>
                                                            );
                                                        }
                                                        if (subjectsList.length === 0) {
                                                            return (
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                                                    value={formData.subject}
                                                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                                    placeholder="e.g. Maths, Science"
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <select
                                                                required
                                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                                value={formData.subject}
                                                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                            >
                                                                <option value="">Select Subject</option>
                                                                {subjectsList.map((sub, i) => (
                                                                    <option key={i} value={sub}>{sub}</option>
                                                                ))}
                                                            </select>
                                                        );
                                                    })()}
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

                                    {(role === 'Teacher' || role === 'Editor') && (
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
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">
                                                        {role === 'Teacher' ? 'Teaching Subjects' : 'Assigned Subjects'}
                                                    </label>
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
                                                                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
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

                                            {role === 'Teacher' && formData.course && (
                                                <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-150 space-y-4 mt-4 animate-fade-in">
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
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-[#0b1329] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'basic' && (role === 'Student' || role === 'Teacher' || role === 'Editor' || role === 'Accountant') ? (
                                <button
                                    type="button"
                                    onClick={handleNextTab}
                                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    {loading ? 'Creating Account...' : `Create ${role}`}
                                </button>
                            )}
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
