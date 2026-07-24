import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Upload, Link as LinkIcon, FileText, BookOpen, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddCourseModal = ({ isOpen, onClose, refreshData, course = null, isDemoPreset = false }) => {
    const { user } = useAuth();
    const [institutes, setInstitutes] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [isDurationManuallyEdited, setIsDurationManuallyEdited] = useState(false);
    const [formData, setFormData] = useState({
        name: '', code: '', description: '', instituteId: '', subjects: '',
        syllabusUrl: '', syllabusType: 'link', maxStudentsPerSection: 30,
        sectionsCount: 1, duration: 5, fee: 0, isDemo: false
    });
    const [syllabusMode, setSyllabusMode] = useState('link'); // 'link' | 'file'
    const [syllabusFile, setSyllabusFile] = useState(null);
    const [syllabusUploading, setSyllabusUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const syllabusFileRef = useRef(null);
    const [showAllSelectedSubjects, setShowAllSelectedSubjects] = useState(false);

    const calculateSumOfDays = (subjectsString) => {
        if (!subjectsString) return 0;
        const selectedNames = subjectsString.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        let sum = 0;
        selectedNames.forEach(name => {
            const match = allSubjects.find(sub => sub.name?.toLowerCase() === name);
            if (match) {
                sum += Number(match.duration) || 0;
            } else if (course && course.subjectDurations) {
                const courseMatch = course.subjectDurations.find(sd => sd.subjectName?.toLowerCase() === name);
                if (courseMatch) {
                    sum += Number(courseMatch.duration) || 0;
                }
            }
        });
        return sum;
    };

    useEffect(() => {
        if (isOpen) {
            setIsDurationManuallyEdited(false);
            setShowAllSelectedSubjects(false);
            const fetchInstitutes = async () => {
                const { data } = await axios.get('/api/setup/institutes');
                setInstitutes(data);
            };
            fetchInstitutes();

            const fetchSubjects = async () => {
                try {
                    const { data } = await axios.get('/api/setup/subjects');
                    setAllSubjects(data);
                } catch (err) {
                    console.error("Error fetching subjects:", err);
                }
            };
            fetchSubjects();

            if (course) {
                setFormData({
                    name: course.name || '',
                    code: course.code || '',
                    description: course.description || '',
                    instituteId: course.institute?._id || course.institute || '',
                    subjects: Array.isArray(course.subjects) ? course.subjects.join(', ') : (course.subjects || ''),
                    syllabusUrl: course.syllabusUrl || '',
                    syllabusType: course.syllabusType || 'link',
                    maxStudentsPerSection: course.maxStudentsPerSection || 30,
                    sectionsCount: course.sectionsCount || 1,
                    duration: course.duration || 5,
                    fee: course.fee || 0,
                    isDemo: course.isDemo || false
                });
                setSyllabusMode(course.syllabusType || 'link');
            } else {
                setFormData({
                    name: '',
                    code: '',
                    description: '',
                    instituteId: user && user.institute
                        ? (typeof user.institute === 'object' ? user.institute._id : user.institute)
                        : '',
                    subjects: '',
                    syllabusUrl: '',
                    syllabusType: 'link',
                    maxStudentsPerSection: 30,
                    sectionsCount: 1,
                    duration: 5,
                    fee: 0,
                    isDemo: isDemoPreset || false
                });
                setSyllabusMode('link');
            }
            setSyllabusFile(null);
        }
    }, [isOpen, user, course, isDemoPreset]);

    useEffect(() => {
        if (!isDurationManuallyEdited && allSubjects.length > 0 && formData.subjects) {
            const calculatedDuration = calculateSumOfDays(formData.subjects);
            if (calculatedDuration > 0) {
                setFormData(prev => ({ ...prev, duration: calculatedDuration }));
            }
        }
    }, [allSubjects, formData.subjects, isDurationManuallyEdited]);

    const [subjectInput, setSubjectInput] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const instituteSubjects = useMemo(() => {
        if (!formData.instituteId) return [];
        const uniq = new Set();
        const list = [];
        allSubjects.forEach(s => {
            const instId = s.institute?._id || s.institute;
            if (instId && String(instId) === String(formData.instituteId)) {
                const nameLower = s.name?.trim().toLowerCase();
                if (nameLower && !uniq.has(nameLower)) {
                    uniq.add(nameLower);
                    list.push(s.name.trim());
                }
            }
        });
        return list;
    }, [allSubjects, formData.instituteId]);

    const filteredInstituteSubjects = useMemo(() => {
        return instituteSubjects.filter(sub => 
            sub.toLowerCase().includes(subjectInput.toLowerCase())
        );
    }, [instituteSubjects, subjectInput]);

    const addSubjectTag = (tag) => {
        const cleanTag = tag.trim();
        if (!cleanTag) return;
        
        const currentTags = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!currentTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) {
            const updatedTags = [...currentTags, cleanTag];
            setFormData(prev => ({ ...prev, subjects: updatedTags.join(', ') }));
        }
        setSubjectInput('');
    };

    const removeSubjectTag = (indexToRemove) => {
        const currentTags = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
        const updatedTags = currentTags.filter((_, idx) => idx !== indexToRemove);
        setFormData(prev => ({ ...prev, subjects: updatedTags.join(', ') }));
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val.endsWith(',')) {
            addSubjectTag(val.slice(0, -1));
        } else {
            setSubjectInput(val);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (subjectInput.trim()) {
                addSubjectTag(subjectInput);
            }
        } else if (e.key === 'Backspace' && !subjectInput) {
            const currentTags = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (currentTags.length > 0) {
                removeSubjectTag(currentTags.length - 1);
            }
        }
    };

    const toggleSubjectSelection = (subName) => {
        const currentTags = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
        const index = currentTags.findIndex(t => t.toLowerCase() === subName.toLowerCase());
        if (index !== -1) {
            removeSubjectTag(index);
        } else {
            addSubjectTag(subName);
        }
    };

    const handleSyllabusFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSyllabusFile(file);
        setSyllabusUploading(true);
        try {
            const fd = new FormData();
            fd.append('syllabus', file);
            const { data } = await axios.post('/api/setup/courses/upload-syllabus', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, syllabusUrl: data.syllabusUrl, syllabusType: 'file' }));
            toast.success(`Syllabus uploaded: ${data.originalName}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Syllabus upload failed');
            setSyllabusFile(null);
        } finally {
            setSyllabusUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate maxStudentsPerSection
        const sectionVal = parseInt(formData.maxStudentsPerSection);
        if (!sectionVal || sectionVal < 1) {
            toast.error('Max Students Per Section must be at least 1');
            return;
        }
        const sectionsCountVal = parseInt(formData.sectionsCount);
        if (isNaN(sectionsCountVal) || sectionsCountVal < 1) {
            toast.error('Number of Sections must be at least 1');
            return;
        }
        const durationVal = parseInt(formData.duration);
        if (isNaN(durationVal) || durationVal < 1) {
            toast.error('Course Duration must be at least 1 day');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                maxStudentsPerSection: sectionVal,
                sectionsCount: sectionsCountVal,
                duration: durationVal,
                fee: parseFloat(formData.fee) || 0
            };
            if (course) {
                await axios.put(`/api/setup/courses/${course._id}`, payload);
                toast.success('Course Updated!');
            } else {
                await axios.post('/api/setup/courses', payload);
                if (user?.role === 'Editor') {
                    toast.success('Course submitted for Admin approval!');
                } else {
                    toast.success('Course Added!');
                }
            }
            setLoading(false);
            onClose();
            if (refreshData) refreshData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving course');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[92vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-[#0b1329] relative flex-shrink-0">
                    <div className="absolute inset-0 flex items-center px-8 gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                            <BookOpen size={20} className="text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">
                            {course 
                                ? (course.isDemo ? 'Edit Demo Course' : 'Edit Course') 
                                : (isDemoPreset ? 'Add New Demo Course' : 'Add New Course')
                            }
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
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Institute selector */}
                        <div>
                            {user?.role !== 'Institute' && user?.role !== 'Editor' ? (
                                <>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Select Institute</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all appearance-none cursor-pointer"
                                        required
                                        value={formData.instituteId}
                                        onChange={e => setFormData({ ...formData, instituteId: e.target.value })}
                                    >
                                        <option value="">Select Institute</option>
                                        {institutes.map(inst => (
                                            <option key={inst._id} value={inst._id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                                    <div className="w-full bg-slate-100/70 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-500 cursor-not-allowed">
                                        {user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Assigned Institute')}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Course Name */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Name</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. B.Tech Computer Science"
                            />
                        </div>

                        {/* Code + Subjects + Section Capacity */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="CSE-2024"
                                />
                            </div>
                            <div className="relative" ref={dropdownRef}>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Subjects</label>
                                
                                <div 
                                    onClick={() => setShowDropdown(true)}
                                    className="w-full min-h-[46px] bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-300 transition-all cursor-text items-center"
                                >
                                    {/* Selected subject pills */}
                                    {(() => {
                                        const tags = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
                                        if (tags.length === 0) return null;
                                        const visibleTags = showAllSelectedSubjects ? tags : tags.slice(0, 1);
                                        return (
                                            <>
                                                {visibleTags.map((sub, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="bg-indigo-50 text-[#3E3ADD] font-extrabold text-[11px] px-2 py-1 rounded-xl flex items-center gap-1 border border-indigo-100 select-none animate-fade-in"
                                                    >
                                                        {sub}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const actualIndex = showAllSelectedSubjects ? idx : tags.indexOf(sub);
                                                                removeSubjectTag(actualIndex !== -1 ? actualIndex : idx);
                                                            }}
                                                            className="hover:text-indigo-900 transition-colors text-[10px] ml-0.5"
                                                        >
                                                            ✕
                                                        </button>
                                                    </span>
                                                ))}
                                                {tags.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowAllSelectedSubjects(!showAllSelectedSubjects);
                                                        }}
                                                        className="bg-slate-200 hover:bg-slate-350 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1 rounded-xl border border-indigo-100 transition-all select-none cursor-pointer"
                                                    >
                                                        {showAllSelectedSubjects ? 'Show Less' : `+${tags.length - 1} more`}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Text Input */}
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 min-w-[100px] p-0.5"
                                        value={subjectInput}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        onFocus={() => setShowDropdown(true)}
                                        placeholder={formData.subjects ? "" : "Select or type subject..."}
                                    />
                                </div>

                                {/* Hidden input for browser required validation */}
                                <input
                                    type="text"
                                    required
                                    value={formData.subjects}
                                    onChange={() => {}}
                                    className="opacity-0 w-0 h-0 absolute pointer-events-none"
                                />

                                {/* Dropdown List */}
                                {showDropdown && (
                                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[120] max-h-52 overflow-y-auto custom-scrollbar p-1">
                                        {filteredInstituteSubjects.length > 0 ? (
                                            filteredInstituteSubjects.map((subName, index) => {
                                                const isSelected = formData.subjects ? formData.subjects.split(',').map(s => s.trim().toLowerCase()).includes(subName.toLowerCase()) : false;
                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => toggleSubjectSelection(subName)}
                                                        className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50 text-[#3E3ADD]' : 'text-slate-700 hover:bg-slate-50'}`}
                                                    >
                                                        <span>{subName}</span>
                                                        {isSelected && <Check size={14} className="text-[#3E3ADD]" />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="px-3.5 py-2.5 text-xs font-bold text-slate-400 italic text-center">
                                                No suggestions found. Press Enter to add "{subjectInput}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Settings: Max Students, Sections Count, Duration & Fee */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-0.5 truncate" title="Max Students Per Section">
                                    👥 Max Students
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    value={formData.maxStudentsPerSection}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, maxStudentsPerSection: val });
                                    }}
                                    placeholder="30"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-0.5 truncate" title="Number of Sections to Create">
                                    📁 Sections Count
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    required
                                    value={formData.sectionsCount}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, sectionsCount: val });
                                    }}
                                    placeholder="1"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-0.5 truncate" title="Course Duration (Days)">
                                    📅 Duration (Days)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    required
                                    value={formData.duration}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setIsDurationManuallyEdited(true);
                                        setFormData({ ...formData, duration: val });
                                    }}
                                    placeholder="e.g. 5"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-0.5 truncate" title="Course Fee (₹)">
                                    💰 Course Fee (₹)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    required
                                    value={formData.fee}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, fee: val });
                                    }}
                                    placeholder="e.g. 15000"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-snug">
                            Max Students controls auto-sections. Duration generates day inboxes (1 to {formData.duration || 5}). Fee sets default student fee.
                        </p>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Description</label>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all min-h-[100px] resize-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description about this course — objectives, eligibility, duration, etc."
                            />
                        </div>

                        {/* Syllabus Section */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-1">
                                <FileText size={12} /> Upload Syllabus
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold uppercase ml-1">Optional</span>
                            </label>

                            {/* Mode toggle */}
                            <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setSyllabusMode('link')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${syllabusMode === 'link' ? 'bg-white shadow text-slate-800 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <LinkIcon size={12} /> Paste Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSyllabusMode('file')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${syllabusMode === 'file' ? 'bg-white shadow text-slate-800 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Upload size={12} /> Upload File
                                </button>
                            </div>

                            {syllabusMode === 'link' ? (
                                <input
                                    type="url"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                    value={formData.syllabusType === 'link' ? formData.syllabusUrl : ''}
                                    onChange={e => setFormData({ ...formData, syllabusUrl: e.target.value, syllabusType: 'link' })}
                                    placeholder="https://drive.google.com/... or any URL"
                                />
                            ) : (
                                <div>
                                    <input
                                        ref={syllabusFileRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className="hidden"
                                        onChange={handleSyllabusFileUpload}
                                    />
                                    <div
                                        onClick={() => syllabusFileRef.current?.click()}                                        className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-3.5 px-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                                    >
                                        {syllabusUploading ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                <p className="text-xs text-indigo-650 font-bold">Uploading...</p>
                                            </div>
                                        ) : (syllabusFile || (formData.syllabusType === 'file' && formData.syllabusUrl)) ? (
                                            <div className="flex flex-col items-center gap-1 transition-all">
                                                <FileText size={20} className="text-indigo-600 animate-pulse" />
                                                <p className="text-xs font-bold text-slate-700 max-w-[280px] truncate leading-tight">
                                                    {syllabusFile ? syllabusFile.name : formData.syllabusUrl.split('/').pop()}
                                                </p>
                                                <div className="flex items-center gap-2.5 mt-0.5">
                                                    <a
                                                        href={formData.syllabusUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] transition-all active:scale-95 inline-block text-center"
                                                    >
                                                        Click to Preview
                                                    </a>
                                                    <span className="text-[9px] text-slate-400 font-bold">or click box to change</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload size={18} className="text-slate-400" />
                                                <p className="text-xs font-bold text-slate-650">Click to upload PDF / Word</p>
                                                <p className="text-[9px] text-slate-400 leading-none">PDF, DOC, DOCX — max 10MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#0b1329] text-white font-bold rounded-2xl shadow-xl shadow-[#0b1329]/10 hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? (course ? 'Updating Course...' : 'Creating Course...') : (course ? 'Save Changes' : 'Create Course')}
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

export default AddCourseModal;
