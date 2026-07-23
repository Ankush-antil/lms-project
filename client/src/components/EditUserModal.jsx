import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, Save, AlertCircle, ChevronDown, ChevronUp, GraduationCap, CheckCircle, Edit, Briefcase, Calculator, Megaphone, Heart, Shield, User } from 'lucide-react';
import { createPortal } from 'react-dom';

const DEFAULT_STUDENT_CONTROLS = {
    myActivity: { enabled: true, mode: 'hide', note: '', inbox: { upcoming: true, submitted: true, returned: true, evaluated: true, expired: true, studyMaterial: true, tools: true, analytics: true } },
    dashboard: { enabled: true, mode: 'hide', note: '' },
    feePortal: { enabled: true, mode: 'hide', note: '' },
    tools: { enabled: true, mode: 'hide', note: '', voiceRecorder: true, videoRecorder: true, fileUploader: true, notesWriting: true, screenshotTool: true, screenRecorder: true, webCalling: true },
    chat: { enabled: true, mode: 'hide', note: '', audioCall: true, videoCall: true, chatWithTeacher: true, chatWithAdmin: true, chatWithEditor: true },
    mySnapshots: { enabled: true, mode: 'hide', note: '' },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true }
};

const DEFAULT_TEACHER_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '', receivingCalls: true, takeAction: true, attendance: true, contactStudents: true },
    studentActivities: { enabled: true, mode: 'hide', note: '', student: true, inbox: true, inboxDetails: { assign: true, upcoming: true, submitted: true, returned: true, evaluated: true, expired: true, studyMaterial: true, tools: true, analytics: true } },
    evaluate: { enabled: true, mode: 'hide', note: '' },
    snapshots: { enabled: true, mode: 'hide', note: '', qrAttendance: true },
    tools: { enabled: true, mode: 'hide', note: '', formBuilderTool: true, databaseCreatorTool: true, elementsControl: true, inputElements: true, displayingElements: true, recordingElements: true, advanceElements: true, addons: true, theme: true, createWithAi: true, integrate: true, import: true, saveAsTemplate: true, decideActivity: true, templates: true, locationLocked: true, logicRules: true, monitoring: true, connectIt: true, profileUnderSettings: true, moreSettings: true, responses: true, collaborate: true, manageAccess: true, publicToWeb: true },
    chat: { enabled: true, mode: 'hide', note: '', audioCall: true, videoCall: true, chatStudent: true, chatEditor: true, chatInstitute: true },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true }
};

const DEFAULT_EDITOR_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '', createCourse: true, launchTestBuilder: true },
    teachers: { enabled: true, mode: 'hide', note: '', addNewTeacher: true },
    courses: { enabled: true, mode: 'hide', note: '', addNewCourses: true },
    subjects: { enabled: true, mode: 'hide', note: '', addSubject: true },
    activities: { enabled: true, mode: 'hide', note: '', createNewAssessment: true, lmsConnectedTests: true, publicWebTests: true, draftTests: true },
    tools: { enabled: true, mode: 'hide', note: '' },
    chat: { enabled: true, mode: 'hide', note: '', teacher: true, editor: true, students: true },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true }
};

const DEFAULT_ACCOUNTANT_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '' },
    feePortal: { enabled: true, mode: 'hide', note: '', dashboard: true, allStudent: { googleSheet: true, edit: true, collect: true }, collectFee: true, pendingDues: true, receipts: true, reports: true, settings: true },
    attendance: { enabled: true, mode: 'hide', note: '' },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true },
    chat: { enabled: true, mode: 'hide', note: '', chatWithAdmin: true, chatWithTeacher: true, chatWithEditor: true, chatWithStudent: true }
};

const DEFAULT_MARKETER_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '' },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true },
    chat: { enabled: true, mode: 'hide', note: '' }
};

const DEFAULT_STAFF_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '' },
    task: { enabled: true, mode: 'hide', note: '', todayTask: true, assignedTask: true, selfCreatedTask: true, myPoints: true, addExtraTask: true },
    attendance: { enabled: true, mode: 'hide', note: '', applyForLeave: true },
    salary: { enabled: true, mode: 'hide', note: '' },
    drive: { enabled: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
    notes: { enabled: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true },
    chat: { enabled: true, mode: 'hide', note: '' }
};

