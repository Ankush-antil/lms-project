import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useRef,  useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download,  Upload,  Search, Filter, Trash2, Calendar, Eye, Plus, Edit, ChevronDown } from 'lucide-react';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import PublicResponseModal from '../../components/common/PublicResponseModal';
import CandidateTestsModal from '../../components/common/CandidateTestsModal';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import BulkEditModal from '../../components/common/BulkEditModal';

const UsersList = () => {
    const { user: currentUser } = useAuth();
    const { openProfile } = useUserProfile();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [viewTab, setViewTab] = useState('registered'); // 'registered' | 'guest' | 'limited' | 'applications' | 'role-requests'
    
    // Bulk action states
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    // Reset selection on tab change
    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [viewTab]);

    // Synchronize viewTab with URL query parameter
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get('tab');
        if (tab && ['registered', 'guest', 'limited', 'applications', 'role-requests'].includes(tab)) {
            setViewTab(tab);
        }
    }, [location]);

    const [users, setUsers] = useState([]);
    const [guests, setGuests] = useState([]);
    const [limitedUsers, setLimitedUsers] = useState([]);
    const [roleRequests, setRoleRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingAppId, setUpdatingAppId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [selectedCandidateGroup, setSelectedCandidateGroup] = useState(null);
    const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
    const [activeRolesTooltipUserId, setActiveRolesTooltipUserId] = useState(null);
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [isEditGuestModalOpen, setIsEditGuestModalOpen] = useState(false);
    const [selectedGuestUser, setSelectedGuestUser] = useState(null);
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [institutes, setInstitutes] = useState([]);

    useEffect(() => {
        setCurrentPage(1);
        setActiveRolesTooltipUserId(null);
    }, [searchTerm, filterRole, viewTab, filterInstitute]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const promises = [
                axios.get('/api/users'),
                axios.get('/api/setup/institute-applications'),
                axios.get('/api/public-tests/admin/submissions')
            ];

            if (currentUser?.role === 'Admin' || currentUser?.role === 'Institute') {
                promises.push(axios.get('/api/users/role-requests'));
            }

            const results = await Promise.all(promises);
            setUsers(results[0].data);
            setGuests(results[1].data);
            setLimitedUsers(results[2].data);
            if (results[3]) {
                setRoleRequests(results[3].data);
            }
            const instsRes = await axios.get('/api/setup/institutes');
            setInstitutes(instsRes.data);
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

    const handleToggleStatus = async (userId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${userId}`, { isActive: nextActive });
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: nextActive } : u));
            toast.success('User status updated successfully');
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

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

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'edit') {
            if (viewTab === 'guest') {
                setIsBulkEditOpen(true);
            }
            return;
        }

        if (bulkAction === 'delete') {
            const confirmMsg = `Are you sure you want to delete the ${selectedIds.size} selected items?`;
            if (window.confirm(confirmMsg)) {
                try {
                    const promises = Array.from(selectedIds).map(id => {
                        if (viewTab === 'registered') {
                            return axios.delete(`/api/users/${id}`);
                        } else if (viewTab === 'role-requests') {
                            return axios.delete(`/api/users/role-requests/${id}`);
                        } else if (viewTab === 'limited') {
                            const group = groupedLimitedUsers.find(g => g._id === id);
                            if (group) {
                                return Promise.all(group.submissions.map(sub =>
                                    axios.delete(`/api/public-tests/admin/submissions/${sub._id}`)
                                ));
                            }
                            return Promise.resolve();
                        } else if (viewTab === 'guest') {
                            return axios.delete(`/api/users/${id}`);
                        } else if (viewTab === 'applications') {
                            return axios.delete(`/api/setup/applications/${id}`);
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(promises);
                    toast.success('Successfully deleted selected items');
                    setSelectedIds(new Set());
                    setBulkAction('');
                    fetchData();
                } catch (err) {
                    console.error("Bulk delete error:", err);
                    toast.error('Failed to delete some selected items');
                }
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

    const handleDeleteIndividualSubmission = async (id) => {
        try {
            await axios.delete(`/api/public-tests/admin/submissions/${id}`);
            setLimitedUsers(prev => prev.filter(s => s._id !== id));
            toast.success('Submission removed successfully');
            
            setSelectedCandidateGroup(prev => {
                if (!prev) return null;
                const updatedSubs = prev.submissions.filter(s => s._id !== id);
                if (updatedSubs.length === 0) {
                    setIsCandidateModalOpen(false);
                    return null;
                }
                return {
                    ...prev,
                    submissions: updatedSubs
                };
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting submission');
        }
    };

    const handleDeleteCandidateGroup = async (candidateGroup) => {
        if (window.confirm(`Are you sure you want to delete all ${candidateGroup.submissions.length} submissions for ${candidateGroup.name}?`)) {
            try {
                await Promise.all(candidateGroup.submissions.map(sub =>
                    axios.delete(`/api/public-tests/admin/submissions/${sub._id}`)
                ));
                setLimitedUsers(prev => prev.filter(s => s.email?.toLowerCase() !== candidateGroup.email?.toLowerCase()));
                toast.success('Candidate submissions deleted successfully');
            } catch (error) {
                console.error("Error deleting candidate submissions:", error);
                toast.error('Error deleting some submissions');
            }
        }
    };

    const handleApproveRoleRequest = async (id) => {
        try {
            await axios.put(`/api/users/role-requests/${id}/approve`);
            toast.success('Role request approved successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error approving request');
        }
    };

    const handleRejectRoleRequest = async (id) => {
        try {
            await axios.put(`/api/users/role-requests/${id}/reject`);
            toast.success('Role request rejected successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error rejecting request');
        }
    };

    const handleDeleteRoleRequest = async (id) => {
        if (window.confirm('Are you sure you want to move this role request to the Recycle Bin?')) {
            try {
                await axios.delete(`/api/users/role-requests/${id}`);
                setRoleRequests(prev => prev.filter(r => r._id !== id));
                toast.success('Role request moved to Recycle Bin');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting role request');
            }
        }
    };

    const handleDeleteGuestApplication = async (id) => {
        if (window.confirm('Are you sure you want to move this guest application to the Recycle Bin?')) {
            try {
                await axios.delete(`/api/setup/applications/${id}`);
                setGuests(prev => prev.filter(g => g._id !== id));
                toast.success('Guest application moved to Recycle Bin');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting application');
            }
        }
    };

    const handleUpdateAppStatus = async (id, status) => {
        try {
            setUpdatingAppId(id);
            await axios.put(`/api/setup/applications/${id}/status`, { status });
            toast.success(`Application status updated to ${status}`);
            fetchData();
        } catch (err) {
            console.error("Error updating application status:", err);
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingAppId(null);
        }
    };

    const filteredRoleRequests = useMemo(() => {
        return roleRequests.filter(req => 
            (filterInstitute === 'All' || (req.user?.institute?._id === filterInstitute || req.user?.institute === filterInstitute)) &&
            ((req.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.requestedRole || '').toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [roleRequests, searchTerm, filterInstitute]);

    const filteredUsers = users.filter(user =>
        (filterRole === 'All' || user.role === filterRole || (user.allowedRoles && user.allowedRoles.includes(filterRole))) &&
        (filterInstitute === 'All' || (user.institute?._id === filterInstitute || user.institute === filterInstitute)) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.allowedRoles && user.allowedRoles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()))))
    );

    const guestUsers = useMemo(() => {
        return users.filter(u => u.role === 'Guest' || (u.allowedRoles && u.allowedRoles.includes('Guest')));
    }, [users]);

    const filteredGuestUsers = useMemo(() => {
        return guestUsers.filter(g =>
            (filterInstitute === 'All' || (g.institute?._id === filterInstitute || g.institute === filterInstitute)) &&
            ((g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.mobileNumber || '').toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [guestUsers, searchTerm, filterInstitute]);

    const filteredApplications = useMemo(() => {
        return guests.filter(g =>
            (filterInstitute === 'All' || (g.institute?._id === filterInstitute || g.institute === filterInstitute)) &&
            ((g.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.guestEmail && g.guestEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.guestPhone || '').toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [guests, searchTerm, filterInstitute]);

    const groupedLimitedUsers = useMemo(() => {
        const groups = {};
        limitedUsers.forEach(sub => {
            const email = (sub.email || '').toLowerCase().trim();
            if (!groups[email]) {
                groups[email] = {
                    _id: email,
                    name: sub.name || 'Candidate',
                    email: sub.email || '',
                    phone: sub.phone || 'N/A',
                    submissions: [],
                    latestSubmissionDate: sub.submittedAt,
                    latestSubmissionId: sub._id
                };
            }
            groups[email].submissions.push(sub);
            if (new Date(sub.submittedAt) > new Date(groups[email].latestSubmissionDate)) {
                groups[email].latestSubmissionDate = sub.submittedAt;
                groups[email].latestSubmissionId = sub._id;
            }
        });
        return Object.values(groups);
    }, [limitedUsers]);

    const filteredLimited = groupedLimitedUsers.filter(l =>
        (l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.phone && l.phone.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const getFilteredItems = () => {
        if (viewTab === 'registered') return filteredUsers;
        if (viewTab === 'guest') return filteredGuestUsers;
        if (viewTab === 'applications') return filteredApplications;
        if (viewTab === 'role-requests') return filteredRoleRequests;
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

    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [isExportRequestsDropdownOpen, setIsExportRequestsDropdownOpen] = useState(false);
    const [isExportLimitedDropdownOpen, setIsExportLimitedDropdownOpen] = useState(false);
    const [isExportGuestDropdownOpen, setIsExportGuestDropdownOpen] = useState(false);
    const importLimitedRef = useRef(null);
    const importGuestRef = useRef(null);

    const exportLimitedUsers = (format) => {
        const data = groupedLimitedUsers;
        if (data.length === 0) { toast.error('No limited users to export'); return; }
        const rows = data.map(u => ({
            Name: u.name || '',
            Email: u.email || '',
            Phone: u.phone || '',
            'Test Count': u.submissions?.length || 0,
            Score: u.submissions?.[0]?.score || 0,
            'Last Submitted': u.submissions?.[0]?.submittedAt ? new Date(u.submissions[0].submittedAt).toLocaleString() : ''
        }));
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows.map(r => ({ name: r.Name, email: r.Email, phone: r.Phone })), null, 2)], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `limited_users_${new Date().toISOString().split('T')[0]}.json`; link.click();
            toast.success(`Exported ${data.length} limited users to JSON`);
        } else if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `limited_users_${new Date().toISOString().split('T')[0]}.csv`; link.click();
            toast.success(`Exported ${data.length} limited users to CSV`);
        } else if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Limited Users');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `limited_users_${new Date().toISOString().split('T')[0]}.xlsx`; link.click();
            toast.success(`Exported ${data.length} limited users to Excel`);
        }
    };

    const exportGuestUsers = (format) => {
        const data = guestUsers;
        if (data.length === 0) { toast.error('No guest users to export'); return; }
        const rows = data.map(u => ({
            Name: u.name || '',
            Email: u.email || '',
            Phone: u.mobileNumber || '',
            Course: u.guestProfile?.demoCourse || '',
            Institute: u.institute?.name || '',
            Status: 'Registered',
            'Created At': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
        }));
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows.map(r => ({ Name: r.Name, Email: r.Email, Phone: r.Phone, Course: r.Course, Status: r.Status })), null, 2)], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `guest_users_${new Date().toISOString().split('T')[0]}.json`; link.click();
            toast.success(`Exported ${data.length} guest users to JSON`);
        } else if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `guest_users_${new Date().toISOString().split('T')[0]}.csv`; link.click();
            toast.success(`Exported ${data.length} guest users to CSV`);
        } else if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Guest Users');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `guest_users_${new Date().toISOString().split('T')[0]}.xlsx`; link.click();
            toast.success(`Exported ${data.length} guest users to Excel`);
        }
    };

    const exportApplications = (format) => {
        const data = guests;
        if (data.length === 0) { toast.error('No applications to export'); return; }
        const rows = data.map(u => ({
            Name: u.guestName || '',
            Email: u.guestEmail || '',
            Phone: u.guestPhone || '',
            Course: u.course?.name || '',
            Institute: u.institute?.name || '',
            Status: u.status || '',
            'Applied At': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
        }));
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `applications_${new Date().toISOString().split('T')[0]}.json`; link.click();
            toast.success(`Exported ${data.length} applications to JSON`);
        } else if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `applications_${new Date().toISOString().split('T')[0]}.csv`; link.click();
            toast.success(`Exported ${data.length} applications to CSV`);
        } else if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Applications');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `applications_${new Date().toISOString().split('T')[0]}.xlsx`; link.click();
            toast.success(`Exported ${data.length} applications to Excel`);
        }
    };

    const handleImportLimitedUsers = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        const filename = file.name.toLowerCase();
        const processImport = async (parsed) => {
            if (!Array.isArray(parsed)) { toast.error('File must contain an array'); return; }
            const mapped = parsed.map(row => {
                const keys = Object.keys(row);
                return {
                    testTitle: (keys.find(k => ['test title', 'testtitle', 'test'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['test title', 'testtitle', 'test'].includes(k.toLowerCase()))]).trim() : '',
                    name: (keys.find(k => k.toLowerCase() === 'name')) ? String(row[keys.find(k => k.toLowerCase() === 'name')]).trim() : '',
                    email: (keys.find(k => k.toLowerCase() === 'email')) ? String(row[keys.find(k => k.toLowerCase() === 'email')]).trim() : '',
                    phone: (keys.find(k => ['phone', 'mobile'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['phone', 'mobile'].includes(k.toLowerCase()))]).trim() : '',
                    score: (keys.find(k => k.toLowerCase() === 'score')) ? Number(row[keys.find(k => k.toLowerCase() === 'score')]) : 0,
                };
            }).filter(i => i.name && i.email && i.testTitle);
            if (mapped.length === 0) { toast.error('No valid rows found'); return; }
            const t = toast.loading(`Importing ${mapped.length} submissions...`);
            try {
                const res = await axios.post('/api/public-tests/admin/submissions/import', { submissions: mapped });
                toast.dismiss(t); const { successCount, errors } = res.data.results;
                toast.success(`Imported ${successCount} submissions. ${errors?.length || 0} failed.`);
                fetchData();
            } catch (err) { toast.dismiss(t); toast.error(err.response?.data?.message || 'Error importing'); }
        };
        if (filename.endsWith('.json')) {
            reader.onload = async (evt) => { try { processImport(JSON.parse(evt.target.result)); } catch { toast.error('Failed to parse JSON'); } };
            reader.readAsText(file);
        } else {
            reader.onload = async (evt) => { try { const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' }); processImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch { toast.error('Failed to parse file'); } };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };

    const handleImportGuestUsers = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        const filename = file.name.toLowerCase();
        const processImport = async (parsed) => {
            if (!Array.isArray(parsed)) { toast.error('File must contain an array'); return; }
            const mapped = parsed.map(row => {
                const keys = Object.keys(row);
                return {
                    guestName: (keys.find(k => ['guest name', 'guestname', 'name'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['guest name', 'guestname', 'name'].includes(k.toLowerCase()))]).trim() : '',
                    guestEmail: (keys.find(k => ['guest email', 'guestemail', 'email'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['guest email', 'guestemail', 'email'].includes(k.toLowerCase()))]).trim() : '',
                    guestPhone: (keys.find(k => ['guest phone', 'guestphone', 'phone', 'mobile'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['guest phone', 'guestphone', 'phone', 'mobile'].includes(k.toLowerCase()))]).trim() : '',
                    courseName: (keys.find(k => ['course', 'course name', 'coursename'].includes(k.toLowerCase()))) ? String(row[keys.find(k => ['course', 'course name', 'coursename'].includes(k.toLowerCase()))]).trim() : '',
                    status: (keys.find(k => k.toLowerCase() === 'status')) ? String(row[keys.find(k => k.toLowerCase() === 'status')]).trim() : 'Applied',
                };
            }).filter(i => i.guestName && i.guestPhone && i.courseName);
            if (mapped.length === 0) { toast.error('No valid rows found'); return; }
            const t = toast.loading(`Importing ${mapped.length} guest applications...`);
            try {
                const res = await axios.post('/api/setup/applications/import', { applications: mapped });
                toast.dismiss(t); const { successCount, errors } = res.data.results;
                toast.success(`Imported ${successCount} applications. ${errors?.length || 0} failed.`);
                fetchData();
            } catch (err) { toast.dismiss(t); toast.error(err.response?.data?.message || 'Error importing'); }
        };
        if (filename.endsWith('.json')) {
            reader.onload = async (evt) => { try { processImport(JSON.parse(evt.target.result)); } catch { toast.error('Failed to parse JSON'); } };
            reader.readAsText(file);
        } else {
            reader.onload = async (evt) => { try { const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' }); processImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch { toast.error('Failed to parse file'); } };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };


    const exportRoleRequests = (format) => {

        const pending = roleRequests.filter(r => r.status === 'Pending');

        if (pending.length === 0) {

            toast.error('No pending role requests to export');

            return;

        }

        const rows = pending.map(r => ({

            Name: r.user?.name || '',

            Email: r.user?.email || '',

            'Current Role': r.user?.role || '',

            'Requested Role': r.requestedRole || '',

            Institute: r.institute?.name || r.user?.institute?.name || '',

            Status: r.status || '',

            'Requested At': r.createdAt ? new Date(r.createdAt).toLocaleString() : ''

        }));

        if (format === 'json') {

            const jsonContent = JSON.stringify(rows.map(r => ({

                name: r.Name,

                email: r.Email,

                currentRole: r['Current Role'],

                requestedRole: r['Requested Role'],

                institute: r.Institute,

                status: r.Status,

                requestedAt: r['Requested At']

            })), null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `role_requests_${new Date().toISOString().split('T')[0]}.json`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${pending.length} role requests to JSON`);

        } else if (format === 'csv') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const csv = XLSX.utils.sheet_to_csv(worksheet);

            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `role_requests_${new Date().toISOString().split('T')[0]}.csv`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${pending.length} role requests to CSV`);

        } else if (format === 'excel') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `role_requests_${new Date().toISOString().split('T')[0]}.xlsx`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${pending.length} role requests to Excel`);

        }

    };


    const importRoleRequestsRef = useRef(null);

    const handleImportRoleRequests = (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        const filename = file.name.toLowerCase();

        const processImport = async (parsed) => {

            if (!Array.isArray(parsed)) {

                toast.error('File must contain an array of requests');

                return;

            }

            const parsedMapped = parsed.map(row => {

                const keys = Object.keys(row);

                const emailKey = keys.find(k => k.toLowerCase() === 'email');

                const roleKey = keys.find(k => ['requested role', 'requestedrole', 'role'].includes(k.toLowerCase()));

                const courseKey = keys.find(k => ['course name', 'coursename', 'course'].includes(k.toLowerCase()));

                return {

                    email: emailKey ? String(row[emailKey]).trim() : '',

                    requestedRole: roleKey ? String(row[roleKey]).trim() : '',

                    courseName: courseKey ? String(row[courseKey]).trim() : ''

                };

            }).filter(item => item.email && item.requestedRole);

            if (parsedMapped.length === 0) {

                toast.error('No valid rows found. Make sure each row has "Email" and "Requested Role" columns.');

                return;

            }

            const loadingToast = toast.loading(`Importing ${parsedMapped.length} role requests...`);

            try {

                const res = await axios.post('/api/users/role-requests/import', { requests: parsedMapped });

                toast.dismiss(loadingToast);

                const { successCount, errors } = res.data.results;

                if (errors && errors.length > 0) {

                    toast.success(`Successfully imported ${successCount} requests. ${errors.length} failed.`);

                } else {

                    toast.success(`Successfully imported ${successCount} requests!`);

                }

                fetchData();

            } catch (err) {

                toast.dismiss(loadingToast);

                toast.error(err.response?.data?.message || 'Error importing role requests');

            }

        };

        if (filename.endsWith('.json')) {

            reader.onload = async (evt) => {

                try {

                    const parsed = JSON.parse(evt.target.result);

                    processImport(parsed);

                } catch (err) {

                    toast.error('Failed to parse JSON file');

                }

            };

            reader.readAsText(file);

        } else {

            reader.onload = async (evt) => {

                try {

                    const data = new Uint8Array(evt.target.result);

                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheetName = workbook.SheetNames[0];

                    const worksheet = workbook.Sheets[firstSheetName];

                    const parsed = XLSX.utils.sheet_to_json(worksheet);

                    processImport(parsed);

                } catch (err) {

                    toast.error('Failed to parse file');

                }

            };

            reader.readAsArrayBuffer(file);

        }

        e.target.value = '';

    };


    const exportUsers = (format) => {

        const registered = users.filter(u => u.role !== 'Guest');

        if (registered.length === 0) {

            toast.error('No registered users to export');

            return;

        }

        const rows = registered.map(u => ({

            Name: u.name || '',

            Email: u.email || '',

            Role: u.role || '',

            'Mobile Number': u.mobileNumber || '',

            Course: u.role === 'Student'
                ? (u.studentProfile?.coursesList && u.studentProfile.coursesList.length > 0
                    ? u.studentProfile.coursesList.map(c => c.course?.name || c.course).filter(Boolean).join(', ')
                    : u.studentProfile?.course?.name || '')
                : (u.teacherProfile?.assignedCourses?.[0]?.name || u.editorProfile?.assignedCourses?.[0]?.name || ''),

            Batch: u.studentProfile?.batch || '',

            Section: u.studentProfile?.section || '',

            'Created At': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''

        }));

        if (format === 'json') {

            const jsonContent = JSON.stringify(rows.map(r => ({

                name: r.Name,

                email: r.Email,

                role: r.Role,

                mobileNumber: r['Mobile Number'],

                courseName: r.Course,

                batch: r.Batch,

                section: r.Section

            })), null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `registered_users_${new Date().toISOString().split('T')[0]}.json`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${registered.length} registered users to JSON`);

        } else if (format === 'csv') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const csv = XLSX.utils.sheet_to_csv(worksheet);

            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `registered_users_${new Date().toISOString().split('T')[0]}.csv`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${registered.length} registered users to CSV`);

        } else if (format === 'excel') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `registered_users_${new Date().toISOString().split('T')[0]}.xlsx`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${registered.length} registered users to Excel`);

        }

    };


    const importUsersRef = useRef(null);

    const handleImportUsers = (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        const filename = file.name.toLowerCase();

        const processImport = async (parsed) => {

            if (!Array.isArray(parsed)) {

                toast.error('File must contain an array of users');

                return;

            }

            const parsedMapped = parsed.map(row => {

                const keys = Object.keys(row);

                const nameKey = keys.find(k => k.toLowerCase() === 'name');

                const emailKey = keys.find(k => k.toLowerCase() === 'email');

                const passwordKey = keys.find(k => k.toLowerCase() === 'password');

                const roleKey = keys.find(k => k.toLowerCase() === 'role');

                const courseKey = keys.find(k => ['course name', 'coursename', 'course'].includes(k.toLowerCase()));

                const mobileKey = keys.find(k => ['mobile number', 'mobilenumber', 'mobile', 'phone'].includes(k.toLowerCase()));

                return {

                    name: nameKey ? String(row[nameKey]).trim() : '',

                    email: emailKey ? String(row[emailKey]).trim() : '',

                    password: passwordKey ? String(row[passwordKey]).trim() : '',

                    role: roleKey ? String(row[roleKey]).trim() : '',

                    courseName: courseKey ? String(row[courseKey]).trim() : '',

                    mobileNumber: mobileKey ? String(row[mobileKey]).trim() : ''

                };

            }).filter(item => item.name && item.email && item.role);

            if (parsedMapped.length === 0) {

                toast.error('No valid rows found. Make sure each object has "Name", "Email" and "Role" columns.');

                return;

            }

            const loadingToast = toast.loading(`Importing ${parsedMapped.length} users...`);

            try {

                const res = await axios.post('/api/users/import', { users: parsedMapped });

                toast.dismiss(loadingToast);

                const { successCount, errors } = res.data.results;

                if (errors && errors.length > 0) {

                    toast.success(`Successfully imported ${successCount} users. ${errors.length} failed.`);

                } else {

                    toast.success(`Successfully imported ${successCount} users!`);

                }

                fetchData();

            } catch (err) {

                toast.dismiss(loadingToast);

                toast.error(err.response?.data?.message || 'Error importing users');

            }

        };

        if (filename.endsWith('.json')) {

            reader.onload = async (evt) => {

                try {

                    const parsed = JSON.parse(evt.target.result);

                    processImport(parsed);

                } catch (err) {

                    toast.error('Failed to parse JSON file');

                }

            };

            reader.readAsText(file);

        } else {

            reader.onload = async (evt) => {

                try {

                    const data = new Uint8Array(evt.target.result);

                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheetName = workbook.SheetNames[0];

                    const worksheet = workbook.Sheets[firstSheetName];

                    const parsed = XLSX.utils.sheet_to_json(worksheet);

                    processImport(parsed);

                } catch (err) {

                    toast.error('Failed to parse file');

                }

            };

            reader.readAsArrayBuffer(file);

        }

        e.target.value = '';

    };


    return (
        <DashboardLayout role={currentUser?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {currentUser?.role === 'Admin' ? 'System Users Directory' : 'Institute Users Directory'}
                    </h1>
                    <p className="text-slate-500">
                        {currentUser?.role === 'Admin' 
                            ? 'View all registered user accounts and their created date/time, role, and details.' 
                            : 'View all registered user accounts and guest details for your institute.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Recycle Bin */}
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>

                    {/* Dynamic Export Dropdown */}
                    {(() => {
                        const exportConfig = {
                            registered: { fn: exportUsers, label: 'registered_users' },
                            limited: { fn: exportLimitedUsers, label: 'limited_users' },
                            guest: { fn: exportGuestUsers, label: 'guest_users' },
                            applications: { fn: exportApplications, label: 'applications' },
                            'role-requests': { fn: exportRoleRequests, label: 'role_requests' },
                        };
                        const cfg = exportConfig[viewTab];
                        return cfg ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsExportDropdownOpen(v => !v)}
                                    className="px-4 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white border border-[#0b1329] rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/20 cursor-pointer active:scale-95"
                                >
                                    <Download size={15} /> Export <ChevronDown size={13} />
                                </button>
                                {isExportDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                                        {['json', 'csv', 'excel'].map(f => (
                                            <button key={f} onClick={() => { cfg.fn(f); setIsExportDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl uppercase">{f}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null;
                    })()}

                    {/* Dynamic Import Button */}
                    {(() => {
                        const importConfig = {
                            registered: { ref: importUsersRef, handler: handleImportUsers },
                            limited: { ref: importLimitedRef, handler: handleImportLimitedUsers },
                            guest: { ref: importGuestRef, handler: handleImportGuestUsers },
                            'role-requests': { ref: importRoleRequestsRef, handler: handleImportRoleRequests },
                        };
                        const cfg = importConfig[viewTab];
                        return cfg ? (
                            <>
                                <button
                                    onClick={() => cfg.ref.current?.click()}
                                    className="px-4 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white border border-[#0b1329] rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/20 cursor-pointer active:scale-95"
                                >
                                    <Upload size={15} /> Import
                                </button>
                                <input ref={cfg.ref} type="file" accept=".json,.csv,.xlsx" onChange={cfg.handler} className="hidden" />
                            </>
                        ) : null;
                    })()}
                </div>
            </div>

            {/* View Tabs */}
            <div className="overflow-x-auto -mx-1 px-1 mb-6">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl min-w-max">
                <button
                    onClick={() => setViewTab('registered')}
                    className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'registered'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Registered Users ({users.filter(u => u.role !== 'Guest').length})
                </button>
                <button
                    onClick={() => setViewTab('limited')}
                    className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'limited'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Limited Users ({groupedLimitedUsers.length})
                </button>
                <button
                    onClick={() => setViewTab('guest')}
                    className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'guest'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Guest Users ({guestUsers.length})
                </button>
                <button
                    onClick={() => setViewTab('applications')}
                    className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                        viewTab === 'applications'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                    Applications ({guests.length})
                </button>
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Institute') && (
                    <button
                        onClick={() => setViewTab('role-requests')}
                        className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all ${
                            viewTab === 'role-requests'
                                ? 'bg-white text-slate-900 shadow-md'
                                : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                    >
                        Staff Requests ({roleRequests.filter(r => r.status === 'Pending').length})
                    </button>
                )}
            </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3 justify-between items-center mb-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={viewTab === 'registered' ? "Search by Name, Email, ID or Role..." : (viewTab === 'guest' || viewTab === 'applications') ? "Search by Guest Name, Email or Phone..." : "Search by Test Taker, Email or Phone..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 px-9 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all animate-fade-in h-[38px]"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer h-[38px] min-w-[120px]"
                        >
                            <option value="">Bulk Action</option>
                            {viewTab === 'guest' && <option value="edit">Edit Selected</option>}
                            <option value="delete">Delete Selected</option>
                        </select>
                        <button
                            type="button"
                            onClick={handleApplyBulkAction}
                            disabled={selectedIds.size === 0 || !bulkAction}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer whitespace-nowrap h-[38px] active:scale-95 flex items-center justify-center border border-transparent disabled:border-slate-100"
                        >
                            Apply to All ({selectedIds.size})
                        </button>
                    </div>
                </div>

                <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    {viewTab === 'guest' && (
                        <button
                            type="button"
                            onClick={() => setIsAddGuestModalOpen(true)}
                            className="px-4 py-2.5 bg-[#0b1329] text-white hover:bg-slate-800 font-bold rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-[#0b1329]/10 cursor-pointer h-[38px]"
                        >
                            <Plus size={14} />
                            Add New Guest User
                        </button>
                    )}
                    {/* Entries selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                        <input
                            type="number"
                            min={5}
                            max={filteredItems.length}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) {
                                    setItemsPerPage('');
                                } else {
                                    const maxVal = filteredItems.length > 5 ? filteredItems.length : 5;
                                    setItemsPerPage(Math.min(val, maxVal));
                                }
                            }}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val) || val < 5) {
                                    setItemsPerPage(10);
                                }
                            }}
                            className="w-16 bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all h-[38px]"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">entries</span>
                    </div>

                    {currentUser?.role === 'Admin' && (
                        <div className="relative min-w-[150px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <select
                                value={filterInstitute}
                                onChange={(e) => setFilterInstitute(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 pl-9 pr-7 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer truncate h-[38px]"
                            >
                                <option value="All">All Institutes</option>
                                {institutes.map(inst => (
                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    )}

                    {viewTab === 'registered' && (
                        <div className="relative min-w-[140px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 pl-9 pr-7 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer h-[38px]"
                            >
                                <option value="All">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Institute">Institute</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Editor">Editor</option>
                                <option value="Student">Student</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
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
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                                        onChange={() => {
                                            if (selectedIds.size === paginatedItems.length) {
                                                setSelectedIds(new Set());
                                            } else {
                                                setSelectedIds(new Set(paginatedItems.map(item => item._id)));
                                            }
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                    />
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'registered' ? 'User Details' : (viewTab === 'guest' || viewTab === 'applications') ? 'Guest Name & Email' : viewTab === 'role-requests' ? 'User Details' : 'Test Taker Details'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'role-requests' ? 'Role Shift' : 'Role'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'limited' ? 'Submitted Date' : 'Created/Applied Date'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    {viewTab === 'registered' ? 'Institute' : (viewTab === 'guest' || viewTab === 'applications') ? 'Course & Institute' : viewTab === 'role-requests' ? 'Institute' : 'Test Title'}
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading directory items...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((u) => (
                                    <tr key={u._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(u._id)}
                                                onChange={() => {
                                                    setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(u._id)) {
                                                            next.delete(u._id);
                                                        } else {
                                                            next.add(u._id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </td>
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
                                                        u.name[0]?.toUpperCase()
                                                    ) : viewTab === 'applications' ? (
                                                        (u.guestName || 'G')[0]?.toUpperCase()
                                                    ) : viewTab === 'role-requests' ? (
                                                        u.user?.name?.[0]?.toUpperCase() || 'U'
                                                    ) : (
                                                        u.name[0]?.toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span 
                                                        className={`font-semibold text-slate-800 ${
                                                            viewTab === 'registered' ? 'cursor-pointer hover:text-indigo-650 transition-colors' : ''
                                                        }`}
                                                        onClick={viewTab === 'registered' ? () => openProfile(u._id) : undefined}
                                                    >
                                                        <TruncatedCell text={viewTab === 'registered' ? u.name : viewTab === 'guest' ? u.name : viewTab === 'applications' ? u.guestName : viewTab === 'role-requests' ? (u.user?.name || 'User') : u.name} maxLength={20} />
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        <TruncatedCell text={viewTab === 'registered' ? u.email : viewTab === 'guest' ? u.email : viewTab === 'applications' ? u.guestEmail : viewTab === 'role-requests' ? (u.user?.email || 'N/A') : u.email} maxLength={25} />
                                                    </span>
                                                    {viewTab === 'registered' && u.role === 'Student' && (
                                                        <span className="text-[10px] text-slate-500 font-extrabold mt-0.5 tracking-wide max-w-[200px] truncate" title={u.studentProfile?.coursesList && u.studentProfile.coursesList.length > 0 ? u.studentProfile.coursesList.map(c => c.course?.name || c.course).filter(Boolean).join(', ') : u.studentProfile?.course?.name || 'No Course'}>
                                                            {u.studentProfile?.coursesList && u.studentProfile.coursesList.length > 0
                                                                ? u.studentProfile.coursesList.map(c => c.course?.name || c.course).filter(Boolean).join(', ')
                                                                : u.studentProfile?.course?.name || 'No Course'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role column */}
                                        <td className="p-4 whitespace-nowrap">
                                            {viewTab === 'role-requests' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeClass(u.user?.role)}`}>
                                                        {u.user?.role}
                                                    </span>
                                                    <span className="text-slate-400 font-bold">➔</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeClass(u.requestedRole)}`}>
                                                        {u.requestedRole}
                                                    </span>
                                                </div>
                                            ) : viewTab === 'registered' ? (
                                                (() => {
                                                    const roles = u.allowedRoles && u.allowedRoles.length > 0 ? u.allowedRoles : [u.role];
                                                    return (
                                                        <div className="flex items-center relative overflow-visible">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeClass(roles[0])}`}>
                                                                {roles[0]}
                                                            </span>
                                                            {roles.length > 1 && (
                                                                <div className="relative overflow-visible flex items-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveRolesTooltipUserId(activeRolesTooltipUserId === u._id ? null : u._id);
                                                                        }}
                                                                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-[10px] font-black transition-all ml-1.5 cursor-pointer select-none"
                                                                    >
                                                                        +{roles.length - 1} more
                                                                    </button>
                                                                    {activeRolesTooltipUserId === u._id && (
                                                                        <>
                                                                            <div 
                                                                                className="fixed inset-0 z-[60]" 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveRolesTooltipUserId(null);
                                                                                }} 
                                                                            />
                                                                            <div 
                                                                                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-[70] p-2.5 min-w-[120px] flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1.5 pb-1 border-b border-slate-100 text-center">
                                                                                    All Roles
                                                                                </div>
                                                                                {roles.map((roleName) => (
                                                                                    <span 
                                                                                        key={roleName} 
                                                                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold text-center ${getRoleBadgeClass(roleName)}`}
                                                                                    >
                                                                                        {roleName}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeClass(viewTab === 'guest' ? 'Guest User' : viewTab === 'applications' ? 'Guest User' : 'Limited User')}`}>
                                                    {viewTab === 'guest' ? 'Guest User' : viewTab === 'applications' ? 'Application' : 'Limited User'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Date column */}
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>{formatDate(viewTab === 'limited' ? u.latestSubmissionDate : u.createdAt)}</span>
                                            </div>
                                        </td>

                                        {/* ID column */}
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">
                                            {viewTab === 'limited' ? u.latestSubmissionId.slice(-6) : u._id.slice(-6)}
                                        </td>

                                        {/* Course/Institute/Test details */}
                                        <td className="p-4 text-slate-600 whitespace-nowrap text-sm">
                                            {viewTab === 'registered' ? (
                                                <TruncatedCell text={u.institute?.name || u.institute || 'N/A'} maxLength={20} />
                                            ) : viewTab === 'role-requests' ? (
                                                <div className="flex flex-col">
                                                    {u.requestedRole === 'Student' && u.course && (
                                                        <span className="font-bold text-slate-700 text-xs">
                                                            Course: <TruncatedCell text={u.course.name} maxLength={20} />
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400">
                                                        <TruncatedCell text={u.institute?.name || 'N/A'} maxLength={20} />
                                                    </span>
                                                </div>
                                            ) : viewTab === 'guest' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">
                                                        <TruncatedCell text={u.guestProfile?.demoCourse || 'N/A'} maxLength={20} />
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        <TruncatedCell text={u.institute?.name || u.institute || 'N/A'} maxLength={20} />
                                                    </span>
                                                </div>
                                            ) : viewTab === 'applications' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">
                                                        <TruncatedCell text={u.course?.name || u.course || 'N/A'} maxLength={20} />
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        <TruncatedCell text={u.institute?.name || u.institute || 'N/A'} maxLength={20} />
                                                    </span>
                                                </div>
                                            ) : (
                                                <TruncatedCell 
                                                    text={
                                                        u.submissions?.length === 1 
                                                            ? (u.submissions[0].test?.title || 'Public Test')
                                                            : `${u.submissions[0].test?.title || 'Public Test'} (+${u.submissions.length - 1} more)`
                                                    } 
                                                    maxLength={25} 
                                                />
                                            )}
                                        </td>

                                        {/* Mobile column */}
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            {viewTab === 'registered' ? (
                                                u.mobileNumber || 'N/A'
                                            ) : viewTab === 'role-requests' ? (
                                                u.user?.mobileNumber || 'N/A'
                                            ) : viewTab === 'guest' ? (
                                                u.mobileNumber || 'N/A'
                                            ) : viewTab === 'applications' ? (
                                                u.guestPhone || u.phone || 'N/A'
                                            ) : (
                                                u.phone || 'N/A'
                                            )}
                                        </td>

                                        {/* Status column */}
                                        <td className="p-4 whitespace-nowrap">
                                            {viewTab === 'registered' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(u._id, u.isActive)}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                        u.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                    }`}
                                                    title={u.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                >
                                                    <span className="sr-only">Toggle status</span>
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            u.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            ) : viewTab === 'role-requests' ? (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    u.status === 'Approved'
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : u.status === 'Rejected'
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    {u.status}
                                                </span>
                                            ) : viewTab === 'guest' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        Registered
                                                    </span>
                                                    {u.guestProfile?.demoExpiryDate && (
                                                        <span className={`text-[10px] font-bold ${
                                                            new Date(u.guestProfile.demoExpiryDate) < new Date()
                                                                ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100'
                                                                : 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100'
                                                        }`}>
                                                            {(() => {
                                                                const diff = new Date(u.guestProfile.demoExpiryDate) - new Date();
                                                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                                                return days <= 0 ? 'Expired' : `${days}d Left`;
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : viewTab === 'applications' ? (
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
                                                (() => {
                                                    if (u.submissions?.length === 1) {
                                                        const singleSub = u.submissions[0];
                                                        const isCompleted = singleSub.completedStatus === 'Completed' || !singleSub.completedStatus;
                                                        return (
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                                {singleSub.completedStatus || 'Completed'} (Score: {singleSub.score || 0})
                                                            </span>
                                                        );
                                                    } else {
                                                        const completedCount = u.submissions?.filter(s => s.completedStatus === 'Completed' || !s.completedStatus).length || 0;
                                                        return (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-650 border border-indigo-100">
                                                                {completedCount}/{u.submissions?.length} Completed
                                                            </span>
                                                        );
                                                    }
                                                })()
                                            )}
                                        </td>

                                        {/* Actions column */}
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">
                                            {viewTab === 'registered' ? (
                                                (currentUser?._id !== u._id && u.role !== 'Admin') ? (
                                                    <button
                                                        onClick={() => handleDelete(u._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-semibold italic px-2">
                                                        {u.role === 'Admin' ? 'Admin' : 'You'}
                                                    </span>
                                                )
                                            ) : viewTab === 'role-requests' ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {u.status === 'Pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveRoleRequest(u._id)}
                                                                className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRoleRequest(u._id)}
                                                                className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`text-xs font-bold px-3 ${u.status === 'Approved' ? 'text-emerald-600' : 'text-rose-600'}`}>{u.status}</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteRoleRequest(u._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Move to Recycle Bin"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : viewTab === 'limited' ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCandidateGroup(u);
                                                            setIsCandidateModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="View Submissions History"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCandidateGroup(u)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Move All Submissions to Recycle Bin"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ) : viewTab === 'guest' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const actualUser = users.find(usr => usr._id === u._id);
                                                            setSelectedGuestUser(actualUser || u);
                                                            setIsEditGuestModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-[#3E3ADD] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Guest User"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Guest Account"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ) : viewTab === 'applications' ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {u.status === 'Pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateAppStatus(u._id, 'Accepted')}
                                                                disabled={updatingAppId === u._id}
                                                                className="px-3 py-1 bg-[#3E3ADD] hover:bg-indigo-750 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateAppStatus(u._id, 'Rejected')}
                                                                disabled={updatingAppId === u._id}
                                                                className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`text-xs font-bold px-3 ${u.status === 'Accepted' || u.status === 'Registered' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {u.status}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteGuestApplication(u._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Move to Recycle Bin"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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
            {(() => {
                const trashConfig = {
                    registered: {
                        title: 'Registered Users Recycle Bin',
                        trashUrl: '/api/users/trash',
                        restoreUrlPattern: (id) => `/api/users/${id}/restore`,
                        permanentDeleteUrlPattern: (id) => `/api/users/${id}/permanent`,
                        renderItemDetail: (item) => `Email: ${item.email} | Role: ${item.role}`
                    },
                    limited: {
                        title: 'Limited Users (Submissions) Recycle Bin',
                        trashUrl: '/api/public-tests/admin/submissions/trash',
                        restoreUrlPattern: (id) => `/api/public-tests/admin/submissions/${id}/restore`,
                        permanentDeleteUrlPattern: (id) => `/api/public-tests/admin/submissions/${id}/permanent`,
                        renderItemDetail: (item) => `Email: ${item.email} | Test: ${item.test?.title || 'N/A'} | Score: ${item.score ?? 'N/A'}`
                    },
                    guest: {
                        title: 'Guest Users Recycle Bin',
                        trashUrl: '/api/users/trash',
                        restoreUrlPattern: (id) => `/api/users/${id}/restore`,
                        permanentDeleteUrlPattern: (id) => `/api/users/${id}/permanent`,
                        renderItemDetail: (item) => `Email: ${item.email} | Role: Guest`
                    },
                    applications: {
                        title: 'Applications Recycle Bin',
                        trashUrl: '/api/setup/applications/trash',
                        restoreUrlPattern: (id) => `/api/setup/applications/${id}/restore`,
                        permanentDeleteUrlPattern: (id) => `/api/setup/applications/${id}/permanent`,
                        renderItemDetail: (item) => `Phone: ${item.guestPhone || item.mobileNumber || 'N/A'} | Status: ${item.status || 'N/A'}`
                    },
                    'role-requests': {
                        title: 'Staff Requests Recycle Bin',
                        trashUrl: '/api/users/role-requests/trash',
                        restoreUrlPattern: (id) => `/api/users/role-requests/${id}/restore`,
                        permanentDeleteUrlPattern: (id) => `/api/users/role-requests/${id}/permanent`,
                        renderItemDetail: (item) => `User: ${item.user?.email || 'N/A'} | Requested: ${item.requestedRole} | Status: ${item.status}`
                    }
                };
                const cfg = trashConfig[viewTab] || trashConfig.registered;
                return (
                    <RecycleBinModal
                        isOpen={isTrashOpen}
                        onClose={() => setIsTrashOpen(false)}
                        title={cfg.title}
                        trashUrl={cfg.trashUrl}
                        onRestoreSuccess={fetchData}
                        restoreUrlPattern={cfg.restoreUrlPattern}
                        permanentDeleteUrlPattern={cfg.permanentDeleteUrlPattern}
                        renderItemDetail={cfg.renderItemDetail}
                    />
                );
            })()}
            {isCandidateModalOpen && selectedCandidateGroup && (
                <CandidateTestsModal
                    isOpen={isCandidateModalOpen}
                    onClose={() => {
                        setIsCandidateModalOpen(false);
                        setSelectedCandidateGroup(null);
                    }}
                    candidate={selectedCandidateGroup}
                    onViewResponse={(sub) => {
                        setSelectedSubmission(sub);
                        setIsResponseModalOpen(true);
                    }}
                    onDeleteSubmission={handleDeleteIndividualSubmission}
                />
            )}
            {selectedSubmission && (
                <PublicResponseModal
                    isOpen={isResponseModalOpen}
                    onClose={() => {
                        setIsResponseModalOpen(false);
                        setSelectedSubmission(null);
                    }}
                    submission={selectedSubmission}
                />
            )}
            {isAddGuestModalOpen && (
                <AddUserModal
                    isOpen={isAddGuestModalOpen}
                    onClose={() => setIsAddGuestModalOpen(false)}
                    role="Guest"
                    onSuccess={fetchData}
                />
            )}
            <EditUserModal
                isOpen={isEditGuestModalOpen}
                onClose={() => {
                    setIsEditGuestModalOpen(false);
                    setSelectedGuestUser(null);
                }}
                user={selectedGuestUser}
                onSuccess={fetchData}
            />
            <BulkEditModal
                isOpen={isBulkEditOpen}
                onClose={() => setIsBulkEditOpen(false)}
                type="guest"
                selectedIds={Array.from(selectedIds)}
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
};

export default UsersList;
