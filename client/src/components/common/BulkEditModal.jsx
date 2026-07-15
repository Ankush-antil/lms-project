import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Save, Loader2 } from 'lucide-react';

const BulkEditModal = ({ isOpen, onClose, type, selectedIds, onSuccess }) => {
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states
    const [studentCoursesList, setStudentCoursesList] = useState([]);
    const [teacherCoursesList, setTeacherCoursesList] = useState([]);
    const [activityCoursesList, setActivityCoursesList] = useState([]);
    const [studentData, setStudentData] = useState({
        course: '',
        section: '',
        batch: '',
        isActive: ''
    });

    const [teacherData, setTeacherData] = useState({
        assignedCourses: [],
        subjects: [],
        isActive: ''
    });

    const [guestData, setGuestData] = useState({
        demoCourse: '',
        demoDuration: '',
        isActive: ''
    });

    const [commonData, setCommonData] = useState({
        isActive: '',
        institute: ''
    });

    const [courseData, setCourseData] = useState({
        duration: '',
        status: ''
    });

    const [subjectData, setSubjectData] = useState({
        duration: ''
    });

    const [activityData, setActivityData] = useState({
        course: '',
        subject: '',
        activity: '',
        date: '',
        index: ''
    });

    useEffect(() => {
        if (isOpen) {
            // Reset forms
            setStudentData({ course: '', section: '', batch: '', isActive: '' });
            setStudentCoursesList([]);
            setTeacherCoursesList([]);
            setTeacherData({ assignedCourses: [], subjects: [], isActive: '' });
            setGuestData({ demoCourse: '', demoDuration: '', isActive: '' });
            setCommonData({ isActive: '', institute: '' });
            setCourseData({ duration: '', status: '' });
            setSubjectData({ duration: '' });
            setActivityData({ course: '', subject: '', activity: '', date: '', index: '' });
            setActivityCoursesList([]);

            // Fetch course/subjects/institutes metadata for dropdowns and pre-fill details
            const fetchMetadataAndDetails = async () => {
                try {
                    setLoadingData(true);
                    const [courseRes, instRes] = await Promise.all([
                        axios.get('/api/setup/courses'),
                        axios.get('/api/setup/institutes')
                    ]);
                    const fetchedCourses = courseRes.data || [];
                    setCourses(fetchedCourses);
                    setInstitutes(instRes.data || []);

                    // If we have selected IDs, fetch the first one to pre-populate
                    if (selectedIds && selectedIds.length > 0) {
                        const firstId = selectedIds[0];
                        if (type === 'student') {
                            const { data } = await axios.get(`/api/users/${firstId}`);
                            const profile = data.studentProfile;
                            let list = (profile?.coursesList || []).map(item => ({
                                course: item.course?._id || item.course,
                                subjects: item.subjects || []
                            }));
                            if (list.length === 0 && profile?.course) {
                                list.push({
                                    course: profile.course?._id || profile.course,
                                    subjects: profile.subject ? profile.subject.split(',').map(s => s.trim()).filter(Boolean) : []
                                });
                            }
                            setStudentCoursesList(list);
                        } else if (type === 'teacher') {
                            const { data } = await axios.get(`/api/users/${firstId}`);
                            const profile = data.teacherProfile;
                            const assigned = profile?.assignedCourses || [];
                            const tSubs = profile?.subjects || [];
                            const list = assigned.map(cId => {
                                const resolvedId = typeof cId === 'object' ? cId._id : cId;
                                const cObj = fetchedCourses.find(c => c._id === String(resolvedId));
                                const matchingSubs = tSubs.filter(sub => cObj && cObj.subjects && cObj.subjects.includes(sub));
                                return { course: String(resolvedId), subjects: matchingSubs };
                            });
                            setTeacherCoursesList(list);
                            if (profile?.isActive !== undefined) {
                                setTeacherData(prev => ({ ...prev, isActive: String(profile.isActive) }));
                            }
                        } else if (type === 'activity' || type === 'test') {
                            const { data } = await axios.get(`/api/tests/${firstId}`);
                            const parseCommaSeparated = (str) => {
                                if (!str) return [];
                                return str.split(',').map(s => s.trim()).filter(Boolean);
                            };
                            const courseNames = parseCommaSeparated(data.course);
                            const subjectNames = parseCommaSeparated(data.subject);
                            const list = courseNames.map(cName => {
                                const cObj = fetchedCourses.find(c => c.name === cName);
                                if (!cObj) return null;
                                const matchingSubs = subjectNames.filter(sub => cObj.subjects && cObj.subjects.includes(sub));
                                return { course: cObj._id, subjects: matchingSubs };
                            }).filter(Boolean);
                            setActivityCoursesList(list);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching metadata/details:", err);
                } finally {
                    setLoadingData(false);
                }
            };
            fetchMetadataAndDetails();
        }
    }, [isOpen, selectedIds, type]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let updatePayload = {};
            let endpointPattern = (id) => `/api/users/${id}`;

            if (type === 'student') {
                if (studentCoursesList.length > 0) {
                    updatePayload.coursesList = studentCoursesList.map(item => ({
                        course: item.course,
                        subjects: item.subjects
                    })).filter(item => item.course);
                }
            } else if (type === 'teacher') {
                if (teacherCoursesList.length > 0) {
                    updatePayload.assignedCourses = teacherCoursesList.map(item => item.course).filter(Boolean);
                    updatePayload.subjects = Array.from(new Set(teacherCoursesList.flatMap(item => item.subjects)));
                }
                if (teacherData.isActive !== '') updatePayload.isActive = teacherData.isActive === 'true';
            } else if (type === 'guest') {
                if (guestData.demoCourse) updatePayload.demoCourse = guestData.demoCourse;
                if (guestData.demoDuration) updatePayload.demoDuration = Number(guestData.demoDuration);
                if (guestData.isActive !== '') updatePayload.isActive = guestData.isActive === 'true';
            } else if (['editor', 'institute', 'accountant', 'marketer', 'staff', 'parent'].includes(type)) {
                if (commonData.isActive !== '') updatePayload.isActive = commonData.isActive === 'true';
                if (commonData.institute) updatePayload.institute = commonData.institute;
            } else if (type === 'course') {
                endpointPattern = (id) => `/api/setup/courses/${id}`;
                if (courseData.duration) updatePayload.duration = Number(courseData.duration);
                if (courseData.status) updatePayload.status = courseData.status;
            } else if (type === 'subject') {
                endpointPattern = (id) => `/api/setup/subjects/update`;
                // Subjects don't use id-based PUT. They use global update.
                // We'll handle subject bulk updating differently in caller or here.
            } else if (type === 'activity' || type === 'test') {
                endpointPattern = (id) => `/api/tests/${id}`;
                if (activityCoursesList.length > 0) {
                    const courseNames = activityCoursesList
                        .map(item => courses.find(c => c._id === item.course)?.name)
                        .filter(Boolean);
                    const subjectNames = Array.from(new Set(activityCoursesList.flatMap(item => item.subjects)));
                    
                    updatePayload.course = courseNames.join(', ');
                    updatePayload.subject = subjectNames.join(', ');
                }
                if (activityData.activity) updatePayload.activity = activityData.activity;
                if (activityData.date) updatePayload.date = activityData.date;
                if (activityData.index) updatePayload.index = activityData.index;
            }

            // Perform parallel updates
            if (type === 'subject') {
                // Bulk update subjects is handled at subjects list by modifying course associations
                toast.error("Bulk editing subjects should be done via name/duration details.");
                setSaving(false);
                return;
            }

            const finalPayload = (type === 'activity' || type === 'test')
                ? { testDetails: updatePayload }
                : updatePayload;

            await Promise.all(selectedIds.map(id => {
                const url = endpointPattern(id);
                return axios.put(url, finalPayload);
            }));

            toast.success("Successfully updated selected items!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error("Bulk edit error:", err);
            toast.error(err.response?.data?.message || "Failed to update selected items");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
            <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-150 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Bulk Edit ({selectedIds.length} Selected)</h3>
                        <p className="text-xs text-slate-400 mt-1">Fields left blank will remain unchanged.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loadingData ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
                        </div>
                    ) : (
                        <>
                            {type === 'student' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assigned Courses & Subjects</label>
                                        <button
                                            type="button"
                                            onClick={() => setStudentCoursesList(prev => [...prev, { course: '', subjects: [] }])}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 border border-indigo-100"
                                        >
                                            + Add Course
                                        </button>
                                    </div>

                                    {studentCoursesList.length === 0 ? (
                                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                            <p className="text-xs text-slate-450 font-semibold">No new courses added. Original courses will be kept.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {studentCoursesList.map((item, index) => {
                                                const selectedCourseObj = courses.find(c => c._id === item.course);
                                                const courseSubjects = selectedCourseObj ? selectedCourseObj.subjects || [] : [];

                                                return (
                                                    <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 relative space-y-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setStudentCoursesList(prev => prev.filter((_, idx) => idx !== index))}
                                                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Remove Course"
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                        <div className="w-[85%]">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Course {index + 1}</label>
                                                            <select
                                                                value={item.course}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setStudentCoursesList(prev => prev.map((ch, idx) => {
                                                                        if (idx === index) {
                                                                            return { course: val, subjects: [] };
                                                                        }
                                                                        return ch;
                                                                    }));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                                            >
                                                                <option value="">Select a Course</option>
                                                                {courses.map(c => (
                                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {item.course && (
                                                            <div className="space-y-1.5 pt-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Subjects</label>
                                                                {courseSubjects.length === 0 ? (
                                                                    <span className="text-xs text-slate-400 italic">No subjects found in this course</span>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-2 bg-white border border-slate-150 rounded-xl p-3 max-h-36 overflow-y-auto">
                                                                        {courseSubjects.map(sub => {
                                                                            const isChecked = item.subjects.includes(sub);
                                                                            return (
                                                                                <label key={sub} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={e => {
                                                                                            const checked = e.target.checked;
                                                                                            setStudentCoursesList(prev => prev.map((ch, idx) => {
                                                                                                if (idx === index) {
                                                                                                    const nextSubs = checked
                                                                                                        ? [...ch.subjects, sub]
                                                                                                        : ch.subjects.filter(s => s !== sub);
                                                                                                    return { ...ch, subjects: nextSubs };
                                                                                                }
                                                                                                return ch;
                                                                                            }));
                                                                                        }}
                                                                                        className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer"
                                                                                    />
                                                                                    {sub}
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
                                    )}
                                </div>
                            )}

                            {type === 'teacher' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assigned Courses & Subjects</label>
                                        <button
                                            type="button"
                                            onClick={() => setTeacherCoursesList(prev => [...prev, { course: '', subjects: [] }])}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 border border-indigo-100"
                                        >
                                            + Add Course
                                        </button>
                                    </div>

                                    {teacherCoursesList.length === 0 ? (
                                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                            <p className="text-xs text-slate-455 font-semibold">No new courses added. Original courses will be kept.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {teacherCoursesList.map((item, index) => {
                                                const selectedCourseObj = courses.find(c => c._id === item.course);
                                                const courseSubjects = selectedCourseObj ? selectedCourseObj.subjects || [] : [];

                                                return (
                                                    <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 relative space-y-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTeacherCoursesList(prev => prev.filter((_, idx) => idx !== index))}
                                                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Remove Course"
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                        <div className="w-[85%]">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Course {index + 1}</label>
                                                            <select
                                                                value={item.course}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setTeacherCoursesList(prev => prev.map((ch, idx) => {
                                                                        if (idx === index) {
                                                                            return { course: val, subjects: [] };
                                                                        }
                                                                        return ch;
                                                                    }));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                                            >
                                                                <option value="">Select a Course</option>
                                                                {courses.map(c => (
                                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {item.course && (
                                                            <div className="space-y-1.5 pt-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Subjects</label>
                                                                {courseSubjects.length === 0 ? (
                                                                    <span className="text-xs text-slate-400 italic">No subjects found in this course</span>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-2 bg-white border border-slate-150 rounded-xl p-3 max-h-36 overflow-y-auto">
                                                                        {courseSubjects.map(sub => {
                                                                            const isChecked = item.subjects.includes(sub);
                                                                            return (
                                                                                <label key={sub} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={e => {
                                                                                            const checked = e.target.checked;
                                                                                            setTeacherCoursesList(prev => prev.map((ch, idx) => {
                                                                                                if (idx === index) {
                                                                                                    const nextSubs = checked
                                                                                                        ? [...ch.subjects, sub]
                                                                                                        : ch.subjects.filter(s => s !== sub);
                                                                                                    return { ...ch, subjects: nextSubs };
                                                                                                }
                                                                                                return ch;
                                                                                            }));
                                                                                        }}
                                                                                        className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer"
                                                                                    />
                                                                                    {sub}
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
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={teacherData.isActive}
                                            onChange={e => setTeacherData(prev => ({ ...prev, isActive: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value="">Keep Original</option>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {type === 'guest' && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Demo Course</label>
                                        <select
                                            value={guestData.demoCourse}
                                            onChange={e => setGuestData(prev => ({ ...prev, demoCourse: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="">Keep Original</option>
                                            {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Demo Duration (Days)</label>
                                        <input
                                            type="number"
                                            value={guestData.demoDuration}
                                            onChange={e => setGuestData(prev => ({ ...prev, demoDuration: e.target.value }))}
                                            placeholder="Keep Original"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={guestData.isActive}
                                            onChange={e => setGuestData(prev => ({ ...prev, isActive: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="">Keep Original</option>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {['editor', 'institute', 'accountant', 'marketer', 'staff', 'parent'].includes(type) && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={commonData.isActive}
                                            onChange={e => setCommonData(prev => ({ ...prev, isActive: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="">Keep Original</option>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {type === 'course' && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Duration (Months)</label>
                                        <input
                                            type="number"
                                            value={courseData.duration}
                                            onChange={e => setCourseData(prev => ({ ...prev, duration: e.target.value }))}
                                            placeholder="Keep Original"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={courseData.status}
                                            onChange={e => setCourseData(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="">Keep Original</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {(type === 'activity' || type === 'test') && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assigned Courses & Subjects</label>
                                        <button
                                            type="button"
                                            onClick={() => setActivityCoursesList(prev => [...prev, { course: '', subjects: [] }])}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 border border-indigo-100"
                                        >
                                            + Add Course
                                        </button>
                                    </div>

                                    {activityCoursesList.length === 0 ? (
                                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                            <p className="text-xs text-slate-450 font-semibold">No new courses added. Original courses will be kept.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activityCoursesList.map((item, index) => {
                                                const selectedCourseObj = courses.find(c => c._id === item.course);
                                                const courseSubjects = selectedCourseObj ? selectedCourseObj.subjects || [] : [];

                                                return (
                                                    <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 relative space-y-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActivityCoursesList(prev => prev.filter((_, idx) => idx !== index))}
                                                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Remove Course"
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                        <div className="w-[85%]">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Course {index + 1}</label>
                                                            <select
                                                                value={item.course}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setActivityCoursesList(prev => prev.map((ch, idx) => {
                                                                        if (idx === index) {
                                                                            return { course: val, subjects: [] };
                                                                        }
                                                                        return ch;
                                                                    }));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                                            >
                                                                <option value="">Select a Course</option>
                                                                {courses.map(c => (
                                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {item.course && (
                                                            <div className="space-y-1.5 pt-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Subjects</label>
                                                                {courseSubjects.length === 0 ? (
                                                                    <span className="text-xs text-slate-400 italic">No subjects found in this course</span>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-2 bg-white border border-slate-150 rounded-xl p-3 max-h-36 overflow-y-auto">
                                                                        {courseSubjects.map(sub => {
                                                                            const isChecked = item.subjects.includes(sub);
                                                                            return (
                                                                                <label key={sub} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={e => {
                                                                                            const checked = e.target.checked;
                                                                                            setActivityCoursesList(prev => prev.map((ch, idx) => {
                                                                                                if (idx === index) {
                                                                                                    const nextSubs = checked
                                                                                                        ? [...ch.subjects, sub]
                                                                                                        : ch.subjects.filter(s => s !== sub);
                                                                                                    return { ...ch, subjects: nextSubs };
                                                                                                }
                                                                                                return ch;
                                                                                            }));
                                                                                        }}
                                                                                        className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer"
                                                                                    />
                                                                                    {sub}
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
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-150 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-bold border border-slate-250 rounded-xl hover:bg-white hover:shadow-sm transition-all active:scale-95 text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Apply Changes
                    </button>
                </div>
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>,
        document.body
    );
};

export default BulkEditModal;
