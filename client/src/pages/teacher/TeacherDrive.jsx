import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    BookOpen, HardDrive, Plus, X, Upload, Link2, Loader2,
    ChevronDown, ChevronRight, Lock
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const TeacherDrive = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loading, setLoading] = useState(false);

    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [selectedInboxId, setSelectedInboxId] = useState(null);

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [showMatModal, setShowMatModal] = useState(false);
    const [matTitle, setMatTitle] = useState('');
    const [matFile, setMatFile] = useState(null);
    const [matUrl, setMatUrl] = useState('');
    const [uploadType, setUploadType] = useState('file'); // 'file' or 'url'
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    // Fetch teacher's courses on mount/user change
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const instId = user?.institute?._id || user?.institute;
                if (!instId) return;

                // Fetch all courses in the institute
                const { data: allCourses } = await axios.get(`/api/setup/courses?instituteId=${instId}`);
                
                // Filter to only those assigned to the teacher, unless Admin
                const filteredCourses = user?.role === 'Admin' 
                    ? allCourses 
                    : allCourses.filter(c => {
                        const assignedIds = user?.teacherProfile?.assignedCourses?.map(ac => String(ac._id || ac)) || [];
                        return assignedIds.includes(String(c._id));
                    });
                
                setCourses(filteredCourses);
                
                if (filteredCourses.length > 0) {
                    setSelectedCourse(filteredCourses[0]);
                }
            } catch (err) {
                console.error("Failed to load courses:", err);
                toast.error("Failed to load courses");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadInitialData();
        }
    }, [user]);

    // Build the dynamic Day/Index mapping for the selected Course (exactly like Student side)
    const subjectDaysMapping = useMemo(() => {
        if (!selectedCourse) return [];
        const course = selectedCourse;
        const subjects = course.subjects || [];
        const durations = course.subjectDurations || [];
        const totalDuration = course.duration || 5;

        let currentDayIndex = 1;
        const mapping = [];

        if (durations && durations.length > 0) {
            durations.forEach(d => {
                const subName = d.subjectName;
                const subDur = Number(d.duration) || 0;
                const daysList = [];
                for (let i = 1; i <= subDur; i++) {
                    if (currentDayIndex <= totalDuration) {
                        daysList.push({
                            dayNum: i,
                            indexNum: currentDayIndex,
                            id: `Index ${currentDayIndex}`
                        });
                        currentDayIndex++;
                    }
                }
                if (daysList.length > 0) {
                    mapping.push({
                        subjectName: subName,
                        days: daysList
                    });
                }
            });
        }

        if (currentDayIndex <= totalDuration) {
            const mappedSubjectNames = mapping.map(m => m.subjectName.toLowerCase());
            const remainingSubjects = subjects.filter(s => !mappedSubjectNames.includes(s.toLowerCase()));

            if (remainingSubjects.length > 0) {
                const remainingDays = totalDuration - currentDayIndex + 1;
                const daysPerSubject = Math.floor(remainingDays / remainingSubjects.length);
                const extraDays = remainingDays % remainingSubjects.length;

                remainingSubjects.forEach((subName, idx) => {
                    const subDur = daysPerSubject + (idx < extraDays ? 1 : 0);
                    const daysList = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            daysList.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Index ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (daysList.length > 0) {
                        mapping.push({
                            subjectName: subName,
                            days: daysList
                        });
                    }
                });
            } else {
                const daysList = [];
                let dayCounter = 1;
                while (currentDayIndex <= totalDuration) {
                    daysList.push({
                        dayNum: dayCounter,
                        indexNum: currentDayIndex,
                        id: `Index ${currentDayIndex}`
                    });
                    currentDayIndex++;
                    dayCounter++;
                }
                if (daysList.length > 0) {
                    mapping.push({
                        subjectName: 'Other Subjects',
                        days: daysList
                    });
                }
            }
        }

        if (mapping.length === 0) {
            const daysList = [];
            for (let i = 1; i <= totalDuration; i++) {
                daysList.push({
                    dayNum: i,
                    indexNum: i,
                    id: `Index ${i}`
                });
            }
            mapping.push({
                subjectName: 'General',
                days: daysList
            });
        }

        // Filter mapping to only include subjects that are assigned to the teacher
        const teacherAssignedSubs = user?.teacherProfile?.subjects?.map(s => s.trim().toLowerCase()) || [];
        
        return mapping.filter(m => 
            teacherAssignedSubs.includes(m.subjectName.trim().toLowerCase())
        );
    }, [selectedCourse, user]);

    // Auto-select the first day of the first subject when mapping updates
    useEffect(() => {
        if (subjectDaysMapping.length > 0 && subjectDaysMapping[0].days.length > 0) {
            setSelectedInboxId(subjectDaysMapping[0].days[0].id);
        } else {
            setSelectedInboxId(null);
        }
    }, [subjectDaysMapping]);

    // Expand all collapsible subjects initially
    useEffect(() => {
        if (subjectDaysMapping.length > 0) {
            const initial = {};
            subjectDaysMapping.forEach(g => {
                initial[g.subjectName] = true;
            });
            setExpandedSubjects(initial);
        }
    }, [subjectDaysMapping]);

    // Fetch private study materials when selected day inbox changes
    useEffect(() => {
        const fetchMaterials = async () => {
            if (!selectedInboxId) return;
            try {
                setLoadingMaterials(true);
                // Pass isPrivate=true to only retrieve private files uploaded by this teacher
                const { data } = await axios.get(`/api/study-materials?inboxId=${selectedInboxId}&isPrivate=true`);
                setStudyMaterials(data);
            } catch (err) {
                console.error("Error fetching materials:", err);
                toast.error("Failed to load materials");
            } finally {
                setLoadingMaterials(false);
            }
        };

        fetchMaterials();
    }, [selectedInboxId]);

    // Derive active details for headers
    const { selectedDayNumber, selectedSubjectName } = useMemo(() => {
        if (!selectedInboxId || subjectDaysMapping.length === 0) return { selectedDayNumber: 1, selectedSubjectName: '' };
        for (const group of subjectDaysMapping) {
            const foundDay = group.days.find(d => d.id === selectedInboxId);
            if (foundDay) {
                return {
                    selectedDayNumber: foundDay.dayNum,
                    selectedSubjectName: group.subjectName
                };
            }
        }
        return { selectedDayNumber: 1, selectedSubjectName: '' };
    }, [selectedInboxId, subjectDaysMapping]);

    // Upload Content
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!matTitle.trim() || !selectedInboxId) {
            toast.error("Please fill in the title");
            return;
        }

        if (uploadType === 'file' && !matFile) {
            toast.error("Please select a file to upload");
            return;
        }

        if (uploadType === 'url' && !matUrl.trim()) {
            toast.error("Please provide a Web Link (URL)");
            return;
        }

        try {
            setUploadingMaterial(true);
            const formData = new FormData();
            formData.append('title', matTitle.trim());
            formData.append('inboxId', selectedInboxId);
            formData.append('isPrivate', 'true'); // Flag it as private content

            if (uploadType === 'file') {
                formData.append('file', matFile);
            } else {
                formData.append('fileUrl', matUrl.trim());
            }

            const { data } = await axios.post('/api/study-materials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(uploadType === 'file' ? "File uploaded to private drive!" : "Web Link added to private drive!");
            setStudyMaterials(prev => [data, ...prev]);
            setMatTitle('');
            setMatFile(null);
            setMatUrl('');
            setShowMatModal(false);
            
            // Reset input
            const fileInput = document.getElementById('drive-material-file');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            console.error("Error uploading to drive:", err);
            toast.error(err.response?.data?.message || "Failed to upload content");
        } finally {
            setUploadingMaterial(false);
        }
    };

    // Delete Content
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this file from your private drive?")) return;
        try {
            await axios.delete(`/api/study-materials/${id}`);
            toast.success("Content deleted successfully!");
            setStudyMaterials(prev => prev.filter(m => m._id !== id));
        } catch (err) {
            console.error("Error deleting content:", err);
            toast.error("Failed to delete content");
        }
    };

    const isDriveDisabled = user?.teacherProfile?.controls?.dashboard?.enabled === false;

    if (isDriveDisabled) {
        return (
            <DashboardLayout role="Teacher" fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Feature Restricted</h2>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Private Drive has been disabled by your administrator.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                
                {/* ── LEFT SIDEBAR ───────────────────────────────────── */}
                <aside className="w-72 border-r border-slate-200 flex flex-col bg-white shrink-0 overflow-hidden">
                    
                    {/* Course Selection */}
                    <div className="p-6 border-b border-slate-150 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="text-slate-700" size={18} />
                            <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">My Private Drive</h2>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-4 font-semibold uppercase tracking-wider">Storage & Resources</p>

                        {loading ? (
                            <div className="h-9 bg-slate-100 animate-pulse rounded-xl" />
                        ) : courses.length === 0 ? (
                            <div className="text-[10px] text-red-500 bg-red-50 border border-red-100 rounded-xl p-3 font-semibold">
                                No assigned courses found. Please contact admin.
                            </div>
                        ) : (
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Select Course</label>
                                <select
                                    value={selectedCourse?._id || ''}
                                    onChange={(e) => {
                                        const found = courses.find(c => c._id === e.target.value);
                                        setSelectedCourse(found);
                                    }}
                                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-750 font-bold cursor-pointer"
                                >
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Subjects and Days List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-slate-50/10">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />)}
                            </div>
                        ) : selectedCourse && subjectDaysMapping.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-[11px] font-bold">No assigned subjects found in this course.</div>
                        ) : (
                            subjectDaysMapping.map(group => {
                                const isExpanded = expandedSubjects[group.subjectName] !== false;
                                return (
                                    <div key={group.subjectName} className="space-y-1.5 animate-fade-in mb-3">
                                        
                                        {/* Subject Collapsible Header */}
                                        <div
                                            onClick={() => setExpandedSubjects(prev => ({
                                                ...prev,
                                                [group.subjectName]: !isExpanded
                                            }))}
                                            className="flex items-center justify-between p-2.5 bg-slate-100/70 hover:bg-slate-200/50 rounded-xl cursor-pointer select-none text-[11px] font-black text-slate-700 tracking-wide transition-all uppercase"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>{group.subjectName}</span>
                                                <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                                                    {group.days.length}
                                                </span>
                                            </div>
                                            <div>
                                                {isExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                                            </div>
                                        </div>

                                        {/* Days List under Subject */}
                                        {isExpanded && (
                                            <div className="space-y-1.5 pl-1.5 border-l border-slate-200/65 ml-2">
                                                {group.days.map(day => {
                                                    const isActive = selectedInboxId === day.id;
                                                    return (
                                                        <div
                                                            key={day.id}
                                                            onClick={() => setSelectedInboxId(day.id)}
                                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                                                ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                                                : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                                                }`}
                                                        >
                                                            <div className="flex items-center space-x-2.5 min-w-0">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive
                                                                    ? 'bg-[#3E3ADD] text-white shadow-sm'
                                                                    : 'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                    <BookOpen size={13} />
                                                                </div>
                                                                <h3 className={`font-bold text-xs truncate ${isActive ? 'text-indigo-900' : 'text-slate-750'}`}>
                                                                    Index {day.dayNum}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ── MAIN CONTENT ──────────────────────────────────── */}
                <main className="flex-1 flex flex-col bg-white overflow-hidden">
                    
                    {/* Panel Header */}
                    <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                <HardDrive size={16} />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                    {selectedInboxId ? `Index ${selectedDayNumber}` : 'Select an Index'}
                                </h1>
                                <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                                    {selectedCourse ? `${selectedCourse.name} · ${selectedSubjectName}` : 'Private Drive'}
                                </p>
                            </div>
                        </div>
                        {selectedInboxId && (
                            <button
                                onClick={() => setShowMatModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                Upload Content
                            </button>
                        )}
                    </div>

                    {/* Files Display */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        {!selectedInboxId ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center">
                                    <h2 className="text-base font-extrabold text-slate-400 mb-1.5">No Day Selected</h2>
                                    <p className="text-slate-455 text-xs leading-relaxed">
                                        Select a Subject day index from the sidebar to view your private Drive files.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-6 text-left">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-sm font-bold text-slate-800">Your Private Uploads</h2>
                                    <span className="text-xs bg-slate-100 text-slate-650 px-3 py-1 rounded-full font-bold">
                                        Files: {studyMaterials.length}
                                    </span>
                                </div>

                                {loadingMaterials ? (
                                    <div className="flex flex-col items-center justify-center py-12 bg-white">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                        <p className="text-xs text-slate-450 font-semibold">Loading your private drive files...</p>
                                    </div>
                                ) : studyMaterials.length === 0 ? (
                                    <div className="py-12 text-center bg-white rounded-2xl border border-slate-150 shadow-sm max-w-md mx-auto space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                                            <HardDrive size={26} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">Drive is Empty</p>
                                            <p className="text-slate-450 text-xs mt-1 font-medium leading-relaxed">
                                                You haven't uploaded any private content for this subject day index yet. Files uploaded here are only visible to you.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowMatModal(true)}
                                            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#3E3ADD] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                        >
                                            Upload Your First File
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                        {studyMaterials.map((mat) => (
                                            <div key={mat._id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between hover:-translate-y-0.5 duration-205">
                                                <div className="space-y-2">
                                                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2" title={mat.title}>{mat.title}</h4>
                                                    <p className="text-xs text-slate-450 truncate" title={mat.filename}>
                                                        {mat.filename === 'Web Link' ? (
                                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">🔗 Web Link</span>
                                                        ) : (
                                                            mat.filename
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-semibold">Uploaded on {new Date(mat.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                    <button
                                                        onClick={() => handleDelete(mat._id)}
                                                        className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                    <a
                                                        href={mat.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                                    >
                                                        {mat.filename === 'Web Link' ? 'Open Link' : 'Open File'}
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
							</div>
                        )}
                    </div>
                </main>
            </div>

            {/* Upload Modal */}
            {showMatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMatModal(false)} />
                    
                    {/* Content */}
                    <div className="bg-white border border-slate-200 rounded-[28px] shadow-2xl w-full max-w-md p-6 relative z-10 animate-scale-in">
                        <button
                            onClick={() => setShowMatModal(false)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-655 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            <X size={16} />
                        </button>

                        <div className="mb-5">
                            <h2 className="text-base font-extrabold text-slate-850">Upload to Private Drive</h2>
                            <p className="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-wider">
                                {selectedInboxId ? `Subject: ${selectedSubjectName} · Index ${selectedDayNumber}` : ''}
                            </p>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Content Title</label>
                                <input
                                    type="text"
                                    value={matTitle}
                                    onChange={e => setMatTitle(e.target.value)}
                                    placeholder="e.g., Lesson Plan, Audio Reference, Lecture Notes"
                                    className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Upload Type</label>
                                <div className="flex bg-slate-100 p-0.5 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setUploadType('file')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${uploadType === 'file' ? 'bg-white text-[#3E3ADD] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Upload File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadType('url')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${uploadType === 'url' ? 'bg-white text-[#3E3ADD] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Web Link (URL)
                                    </button>
                                </div>
                            </div>

                            {uploadType === 'file' ? (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Select File</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50 relative group">
                                        <input
                                            type="file"
                                            id="drive-material-file"
                                            onChange={e => setMatFile(e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            required={uploadType === 'file'}
                                        />
                                        <Upload className="mx-auto text-slate-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
                                        <p className="text-xs font-bold text-slate-655 truncate">
                                            {matFile ? matFile.name : "Drag & drop or browse file"}
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-1 font-semibold">PDF, DOC, DOCX, ZIP, MP3, PNG, JPG up to 10MB</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Web URL</label>
                                    <div className="relative">
                                        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="url"
                                            value={matUrl}
                                            onChange={e => setMatUrl(e.target.value)}
                                            placeholder="https://example.com/resources"
                                            className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                            required={uploadType === 'url'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowMatModal(false)}
                                    className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingMaterial}
                                    className="flex-1 h-10 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-70 transition-all"
                                >
                                    {uploadingMaterial ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            Uploading...
                                        </>
                                    ) : (
                                        "Upload"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-scale-in {
                            animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
                        }
                    `}} />
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherDrive;
