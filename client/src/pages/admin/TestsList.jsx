import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Plus, FileText, Clock, Calendar, Wand2, Edit, Trash2, Link2, Check } from 'lucide-react';

const TestsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);

    const handleCopyUrl = (testId) => {
        const url = `${window.location.origin}/take-test/${testId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(testId);
            setTimeout(() => setCopiedId(null), 1500);
        }).catch(() => {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopiedId(testId);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    useEffect(() => {
        const fetchTests = async () => {
            try {

                if (!userInfo) {
                    navigate('/');
                    return;
                }
                
                console.log("[TestsList] Fetching tests...");
                const res = await axios.get('/api/tests');
                console.log("[TestsList] Received tests:", res.data);
                setTests(Array.isArray(res.data) ? res.data : []);
                setLoading(false);
            } catch (error) {
                console.error("[TestsList] Error fetching tests:", error);
                setLoading(false);
            }
        };
        fetchTests();
    }, [navigate]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        try {

            
            await axios.delete(`/api/tests/${id}`);
            setTests(tests.filter(t => t._id !== id));
            toast.success('Test deleted successfully');
        } catch (error) {
            console.error("[TestsList] Error deleting test:", error);
            toast.error('Error deleting test');
        }
    };

    const filteredTests = tests.filter(test => {
        const titleMatch = (test.title || 'Untitled').toLowerCase().includes(searchTerm.toLowerCase());
        const subjectMatch = filterSubject === 'All' || test.subject === filterSubject;
        return titleMatch && subjectMatch;
    }).sort((a, b) => {
        const getNum = (s) => parseInt(s?.match(/\d+/)?.[0] || 0);
        const numA = getNum(a.index);
        const numB = getNum(b.index);
        if (numA !== numB) return numA - numB;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const uniqueSubjects = ['All', ...new Set(tests.map(t => t.subject).filter(s => s && s.trim() !== ''))];

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">All Tests</h1>
                    <p className="text-slate-500">Manage and monitor tests across courses.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/admin/tests/builder')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} /> Create New Test
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Test Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="input-field pl-10 appearance-none cursor-pointer"
                        >
                            {uniqueSubjects.map(subject => (
                                <option key={subject} value={subject}>{subject === 'All' ? 'All Subjects' : subject}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tests Table */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredTests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-700">No tests found</h3>
                    <p className="text-slate-500">Create your first test using the builder.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold whitespace-nowrap">Test Title</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Course</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Subject</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Duration</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Questions</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Test Index</th>
                                    <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTests.map((test) => (
                                    <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="font-semibold text-slate-800">{test.title || 'Untitled'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                                {test.course || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                                                {test.subject || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                <Clock size={14} className="text-slate-400" />
                                                {test.settings?.duration || 0} mins
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-600 text-sm font-mono">
                                            {test.questions?.length || 0} Qs
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-600 text-sm">
                                            {test.index ? (
                                                <span className="font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100">{test.index}</span>
                                            ) : (
                                                <span className="text-slate-400 italic">No Index</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">
                                            <button
                                                onClick={() => handleCopyUrl(test._id)}
                                                className={`p-2 rounded-lg transition-all ${copiedId === test._id
                                                        ? 'text-emerald-600 bg-emerald-50'
                                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                    }`}
                                                title="Copy shareable test URL"
                                            >
                                                {copiedId === test._id ? <Check size={18} /> : <Link2 size={18} />}
                                            </button>
                                            <button
                                                onClick={() => navigate(`/admin/tests/edit/${test._id}`)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                title="Edit Test"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(test._id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                title="Delete Test"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
                        <span>Showing {filteredTests.length} of {tests.length} tests</span>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
                            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TestsList;
