import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import styles
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Save, Plus, Trash2, Clock, Upload, CheckSquare, AlignLeft, Calendar, MessageSquare } from 'lucide-react';

const CreateTest = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isDiscussionModalOpen, setIsDiscussionModalOpen] = useState(false);
    const [discussionActivity, setDiscussionActivity] = useState({ activityName: '', activityLink: '' });

    // Step 1: Basic Info
    const [testDetails, setTestDetails] = useState({
        title: '',
        description: '',
        institute: '',
        course: '',
        subject: '',
        date: new Date().toISOString().split('T')[0], // Store as YYYY-MM-DD for input
    });

    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instRes, courseRes] = await Promise.all([
                    axios.get('/api/setup/institutes'),
                    axios.get('/api/setup/courses')
                ]);
                setInstitutes(instRes.data);
                setCourses(courseRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    // Step 2: Settings
    const [settings, setSettings] = useState({
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        startTime: '',
        endTime: '',
    });

    // Step 3: Questions
    const [questions, setQuestions] = useState([]);

    const addQuestion = (type) => {
        setQuestions([
            ...questions,
            {
                id: Date.now(),
                type,
                text: '',
                marks: 1,
                options: type === 'MCQ' ? [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] : []
            }
        ]);
    };

    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId, oIndex, field, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options];
                newOptions[oIndex][field] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const addOption = (qId) => {
        setQuestions(questions.map(q =>
            q.id === qId ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q
        ));
    };

    const handleSave = async () => {
        try {



            setLoading(true);
            await axios.post('/api/tests', {
                testDetails: {
                    ...testDetails,
                    discussionActivity
                },
                settings,
                questions
            });
            setLoading(false);

            toast.success('Test Created and Published Successfully!');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error("Error creating test:", error);
            toast.error(error.response?.data?.message || 'Error creating test');
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="Admin">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Create New Test</h1>

            {/* Steps Indicator */}
            <div className="flex items-center gap-4 mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`flex items-center gap-2 ${step === s ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === s ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>
                            {s}
                        </div>
                        <span className="text-sm">
                            {s === 1 ? 'Details' : s === 2 ? 'Questions' : 'Settings'}
                        </span>
                        {s < 3 && <div className="h-0.5 w-12 bg-slate-200 mx-2"></div>}
                    </div>
                ))}
            </div>

            {/* Step 1: Test Details */}
            {step === 1 && (
                <div className="max-w-3xl space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label-text">Institute</label>
                            <select
                                className="input-field"
                                value={testDetails.institute}
                                onChange={(e) => setTestDetails({ ...testDetails, institute: e.target.value })}
                            >
                                <option value="">Select Institute</option>
                                {institutes.map(inst => (
                                    <option key={inst._id} value={inst.name}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Course</label>
                            <select
                                className="input-field"
                                value={testDetails.course}
                                onChange={(e) => setTestDetails({ ...testDetails, course: e.target.value })}
                            >
                                <option value="">Select Course</option>
                                {courses.filter(c => !testDetails.institute || c.institute?.name === testDetails.institute || c.institute === testDetails.institute).map(course => (
                                    <option key={course._id} value={course.name}>{course.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Subject</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Data Structures"
                                value={testDetails.subject}
                                onChange={(e) => setTestDetails({ ...testDetails, subject: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label-text flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" />
                                Assigned Date
                            </label>
                            <input
                                type="date"
                                className="input-field"
                                value={testDetails.date}
                                onChange={(e) => setTestDetails({ ...testDetails, date: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                Assigned Date: {new Date(testDetails.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <label className="label-text">Test Title</label>
                            <input
                                type="text"
                                className="input-field font-semibold text-lg"
                                placeholder="Enter Test Name"
                                value={testDetails.title}
                                onChange={(e) => setTestDetails({ ...testDetails, title: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label-text mb-2 block">Description / Instructions</label>
                            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                                <ReactQuill
                                    theme="snow"
                                    value={testDetails.description}
                                    onChange={(value) => setTestDetails({ ...testDetails, description: value })}
                                    className="h-40 mb-12"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button className="btn-primary" onClick={() => setStep(2)}>Next: Add Questions</button>
                    </div>
                </div>
            )}

            {/* Step 2: Add Questions */}
            {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                    {/* Toolbar */}
                    <div className="flex gap-2 p-4 bg-white rounded-xl shadow-sm border border-slate-100 sticky top-16 z-10 overflow-x-auto">
                        <button onClick={() => addQuestion('MCQ')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium">
                            <CheckSquare size={16} /> Add MCQ
                        </button>
                        <button onClick={() => addQuestion('Subjective')} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-sm font-medium">
                            <AlignLeft size={16} /> Add Subjective
                        </button>
                        <button onClick={() => addQuestion('FileUpload')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                            <Upload size={16} /> File Upload
                        </button>
                    </div>

                    {questions.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500">No questions added yet. Use the toolbar above to start.</p>
                        </div>
                    )}

                    {questions.map((q, index) => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setQuestions(questions.filter(i => i.id !== q.id))} className="text-red-400 hover:text-red-600 p-2">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-sm font-bold">Q{index + 1}</span>
                                <div className="flex-1">
                                    <ReactQuill
                                        theme="bubble"
                                        value={q.text}
                                        onChange={(val) => updateQuestion(q.id, 'text', val)}
                                        placeholder="Type your question here..."
                                        className="bg-slate-50 rounded-lg border border-slate-200"
                                    />
                                </div>
                                <div className="w-24">
                                    <input
                                        type="number"
                                        value={q.marks}
                                        onChange={(e) => updateQuestion(q.id, 'marks', e.target.value)}
                                        className="input-field text-center"
                                        placeholder="Marks"
                                    />
                                </div>
                            </div>

                            {q.type === 'MCQ' && (
                                <div className="ml-12 space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name={`correct-${q.id}`}
                                                checked={opt.isCorrect}
                                                onChange={() => {
                                                    const newOpts = q.options.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                                                    updateQuestion(q.id, 'options', newOpts);
                                                }}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => updateOption(q.id, oIdx, 'text', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder={`Option ${oIdx + 1}`}
                                            />
                                        </div>
                                    ))}
                                    <button onClick={() => addOption(q.id)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-2">
                                        <Plus size={14} /> Add Option
                                    </button>
                                </div>
                            )}

                            {q.type === 'Subjective' && (
                                <div className="ml-12 text-sm text-slate-400 italic">
                                    Student will type their answer in a text box.
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-between pt-6 border-t border-slate-200">
                        <button className="px-6 py-2 text-slate-600 hover:text-slate-800" onClick={() => setStep(1)}>Back</button>
                        <button className="btn-primary" onClick={() => setStep(3)}>Next: Settings</button>
                    </div>
                </div>
            )}

            {/* Step 3: Settings & Assign */}
            {step === 3 && (
                <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
                    <h3 className="font-bold text-lg text-slate-800">Test Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label-text flex items-center gap-2"><Clock size={16} /> Duration (Minutes)</label>
                            <input type="number" className="input-field" value={settings.duration} onChange={(e) => setSettings({ ...settings, duration: e.target.value })} />
                        </div>
                        <div>
                            <label className="label-text flex items-center gap-2"><CheckSquare size={16} /> Passing Marks</label>
                            <input type="number" className="input-field" value={settings.passingMarks} onChange={(e) => setSettings({ ...settings, passingMarks: e.target.value })} />
                        </div>
                        <div>
                            <label className="label-text flex items-center gap-2"><Calendar size={16} /> Start Date & Time</label>
                            <input type="datetime-local" className="input-field" value={settings.startTime} onChange={(e) => setSettings({ ...settings, startTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="label-text flex items-center gap-2"><Calendar size={16} /> End Date & Time</label>
                            <input type="datetime-local" className="input-field" value={settings.endTime} onChange={(e) => setSettings({ ...settings, endTime: e.target.value })} />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <label className="label-text mb-3 block">Assign To</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 border p-3 rounded-xl cursor-pointer hover:bg-slate-50 w-full">
                                <input type="radio" name="assign" className="text-indigo-600" defaultChecked />
                                <div>
                                    <p className="font-semibold text-slate-800">Whole Batch</p>
                                    <p className="text-xs text-slate-500">Assign to all students in Course</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 border p-3 rounded-xl cursor-pointer hover:bg-slate-50 w-full">
                                <input type="radio" name="assign" className="text-indigo-600" />
                                <div>
                                    <p className="font-semibold text-slate-800">Select Students</p>
                                    <p className="text-xs text-slate-500">Pick specific students</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-between pt-8">
                        <div className="flex items-center gap-3">
                            <button className="px-6 py-2 text-slate-600 hover:text-slate-800" onClick={() => setStep(2)}>Back</button>
                            <button
                                type="button"
                                onClick={() => setIsDiscussionModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl shadow-sm transition-all"
                            >
                                <MessageSquare size={14} className="text-purple-600" />
                                <span>Decide Activity</span>
                            </button>
                        </div>
                        <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
                            <Save size={18} /> Publish Test
                        </button>
                    </div>
                </div>
            )}

            {isDiscussionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsDiscussionModalOpen(false)}>
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-6 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                <MessageSquare size={20} className="text-purple-600" />
                                <span>Decide Activity</span>
                            </h3>
                            <button
                                onClick={() => setIsDiscussionModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="py-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Activity Name</label>
                                <input
                                    type="text"
                                    value={discussionActivity?.activityName || ''}
                                    onChange={(e) => setDiscussionActivity(prev => ({ ...prev, activityName: e.target.value }))}
                                    placeholder="Enter activity name (e.g. Discuss on Slack)"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none text-sm font-semibold transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Activity Link (URL)</label>
                                <input
                                    type="url"
                                    value={discussionActivity?.activityLink || ''}
                                    onChange={(e) => setDiscussionActivity(prev => ({ ...prev, activityLink: e.target.value }))}
                                    placeholder="https://example.com/discussion"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none text-sm font-semibold transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDiscussionModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!discussionActivity?.activityName?.trim()) {
                                        toast.error("Please enter an activity name.");
                                        return;
                                    }
                                    if (!discussionActivity?.activityLink?.trim()) {
                                        toast.error("Please enter a valid link.");
                                        return;
                                    }
                                    setIsDiscussionModalOpen(false);
                                    toast.success("Decide Activity settings configured!");
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/15"
                            >
                                Save Activity
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default CreateTest;
