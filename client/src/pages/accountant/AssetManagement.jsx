import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Package, Plus, Search, Edit, Trash2, Calendar, DollarSign, 
    Wrench, X, Check, HardDrive, RefreshCw, AlertCircle
} from 'lucide-react';

const AssetManagement = () => {
    const { user } = useAuth();
    // 1. Assets list state (initialized with high-quality mock data)
    const [assets, setAssets] = useState(() => {
        const stored = localStorage.getItem('lms_assets');
        if (stored) return JSON.parse(stored);
        
        // Premium default asset inventory
        return [
            {
                id: 'AST-001',
                name: 'HP ProBook 440 G9 Laptops (10x)',
                category: 'IT Equipment',
                serialNumber: 'HP-PB-440-G9-B1',
                purchaseDate: '2025-04-10',
                purchaseCost: 450000,
                assignedTo: 'Sunil Kumar (IT Dept)',
                status: 'Active',
                notes: 'Assigned to newly joined staff members. 3 year on-site warranty active.',
                maintenanceLogs: [
                    { date: '2025-10-15', cost: 1500, description: 'RAM Upgrade (8GB to 16GB) on 1 unit', status: 'Completed' }
                ]
            },
            {
                id: 'AST-002',
                name: 'Epson EB-FH52 HD Projector',
                category: 'IT Equipment',
                serialNumber: 'EPS-PROJ-FH52-X9',
                purchaseDate: '2025-05-15',
                purchaseCost: 72000,
                assignedTo: 'Seminar Hall B',
                status: 'Under Maintenance',
                notes: 'Lamp replacement required. Screen flickering issue reported.',
                maintenanceLogs: [
                    { date: '2026-02-12', cost: 8500, description: 'Sent for lamp replacement and cleaning', status: 'Pending' }
                ]
            },
            {
                id: 'AST-003',
                name: 'Ergonomic Premium Chairs (25x)',
                category: 'Furniture',
                serialNumber: 'ERG-CHR-2025-BLK',
                purchaseDate: '2025-01-20',
                purchaseCost: 125000,
                assignedTo: 'Staff Room Level 2',
                status: 'Active',
                notes: 'Delivered and assembled by Godrej Interio.',
                maintenanceLogs: []
            },
            {
                id: 'AST-004',
                name: 'Promethean Smart Interactive Whiteboard',
                category: 'Furniture',
                serialNumber: 'PROM-SMT-86-V3',
                purchaseDate: '2025-06-02',
                purchaseCost: 195000,
                assignedTo: 'Classroom 101',
                status: 'Active',
                notes: 'Fitted wall mount. Includes dual stylus pens.',
                maintenanceLogs: []
            },
            {
                id: 'AST-005',
                name: 'Tata Winger School Bus (MH-12-XX-1234)',
                category: 'Vehicle',
                serialNumber: 'TATA-WNG-BUS-8891',
                purchaseDate: '2024-08-12',
                purchaseCost: 1850000,
                assignedTo: 'Transport Department',
                status: 'Active',
                notes: 'First party commercial vehicle insurance valid until August 2026.',
                maintenanceLogs: [
                    { date: '2025-08-12', cost: 18000, description: 'First Year Comprehensive Servicing', status: 'Completed' },
                    { date: '2026-02-14', cost: 4500, description: 'Engine oil replacement and brake check', status: 'Completed' }
                ]
            },
            {
                id: 'AST-006',
                name: 'Olympus CX21 LED Microscopes (5x)',
                category: 'Lab Equipment',
                serialNumber: 'OLY-MIC-CX21-S2',
                purchaseDate: '2025-02-18',
                purchaseCost: 180000,
                assignedTo: 'Biology & Biotech Lab',
                status: 'Stock',
                notes: 'Kept in storage cabinets for advanced student batches.',
                maintenanceLogs: []
            }
        ];
    });

    // Save assets list to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('lms_assets', JSON.stringify(assets));
    }, [assets]);

    // 2. State definitions
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals visibility states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

    // Selected assets states
    const [selectedAsset, setSelectedAsset] = useState(null);

    // Form inputs state
    const [form, setForm] = useState({
        name: '',
        category: 'IT Equipment',
        serialNumber: '',
        purchaseDate: '',
        purchaseCost: '',
        assignedTo: '',
        status: 'Active',
        notes: ''
    });

    // Maintenance log form state
    const [maintForm, setMaintForm] = useState({
        date: new Date().toISOString().split('T')[0],
        cost: '',
        description: '',
        status: 'Pending'
    });

    // 3. Dropdown list options
    const categories = ['IT Equipment', 'Furniture', 'Lab Equipment', 'Vehicle', 'Library', 'Other'];
    const statuses = ['Active', 'Under Maintenance', 'Stock', 'Disposed'];

    // 4. Calculations for KPI cards
    const totalAssetsValue = assets.reduce((sum, item) => sum + (Number(item.purchaseCost) || 0), 0);
    const activeAssetsCount = assets.filter(item => item.status === 'Active').length;
    const maintenanceCount = assets.filter(item => item.status === 'Under Maintenance').length;
    const stockCount = assets.filter(item => item.status === 'Stock').length;

    // 5. Actions / Event Handlers
    const openAddModal = () => {
        setForm({
            name: '',
            category: 'IT Equipment',
            serialNumber: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseCost: '',
            assignedTo: '',
            status: 'Active',
            notes: ''
        });
        setIsAddModalOpen(true);
    };

    const handleAddAsset = (e) => {
        e.preventDefault();
        if (!form.name || !form.purchaseCost || !form.purchaseDate) {
            toast.error('Please fill in all required fields (*)');
            return;
        }

        const newId = `AST-${String(assets.length + 1).padStart(3, '0')}`;
        const newAsset = {
            id: newId,
            name: form.name,
            category: form.category,
            serialNumber: form.serialNumber || 'N/A',
            purchaseDate: form.purchaseDate,
            purchaseCost: Number(form.purchaseCost) || 0,
            assignedTo: form.assignedTo || 'Unassigned',
            status: form.status,
            notes: form.notes || '',
            maintenanceLogs: []
        };

        setAssets([...assets, newAsset]);
        setIsAddModalOpen(false);
        toast.success(`Asset ${newId} added successfully!`);
    };

    const openEditModal = (asset) => {
        setSelectedAsset(asset);
        setForm({
            name: asset.name,
            category: asset.category,
            serialNumber: asset.serialNumber,
            purchaseDate: asset.purchaseDate,
            purchaseCost: asset.purchaseCost,
            assignedTo: asset.assignedTo,
            status: asset.status,
            notes: asset.notes
        });
        setIsEditModalOpen(true);
    };

    const handleEditAsset = (e) => {
        e.preventDefault();
        if (!form.name || !form.purchaseCost || !form.purchaseDate) {
            toast.error('Please fill in all required fields (*)');
            return;
        }

        const updatedAssets = assets.map(item => {
            if (item.id === selectedAsset.id) {
                return {
                    ...item,
                    name: form.name,
                    category: form.category,
                    serialNumber: form.serialNumber,
                    purchaseDate: form.purchaseDate,
                    purchaseCost: Number(form.purchaseCost) || 0,
                    assignedTo: form.assignedTo,
                    status: form.status,
                    notes: form.notes
                };
            }
            return item;
        });

        setAssets(updatedAssets);
        setIsEditModalOpen(false);
        setSelectedAsset(null);
        toast.success('Asset details updated successfully!');
    };

    const handleDeleteAsset = (id) => {
        if (window.confirm(`Are you sure you want to delete asset ${id}?`)) {
            const filtered = assets.filter(item => item.id !== id);
            setAssets(filtered);
            toast.success('Asset deleted successfully.');
        }
    };

    // Maintenance log triggers
    const openMaintenanceModal = (asset) => {
        setSelectedAsset(asset);
        setMaintForm({
            date: new Date().toISOString().split('T')[0],
            cost: '',
            description: '',
            status: 'Pending'
        });
        setIsMaintenanceModalOpen(true);
    };

    const handleAddMaintenance = (e) => {
        e.preventDefault();
        if (!maintForm.description || !maintForm.cost || !maintForm.date) {
            toast.error('Please fill in all maintenance fields.');
            return;
        }

        const newLog = {
            date: maintForm.date,
            cost: Number(maintForm.cost) || 0,
            description: maintForm.description,
            status: maintForm.status
        };

        const updatedAssets = assets.map(item => {
            if (item.id === selectedAsset.id) {
                const logs = item.maintenanceLogs ? [...item.maintenanceLogs, newLog] : [newLog];
                // Automatically switch status to "Under Maintenance" if log status is Pending
                const newStatus = maintForm.status === 'Pending' ? 'Under Maintenance' : item.status;
                return {
                    ...item,
                    status: newStatus,
                    maintenanceLogs: logs
                };
            }
            return item;
        });

        setAssets(updatedAssets);
        setIsMaintenanceModalOpen(false);
        setSelectedAsset(null);
        toast.success('Maintenance log added successfully!');
    };

    const toggleMaintenanceStatus = (assetId, logIndex) => {
        const updatedAssets = assets.map(item => {
            if (item.id === assetId) {
                const logs = item.maintenanceLogs.map((log, idx) => {
                    if (idx === logIndex) {
                        const nextStatus = log.status === 'Pending' ? 'Completed' : 'Pending';
                        return { ...log, status: nextStatus };
                    }
                    return log;
                });
                
                // If all logs are completed, check if we can revert status to Active/Stock
                const hasPending = logs.some(l => l.status === 'Pending');
                const newStatus = !hasPending && item.status === 'Under Maintenance' ? 'Active' : item.status;

                return {
                    ...item,
                    status: newStatus,
                    maintenanceLogs: logs
                };
            }
            return item;
        });

        setAssets(updatedAssets);
        toast.success('Maintenance task status updated!');
    };

    // Excel Export Helper
    const handleExportExcel = () => {
        const dataToExport = assets.map((item, idx) => ({
            'S.No': idx + 1,
            'Asset Code': item.id,
            'Asset Name': item.name,
            'Category': item.category,
            'Serial/Model No.': item.serialNumber,
            'Purchase Cost (INR)': item.purchaseCost,
            'Purchase Date': item.purchaseDate,
            'Assigned To': item.assignedTo,
            'Current Status': item.status,
            'Remarks/Notes': item.notes,
            'Total Maintenance Logged': item.maintenanceLogs?.length || 0
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, 'Asset Inventory');
        XLSX.writeFile(wb, 'Asset_Inventory_Report.xlsx');
        toast.success('Excel report downloaded successfully!');
    };

    // 6. Filter Asset List based on search and selected categories
    const filteredAssets = assets.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <DashboardLayout role={user?.role || 'Institute'}>
            {/* Header / Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-slate-900 to-slate-900 rounded-[30px] p-8 md:p-10 text-white mb-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-500/15 rounded-full blur-3xl -mb-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-indigo-500/10">
                            <Package size={12} /> Asset Desk
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Asset & Inventory Desk</h1>
                        <p className="text-slate-300 mt-2 max-w-xl text-sm md:text-base">
                            Track capital assets, catalog equipment, oversee maintenance, and catalog new acquisitions of the institute.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl transition-all font-bold text-sm flex items-center gap-2 cursor-pointer"
                        >
                            Export Excel
                        </button>
                        <button
                            onClick={openAddModal}
                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <Plus size={16} /> Add Asset
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Inventory Value */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Asset Value</span>
                        <h3 className="text-2xl font-extrabold text-slate-800">{formatCurrency(totalAssetsValue)}</h3>
                        <span className="text-xs text-indigo-600 font-bold mt-2 inline-block">Invested capital</span>
                    </div>
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <DollarSign size={24} />
                    </div>
                </div>

                {/* Active Assets */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Active Assets</span>
                        <h3 className="text-2xl font-extrabold text-slate-800">{activeAssetsCount}</h3>
                        <span className="text-xs text-emerald-600 font-bold mt-2 inline-block">Deployments active</span>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Package size={24} />
                    </div>
                </div>

                {/* Under Maintenance */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">In Maintenance</span>
                        <h3 className="text-2xl font-extrabold text-slate-800">{maintenanceCount}</h3>
                        <span className="text-xs text-amber-600 font-bold mt-2 inline-block">Awaiting repair</span>
                    </div>
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <Wrench size={24} />
                    </div>
                </div>

                {/* Spare/In Stock */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Spare (In Stock)</span>
                        <h3 className="text-2xl font-extrabold text-slate-800">{stockCount}</h3>
                        <span className="text-xs text-indigo-600 font-bold mt-2 inline-block">Available in storage</span>
                    </div>
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <HardDrive size={24} />
                    </div>
                </div>
            </div>

            {/* Inventory List Control Toolbar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left side: Search & filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px] md:max-w-xs">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Code, Name, Serial..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="All">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        {statuses.map(st => (
                            <option key={st} value={st}>{st}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Assets Table Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">Code</th>
                                <th className="p-4">Asset Details</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Purchase Date</th>
                                <th className="p-4 text-right">Value (INR)</th>
                                <th className="p-4">Assigned To</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'Admin' ? 9 : 8} className="p-12 text-center text-slate-400 font-semibold text-sm">
                                        No assets match your search parameters.
                                    </td>
                                </tr>
                            ) : filteredAssets.map((asset) => (
                                <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                                    <td className="p-4 pl-6 text-sm font-bold text-indigo-600">{asset.id}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-extrabold text-slate-800">{asset.name}</span>
                                            <span className="text-xs text-slate-400 font-medium mt-0.5">S/N: {asset.serialNumber}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-slate-500">
                                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg">{asset.category}</span>
                                    </td>
                                    <td className="p-4 text-sm font-semibold text-slate-600">
                                        📅 {new Date(asset.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-800 text-right">{formatCurrency(asset.purchaseCost)}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-700">{asset.assignedTo || 'Unassigned'}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                            asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                                            asset.status === 'Under Maintenance' ? 'bg-amber-50 text-amber-700' :
                                            asset.status === 'Stock' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                asset.status === 'Active' ? 'bg-emerald-500' :
                                                asset.status === 'Under Maintenance' ? 'bg-amber-500' :
                                                asset.status === 'Stock' ? 'bg-indigo-500' : 'bg-rose-500'
                                            }`} />
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="p-4 pr-6">
                                        <div className="flex items-center justify-end gap-2.5">
                                            {/* Maintenance Log Trigger */}
                                            <button
                                                onClick={() => openMaintenanceModal(asset)}
                                                title="Add/View Maintenance"
                                                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Wrench size={15} />
                                            </button>
                                            
                                            {/* Edit */}
                                            <button
                                                onClick={() => openEditModal(asset)}
                                                title="Edit details"
                                                className="p-2 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Edit size={15} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDeleteAsset(asset.id)}
                                                title="Remove asset"
                                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Add Asset */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#f5f5f5] rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800">Add New Inventory Asset</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddAsset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Asset Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dell UltraSharp 27 Monitor"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Serial / Model No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SN-89271-X"
                                        value={form.serialNumber}
                                        onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Purchase Cost (INR) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="e.g. 15000"
                                        value={form.purchaseCost}
                                        onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Purchase Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.purchaseDate}
                                        onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Assigned To (User/Location)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. IT Department"
                                        value={form.assignedTo}
                                        onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    >
                                        {statuses.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Notes / Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Add warranty, setup guide, or spec details..."
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-md cursor-pointer"
                                >
                                    Add Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Edit Asset */}
            {isEditModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#f5f5f5] rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800">Edit Asset Details ({selectedAsset?.id})</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleEditAsset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Asset Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Serial / Model No.</label>
                                    <input
                                        type="text"
                                        value={form.serialNumber}
                                        onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Purchase Cost (INR) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={form.purchaseCost}
                                        onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Purchase Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.purchaseDate}
                                        onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Assigned To</label>
                                    <input
                                        type="text"
                                        value={form.assignedTo}
                                        onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                                    >
                                        {statuses.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Notes / Description</label>
                                <textarea
                                    rows={2}
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); setSelectedAsset(null); }}
                                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-md cursor-pointer"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Maintenance Logs & Tracker */}
            {isMaintenanceModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#f5f5f5] rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Maintenance Desk</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedAsset?.name} ({selectedAsset?.id})</p>
                            </div>
                            <button onClick={() => { setIsMaintenanceModalOpen(false); setSelectedAsset(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Existing Maintenance History */}
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Log History ({selectedAsset?.maintenanceLogs?.length || 0})</h4>
                            {selectedAsset?.maintenanceLogs?.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 border-dashed text-center text-slate-400 text-xs font-bold">
                                    No maintenance logs found for this asset.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedAsset?.maintenanceLogs.map((log, index) => (
                                        <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-400">📅 {log.date}</span>
                                                    <span className="text-xs font-extrabold text-indigo-600">• Cost: {formatCurrency(log.cost)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">{log.description}</p>
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleMaintenanceStatus(selectedAsset.id, index)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                                        log.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                    }`}
                                                >
                                                    {log.status === 'Completed' ? <Check size={12} /> : <Wrench size={12} />}
                                                    {log.status}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Form: Add New Maintenance Log */}
                        <form onSubmit={handleAddMaintenance} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Record New Maintenance / Repair</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={maintForm.date}
                                        onChange={e => setMaintForm({ ...maintForm, date: e.target.value })}
                                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cost (INR)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="Repair cost..."
                                        value={maintForm.cost}
                                        onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })}
                                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason / Description of work</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Replacement of screen display panel"
                                        value={maintForm.description}
                                        onChange={e => setMaintForm({ ...maintForm, description: e.target.value })}
                                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Log Status:</span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMaintForm({ ...maintForm, status: 'Pending' })}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${maintForm.status === 'Pending' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMaintForm({ ...maintForm, status: 'Completed' })}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${maintForm.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                                        >
                                            Completed
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-xs shadow-md cursor-pointer"
                                >
                                    Log Service
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default AssetManagement;
