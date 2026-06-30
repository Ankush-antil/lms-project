import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AddCourseModal from '../../components/AddCourseModal';
import CollaborateModal from '../../components/CollaborateModal';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, FileText, Plus, PenTool, Sparkles, Folder, Calendar, ArrowRight, Users, Trash2 } from 'lucide-react';

const EditorDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('tests'); // 'tests' | 'builder'
    const [tests, setTests] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    const handleDeleteTest = async (testId) => {
        if (!window.confirm("Are you sure you want to delete this test permanently from the database?")) return;
        try {
            await axios.delete(`/api/tests/${testId}`);
            toast.success("Test deleted successfully");
            setTests(prev => prev.filter(t => t._id !== testId));
        } catch (error) {
            console.error("Error deleting test:", error);
            toast.error(error.response?.data?.message || "Failed to delete test");
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [testRes, courseRes] = await Promise.all([
                axios.get('/api/tests'),
                axios.get('/api/setup/courses')
            ]);
            setTests(Array.isArray(testRes.data) ? testRes.data : []);
            setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching editor dashboard data:", error);
            toast.error("Failed to fetch dashboard data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateCourseSuccess = () => {
        fetchData();
    };

    return (
        <DashboardLayout role="Editor">
            {/* Upper Premium Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-[30px] p-8 md:p-10 text-white mb-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl -mb-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-purple-500/10">
                            <Sparkles size={12} /> Editor Workspace
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Welcome to Creator Hub</h1>
                        <p className="text-slate-300 mt-2 max-w-xl text-sm md:text-base">
                            Create courses, structure exams, and use our advanced Test Builder to publish engaging assessments.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsCourseModalOpen(true)}
                            className="px-5 py-3 bg-white text-slate-900 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus size={16} /> Create Course
                        </button>
                        <button
                            onClick={() => navigate('/editor/activities-builder')}
                            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PenTool size={16} /> Launch Test Builder
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-8 gap-4">
                <button
                    onClick={() => setActiveSection('tests')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeSection === 'tests'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <FileText size={18} /> Test Section
                </button>
                <button
                    onClick={() => setActiveSection('builder')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeSection === 'builder'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <PenTool size={18} /> Test Builder Section
                </button>
            </div>

            {/* Loading / Content */}
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">Loading dashboard workspace...</p>
                </div>
            ) : activeSection === 'tests' ? (
                /* TESTS TAB */
                <div className="space-y-8 animate-fade-in">
                    {/* Courses Quick Summary */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-purple-600" /> Existing Courses ({courses.length})
                        </h3>
                        {courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {courses.map(course => (
                                    <div key={course._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                            <Folder size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={course.name}>
                                                {course.name}
                                            </h4>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                {course.code}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 text-center text-slate-500 text-sm">
                                No courses created yet. Click <span className="font-bold text-purple-600 cursor-pointer" onClick={() => setIsCourseModalOpen(true)}>Create Course</span> to start.
                            </div>
                        )}
                    </div>

                    {/* Tests List */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-purple-600" /> Active Tests ({tests.length})
                        </h3>
                        {tests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tests.map(test => (
                                    <div key={test._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-2 h-full bg-purple-600"></div>
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                                                    {test.subject || 'General'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                    <Calendar size={12} /> {new Date(test.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-extrabold text-slate-850 text-base mb-2 group-hover:text-purple-600 transition-colors">
                                                {test.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-bold mb-3">
                                                Course: {test.course || 'N/A'}
                                            </p>

                                            {/* Shared Info or Collab Action */}
                                            {test.createdBy && (typeof test.createdBy === 'object' ? test.createdBy._id : test.createdBy) !== user?._id ? (
                                                <div className="text-[10px] text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 font-bold inline-flex items-center gap-1 mb-4 w-fit">
                                                    <Users size={10} /> Shared by: {test.createdBy.name || 'Another Editor'}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedTest(test);
                                                        setIsCollabModalOpen(true);
                                                    }}
                                                    className="text-[10px] text-slate-500 hover:text-purple-600 border border-slate-200 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 transition-all mb-4 w-fit active:scale-95"
                                                >
                                                    <Users size={10} /> Collaborate ({test.collaborators?.length || 0})
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-2">
                                            <span className="text-xs text-slate-400 font-bold">
                                                {test.questions?.length || 0} Questions
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleDeleteTest(test._id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Test"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/editor/activities-edit/${test._id}`)}
                                                    className="text-xs text-purple-600 font-bold flex items-center gap-1 hover:underline"
                                                >
                                                    Edit Test <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-150 rounded-3xl p-10 text-center text-slate-500">
                                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                                <h4 className="font-bold text-slate-700">No Tests Found</h4>
                                <p className="text-sm mt-1 mb-4">You have not created any tests yet.</p>
                                <button
                                    onClick={() => navigate('/editor/activities-builder')}
                                    className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition-all inline-flex items-center gap-2"
                                >
                                    <Plus size={14} /> Build Your First Test
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* TEST BUILDER TAB */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* Launch Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
                        <div>
                            <div className="w-14 h-14 bg-purple-500/20 text-purple-300 border border-purple-500/25 rounded-2xl flex items-center justify-center mb-6">
                                <PenTool size={28} />
                            </div>
                            <h3 className="text-2xl font-extrabold tracking-tight mb-2">Advanced Test Builder</h3>
                            <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
                                Build complete exams with different questions types, randomize lists, configure time limits, password protections, and anti-cheat webcams.
                            </p>
                        </div>
                        <div className="pt-6">
                            <button
                                onClick={() => navigate('/editor/activities-builder')}
                                className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-900/30 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                            >
                                <Plus size={16} /> Create New Assessment
                            </button>
                        </div>
                    </div>

                    {/* Quick Info & Help card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 className="font-extrabold text-slate-850 text-lg mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                                <Sparkles className="text-purple-600" size={18} /> Quick Guidelines
                            </h4>
                            <ul className="space-y-4 text-xs font-semibold text-slate-650">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">1</span>
                                    <span>Ensure you create the Course first before assigning a test to it.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">2</span>
                                    <span>Create Descriptive, Multiple Choice, and rich-text assignments.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">3</span>
                                    <span>Set score thresholds and passing constraints before publishing.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-purple-50/50 border border-purple-100/50 p-4 rounded-2xl mt-6">
                            <p className="text-[10px] text-purple-750 font-bold uppercase tracking-wider mb-1">Assigned Tasks</p>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                Need to edit an existing test? You can find it listed under the **Test Section** tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <AddCourseModal
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                refreshData={handleCreateCourseSuccess}
            />

            <CollaborateModal
                isOpen={isCollabModalOpen}
                onClose={() => setIsCollabModalOpen(false)}
                test={selectedTest}
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
};

export default EditorDashboard;
