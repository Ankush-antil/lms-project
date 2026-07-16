import { useAuth } from '../../context/AuthContext';
import { X, Info, ChevronDown, Plus, Edit } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

const CustomSelect = ({ label, value, options, onChange, onCreateNew, onRenameOption, placeholder, isMulti = false, renderOption }) => {
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
        if (isMulti) {
            return Array.isArray(value) && value.includes(option);
        }
        return value === option;
    };

    const handleOptionClick = (option) => {
        if (isMulti) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(option)
                ? currentValues.filter(v => v !== option)
                : [...currentValues, option];
            onChange(newValues);
        } else {
            onChange(option);
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
                className={`w-full p-2.5 bg-white border ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-300'} rounded-lg text-slate-700 cursor-pointer flex justify-between items-center transition-all`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate ${displayValue ? 'text-slate-700' : 'text-slate-400'}`}>{displayValue || placeholder}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
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
                                            onChange={() => {}} // handled by parent onClick
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 border-slate-300 cursor-pointer flex-shrink-0"
                                        />
                                    )}
                                    <span className="truncate">{renderOption ? renderOption(option) : option}</span>
                                </div>
                                {onRenameOption && !isMulti && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRenameOption(option);
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded transition-all cursor-pointer flex-shrink-0"
                                        title="Rename Index"
                                    >
                                        <Edit size={13} />
                                    </button>
                                )}
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

const ConnectItModal = ({ isOpen, onClose, onSave, initialData }) => {
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
        description: ''
    });

    const [allCourses, setAllCourses] = useState([]);
    const [options, setOptions] = useState({
        institute: [],
        course: [],
        subject: [],
        index: Array.from({ length: 50 }, (_, i) => `Inbox ${i + 1}`),
        activity: ['Viva', 'Exam', 'Assignment', 'Test', 'Quiz']
    });

    const [indexMappings, setIndexMappings] = useState({});
    const [loadingMappings, setLoadingMappings] = useState(false);
    const [dayNumberMap, setDayNumberMap] = useState({});

    const parseCommaSeparated = (str) => {
        if (!str) return [];
        return str.split(',').map(s => s.trim()).filter(Boolean);
    };

    const fetchIndexMappings = async (courseId, subjectList) => {
        setLoadingMappings(true);
        try {
            const params = { courseId };
            if (subjectList && subjectList.length > 0) {
                params.subject = subjectList.join(', ');
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
        const selectedSubjects = Array.isArray(formData.subject) ? formData.subject : [];
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
                    const [instRes, courseRes] = await Promise.all([
                        axios.get('/api/setup/institutes'),
                        axios.get('/api/setup/courses')
                    ]);

                    setAllCourses(courseRes.data);
                    setOptions(prev => ({
                        ...prev,
                        institute: instRes.data.map(i => i.name),
                        course: courseRes.data.map(c => c.name)
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
                    description: initialData.description || ''
                });
            } else {
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
                    description: ''
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

            // Adjust selected subject to only keep valid subjects
            setFormData(prev => {
                const currentSelected = prev.subject || '';
                const isValid = uniqueSubjects.includes(currentSelected);
                return { ...prev, subject: isValid ? currentSelected : '' };
            });

        } else {
            setOptions(prev => ({ ...prev, subject: [] }));
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

                if (durations && durations.length > 0) {
                    durations.forEach(d => {
                        const subName = d.subjectName;
                        const subDur = Number(d.duration) || 0;
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
                    daysList = matchedGroup.days.map(d => d.id);
                    const dayMap = {};
                    matchedGroup.days.forEach(d => {
                        dayMap[d.id] = d.dayNum;
                        dayMap[d.id.toLowerCase()] = d.dayNum;
                        dayMap[d.id.trim().toLowerCase()] = d.dayNum;
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

    const handleCreateNew = (field, key) => {
        const newValue = prompt(`Enter new ${field}:`);
        if (newValue) {
            setOptions(prev => ({
                ...prev,
                [key]: [...prev[key], newValue]
            }));
            setFormData(prev => {
                if (key === 'course') {
                    return {
                        ...prev,
                        [key]: [...(prev[key] || []), newValue]
                    };
                }
                return {
                    ...prev,
                    [key]: newValue
                };
            });
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
                            />
                        )}

                        <CustomSelect
                            label="Course Name"
                            value={formData.course}
                            options={options.course}
                            onChange={(val) => setFormData(prev => ({ ...prev, course: val }))}
                            placeholder="Select Course"
                            isMulti={true}
                        />

                        <CustomSelect
                            label="Subject Name"
                            value={formData.subject}
                            options={options.subject}
                            onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                            onCreateNew={() => handleCreateNew('Subject Name', 'subject')}
                            placeholder="Select Subject"
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
                                />
                            )
                        ) : null}

                        <CustomSelect
                            label="Type of Activity"
                            value={formData.activity}
                            options={options.activity}
                            onChange={(val) => setFormData(prev => ({ ...prev, activity: val }))}
                            onCreateNew={() => handleCreateNew('Type of Activity', 'activity')}
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


                        {/* Status (Assign / Upcoming) */}
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-bold text-slate-700 block">Status</label>
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