const DEFAULT_PARENT_CONTROLS = {
    dashboard: { enabled: true, mode: 'hide', note: '' },
    studentFee: { enabled: true, mode: 'hide', note: '' },
    attendance: { enabled: true, mode: 'hide', note: '' },
    activities: { enabled: true, mode: 'hide', note: '' }
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
        controls: DEFAULT_STUDENT_CONTROLS,
        demoCourse: '',
        demoDuration: 1
    });
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCoursesList, setSelectedCoursesList] = useState([]);
    const [expandedCourseSubjects, setExpandedCourseSubjects] = useState({});
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [controlsScope, setControlsScope] = useState('single');
    const [selectedPropagationStudents, setSelectedPropagationStudents] = useState([]);
    const [expandedSections, setExpandedSections] = useState({});
    const [propagationUsers, setPropagationUsers] = useState([]);
    const [loadingPropagationUsers, setLoadingPropagationUsers] = useState(false);

    const [selectedRoleToEdit, setSelectedRoleToEdit] = useState(null);

    useEffect(() => {
        const activeRole = selectedRoleToEdit;
        const instId = currentUser?.institute?._id || currentUser?.institute || formData.institute;
        if (isOpen && controlsScope === 'selected' && activeRole && instId) {
            setLoadingPropagationUsers(true);
            axios.get(`/api/users?role=${activeRole}`)
                .then(res => {
                    const filtered = res.data.filter(u => {
                        const uInstId = u.institute?._id || u.institute;
                        const matchInst = uInstId === instId;
                        const targetId = user?._id || user?.id;
                        return matchInst && u._id !== targetId;
                    });
                    setPropagationUsers(filtered);
                })
                .catch(err => console.error("Error fetching propagation users:", err))
                .finally(() => setLoadingPropagationUsers(false));
        } else {
            setPropagationUsers([]);
        }
    }, [isOpen, controlsScope, selectedRoleToEdit, formData.institute, currentUser, user]);

    const [loadingStudents, setLoadingStudents] = useState(false);
    const [instituteTeachers, setInstituteTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [instituteDetails, setInstituteDetails] = useState(null);

    const initializeFormData = (role) => {


        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            password: '', // Keep empty unless changing
            admissionNo: user?.admissionNo || '',
            course: role === 'Student'
                ? (user?.studentProfile?.course?._id || user?.studentProfile?.course || '')
                : (role === 'Teacher'
                    ? (user?.teacherProfile?.assignedCourses?.[0]?._id || user?.teacherProfile?.assignedCourses?.[0] || '')
                    : (role === 'Editor'
                        ? (user?.editorProfile?.assignedCourses?.[0]?._id || user?.editorProfile?.assignedCourses?.[0] || '')
                        : '')),
            institute: user?.institute?._id || user?.institute || (currentUser && currentUser.institute ? (typeof currentUser.institute === 'object' ? currentUser.institute._id : currentUser.institute) : ''),
            subjects: role === 'Teacher' 
                ? (user?.teacherProfile?.subjects?.join(', ') || '') 
                : (role === 'Editor' 
                    ? (user?.editorProfile?.subjects?.join(', ') || '') 
                    : ''),
            subject: role === 'Student' ? (user?.studentProfile?.subject || '') : '',
            mobileNumber: user?.mobileNumber || '',
            batch: role === 'Student' ? (user?.studentProfile?.batch || '') : '',
            section: role === 'Student' ? (user?.studentProfile?.section || '') : '',
            callEnabled: user?.callEnabled || false,
            studentAssignmentMode: role === 'Teacher' ? (user?.teacherProfile?.studentAssignmentMode || 'all') : 'all',
            assignedSections: role === 'Teacher' ? (user?.teacherProfile?.assignedSections || []) : [],
            assignedStudents: role === 'Teacher' ? (user?.teacherProfile?.assignedStudents?.map(s => s._id || s) || []) : [],
            controls: role === 'Student' ? { ...DEFAULT_STUDENT_CONTROLS, ...(user?.studentProfile?.controls || {}) } :
                      role === 'Teacher' ? { ...DEFAULT_TEACHER_CONTROLS, ...(user?.teacherProfile?.controls || {}) } :
                      role === 'Editor' ? { ...DEFAULT_EDITOR_CONTROLS, ...(user?.editorProfile?.controls || {}) } :
                      role === 'Accountant' ? { ...DEFAULT_ACCOUNTANT_CONTROLS, ...(user?.accountantProfile?.controls || {}) } :
                      role === 'Marketer' ? { ...DEFAULT_MARKETER_CONTROLS, ...(user?.marketerProfile?.controls || {}) } :
                      role === 'Staff' ? { ...DEFAULT_STAFF_CONTROLS, ...(user?.staffProfile?.controls || {}) } :
                      role === 'Parent' ? { ...DEFAULT_PARENT_CONTROLS, ...(user?.parentProfile?.controls || {}) } : {},
            parentProfile: {
                student: role === 'Parent' ? (user?.parentProfile?.student?._id || user?.parentProfile?.student || '') : ''
            },
            demoCourse: role === 'Guest' ? (user?.guestProfile?.demoCourse?._id || user?.guestProfile?.demoCourse || '') : '',
            demoDuration: role === 'Guest' ? (user?.guestProfile?.demoDuration || 1) : 1,
            allowedRoles: user?.allowedRoles && user.allowedRoles.length > 0 ? user.allowedRoles : [role]
        });
    };

    useEffect(() => {
        if (isOpen && user) {
            setSubjectDropdownOpen(false);
            setControlsScope('single');
            setSelectedPropagationStudents([]);
            setExpandedCourseSubjects({});
            
            const rolesList = user.allowedRoles && user.allowedRoles.length > 0 ? user.allowedRoles : [user.role];
            if (rolesList.length > 1) {
                setSelectedRoleToEdit(null);
            } else {
                const singleRole = rolesList[0] || 'Student';
                setSelectedRoleToEdit(singleRole);
                initializeFormData(singleRole);
            }
            setError('');
            setActiveTab('basic');

            const fetchData = async () => {
                try {
                    const instId = user.institute?._id || user.institute || (currentUser && currentUser.institute ? (typeof currentUser.institute === 'object' ? currentUser.institute._id : currentUser.institute) : '');
                    const [instRes, courseRes, studentsRes] = await Promise.all([
                        axios.get('/api/setup/institutes'),
                        axios.get('/api/setup/courses'),
                        axios.get('/api/users?role=Student')
                    ]);
                    setInstitutes(instRes.data);
                    setCourses(courseRes.data);
                    setAllStudents(studentsRes.data || []);
                    if (instRes.data) {
                        setInstituteDetails(instRes.data.find(i => i._id === instId) || instRes.data[0]);
                    }
                } catch (error) {
                    console.error("Error fetching setup data:", error);
                }
            };
            fetchData();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (isOpen && user && courses.length > 0 && selectedRoleToEdit) {
            const role = selectedRoleToEdit;
            if (role === 'Student' || role === 'Teacher' || role === 'Editor') {
                const isStudent = role === 'Student';
                const profile = isStudent 
                    ? user.studentProfile 
                    : (role === 'Teacher' ? user.teacherProfile : user.editorProfile);
                const profileCourses = isStudent 
                    ? (profile?.coursesList || [])
                    : (profile?.assignedCourses || []).map(cId => ({ course: cId }));

                const profileSubjects = isStudent 
                    ? [] 
                    : (profile?.subjects || []);

                const initialCoursesList = profileCourses.length > 0
                    ? profileCourses.map(c => {
                        const cId = c.course?._id || c.course;
                        const courseObj = courses.find(item => String(item._id) === String(cId));
                        const courseSubjects = courseObj?.subjects || [];
                        
                        const subs = isStudent 
                            ? (c.subjects || []) 
                            : profileSubjects.filter(sub => courseSubjects.some(cs => cs.toLowerCase() === sub.toLowerCase()));

                        return {
                            courseId: cId,
                            subjects: subs
                        };
                      })
                    : (profile?.course 
                        ? [{ 
                            courseId: profile.course?._id || profile.course, 
                            subjects: isStudent
                                ? (profile.subject ? profile.subject.split(',').map(s => s.trim()).filter(Boolean) : [])
                                : profileSubjects
                          }] 
                        : []
                      );
                setSelectedCoursesList(initialCoursesList);
            } else {
                setSelectedCoursesList([]);
            }
        }
    }, [isOpen, user, courses, selectedRoleToEdit]);

    const courseStudents = useMemo(() => {
        if (selectedRoleToEdit !== 'Teacher') {
            return allStudents.filter(s => String(s.studentProfile?.course?._id || s.studentProfile?.course) === String(formData.course));
        }
        const selectedCourseIds = selectedCoursesList.map(c => String(c.courseId));
        return allStudents.filter(s => {
            const primId = String(s.studentProfile?.course?._id || s.studentProfile?.course);
            const matchesPrimary = selectedCourseIds.includes(primId);
            const matchesSecondary = s.studentProfile?.coursesList?.some(c => 
                selectedCourseIds.includes(String(c.course?._id || c.course))
            );
            return matchesPrimary || matchesSecondary;
        });
    }, [allStudents, selectedCoursesList, selectedRoleToEdit, formData.course]);

    useEffect(() => {
        if (isOpen && user && selectedRoleToEdit === 'Teacher') {
            const fetchTeachers = async () => {
                try {
                    setLoadingTeachers(true);
                    const instId = user.institute?._id || user.institute || (currentUser && currentUser.institute ? (typeof currentUser.institute === 'object' ? currentUser.institute._id : currentUser.institute) : '');
                    if (instId) {
                        const { data } = await axios.get(`/api/users?role=Teacher`);
                        setInstituteTeachers(data.filter(t => t._id !== user._id && (t.institute?._id === instId || t.institute === instId)));
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
    }, [isOpen, user, selectedRoleToEdit]);

        const updateControl = (section, field, value) => {
        setFormData(prev => {
            const newControls = { ...prev.controls };
            if (!newControls[section]) newControls[section] = {};
            newControls[section] = {
                ...newControls[section],
                [field]: value
            };
            return { ...prev, controls: newControls };
        });
    };

    const toggleSection = (sec) => {
        setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
    };

    const renderControlSection = ({ id, label, hasSubControls = false, subControls = null }) => {
        const controls = formData.controls || {};
        const ctrl = controls[id] || { enabled: true, mode: 'hide', note: '' };
        const isExpanded = !!expandedSections[id];

        return (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm hover:shadow-md/5 transition-all">
                <div 
                    className="flex items-center justify-between border-b border-slate-100 pb-2 cursor-pointer select-none" 
                    onClick={() => hasSubControls && toggleSection(id)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">{label}</span>
                        {hasSubControls && (
                            isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <select
                            value={ctrl.mode || 'hide'}
                            onChange={e => updateControl(id, 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-0.5 text-[10px] font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                        <input 
                            type="checkbox" 
                            checked={ctrl.enabled !== false} 
                            onChange={e => updateControl(id, 'enabled', e.target.checked)} 
                            className="w-4 h-4 accent-indigo-650 cursor-pointer" 
                        />
                    </div>
                </div>

                {ctrl.enabled !== false && hasSubControls && isExpanded && (
                    <div className="pl-1 pt-1 space-y-2 animate-fade-in">
                        {subControls}
                    </div>
                )}

                {ctrl.enabled === false && (
                    <div className="w-full animate-fade-in pt-1">
                        <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                        <input
                            type="text"
                            value={ctrl.note || ''}
                            onChange={e => updateControl(id, 'note', e.target.value)}
                            placeholder={`Reason for deactivating ${label}`}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderDriveSubControls = (section = 'drive') => {
        const ctrl = formData.controls?.[section] || { newDrive: true, integrateDrive: true, viewDrive: true };
        const handleSubChange = (field, val) => {
            setFormData(prev => {
                const prevSection = prev.controls?.[section] || {};
                return {
                    ...prev,
                    controls: {
                        ...prev.controls,
                        [section]: { ...prevSection, [field]: val }
                    }
                };
            });
        };
        return (
            <div className="flex flex-col gap-2 pl-2 border-l border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.newDrive !== false} onChange={e => handleSubChange('newDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-655 rounded cursor-pointer" />New</label>
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.integrateDrive !== false} onChange={e => handleSubChange('integrateDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer" />Integrate</label>
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.viewDrive !== false} onChange={e => handleSubChange('viewDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer" />View</label>
            </div>
        );
    };

    const renderNotesSubControls = (section = 'notes') => {
        const ctrl = formData.controls?.[section] || { newNote: true, saveDraft: true, saveNotes: true };
        const handleSubChange = (field, val) => {
            setFormData(prev => {
                const prevSection = prev.controls?.[section] || {};
                return {
                    ...prev,
                    controls: {
                        ...prev.controls,
                        [section]: { ...prevSection, [field]: val }
                    }
                };
            });
        };
        return (
            <div className="flex flex-col gap-2 pl-2 border-l border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.newNote !== false} onChange={e => handleSubChange('newNote', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer" />New Note</label>
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.saveDraft !== false} onChange={e => handleSubChange('saveDraft', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer" />Save Draft</label>
                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none"><input type="checkbox" checked={ctrl.saveNotes !== false} onChange={e => handleSubChange('saveNotes', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer" />Save Notes</label>
            </div>
        );
    };

        const renderPropagationSelector = (roleLabel) => {
        const isStudent = roleLabel === 'Student';
        return (
            <div className="bg-slate-100/70 p-5 rounded-3xl border border-slate-200/60 mt-6 space-y-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Apply These Settings To</span>
                    <p className="text-[10px] text-slate-450 font-semibold leading-normal">
                        Propagate these feature control and note settings to other ${roleLabel.toLowerCase()}s in the system.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    {[
                        { value: 'single', label: `This ${roleLabel} Only` },
                        ...(isStudent ? [{ value: 'course', label: 'All Students of Course' }] : []),
                        { value: 'selected', label: `Selected ${roleLabel}s` },
                        { value: 'all', label: `All ${roleLabel}s of this Institute` }
                    ].map(opt => (
                        <label key={opt.value} className={`flex items-center gap-3 bg-white border rounded-2xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${controlsScope === opt.value ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                            <input
                                type="radio"
                                name="controlsScope"
                                value={opt.value}
                                checked={controlsScope === opt.value}
                                onChange={() => setControlsScope(opt.value)}
                                className="rounded-full border-slate-350 text-indigo-650 focus:ring-indigo-550 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{opt.label}</span>
                        </label>
                    ))}
                </div>

                {controlsScope === 'selected' && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 mt-3 space-y-3 max-h-60 overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-750">Select ${roleLabel}s to Apply Settings</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPropagationStudents(propagationUsers.map(u => u._id))}
                                    className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer"
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
                        {loadingPropagationUsers ? (
                            <div className="text-xs text-slate-400 text-center py-4">Loading...</div>
                        ) : propagationUsers.length === 0 ? (
                            <div className="text-xs text-slate-450 text-center py-4">No other ${roleLabel.toLowerCase()}s in this institute.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {propagationUsers.map(u => {
                                    const isChecked = selectedPropagationStudents.includes(u._id);
                                    return (
                                        <label key={u._id} className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-150'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    if (isChecked) {
                                                        setSelectedPropagationStudents(prev => prev.filter(id => id !== u._id));
                                                    } else {
                                                        setSelectedPropagationStudents(prev => [...prev, u._id]);
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-700 truncate">{u.name}</span>
                                                <span className="text-[9px] font-semibold text-slate-450 truncate">{u.email}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderStudentControls = () => {
        const ctrl = formData.controls || {};
        const handleInboxChange = (field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls.myActivity) newControls.myActivity = {};
                newControls.myActivity.inbox = {
                    ...(newControls.myActivity.inbox || {}),
                    [field]: checked
                };
                return { ...prev, controls: newControls };
            });
        };
        const handleToolsChange = (field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls.tools) newControls.tools = {};
                newControls.tools[field] = checked;
                return { ...prev, controls: newControls };
            });
        };
        const handleChatChange = (field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls.chat) newControls.chat = {};
                newControls.chat[field] = checked;
                return { ...prev, controls: newControls };
            });
        };

        return (
            <div className="space-y-4">
                {renderControlSection({
                    id: 'myActivity',
                    label: 'My Activity Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            {['upcoming', 'submitted', 'returned', 'evaluated', 'expired', 'studyMaterial', 'tools', 'analytics'].map(tab => (
                                <label key={tab} className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={ctrl.myActivity?.inbox?.[tab] !== false}
                                        onChange={e => handleInboxChange(tab, e.target.checked)}
                                        className="rounded border-slate-355 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="text-xs font-semibold text-slate-700">{getInboxTabLabel(tab)}</span>
                                </label>
                            ))}
                        </div>
                    )
                })}

                {renderControlSection({ id: 'dashboard', label: 'Dashboard Page' })}
                {renderControlSection({ id: 'feePortal', label: 'Fee Portal Page' })}

                {renderControlSection({
                    id: 'tools',
                    label: 'Tools Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
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
                                        checked={ctrl.tools?.[item.id] !== false}
                                        onChange={e => handleToolsChange(item.id, e.target.checked)}
                                        className="rounded border-slate-350 text-indigo-655 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'chat',
                    label: 'Chat Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="space-y-3 pl-2 border-l border-slate-200">
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Call Functions</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.audioCall !== false} onChange={e => handleChatChange('audioCall', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Audio Call</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.videoCall !== false} onChange={e => handleChatChange('videoCall', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Video Call</span></label>
                            </div>
                            <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block pt-2 border-t border-slate-100">Talk to Contacts</span>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithTeacher !== false} onChange={e => handleChatChange('chatWithTeacher', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Teachers</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithAdmin !== false} onChange={e => handleChatChange('chatWithAdmin', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Admins</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithEditor !== false} onChange={e => handleChatChange('chatWithEditor', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Editors</span></label>
                            </div>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'mySnapshots', label: 'My Snapshots Page' })}
                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}

                {renderPropagationSelector('Student')}
            </div>
        );
    };

    const renderTeacherControls = () => {
        const ctrl = formData.controls || {};
        const handleSubChange = (section, field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                newControls[section][field] = checked;
                return { ...prev, controls: newControls };
            });
        };
        const handleInboxChange = (field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls.studentActivities) newControls.studentActivities = {};
                newControls.studentActivities.inboxDetails = {
                    ...(newControls.studentActivities.inboxDetails || {}),
                    [field]: checked
                };
                return { ...prev, controls: newControls };
            });
        };

        const activitiesAllowed = instituteDetails?.controls?.activities || {};
        const isFormBuilderAllowed = activitiesAllowed.formBuilderTool !== false;

        return (
            <div className="space-y-4">
                {renderControlSection({
                    id: 'dashboard',
                    label: 'Dashboard Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.receivingCalls !== false} onChange={e => handleSubChange('dashboard', 'receivingCalls', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Receiving Calls</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.takeAction !== false} onChange={e => handleSubChange('dashboard', 'takeAction', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Take Actions</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.attendance !== false} onChange={e => handleSubChange('dashboard', 'attendance', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Daily Attendance</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.contactStudents !== false} onChange={e => handleSubChange('dashboard', 'contactStudents', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Contact Students</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'studentActivities',
                    label: 'Student Activities Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="space-y-3 pl-2 border-l border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.studentActivities?.student !== false} onChange={e => handleSubChange('studentActivities', 'student', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Student Profiles</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.studentActivities?.inbox !== false} onChange={e => handleSubChange('studentActivities', 'inbox', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Inbox Activities</span></label>
                            </div>
                            {ctrl.studentActivities?.inbox !== false && (
                                <div className="border-t border-slate-100 pt-2 space-y-2">
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Allowed Inbox Tasks</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['assign', 'upcoming', 'submitted', 'returned', 'evaluated', 'expired', 'studyMaterial', 'tools', 'analytics'].map(tab => (
                                            <label key={tab} className="flex items-center gap-2.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={ctrl.studentActivities?.inboxDetails?.[tab] !== false}
                                                    onChange={e => handleInboxChange(tab, e.target.checked)}
                                                    className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <span className="text-xs font-semibold text-slate-700">{getInboxTabLabel(tab === 'assign' ? 'assign' : tab)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {renderControlSection({ id: 'evaluate', label: 'Evaluate Page' })}

                {renderControlSection({
                    id: 'snapshots',
                    label: 'Snapshots / Attendance Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex gap-4 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.snapshots?.qrAttendance !== false} onChange={e => handleSubChange('snapshots', 'qrAttendance', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Launch QR Attendance</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'tools',
                    label: 'Form & Database Creator Tools',
                    hasSubControls: true,
                    subControls: (
                        <div className="space-y-3 pl-2 border-l border-slate-200">
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.tools?.formBuilderTool !== false} onChange={e => handleSubChange('tools', 'formBuilderTool', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-bold text-slate-700">Form Builder Tool</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.tools?.databaseCreatorTool !== false} onChange={e => handleSubChange('tools', 'databaseCreatorTool', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-bold text-slate-700">Database Creator Tool</span></label>
                            </div>
                            {ctrl.tools?.formBuilderTool !== false && (
                                <div className="border-t border-slate-100 pt-2 space-y-2">
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Form Builder Granular Settings</span>
                                    {!isFormBuilderAllowed ? (
                                        <p className="text-[10px] text-red-500 font-extrabold italic">Disabled by Institute global settings</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {[
                                                { id: 'elementsControl', label: 'Elements Control' },
                                                { id: 'inputElements', label: 'Input Elements' },
                                                { id: 'displayingElements', label: 'Displaying Elements' },
                                                { id: 'recordingElements', label: 'Recording Elements' },
                                                { id: 'advanceElements', label: 'Advance Elements' },
                                                { id: 'addons', label: 'Add-ons' },
                                                { id: 'theme', label: 'Theme Styling' },
                                                { id: 'createWithAi', label: 'Create with AI' },
                                                { id: 'integrate', label: 'Integration' },
                                                { id: 'import', label: 'Import Feature' },
                                                { id: 'saveAsTemplate', label: 'Save As Template' },
                                                { id: 'decideActivity', label: 'Decide Activity' },
                                                { id: 'templates', label: 'Browse Templates' },
                                                { id: 'locationLocked', label: 'Location Lock' },
                                                { id: 'logicRules', label: 'Logic Rules' },
                                                { id: 'monitoring', label: 'Monitoring Log' },
                                                { id: 'connectIt', label: 'Connect it Modules' },
                                                { id: 'profileUnderSettings', label: 'Profile Settings' },
                                                { id: 'moreSettings', label: 'Advanced Settings' },
                                                { id: 'responses', label: 'View Responses' },
                                                { id: 'collaborate', label: 'Collaborate' },
                                                { id: 'manageAccess', label: 'Manage Access' },
                                                { id: 'publicToWeb', label: 'Public Web Sharing' }
                                            ].map(item => (
                                                <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={ctrl.tools?.[item.id] !== false}
                                                        onChange={e => handleSubChange('tools', item.id, e.target.checked)}
                                                        className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-[11px] font-semibold text-slate-700">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'chat',
                    label: 'Chat Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="space-y-3 pl-2 border-l border-slate-200">
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Call Functions</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.audioCall !== false} onChange={e => handleChatChange('audioCall', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Audio Call</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.videoCall !== false} onChange={e => handleChatChange('videoCall', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Video Call</span></label>
                            </div>
                            <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block pt-2 border-t border-slate-100">Talk to Contacts</span>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatStudent !== false} onChange={e => handleChatChange('chatStudent', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Students</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatEditor !== false} onChange={e => handleChatChange('chatEditor', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Editors</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatInstitute !== false} onChange={e => handleChatChange('chatInstitute', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Institutes</span></label>
                            </div>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}

                {renderPropagationSelector('Teacher')}
            </div>
        );
    };

    const renderEditorControls = () => {
        const ctrl = formData.controls || {};
        const handleSubChange = (section, field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                newControls[section][field] = checked;
                return { ...prev, controls: newControls };
            });
        };

        return (
            <div className="space-y-4">
                {renderControlSection({
                    id: 'dashboard',
                    label: 'Dashboard Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex flex-col gap-2 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.createCourse !== false} onChange={e => handleSubChange('dashboard', 'createCourse', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Create Course</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.dashboard?.launchTestBuilder !== false} onChange={e => handleSubChange('dashboard', 'launchTestBuilder', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Launch Test Builder</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'teachers',
                    label: 'Teachers Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex gap-4 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.teachers?.addNewTeacher !== false} onChange={e => handleSubChange('teachers', 'addNewTeacher', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Add New Teacher</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'courses',
                    label: 'Courses Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex gap-4 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.courses?.addNewCourses !== false} onChange={e => handleSubChange('courses', 'addNewCourses', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Add New Course</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'subjects',
                    label: 'Subjects Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex gap-4 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.subjects?.addSubject !== false} onChange={e => handleSubChange('subjects', 'addSubject', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Add Subject</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'activities',
                    label: 'Activities Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.activities?.createNewAssessment !== false} onChange={e => handleSubChange('activities', 'createNewAssessment', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Create New Assessment</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.activities?.lmsConnectedTests !== false} onChange={e => handleSubChange('activities', 'lmsConnectedTests', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">LMS Connected Tests</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.activities?.publicWebTests !== false} onChange={e => handleSubChange('activities', 'publicWebTests', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Public Web Tests</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.activities?.draftTests !== false} onChange={e => handleSubChange('activities', 'draftTests', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Draft Tests</span></label>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'tools', label: 'Tools Page' })}

                {renderControlSection({
                    id: 'chat',
                    label: 'Chat Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.teacher !== false} onChange={e => handleSubChange('chat', 'teacher', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Teacher</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.editor !== false} onChange={e => handleSubChange('chat', 'editor', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Editor</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.students !== false} onChange={e => handleSubChange('chat', 'students', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Student</span></label>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}

                {renderPropagationSelector('Editor')}
            </div>
        );
    };

    const renderAccountantControls = () => {
        const ctrl = formData.controls || {};
        const handleSubChange = (section, field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                newControls[section][field] = checked;
                return { ...prev, controls: newControls };
            });
        };
        const handleAllStudentChange = (field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls.feePortal) newControls.feePortal = {};
                newControls.feePortal.allStudent = {
                    ...(newControls.feePortal.allStudent || {}),
                    [field]: checked
                };
                return { ...prev, controls: newControls };
            });
        };

        return (
            <div className="space-y-4">
                {renderControlSection({ id: 'dashboard', label: 'Dashboard Page' })}

                {renderControlSection({
                    id: 'feePortal',
                    label: 'Fee Portal Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="space-y-3 pl-2 border-l border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.dashboard !== false} onChange={e => handleSubChange('feePortal', 'dashboard', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Dashboard</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.collectFee !== false} onChange={e => handleSubChange('feePortal', 'collectFee', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Collect Fee</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.pendingDues !== false} onChange={e => handleSubChange('feePortal', 'pendingDues', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Pending Dues</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.receipts !== false} onChange={e => handleSubChange('feePortal', 'receipts', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Receipts</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.reports !== false} onChange={e => handleSubChange('feePortal', 'reports', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Reports</span></label>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.settings !== false} onChange={e => handleSubChange('feePortal', 'settings', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Settings</span></label>
                            </div>
                            <div className="border-t border-slate-100 pt-2 space-y-2">
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block">All Student Page Actions</span>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.allStudent?.googleSheet !== false} onChange={e => handleAllStudentChange('googleSheet', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Link to Google Sheet</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.allStudent?.edit !== false} onChange={e => handleAllStudentChange('edit', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Edit Student Info</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.feePortal?.allStudent?.collect !== false} onChange={e => handleAllStudentChange('collect', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Collect Fee Button</span></label>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'attendance', label: 'Attendance Page' })}
                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}

                {renderControlSection({
                    id: 'chat',
                    label: 'Chat Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithAdmin !== false} onChange={e => handleSubChange('chat', 'chatWithAdmin', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Admin</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithTeacher !== false} onChange={e => handleSubChange('chat', 'chatWithTeacher', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Teacher</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithEditor !== false} onChange={e => handleSubChange('chat', 'chatWithEditor', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Editor</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.chat?.chatWithStudent !== false} onChange={e => handleSubChange('chat', 'chatWithStudent', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Chat with Student</span></label>
                        </div>
                    )
                })}

                {renderPropagationSelector('Accountant')}
            </div>
        );
    };

    const renderMarketerControls = () => {
        return (
            <div className="space-y-4">
                {renderControlSection({ id: 'dashboard', label: 'Dashboard Page' })}
                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}
                {renderControlSection({ id: 'chat', label: 'Chat Page' })}

                {renderPropagationSelector('Marketer')}
            </div>
        );
    };

    const renderStaffControls = () => {
        const ctrl = formData.controls || {};
        const handleSubChange = (section, field, checked) => {
            setFormData(prev => {
                const newControls = { ...prev.controls };
                if (!newControls[section]) newControls[section] = {};
                newControls[section][field] = checked;
                return { ...prev, controls: newControls };
            });
        };

        return (
            <div className="space-y-4">
                {renderControlSection({ id: 'dashboard', label: 'Dashboard Page' })}

                {renderControlSection({
                    id: 'task',
                    label: 'Tasks Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="grid grid-cols-2 gap-3 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.task?.todayTask !== false} onChange={e => handleSubChange('task', 'todayTask', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Today Task</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.task?.assignedTask !== false} onChange={e => handleSubChange('task', 'assignedTask', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Assigned Task</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.task?.selfCreatedTask !== false} onChange={e => handleSubChange('task', 'selfCreatedTask', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Self-Created Task</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.task?.myPoints !== false} onChange={e => handleSubChange('task', 'myPoints', e.target.checked)} className="rounded border-slate-350 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">My Points</span></label>
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.task?.addExtraTask !== false} onChange={e => handleSubChange('task', 'addExtraTask', e.target.checked)} className="rounded border-slate-355 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Add Extra Task</span></label>
                        </div>
                    )
                })}

                {renderControlSection({
                    id: 'attendance',
                    label: 'Attendance Page',
                    hasSubControls: true,
                    subControls: (
                        <div className="flex gap-4 pl-2 border-l border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={ctrl.attendance?.applyForLeave !== false} onChange={e => handleSubChange('attendance', 'applyForLeave', e.target.checked)} className="rounded border-slate-300 text-indigo-650 h-3.5 w-3.5 cursor-pointer" /><span className="text-xs font-semibold text-slate-700">Apply for Leave</span></label>
                        </div>
                    )
                })}

                {renderControlSection({ id: 'salary', label: 'Salary Page' })}
                {renderControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: renderDriveSubControls('drive') })}
                {renderControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: renderNotesSubControls('notes') })}
                {renderControlSection({ id: 'chat', label: 'Chat Page' })}

                {renderPropagationSelector('Staff')}
            </div>
        );
    };

    const renderParentControls = () => {
        return (
            <div className="space-y-4">
                {renderControlSection({ id: 'dashboard', label: 'Dashboard Page' })}
                {renderControlSection({ id: 'studentFee', label: 'Student Fee Page' })}
                {renderControlSection({ id: 'attendance', label: 'Attendance Page' })}
                {renderControlSection({ id: 'activities', label: 'Activities Page' })}

                {renderPropagationSelector('Parent')}
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
                admissionNo: formData.admissionNo,
                institute: formData.institute,
                course: formData.course,
                subject: formData.subject,
                subjects: (selectedRoleToEdit === 'Teacher' || selectedRoleToEdit === 'Editor') ? [...new Set(selectedCoursesList.flatMap(c => c.subjects))] : formData.subjects,
                mobileNumber: formData.mobileNumber,
                batch: formData.batch,
                section: formData.section,
                callEnabled: formData.callEnabled,
                studentAssignmentMode: formData.studentAssignmentMode,
                assignedSections: formData.assignedSections,
                assignedStudents: formData.assignedStudents,
                controls: formData.controls,
                controlsScope: controlsScope,
                selectedPropagationStudents: selectedPropagationStudents,
                parentProfile: formData.parentProfile,
                editingRole: selectedRoleToEdit,
                demoCourse: formData.demoCourse,
                demoDuration: formData.demoDuration,
                allowedRoles: formData.allowedRoles && formData.allowedRoles.length > 0 ? formData.allowedRoles : [selectedRoleToEdit],
                coursesList: selectedRoleToEdit === 'Student' ? selectedCoursesList.map(c => ({ course: c.courseId, subjects: c.subjects })) : undefined,
                assignedCourses: (selectedRoleToEdit === 'Teacher' || selectedRoleToEdit === 'Editor') ? selectedCoursesList.map(c => c.courseId) : undefined
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

    const filteredCourses = (formData.institute
        ? courses.filter(c => c.institute?._id === formData.institute || c.institute === formData.institute)
        : courses).filter(c => selectedRoleToEdit === 'Guest' ? c.isDemo === true : !c.isDemo);

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    const uniqueSections = useMemo(() => {
        if (!formData.course) return ['A', 'B', 'C'];
        const selectedCourse = courses.find(c => c._id === formData.course);
        if (!selectedCourse) return ['A', 'B', 'C'];
        const count = selectedCourse.sectionsCount || 1;
        const secs = [];
        for (let i = 0; i < count; i++) {
            secs.push(String.fromCharCode(65 + i)); // 'A', 'B', 'C'...
        }
        return secs;
    }, [formData.course, courses]);

    const handleNextTab = (e) => {
        if (e) e.preventDefault();
        
        // Validate name
        if (!formData.name || !formData.name.trim()) {
            toast.error("Please enter full name");
            return;
        }

        // Validate institute (if Admin is adding)
        if (currentUser?.role === 'Admin' && !formData.institute) {
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
        if (selectedRoleToEdit === 'Student') {
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
        if (selectedRoleToEdit === 'Teacher') {
            if (!formData.course) {
                toast.error("Please select an assigned course");
                return;
            }
            const hasSubjectsSelected = selectedCoursesList.some(c => c.subjects && c.subjects.length > 0);
            if (!hasSubjectsSelected) {
                toast.error("Please select at least one teaching subject");
                return;
            }
        }

        setActiveTab('controls');
    };

    if (!isOpen || !user) return null;

    if (selectedRoleToEdit === null) {
        const rolesList = user.allowedRoles && user.allowedRoles.length > 0 ? user.allowedRoles : [user.role];
        return createPortal(
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center sm:p-4">
                <div className="bg-white w-full h-full sm:h-auto sm:max-h-[85vh] max-w-md rounded-none sm:rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                    {/* Header */}
                    <div className="bg-[#0b1329] text-white px-6 py-5 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Select Role to Edit</h3>
                            <p className="text-[10px] text-slate-350 font-bold uppercase tracking-wider mt-0.5">{user.name}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Role Picker List */}
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <p className="text-xs text-slate-500 font-medium">
                            This user is registered with multiple roles. Select which profile you want to configure:
                        </p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {rolesList.map((roleName) => (
                                <button
                                    key={roleName}
                                    type="button"
                                    onClick={() => {
                                        setSelectedRoleToEdit(roleName);
                                        initializeFormData(roleName);
                                    }}
                                    className="w-full p-4 text-left bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between group hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center">
                                            {roleName === 'Student' && <GraduationCap size={18} />}
                                            {roleName === 'Teacher' && <CheckCircle size={18} />}
                                            {roleName === 'Editor' && <Edit size={18} />}
                                            {roleName === 'Staff' && <Briefcase size={18} />}
                                            {roleName === 'Accountant' && <Calculator size={18} />}
                                            {roleName === 'Marketer' && <Megaphone size={18} />}
                                            {roleName === 'Parent' && <Heart size={18} />}
                                            {roleName === 'Admin' && <Shield size={18} />}
                                            {!['Student', 'Teacher', 'Editor', 'Staff', 'Accountant', 'Marketer', 'Parent', 'Admin'].includes(roleName) && <User size={18} />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 group-hover:text-indigo-900 transition-colors">{roleName} Profile</h4>
                                            <p className="text-[10px] text-slate-400 font-bold group-hover:text-indigo-400 transition-colors uppercase tracking-wider mt-0.5">Configure details & permissions</p>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className="-rotate-90 text-slate-400 group-hover:text-indigo-650 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center sm:p-4">
            <div className="bg-white w-full h-full sm:h-auto max-w-2xl sm:max-h-[90vh] rounded-none sm:rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className={`${selectedRoleToEdit === 'Student' || selectedRoleToEdit === 'Guest' ? 'bg-[#0b1329]' : 'h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'} relative flex-shrink-0 px-6 pt-5 pb-0`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-medium font-black text-white tracking-tight">
                                Edit {selectedRoleToEdit === 'Guest' ? 'Limited User' : selectedRoleToEdit}: {user.name}
                            </h3>
                            {user.allowedRoles && user.allowedRoles.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoleToEdit(null)}
                                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
                                >
                                    Change Role
                                </button>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer', 'Staff', 'Parent'].includes(selectedRoleToEdit) && (
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
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-shake">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        {activeTab === 'controls' ? (
                            selectedRoleToEdit === 'Student' ? renderStudentControls() :
                                selectedRoleToEdit === 'Teacher' ? renderTeacherControls() :
                                selectedRoleToEdit === 'Editor' ? renderEditorControls() :
                                selectedRoleToEdit === 'Accountant' ? renderAccountantControls() :
                                selectedRoleToEdit === 'Marketer' ? renderMarketerControls() :
                                selectedRoleToEdit === 'Staff' ? renderStaffControls() :
                                selectedRoleToEdit === 'Parent' ? renderParentControls() : null
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

                                {selectedRoleToEdit === 'Student' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Admission No.</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.admissionNo}
                                            onChange={e => setFormData({ ...formData, admissionNo: e.target.value })}
                                            placeholder="e.g. UQ-22354"
                                        />
                                    </div>
                                )}

                                {selectedRoleToEdit === 'Parent' && (
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

                                {selectedRoleToEdit === 'Guest' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Demo Course</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
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

                                {(selectedRoleToEdit === 'Student' || selectedRoleToEdit === 'Teacher' || selectedRoleToEdit === 'Editor') && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Select Courses (Multiple allowed)</label>
                                                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2.5">
                                                    {filteredCourses.length === 0 ? (
                                                        <div className="text-xs font-bold text-slate-400 opacity-60">No courses available</div>
                                                    ) : (
                                                        filteredCourses.map(course => {
                                                            const isChecked = selectedCoursesList.some(c => c.courseId === course._id);
                                                            return (
                                                                <label key={course._id} className="flex items-center gap-3 text-sm font-bold text-slate-600 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            if (isChecked) {
                                                                                const updated = selectedCoursesList.filter(c => c.courseId !== course._id);
                                                                                setSelectedCoursesList(updated);
                                                                                if (updated.length > 0) {
                                                                                    setFormData(prev => ({
                                                                                        ...prev,
                                                                                        course: updated[0].courseId,
                                                                                        subject: updated[0].subjects.join(', ')
                                                                                    }));
                                                                                } else {
                                                                                    setFormData(prev => ({ ...prev, course: '', subject: '' }));
                                                                                }
                                                                            } else {
                                                                                const defaultSubjects = course.subjects || [];
                                                                                const updated = [...selectedCoursesList, { courseId: course._id, subjects: defaultSubjects }];
                                                                                setSelectedCoursesList(updated);
                                                                                setFormData(prev => ({
                                                                                    ...prev,
                                                                                    course: course._id,
                                                                                    subject: defaultSubjects.join(', ')
                                                                                }));
                                                                                setExpandedCourseSubjects(prev => ({
                                                                                    ...prev,
                                                                                    [course._id]: true
                                                                                }));
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    <span>{course.name}</span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                            {selectedRoleToEdit === 'Student' && (
                                                <div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Section</label>
                                                            {(() => {
                                                                const primaryCourseId = selectedCoursesList[0]?.courseId || formData.course;
                                                                const selectedCourse = courses.find(c => c._id === primaryCourseId);
                                                                const count = selectedCourse?.sectionsCount || 1;
                                                                const sectionsList = [];
                                                                for (let i = 0; i < count; i++) {
                                                                    sectionsList.push(String.fromCharCode(65 + i));
                                                                }
                                                                return (
                                                                    <select
                                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                                                        value={formData.section || ''}
                                                                        onChange={e => setFormData({ ...formData, section: e.target.value })}
                                                                    >
                                                                        <option value="">Select Section</option>
                                                                        {sectionsList.map((sec, i) => (
                                                                            <option key={i} value={sec}>Section {sec}</option>
                                                                        ))}
                                                                    </select>
                                                                );
                                                            })()}
                                                        </div>
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
                                                </div>
                                            )}
                                        </div>

                                        {selectedCoursesList.length > 0 && (
                                            <div className="mt-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                                                <label className="text-xs font-black text-slate-550 uppercase tracking-widest leading-none block mb-1">Subjects Selection per Course</label>
                                                <div className="space-y-4">
                                                    {selectedCoursesList.map((selectedItem, idx) => {
                                                        const courseObj = courses.find(c => c._id === selectedItem.courseId);
                                                        if (!courseObj) return null;
                                                        const courseSubjects = courseObj.subjects || [];

                                                        const handleSubjectToggleForCourse = (sub) => {
                                                            const updated = selectedCoursesList.map(c => {
                                                                if (c.courseId === selectedItem.courseId) {
                                                                    const isSelected = c.subjects.includes(sub);
                                                                    const updatedSubs = isSelected
                                                                        ? c.subjects.filter(s => s !== sub)
                                                                        : [...c.subjects, sub];
                                                                    return { ...c, subjects: updatedSubs };
                                                                }
                                                                return c;
                                                            });
                                                            setSelectedCoursesList(updated);
                                                            if (idx === 0) {
                                                                const firstItem = updated[0];
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    subject: firstItem.subjects.join(', ')
                                                                }));
                                                            }
                                                        };

                                                        const isExpanded = !!expandedCourseSubjects[selectedItem.courseId];
                                                        return (
                                                            <div key={selectedItem.courseId} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2.5">
                                                                <div 
                                                                    className="text-sm font-extrabold text-slate-800 flex items-center justify-between cursor-pointer select-none"
                                                                    onClick={() => {
                                                                        setExpandedCourseSubjects(prev => ({
                                                                            ...prev,
                                                                            [selectedItem.courseId]: !prev[selectedItem.courseId]
                                                                        }));
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {isExpanded ? (
                                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                            </svg>
                                                                        )}
                                                                        <span>{courseObj.name}</span>
                                                                    </div>
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Course {idx + 1}</span>
                                                                </div>
                                                                {isExpanded && (
                                                                    <div className="pl-1 space-y-2 pt-2 border-t border-slate-50 animate-fade-in">
                                                                        {courseSubjects.length === 0 ? (
                                                                            <input
                                                                                type="text"
                                                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                                                value={selectedItem.subjects.join(', ')}
                                                                                onChange={e => {
                                                                                    const updated = selectedCoursesList.map(c => {
                                                                                        if (c.courseId === selectedItem.courseId) {
                                                                                            return { ...c, subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                                                                                        }
                                                                                        return c;
                                                                                    });
                                                                                    setSelectedCoursesList(updated);
                                                                                    if (idx === 0) {
                                                                                        setFormData(prev => ({ ...prev, subject: e.target.value }));
                                                                                    }
                                                                                }}
                                                                                placeholder="e.g. Maths, Science"
                                                                            />
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                                {courseSubjects.map((sub, sIdx) => {
                                                                                    const isChecked = selectedItem.subjects.includes(sub);
                                                                                    return (
                                                                                        <label key={sIdx} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none animate-fade-in">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isChecked}
                                                                                                onChange={() => handleSubjectToggleForCourse(sub)}
                                                                                                className="w-3.5 h-3.5 rounded text-indigo-650 border-slate-350 focus:ring-indigo-550 cursor-pointer"
                                                                                            />
                                                                                            <span>{sub}</span>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}




                                {selectedRoleToEdit === 'Teacher' && selectedCoursesList.length > 0 && (
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

                                {/* Assign Other Role */}
                                {selectedRoleToEdit !== 'Guest' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-3 block">Assign Other Role</label>
                                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex flex-wrap gap-x-5 gap-y-2.5">
                                            {['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer', 'Staff', 'Parent'].map(r => {
                                                const isPrimary = r === selectedRoleToEdit;
                                                const isChecked = (formData.allowedRoles || [selectedRoleToEdit]).includes(r);
                                                return (
                                                    <label key={r} className={`flex items-center gap-2 text-xs font-bold cursor-pointer select-none ${isPrimary ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={isPrimary}
                                                            onChange={() => {
                                                                const current = formData.allowedRoles || [selectedRoleToEdit];
                                                                const next = isChecked
                                                                    ? current.filter(x => x !== r)
                                                                    : [...current, r];
                                                                setFormData({ ...formData, allowedRoles: next });
                                                            }}
                                                            className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer disabled:opacity-60"
                                                        />
                                                        {r}{isPrimary && <span className="text-[9px] font-black bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full ml-0.5">Default</span>}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
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

                        {activeTab === 'basic' && (selectedRoleToEdit === 'Student' || selectedRoleToEdit === 'Teacher' || selectedRoleToEdit === 'Editor' || selectedRoleToEdit === 'Accountant') ? (
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
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Save size={18} />
                                )}
                                {loading ? 'Saving Changes...' : 'Update Details'}
                            </button>
                        )}
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
