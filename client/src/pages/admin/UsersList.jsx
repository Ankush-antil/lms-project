import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Trash2, Calendar } from 'lucide-react';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';

const UsersList = () => {
    const { user: currentUser } = useAuth();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [viewTab, setViewTab] = useState('registered'); // 'registered' | 'guest' | 'limited'
    const [users, setUsers] = useState([]);
    const [guests, setGuests] = useState([]);
    const [limitedUsers, setLimitedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, viewTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userRes, guestRes, limitedRes] = await Promise.all([
                axios.get('/api/users'),
                axios.get('/api/setup/institute-applications'),
                axios.get('/api/public-tests/admin/submissions')
            ]);
            setUsers(userRes.data);
            setGuests(guestRes.data);
            setLimitedUsers(limitedRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching users directory:", error);
            toast.error("Failed to load users list");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`/api/users/${id}`);
                setUsers(users.filter(u => u._id !== id));
                toast.success('User deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting user');
            }
        }
    };

    const handleDeletePublicSubmission = async (id) => {
        if (window.confirm('Are you sure you want to delete this public test response?')) {
            try {
                await axios.delete(`/api/public-tests/admin/submissions/${id}`);
                setLimitedUsers(limitedUsers.filter(s => s._id !== id));
                toast.success('Public submission removed successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting submission');
            }
        }
    };

    const filteredUsers = users.filter(user =>
        (filterRole === 'All' || user.role === filterRole) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const filteredGuests = guests.filter(g =>
        g.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.guestEmail && g.guestEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        g.guestPhone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLimited = limitedUsers.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.phone && l.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getFilteredItems = () => {
        if (viewTab === 'registered') return filteredUsers;
        if (viewTab === 'guest') return filteredGuests;
        return filteredLimited;
    };

    const filteredItems = getFilteredItems();
    const limit = typeof itemsPerPage === 'number' && itemsPerPage >= 5 ? itemsPerPage : 10;
    const totalPages = Math.ceil(filteredItems.length / limit);
    const startIndex = (currentPage - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Admin':
                return 'bg-rose-50 text-rose-600 border border-rose-100';
            case 'Institute':
                return 'bg-amber-50 text-amber-600 border border-amber-100';
            case 'Teacher':
                return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
            case 'Editor':
                return 'bg-purple-50 text-purple-600 border border-purple-100';
            case 'Student':
                return 'bg-blue-50 text-blue-600 border border-blue-100';
            case 'Guest User':
                return 'bg-slate-50 text-slate-600 border border-slate-200';
            case 'Limited User':
                return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
            default:
                return 'bg-slate-50 text-slate-600 border border-slate-100';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <DashboardLayout role={currentUser?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Users Directory</h1>
                    <p className="text-slate-500">View all registered user accounts and their created date/time, role, and details.</p>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 max-w-xl">
                <button
                    onClick={() => setViewTab('registered')}
                    className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'registered'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Registered Users ({users.length})
                </button>
                <button
                    onClick={() => setViewTab('guest')}
                    className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'guest'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Guest Users ({guests.length})
                </button>
                <button
                    onClick={() => setViewTab('limited')}
                    className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'limited'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Limited Users ({limitedUsers.length})
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={viewTab === 'registered' ? "Search by Name, Email, ID or Role..." : viewTab === 'guest' ? "Search by Guest Name, Email or Phone..." : "Search by Test Taker, Email or Phone..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-10 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Entries selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                        <input
                            type="number"
                            min={5}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setItemsPerPage(isNaN(val) ? '' : val);
                            }}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val) || val < 5) {
                                    setItemsPerPage(10);
                                }
                            }}
                            className="w-16 bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">entries</span>
                    </div>

                    {viewTab === 'registered' && (
                        <div className="relative min-w-[180px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-8 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="All">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Institute">Institute</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Editor">Editor</option>
                                <option value="Student">Student</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'registered' ? 'User Details' : viewTab === 'guest' ? 'Guest Name & Email' : 'Test Taker Details'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">Role</th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'limited' ? 'Submitted Date' : 'Created/Applied Date'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'registered' ? 'Institute' : viewTab === 'guest' ? 'Course & Institute' : 'Test Title'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading directory items...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((u) => (
                                    <tr key={u._id} className="hover:bg-slate-50 transition-colors group">
                                        {/* Details column */}
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className={`w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shadow-sm flex-shrink-0 ${
                                                        viewTab === 'registered' ? 'cursor-pointer hover:scale-110 transition-transform' : ''
                                                    }`}
                                                    onClick={viewTab === 'registered' ? () => openProfile(u._id) : undefined}
                                                >
                                                    {viewTab === 'registered' ? (
                                                        u.avatar ? (
                                                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            u.name[0]?.toUpperCase()
                                                        )
                                                    ) : viewTab === 'guest' ? (
                                                        u.guestName[0]?.toUpperCase()
                                                    ) : (
                                                        u.name[0]?.toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span 
                                                        className={`font-semibold text-slate-800 ${
                                                            viewTab === 'registered' ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''
                                                        }`}
                                                        onClick={viewTab === 'registered' ? () => openProfile(u._id) : undefined}
                                                    >
                                                        <TruncatedCell text={viewTab === 'registered' ? u.name : viewTab === 'guest' ? u.guestName : u.name} maxLength={20} />
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        <TruncatedCell text={viewTab === 'registered' ? u.email : viewTab === 'guest' ? u.guestEmail : u.email} maxLength={25} />
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role column */}
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeClass(viewTab === 'registered' ? u.role : viewTab === 'guest' ? 'Guest User' : 'Limited User')}`}>
                                                {viewTab === 'registered' ? u.role : viewTab === 'guest' ? 'Guest User' : 'Limited User'}
                                            </span>
                                        </td>

                                        {/* Date column */}
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>{formatDate(viewTab === 'limited' ? u.submittedAt : u.createdAt)}</span>
                                            </div>
                                        </td>

                                        {/* ID column */}
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">
                                            {u._id.slice(-6)}
                                        </td>

                                        {/* Course/Institute/Test details */}
                                        <td className="p-4 text-slate-600 whitespace-nowrap text-sm">
                                            {viewTab === 'registered' ? (
                                                <TruncatedCell text={u.institute?.name || u.institute || 'N/A'} maxLength={20} />
                                            ) : viewTab === 'guest' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">
                                                        <TruncatedCell text={u.course?.name || 'N/A'} maxLength={20} />
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        <TruncatedCell text={u.institute?.name || 'N/A'} maxLength={20} />
                                                    </span>
                                                </div>
                                            ) : (
                                                <TruncatedCell text={u.test?.title || 'Public Test'} maxLength={20} />
                                            )}
                                        </td>

                                        {/* Mobile column */}
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            {viewTab === 'registered' ? (
                                                u.mobileNumber || 'N/A'
                                            ) : viewTab === 'guest' ? (
                                                u.guestPhone || 'N/A'
                                            ) : (
                                                u.phone || 'N/A'
                                            )}
                                        </td>

                                        {/* Status column */}
                                        <td className="p-4 whitespace-nowrap">
                                            {viewTab === 'registered' ? (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {u.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            ) : viewTab === 'guest' ? (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    u.status === 'Accepted' || u.status === 'Registered'
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : u.status === 'Rejected'
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    {u.status}
                                                </span>
                                            ) : (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.completedStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {u.completedStatus || 'Completed'} (Score: {u.score || 0})
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions column */}
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">
                                            {viewTab === 'registered' ? (
                                                currentUser?._id !== u._id ? (
                                                    <button
                                                        onClick={() => handleDelete(u._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic px-2">You (Current Admin)</span>
                                                )
                                            ) : viewTab === 'limited' ? (
                                                <button
                                                    onClick={() => handleDeletePublicSubmission(u._id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                    title="Delete Submission"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic px-3">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        No directory items found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredItems.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                        <div className="text-sm font-semibold text-slate-500">
                            Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                            <span className="text-slate-700">{Math.min(startIndex + limit, filteredItems.length)}</span> of{' '}
                            <span className="text-slate-700">{filteredItems.length}</span> entries
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {(() => {
                                    const pages = [];
                                    const maxVisible = 5;
                                    if (totalPages <= maxVisible) {
                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                    } else {
                                        pages.push(1);
                                        let start = Math.max(2, currentPage - 1);
                                        let end = Math.min(totalPages - 1, currentPage + 1);
                                        if (currentPage <= 2) {
                                            end = 4;
                                        } else if (currentPage >= totalPages - 1) {
                                            start = totalPages - 3;
                                        }
                                        if (start > 2) pages.push('...');
                                        for (let i = start; i <= end; i++) pages.push(i);
                                        if (end < totalPages - 1) pages.push('...');
                                        pages.push(totalPages);
                                    }
                                    return pages.map((p, idx) => (
                                        <button
                                            key={idx}
                                            disabled={p === '...'}
                                            onClick={() => p !== '...' && setCurrentPage(p)}
                                            className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${
                                                p === '...'
                                                    ? 'text-slate-400 cursor-default bg-transparent'
                                                    : currentPage === p
                                                        ? 'bg-[#0b1329] text-white shadow-md'
                                                        : 'text-slate-600 hover:bg-slate-100 bg-transparent'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ));
                                })()}
                            </div>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default UsersList;
