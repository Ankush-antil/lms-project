import { useAuth } from '../../context/AuthContext';
import { X, Info, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

const CustomSelect = ({ label, value, options, onChange, onCreateNew, onRenameOption, onDeleteOption, canShowRename = () => true, canShowDelete = () => true, placeholder, isMulti = false, renderOption, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isSelected = (option) => {
        const optVal = typeof option === 'object' && option ? option.name : option;
        if (isMulti) {
            return Array.isArray(value) && value.includes(optVal);
        }
        return value === optVal;
    };

    const handleOptionClick = (option) => {
        const optVal = typeof option === 'object' && option ? option.name : option;
        if (isMulti) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optVal)
                ? currentValues.filter(v => v !== optVal)
                : [...currentValues, optVal];
            onChange(newValues);
        } else {
            onChange(optVal);
            setIsOpen(false);
        }
    };

    const displayValue = isMulti
        ? (Array.isArray(value) && value.length > 0 ? value.map(v => renderOption ? renderOption(v) : v).join(', ') : '')
        : (renderOption ? renderOption(value) : value);

    return (
        <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-sm font-semibold text-slate-600">{label}</label>
            <div
                className={`w-full p-2.5 border rounded-lg flex justify-between items-center transition-all ${
                    disabled 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none' 
                        : isOpen 
                            ? 'bg-white border-indigo-500 ring-2 ring-indigo-100 cursor-pointer' 
                            : 'bg-white border-slate-300 cursor-pointer'
                }`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`truncate ${displayValue ? (disabled ? 'text-slate-500' : 'text-slate-700') : 'text-slate-400'}`}>{displayValue || placeholder}</span>
                {!disabled && <ChevronDown size={16} className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in max-h-60 flex flex-col animate-fade-in">
                    <div className="flex-1 overflow-y-auto">
                        {options.map((option, idx) => (
                            <div
                                key={idx}
                                className={`px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center justify-between ${isSelected(option) ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600'}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 w-full">
                                    {isMulti && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected(option)}
                                            onChange={() => { }} // handled by parent onClick
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 border-slate-300 cursor-pointer flex-shrink-0"
                                        />
                                    )}
                                    <span className="truncate">{renderOption ? renderOption(option) : (typeof option === 'object' && option ? option.name : option)}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {onRenameOption && !isMulti && canShowRename(option) && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRenameOption(option);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded transition-all cursor-pointer flex-shrink-0"
                                            title="Rename"
                                        >
                                            <Edit size={13} />
                                        </button>
                                    )}
                                    {onDeleteOption && !isMulti && canShowDelete(option) && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteOption(option);
                                            }}
                                            className="p-1 text-slate-455 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer flex-shrink-0"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Create New Button */}
                    {onCreateNew && (
                        <div
                            className="px-3 py-2.5 bg-slate-50 border-t border-slate-100 text-indigo-600 text-sm font-semibold cursor-pointer hover:bg-indigo-50 flex items-center gap-2 transition-colors sticky bottom-0"
                            onClick={() => {
                                setIsOpen(false);
                                onCreateNew();
                            }}
                        >
                            <Plus size={16} /> Create New
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ConnectItModal = ({ isOpen, onClose, onSave, initialData, disabledFields = {} }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        institute: '',
        course: [],
        subject: '',
        date: '',
        index: '',
        activity: '',
        name: '',
        isAssigned: false,
        duration: '',
        passingMarks: '',
        description: '',
        assignmentType: 'all', // 'all', 'particular', 'selected'
        assignedStudents: []
    });

    const [allCourses, setAllCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [options, setOptions] = useState({
        institute: [],
        course: [],
        subject: [],
        index: Array.from({ length: 50 }, (_, i) => `Inbox ${i + 1}`),
        activity: [
            { name: 'Viva', isDefault: true },
            { name: 'Exam', isDefault: true },
            { name: 'Assignment', isDefault: true },
            { name: 'Test', isDefault: true },
            { name: 'Quiz', isDefault: true }
        ]
    });

    const [indexMappings, setIndexMappings] = useState({});
    const [loadingMappings, setLoadingMappings] = useState(false);
    const [dayNumberMap, setDayNumberMap] = useState({});

    const parseCommaSeparated = (str) => {
        if (!str) return [];
        if (Array.isArray(str)) return str;
        if (typeof str !== 'string') return [String(str)];
        return str.split(',').map(s => s.trim()).filter(Boolean);
    };

    const fetchIndexMappings = async (courseId, subjectList) => {
        setLoadingMappings(true);
        try {
            const params = { courseId };
            if (subjectList) {
                const subStr = Array.isArray(subjectList) ? subjectList.join(', ') : subjectList;
                if (subStr) {
                    params.subject = subStr;
                }
            }
            const { data } = await axios.get('/api/users/inbox-configs/course-subject', { params });
            const mapping = {};
            if (Array.isArray(data)) {
                data.forEach(cfg => {
                    if (cfg.inboxId && cfg.displayName) {
                        mapping[cfg.inboxId] = cfg.displayName;
                        mapping[cfg.inboxId.toLowerCase()] = cfg.displayName;
                        mapping[cfg.inboxId.trim().toLowerCase()] = cfg.displayName;
                    }
                });
            }
            setIndexMappings(mapping);
        } catch (err) {
            console.error("Error fetching inbox mappings:", err);
        } finally {
            setLoadingMappings(false);
        }
    };

    const handleRenameIndex = async (currentOption) => {
        const selectedSubjects = Array.isArray(formData.subject) ? formData.subject : (formData.subject ? [formData.subject] : []);
        const selectedCourseNames = Array.isArray(formData.course) ? formData.course : [];

        if (selectedCourseNames.length === 0 && selectedSubjects.length === 0) {
            toast.error('Please select a course or subject first');
            return;
        }

        // Find which inboxId this currentOption corresponds to
        let targetInboxId = '';
        const foundKey = Object.keys(indexMappings).find(k => indexMappings[k] === currentOption);
        if (foundKey) {
            targetInboxId = foundKey;
        } else {
            const match = currentOption.match(/^(Index|Inbox)\s+(\d+)$/i);
            if (match) {
                targetInboxId = `inbox ${match[2]}`;
            }
        }

        if (!targetInboxId) {
            toast.error('Cannot rename custom added inboxes');
            return;
        }

        const newName = prompt(`Rename "${currentOption}" to:`, currentOption);
        if (newName && newName.trim() && newName !== currentOption) {
            try {
                // Use the first selected course for the API call; the server
                // will find all other courses sharing the same subject automatically.
                const firstCourseName = selectedCourseNames[0] || '';
                const selectedCourse = allCourses.find(c => c.name === firstCourseName);
                const courseIdToSend = selectedCourse?._id || undefined;

                await axios.post('/api/users/inbox-configs', {
                    inboxId: targetInboxId,
                    displayName: newName.trim(),
                    courseId: courseIdToSend,
                    subject: selectedSubjects.join(', ')
                });
                toast.success('Inbox renamed across all courses with this subject!');
                // Refresh mappings using subject for cross-course accuracy
                await fetchIndexMappings(courseIdToSend, selectedSubjects);
                if (formData.index === currentOption) {
                    setFormData(prev => ({ ...prev, index: newName.trim() }));
                }
            } catch (err) {
                console.error("Rename error:", err);
                toast.error('Failed to rename inbox');
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const studentsUrl = user?.role === 'Teacher' ? '/api/users/teacher-students' : '/api/users?role=Student';
                    const [instRes, courseRes, actTypesRes, studRes] = await Promise.all([
                        axios.get('/api/setup/institutes'),
                        axios.get('/api/setup/courses'),
                        axios.get('/api/setup/activity-types'),
                        axios.get(studentsUrl).catch(() => ({ data: [] }))
                    ]);

                    setAllCourses(courseRes.data);
                    setAllStudents(studRes.data || []);
                    
                    const defaults = [
                        { name: 'Viva', isDefault: true },
                        { name: 'Exam', isDefault: true },
                        { name: 'Assignment', isDefault: true },
                        { name: 'Test', isDefault: true },
                        { name: 'Quiz', isDefault: true }
                    ];

                    setOptions(prev => ({
                        ...prev,
                        institute: instRes.data.map(i => i.name),
                        course: courseRes.data.map(c => c.name),
                        activity: [...defaults, ...(actTypesRes.data || [])]
                    }));

                    // If user is Institute or Editor, auto-fill the institute name from the fetched list
                    if (user?.role === 'Institute' || user?.role === 'Editor') {
                        const userInstId = user && user.institute
                            ? (typeof user.institute === 'object' ? user.institute._id : user.institute)
                            : '';
                        const matchingInst = instRes.data.find(i => i._id === userInstId);
                        if (matchingInst) {
                            setFormData(prev => ({
                                ...prev,
                                institute: prev.institute || matchingInst.name
                            }));
                        } else if (user?.institute?.name) {
                            setFormData(prev => ({
                                ...prev,
                                institute: prev.institute || user.institute.name
                            }));
                        }
                    }

                } catch (error) {
                    console.error("Error fetching setup data:", error);
                }
            };
            fetchData();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (isOpen) {
            let defaultInstName = '';
            if (user?.role === 'Institute' || user?.role === 'Editor') {
                defaultInstName = (user.institute && typeof user.institute === 'object') ? (user.institute.name || '') : '';
            }

            if (initialData) {
                setFormData({
                    institute: initialData.institute || defaultInstName,
                    course: parseCommaSeparated(initialData.course),
                    subject: initialData.subject || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    index: initialData.index || '',
                    activity: initialData.activity || '',
                    name: initialData.name || '',
                    isAssigned: initialData.isAssigned !== undefined ? initialData.isAssigned : false,
                    duration: initialData.duration || '',
                    passingMarks: initialData.passingMarks || '',
                    description: initialData.description || '',
                    assignmentType: initialData.assignmentType || 'all',
                    assignedStudents: initialData.assignedStudents || []
                });
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                const queryStudentId = urlParams.get('studentId');
                setFormData({
                    institute: defaultInstName,
                    course: [],
                    subject: '',
                    date: '',
                    index: '',
                    activity: '',
                    name: '',
                    isAssigned: false,
                    duration: '',
                    passingMarks: '',
                    description: '',
                    assignmentType: queryStudentId ? 'selected' : 'all',
                    assignedStudents: queryStudentId ? [queryStudentId] : []
                });
            }
        }
    }, [isOpen, initialData, user]);

    // Update subjects and load custom index/day names when selected courses change
    useEffect(() => {
        if (allCourses.length === 0) return;
        if (formData.course && formData.course.length > 0 && allCourses.length > 0) {
            const selectedCourses = allCourses.filter(c => formData.course.includes(c.name));

            // Count frequency of subjects
            const subjectCounts = {};
            selectedCourses.forEach(course => {
                const subs = course.subjects || [];
                subs.forEach(s => {
                    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
                });
            });

            const uniqueSubjects = Object.keys(subjectCounts);

            // Sort by frequency descending (top) and then alphabetically
            uniqueSubjects.sort((a, b) => {
                const freqA = subjectCounts[a];
                const freqB = subjectCounts[b];
                if (freqA !== freqB) {
                    return freqB - freqA;
                }
                return a.localeCompare(b);
            });

            setOptions(prev => ({ ...prev, subject: uniqueSubjects }));

            // Adjust selected subject to only keep valid subjects (case-insensitive and prefix-tolerant check)
            setFormData(prev => {
                const cleanStr = (str) => (str || '').replace(/^\d+[\s.-]*/, '').trim().toLowerCase();
                const currentSelected = prev.subject || '';
                const currentCleaned = cleanStr(currentSelected);
                
                // Try exact case-insensitive match first
                let matchedSubject = uniqueSubjects.find(s => s.trim().toLowerCase() === currentSelected.trim().toLowerCase());
                
                // If not found, try matching by stripping numeric prefixes (e.g. "1. COMPUTER FUNDAMENTAL" matches "COMPUTER FUNDAMENTAL")
                if (!matchedSubject && currentCleaned) {
                    matchedSubject = uniqueSubjects.find(s => cleanStr(s) === currentCleaned);
                }
                
                return { ...prev, subject: matchedSubject || '' };
            });

        } else {
            setOptions(prev => ({ ...prev, subject: [] }));
            setFormData(prev => ({ ...prev, subject: '' }));
            setFormData(prev => ({ ...prev, subject: '' }));
        }
    }, [formData.course, allCourses]);

    // Fetch index mappings when course or subject selection changes
    useEffect(() => {
        if (formData.course && formData.course.length > 0 && allCourses.length > 0) {
            const selectedCourses = allCourses.filter(c => formData.course.includes(c.name));
            if (selectedCourses[0]) {
                const subjectList = formData.subject ? [formData.subject] : [];
                fetchIndexMappings(selectedCourses[0]._id, subjectList);
            }
        } else {
            setIndexMappings({});
        }
    }, [formData.course, formData.subject, allCourses]);

    // Update index/day options when course, subject, or mappings change
    useEffect(() => {
        let duration = 50; // fallback
        let daysList = [];

        if (formData.course && formData.course.length > 0 && formData.subject && allCourses.length > 0) {
            const selectedCourses = allCourses.filter(c => formData.course.includes(c.name));
            const firstCourse = selectedCourses[0];
            const firstSub = formData.subject;

            if (firstCourse) {
                const subjects = firstCourse.subjects || [];
                const durations = firstCourse.subjectDurations || [];
                const totalDuration = firstCourse.duration || 5;

                let currentDayIndex = 1;
                const mapping = [];

                // Sort and map durations chronologically according to subjects array
                if (subjects && subjects.length > 0) {
                    subjects.forEach(subjName => {
                        const d = durations.find(dur => dur.subjectName?.toLowerCase() === subjName.toLowerCase());
                        if (d) {
                            const subDur = Number(d.duration) || 0;
                            const subDays = [];
                            for (let i = 1; i <= subDur; i++) {
                                if (currentDayIndex <= totalDuration) {
                                    subDays.push({
                                        dayNum: i,
                                        indexNum: currentDayIndex,
                                        id: `Inbox ${currentDayIndex}`
                                    });
                                    currentDayIndex++;
                                }
                            }
                            if (subDays.length > 0) {
                                mapping.push({
                                    subjectName: subjName,
                                    days: subDays
                                });
                            }
                        }
                    });
                }

                const mappedSubjectNames = mapping.map(m => m.subjectName.toLowerCase());
                const remainingSubjects = subjects.filter(s => !mappedSubjectNames.includes(s.toLowerCase()));

                if (remainingSubjects.length > 0) {
                    const remainingDays = Math.max(totalDuration - currentDayIndex + 1, 0);
                    const daysPerSubject = remainingDays > 0 ? Math.floor(remainingDays / remainingSubjects.length) : 0;
                    const extraDays = remainingDays > 0 ? remainingDays % remainingSubjects.length : 0;

                    remainingSubjects.forEach((subName, idx) => {
                        let subDur = daysPerSubject + (idx < extraDays ? 1 : 0);
                        if (subDur <= 0) subDur = 5;
                        const subDays = [];
                        for (let i = 1; i <= subDur; i++) {
                            subDays.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                        if (subDays.length > 0) {
                            mapping.push({
                                subjectName: subName,
                                days: subDays
                            });
                        }
                    });
                }

                const matchedGroup = mapping.find(m => m.subjectName.toLowerCase() === firstSub.toLowerCase());
                if (matchedGroup) {
                    // Check if current formData.index is course-wide (e.g., "Inbox 339") and convert it to subject-relative
                    const currentInboxNorm = formData.index?.trim().toLowerCase();
                    const foundDay = matchedGroup.days.find(d => d.id.trim().toLowerCase() === currentInboxNorm);
                    
                    let targetInbox = formData.index;
                    if (foundDay) {
                        targetInbox = `Inbox ${foundDay.dayNum}`;
                        setFormData(prev => ({ ...prev, index: targetInbox }));
                    }

                    // Options list should be subject-relative, e.g., Inbox 1 to Inbox 26
                    daysList = matchedGroup.days.map(d => `Inbox ${d.dayNum}`);
                    const dayMap = {};
                    matchedGroup.days.forEach(d => {
                        dayMap[`Inbox ${d.dayNum}`] = d.dayNum;
                        dayMap[`Inbox ${d.dayNum}`.toLowerCase()] = d.dayNum;
                        dayMap[`Inbox ${d.dayNum}`.trim().toLowerCase()] = d.dayNum;
                    });
                    setDayNumberMap(dayMap);
                }
            }
        }

        if (daysList.length === 0) {
            daysList = Array.from({ length: duration }, (_, i) => `Inbox ${i + 1}`);
            const dayMap = {};
            daysList.forEach((id, i) => {
                dayMap[id] = i + 1;
                dayMap[id.toLowerCase()] = i + 1;
                dayMap[id.trim().toLowerCase()] = i + 1;
            });
            setDayNumberMap(dayMap);
        }

        setOptions(prev => ({
            ...prev,
            index: daysList
        }));
    }, [formData.course, formData.subject, allCourses]);

    const handleCreateNew = async (field, key) => {
        const newValue = prompt(`Enter new ${field}:`);
        if (newValue && newValue.trim()) {
            if (key === 'activity') {
                const reserved = ['viva', 'exam', 'assignment', 'test', 'quiz'];
                if (reserved.includes(newValue.trim().toLowerCase())) {
                    toast.error('This activity type is reserved');
                    return;
                }
                try {
                    const { data } = await axios.post('/api/setup/activity-types', { name: newValue.trim() });
                    toast.success('Activity type created successfully');
                    setOptions(prev => ({
                        ...prev,
                        activity: [...prev.activity, data]
                    }));
                    setFormData(prev => ({
                        ...prev,
                        activity: data.name
                    }));
                } catch (err) {
                    console.error("Error creating activity type:", err);
                    toast.error(err.response?.data?.message || 'Failed to create activity type');
                }
            } else {
                setOptions(prev => ({
                    ...prev,
                    [key]: [...prev[key], newValue.trim()]
                }));
                setFormData(prev => {
                    if (key === 'course') {
                        return {
                            ...prev,
                            [key]: [...(prev[key] || []), newValue.trim()]
                        };
                    }
                    return {
                        ...prev,
                        [key]: newValue.trim()
                    };
                });
            }
        }
    };

    const canModifyActivity = (option) => {
        if (typeof option !== 'object' || !option) return false;
        if (option.isDefault) return false;
        const currentUserId = user?._id || user?.id || '';
        return option.createdBy && option.createdBy.toString() === currentUserId.toString();
    };

    const handleEditActivity = async (option) => {
        const newName = prompt(`Rename "${option.name}" to:`, option.name);
        if (newName && newName.trim() && newName.trim() !== option.name) {
            const reserved = ['viva', 'exam', 'assignment', 'test', 'quiz'];
            if (reserved.includes(newName.trim().toLowerCase())) {
                toast.error('This activity type is reserved');
                return;
            }
            try {
                const { data } = await axios.put(`/api/setup/activity-types/${option._id}`, { name: newName.trim() });
                toast.success('Activity type updated successfully');
                
                // Update options list
                setOptions(prev => ({
                    ...prev,
                    activity: prev.activity.map(act => act._id === option._id ? data : act)
                }));
                
                // If it was selected, update form data
                if (formData.activity === option.name) {
                    setFormData(prev => ({ ...prev, activity: data.name }));
                }
            } catch (err) {
                console.error("Error updating activity type:", err);
                toast.error(err.response?.data?.message || 'Failed to update activity type');
            }
        }
    };

    const handleDeleteActivity = async (option) => {
        if (confirm(`Are you sure you want to delete the activity type "${option.name}"?`)) {
            try {
                await axios.delete(`/api/setup/activity-types/${option._id}`);
                toast.success('Activity type deleted successfully');
                
                // Remove from options list
                setOptions(prev => ({
                    ...prev,
                    activity: prev.activity.filter(act => act._id !== option._id)
                }));
                
                // If it was selected, clear it
                if (formData.activity === option.name) {
                    setFormData(prev => ({ ...prev, activity: '' }));
                }
            } catch (err) {
                console.error("Error deleting activity type:", err);
                toast.error(err.response?.data?.message || 'Failed to delete activity type');
            }
        }
    };

    const handleSave = () => {
        if (!onSave) return;
        const courseStr = Array.isArray(formData.course) ? formData.course.join(', ') : formData.course;
        const subjectStr = Array.isArray(formData.subject) ? formData.subject.join(', ') : formData.subject;

        onSave({
            ...formData,
            course: courseStr,
            subject: subjectStr
        });
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0 bg-white z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Info size={18} strokeWidth={3} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Connect it</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                    <div className="space-y-6">
                        {user?.role !== 'Institute' && user?.role !== 'Editor' && (
                            <CustomSelect
                                label="Institute Name"
                                value={formData.institute}
                                options={options.institute}
                                onChange={(val) => setFormData(prev => ({ ...prev, institute: val }))}
                                placeholder="Select Institute"
                                disabled={disabledFields?.institute}
                            />
                        )}

                        <CustomSelect
                            label="Course Name"
                            value={formData.course}
                            options={options.course}
                            onChange={(val) => setFormData(prev => ({ ...prev, course: val }))}
                            placeholder="Select Course"
                            isMulti={true}
                            disabled={disabledFields?.course}
                        />

                        <CustomSelect
                            label="Subject Name"
                            value={formData.subject}
                            options={options.subject}
                            onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                            onCreateNew={() => handleCreateNew('Subject Name', 'subject')}
                            placeholder="Select Subject"
                            disabled={disabledFields?.subject}
                        />

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-600">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans font-bold"
                            />
                        </div>

                        {formData.subject && formData.subject.length > 0 ? (
                            loadingMappings ? (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600">Test Day / Inbox</label>
                                    <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 flex items-center gap-2 transition-all">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                                        <span className="text-sm font-medium animate-pulse">Loading inbox configurations...</span>
                                    </div>
                                </div>
                            ) : (
                                <CustomSelect
                                    label="Test Day / Inbox"
                                    value={formData.index}
                                    options={options.index}
                                    onChange={(val) => setFormData(prev => ({ ...prev, index: val }))}
                                    onCreateNew={() => handleCreateNew('Test Day / Inbox', 'index')}
                                    onRenameOption={handleRenameIndex}
                                    renderOption={(opt) => {
                                        const norm = (opt || '').trim().toLowerCase();
                                        if (indexMappings[norm]) {
                                            return indexMappings[norm];
                                        }
                                        const localDayNum = dayNumberMap[norm];
                                        if (localDayNum !== undefined) {
                                            return `Inbox ${localDayNum}`;
                                        }
                                        return opt;
                                    }}
                                    placeholder="Select Day / Inbox"
                                    disabled={disabledFields?.index}
                                />
                            )
                        ) : null}

                        <CustomSelect
                            label="Type of Activity"
                            value={formData.activity}
                            options={options.activity}
                            onChange={(val) => setFormData(prev => ({ ...prev, activity: val }))}
                            onCreateNew={() => handleCreateNew('Type of Activity', 'activity')}
                            onRenameOption={handleEditActivity}
                            onDeleteOption={handleDeleteActivity}
                            canShowRename={canModifyActivity}
                            canShowDelete={canModifyActivity}
                            renderOption={(opt) => typeof opt === 'object' && opt ? opt.name : opt}
                            placeholder="Select Activity"
                        />

                        {/* Name Input */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-600">Test Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter test name..."
                                className="w-full p-4 font-bold text-indigo-600 bg-indigo-50/30 border border-indigo-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-indigo-300 transition-all"
                            />
                        </div>

                        {/* Duration and Passing Marks Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-600">Test Duration (mins)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                                    placeholder="e.g. 60"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-600">Passing Marks</label>
                                <input
                                    type="number"
                                    value={formData.passingMarks}
                                    onChange={(e) => setFormData(prev => ({ ...prev, passingMarks: e.target.value }))}
                                    placeholder="e.g. 40"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans font-bold"
                                />
                            </div>
                        </div>

                        {/* Student targeting control */}
                        {(() => {
                            const urlParams = new URLSearchParams(window.location.search);
                            const queryStudentId = urlParams.get('studentId');
                            const targetStudentObj = queryStudentId ? allStudents.find(s => s._id === queryStudentId) : null;

                            return (
                                <div className="space-y-3 pt-2">
                                    <label className="text-sm font-bold text-slate-700 block">Assign Test To</label>
                                    {/* Tab selection */}
                                    <div className={`grid gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-xl ${queryStudentId ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        {queryStudentId && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    assignmentType: 'selected',
                                                    assignedStudents: [queryStudentId]
                                                }))}
                                                className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer truncate ${formData.assignmentType === 'selected' ? 'bg-[#3E3ADD] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {targetStudentObj ? `${targetStudentObj.name.split(' ')[0]} Only` : 'This Student Only'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                assignmentType: 'particular',
                                                assignedStudents: prev.assignedStudents.filter(id => id !== queryStudentId)
                                            }))}
                                            className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer truncate ${formData.assignmentType === 'particular' ? 'bg-[#3E3ADD] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Select Student(s)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                assignmentType: 'all',
                                                assignedStudents: []
                                            }))}
                                            className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer truncate ${formData.assignmentType === 'all' ? 'bg-[#3E3ADD] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            All Students
                                        </button>
                                    </div>

                                    {/* Student checkbox checklist */}
                                    {formData.assignmentType === 'particular' && (() => {
                                        // Filter students by selected course names (if any)
                                        const filteredStudents = allStudents.filter(std => {
                                            const courseMatch = !formData.course || formData.course.length === 0 || (
                                                (std.studentProfile?.course && formData.course.includes(std.studentProfile.course.name)) ||
                                                (std.studentProfile?.coursesList && std.studentProfile.coursesList.some(cItem => cItem.course && formData.course.includes(cItem.course.name)))
                                            );
                                            const nameMatch = !studentSearchQuery || std.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || (std.email && std.email.toLowerCase().includes(studentSearchQuery.toLowerCase()));
                                            return courseMatch && nameMatch;
                                        });

                                        return (
                                            <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                                                <input
                                                    type="text"
                                                    placeholder="Search student by name or email..."
                                                    value={studentSearchQuery}
                                                    onChange={e => setStudentSearchQuery(e.target.value)}
                                                    className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                                                />
                                                <div className="max-h-40 overflow-y-auto space-y-2.5 custom-scrollbar text-left">
                                                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-2 select-none">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Students ({formData.assignedStudents.length} selected)</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (formData.assignedStudents.length === filteredStudents.length) {
                                                                    setFormData(prev => ({ ...prev, assignedStudents: [] }));
                                                                } else {
                                                                    setFormData(prev => ({ ...prev, assignedStudents: filteredStudents.map(s => s._id) }));
                                                                }
                                                            }}
                                                            className="text-[9px] font-black text-[#3E3ADD] hover:text-indigo-850 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            {formData.assignedStudents.length === filteredStudents.length ? 'Clear All' : 'Select All'}
                                                        </button>
                                                    </div>
                                                    {filteredStudents.length === 0 ? (
                                                        <p className="text-xs text-slate-400 text-center py-4">No matching students found</p>
                                                    ) : (
                                                        filteredStudents.map(std => {
                                                            const isChecked = formData.assignedStudents.includes(std._id);
                                                            return (
                                                                <label key={std._id} className="flex items-center gap-2.5 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            if (isChecked) {
                                                                                setFormData(prev => ({
                                                                                    ...prev,
                                                                                    assignedStudents: prev.assignedStudents.filter(id => id !== std._id)
                                                                                }));
                                                                            } else {
                                                                                setFormData(prev => ({
                                                                                    ...prev,
                                                                                    assignedStudents: [...prev.assignedStudents, std._id]
                                                                                }));
                                                                            }
                                                                        }}
                                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#3E3ADD] focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-bold text-slate-750 truncate leading-snug">{std.name}</p>
                                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                                                            {std.email && <span className="text-[10px] text-slate-400 truncate">{std.email}</span>}
                                                                            {std.studentProfile?.course?.name && (
                                                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md font-extrabold uppercase border border-slate-200">
                                                                                    {std.studentProfile.course.name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()}

                        {/* Visibility Mode (Assign / Upcoming) */}
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-bold text-slate-700 block">Visibility Mode</label>
                            <div className="flex gap-4">
                                <label className="flex-1 flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all select-none">
                                    <input
                                        type="checkbox"
                                        checked={!formData.isAssigned}
                                        onChange={() => setFormData(prev => ({ ...prev, isAssigned: false }))}
                                        className="rounded-full text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-slate-800">Assign</span>
                                </label>

                                <label className="flex-1 flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.isAssigned}
                                        onChange={() => setFormData(prev => ({ ...prev, isAssigned: true }))}
                                        className="rounded-full text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-slate-800">Upcoming</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 font-bold border border-slate-200 rounded-2xl hover:bg-white hover:shadow-sm transition-all active:scale-95 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 text-sm"
                    >
                        Save Information
                    </button>
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

export default ConnectItModal;
