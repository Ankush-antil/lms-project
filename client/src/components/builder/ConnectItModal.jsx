import { useAuth } from '../../context/AuthContext';
import { X, Info, ChevronDown, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';

const CustomSelect = ({ label, value, options, onChange, onCreateNew, placeholder }) => {
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

    return (
        <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-sm font-semibold text-slate-600">{label}</label>
            <div
                className={`w-full p-2.5 bg-white border ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-300'} rounded-lg text-slate-700 cursor-pointer flex justify-between items-center transition-all`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value || placeholder}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in max-h-60 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {options.map((option, idx) => (
                            <div
                                key={idx}
                                className={`px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer ${value === option ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600'}`}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                            >
                                {option}
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
        course: '',
        subject: '',
        date: '',
        index: '',
        activity: '',
        name: '',
        isAssigned: false
    });

    const [allCourses, setAllCourses] = useState([]);
    const [options, setOptions] = useState({
        institute: [],
        course: [],
        subject: [],
        index: Array.from({ length: 50 }, (_, i) => `Index ${i + 1}`),
        activity: ['Viva', 'Exam', 'Assignment', 'Test', 'Quiz']
    });

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
                    course: initialData.course || '',
                    subject: initialData.subject || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    index: initialData.index || '',
                    activity: initialData.activity || '',
                    name: initialData.name || '',
                    isAssigned: initialData.isAssigned !== undefined ? initialData.isAssigned : false
                });
            } else {
                setFormData({
                    institute: defaultInstName,
                    course: '',
                    subject: '',
                    date: '',
                    index: '',
                    activity: '',
                    name: '',
                    isAssigned: false
                });
            }
        }
    }, [isOpen, initialData, user]);

    // Update subjects when course changes
    useEffect(() => {
        if (formData.course && allCourses.length > 0) {
            const selectedCourse = allCourses.find(c => c.name === formData.course);
            if (selectedCourse) {
                setOptions(prev => ({ ...prev, subject: selectedCourse.subjects || [] }));
                // Reset subject if not in the new course's list
                if (selectedCourse.subjects && !selectedCourse.subjects.includes(formData.subject)) {
                    setFormData(prev => ({ ...prev, subject: selectedCourse.subjects[0] || '' }));
                }
            }
        }
    }, [formData.course, allCourses]);

    // Update index/day options when course and subject change
    useEffect(() => {
        let duration = 50; // fallback
        if (formData.course && formData.subject && allCourses.length > 0) {
            const selectedCourse = allCourses.find(c => c.name === formData.course);
            if (selectedCourse) {
                const durationEntry = selectedCourse.subjectDurations?.find(
                    sd => sd.subjectName?.toLowerCase() === formData.subject?.toLowerCase()
                );
                if (durationEntry && durationEntry.duration > 0) {
                    duration = durationEntry.duration;
                } else if (selectedCourse.duration > 0) {
                    duration = selectedCourse.duration;
                }
            }
        }
        setOptions(prev => ({
            ...prev,
            index: Array.from({ length: duration }, (_, i) => `Day ${i + 1}`)
        }));
    }, [formData.course, formData.subject, allCourses]);

    const handleCreateNew = (field, key) => {
        const newValue = prompt(`Enter new ${field}:`);
        if (newValue) {
            setOptions(prev => ({
                ...prev,
                [key]: [...prev[key], newValue]
            }));
            setFormData(prev => ({
                ...prev,
                [key]: newValue
            }));
        }
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

                        <CustomSelect
                            label="Test Day / Index"
                            value={formData.index}
                            options={options.index}
                            onChange={(val) => setFormData(prev => ({ ...prev, index: val }))}
                            onCreateNew={() => handleCreateNew('Test Day / Index', 'index')}
                            placeholder="Select Day / Index"
                        />

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
                        onClick={() => onSave && onSave(formData)}
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
