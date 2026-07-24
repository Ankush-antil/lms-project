import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Megaphone, Plus, Search, Filter, Play, Pause, Edit, Trash2, 
    TrendingUp, DollarSign, Eye, MousePointerClick, BarChart2,
    Calendar, ArrowRight, Sparkles, Check, X, ShieldAlert, Upload, Download, ChevronDown
} from 'lucide-react';

const AdsManagement = () => {
    const { user } = useAuth();
    // Convincing Demo Data for Ad Campaigns with Individual Ads List
    const [campaigns, setCampaigns] = useState([
        {
            _id: 'camp_1',
            name: 'Google Search - Web Dev Academy',
            platform: 'Google Ads',
            createdBy: 'Ankush Antil',
            instituteName: 'HARTRON GANAUR',
            totalAds: 6,
            status: 'Active',
            budget: 15000,
            spent: 8400,
            impressions: 48500,
            clicks: 3120,
            leads: 185,
            startDate: '2026-06-01',
            endDate: '2026-08-31',
            adsList: [
                { id: 'ad_101', name: 'Become Full Stack Web Developer 2026', type: 'Search Text Ad', impressions: 18500, clicks: 1250, leads: 78, status: 'Active' },
                { id: 'ad_102', name: 'Learn React & Node.js with 100% Placement', type: 'Search Text Ad', impressions: 14200, clicks: 920, leads: 54, status: 'Active' },
                { id: 'ad_103', name: 'Web Dev Certificate Course - Apply Now', type: 'Display Banner', impressions: 8400, clicks: 510, leads: 32, status: 'Active' },
                { id: 'ad_104', name: 'Zero to Coding Hero in 6 Months', type: 'Responsive Search Ad', impressions: 4200, clicks: 280, leads: 12, status: 'Active' },
                { id: 'ad_105', name: 'Weekend Batch Web Dev Training', type: 'Text Ad', impressions: 2100, clicks: 110, leads: 6, status: 'Disabled' },
                { id: 'ad_106', name: 'Scholarship Offer Web Dev Academy', type: 'Callout Extension Ad', impressions: 1100, clicks: 50, leads: 3, status: 'Disabled' }
            ]
        },
        {
            _id: 'camp_2',
            name: 'Facebook Retargeting - Career Transitioners',
            platform: 'Facebook Ads',
            createdBy: 'Govind Kashyap',
            instituteName: 'HARTRON GANAUR',
            totalAds: 4,
            status: 'Active',
            budget: 10000,
            spent: 4200,
            impressions: 72000,
            clicks: 2840,
            leads: 142,
            startDate: '2026-06-15',
            endDate: '2026-07-31',
            adsList: [
                { id: 'ad_201', name: 'Switch your career to IT in 90 Days', type: 'Carousel Image Ad', impressions: 32000, clicks: 1350, leads: 72, status: 'Active' },
                { id: 'ad_202', name: 'Student Testimonials & Salary Proof', type: 'Video Ad', impressions: 24000, clicks: 910, leads: 48, status: 'Active' },
                { id: 'ad_203', name: 'Free Tech Career Consultation Booking', type: 'Single Image Lead Ad', impressions: 11000, clicks: 420, leads: 18, status: 'Active' },
                { id: 'ad_204', name: 'Limited Seats Left for July Batch', type: 'Urgency Post Ad', impressions: 5000, clicks: 160, leads: 4, status: 'Disabled' }
            ]
        },
        {
            _id: 'camp_3',
            name: 'Instagram Reels - Code in Python',
            platform: 'Instagram Ads',
            createdBy: 'Ankush Antil',
            instituteName: 'HARTRON GANAUR',
            totalAds: 8,
            status: 'Paused',
            budget: 12000,
            spent: 9800,
            impressions: 110000,
            clicks: 6540,
            leads: 298,
            startDate: '2026-05-10',
            endDate: '2026-06-10',
            adsList: [
                { id: 'ad_301', name: 'Build AI Bots in Python Reel', type: 'Reel Video Ad', impressions: 45000, clicks: 2800, leads: 130, status: 'Active' },
                { id: 'ad_302', name: 'Python vs Java Salary Comparison Reel', type: 'Reel Video Ad', impressions: 35000, clicks: 2100, leads: 95, status: 'Active' },
                { id: 'ad_303', name: 'Automate Excel with Python Demo', type: 'Reel Video Ad', impressions: 18000, clicks: 980, leads: 42, status: 'Active' },
                { id: 'ad_304', name: 'Python Data Science Bootcamp Promo', type: 'Story Ad', impressions: 7000, clicks: 410, leads: 21, status: 'Active' },
                { id: 'ad_305', name: 'Free Python Cheat Sheet Download', type: 'Image Post Ad', impressions: 3000, clicks: 150, leads: 7, status: 'Disabled' },
                { id: 'ad_306', name: 'Django Web App Crash Course', type: 'Video Ad', impressions: 1200, clicks: 60, leads: 3, status: 'Disabled' },
                { id: 'ad_307', name: 'Top 5 Python Libraries in 2026', type: 'Carousel Ad', impressions: 500, clicks: 25, leads: 0, status: 'Disabled' },
                { id: 'ad_308', name: 'Live Coding Webinar Invitation', type: 'Story Event Ad', impressions: 300, clicks: 15, leads: 0, status: 'Disabled' }
            ]
        },
        {
            _id: 'camp_4',
            name: 'YouTube Video Ad - Cyber Security Boot Camp',
            platform: 'YouTube Ads',
            createdBy: 'Govind Kashyap',
            instituteName: 'HARTRON GANAUR',
            totalAds: 3,
            status: 'Active',
            budget: 25000,
            spent: 12500,
            impressions: 145000,
            clicks: 4120,
            leads: 89,
            startDate: '2026-06-10',
            endDate: '2026-09-10',
            adsList: [
                { id: 'ad_401', name: 'Ethical Hacking Demo Video (Skippable)', type: 'In-Stream Video Ad', impressions: 85000, clicks: 2400, leads: 52, status: 'Active' },
                { id: 'ad_402', name: 'Cyber Security Career Opportunities', type: 'In-Feed Video Ad', impressions: 42000, clicks: 1210, leads: 28, status: 'Active' },
                { id: 'ad_403', name: 'CEH Certification Prep Course', type: 'Bumper Ad (6s)', impressions: 18000, clicks: 510, leads: 9, status: 'Active' }
            ]
        },
        {
            _id: 'camp_5',
            name: 'Google Display - UI/UX Design Masterclass',
            platform: 'Google Ads',
            createdBy: 'Ankush Antil',
            instituteName: 'HARTRON GANAUR',
            totalAds: 5,
            status: 'Paused',
            budget: 8000,
            spent: 7800,
            impressions: 340000,
            clicks: 1980,
            leads: 52,
            startDate: '2026-04-01',
            endDate: '2026-05-01',
            adsList: [
                { id: 'ad_501', name: 'Master Figma & UI Design Banner 728x90', type: 'Leaderboard Banner', impressions: 150000, clicks: 880, leads: 24, status: 'Active' },
                { id: 'ad_502', name: 'UX Research & Prototyping Square 300x250', type: 'Inline Rectangle Banner', impressions: 110000, clicks: 620, leads: 16, status: 'Active' },
                { id: 'ad_503', name: 'Build Portfolio in UI/UX Mobile Banner', type: 'Mobile Banner 320x50', impressions: 50000, clicks: 310, leads: 8, status: 'Active' },
                { id: 'ad_504', name: 'Design Systems Workshop Promo', type: 'Responsive Display Ad', impressions: 20000, clicks: 120, leads: 3, status: 'Disabled' },
                { id: 'ad_505', name: 'Figma to Code Workflow Banner', type: 'Skyscraper Banner', impressions: 10000, clicks: 50, leads: 1, status: 'Disabled' }
            ]
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [instituteFilter, setInstituteFilter] = useState('All');
    const [institutes, setInstitutes] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editBudget, setEditBudget] = useState('');
    const [previewModalCampaign, setPreviewModalCampaign] = useState(null);

    useEffect(() => {
        const fetchInsts = async () => {
            try {
                const res = await axios.get('/api/setup/institutes');
                setInstitutes(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Error fetching institutes:", err);
            }
        };
        fetchInsts();
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, platformFilter, statusFilter, instituteFilter]);

    // Form state for new campaign
    const [newCampaignForm, setNewCampaignForm] = useState({
        name: '',
        platform: 'Google Ads',
        status: 'Active',
        budget: '',
        totalAds: '1',
        startDate: '',
        endDate: ''
    });

    const platforms = ['Google Ads', 'Facebook Ads', 'Instagram Ads', 'YouTube Ads', 'LinkedIn Ads'];

    const handleCreateCampaign = (e) => {
        e.preventDefault();
        if (!newCampaignForm.name || !newCampaignForm.budget) {
            toast.error("Please fill in all required fields");
            return;
        }

        const newCamp = {
            _id: 'manual_' + Math.random().toString(36).substr(2, 9),
            ...newCampaignForm,
            createdBy: user?.name || 'Marketer',
            instituteName: user?.instituteName || 'HARTRON GANAUR',
            totalAds: parseInt(newCampaignForm.totalAds) || 1,
            budget: parseFloat(newCampaignForm.budget),
            spent: 0,
            impressions: 0,
            clicks: 0,
            leads: 0,
            startDate: newCampaignForm.startDate || new Date().toISOString().split('T')[0],
            endDate: newCampaignForm.endDate || 'Ongoing'
        };

        setCampaigns([...campaigns, newCamp]);
        toast.success("Campaign created successfully!");
        setIsAddModalOpen(false);
        setNewCampaignForm({
            name: '',
            platform: 'Google Ads',
            status: 'Active',
            budget: '',
            totalAds: '1',
            startDate: '',
            endDate: ''
        });
    };

    const handleToggleStatus = (id, currentStatus) => {
        const nextStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
        setCampaigns(prev => prev.map(c => c._id === id ? { ...c, status: nextStatus } : c));
        toast.success(`Campaign state set to ${nextStatus}`);
    };

    const handleDeleteCampaign = (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        setCampaigns(prev => prev.filter(c => c._id !== id));
        toast.success("Campaign deleted");
    };

    const handleToggleAdStatus = (campaignId, adId) => {
        setCampaigns(prev => prev.map(c => {
            if (c._id === campaignId) {
                const currentAds = c.adsList || [];
                const updatedAds = currentAds.map(ad => 
                    ad.id === adId ? { ...ad, status: ad.status === 'Active' ? 'Disabled' : 'Active' } : ad
                );
                const activeAdsCount = updatedAds.filter(ad => ad.status === 'Active').length;
                return {
                    ...c,
                    adsList: updatedAds,
                    status: activeAdsCount > 0 ? 'Active' : 'Paused'
                };
            }
            return c;
        }));

        if (previewModalCampaign && previewModalCampaign._id === campaignId) {
            setPreviewModalCampaign(prev => {
                if (!prev) return null;
                const currentAds = prev.adsList || [];
                const updatedAds = currentAds.map(ad => 
                    ad.id === adId ? { ...ad, status: ad.status === 'Active' ? 'Disabled' : 'Active' } : ad
                );
                return { ...prev, adsList: updatedAds };
            });
        }
        toast.success("Ad status updated!");
    };

    const handleDeleteSingleAd = (campaignId, adId) => {
        if (!window.confirm("Are you sure you want to delete this ad?")) return;

        setCampaigns(prev => prev.map(c => {
            if (c._id === campaignId) {
                const currentAds = c.adsList || [];
                const updatedAds = currentAds.filter(ad => ad.id !== adId);
                return {
                    ...c,
                    totalAds: updatedAds.length,
                    adsList: updatedAds
                };
            }
            return c;
        }));

        if (previewModalCampaign && previewModalCampaign._id === campaignId) {
            setPreviewModalCampaign(prev => {
                if (!prev) return null;
                const currentAds = prev.adsList || [];
                const updatedAds = currentAds.filter(ad => ad.id !== adId);
                return {
                    ...prev,
                    totalAds: updatedAds.length,
                    adsList: updatedAds
                };
            });
        }
        toast.success("Ad deleted from campaign!");
    };

    const handleSaveBudget = (id) => {
        if (!editBudget || isNaN(editBudget)) {
            toast.error("Invalid budget amount");
            return;
        }
        setCampaigns(prev => prev.map(c => c._id === id ? { ...c, budget: parseFloat(editBudget) } : c));
        toast.success("Budget updated");
        setEditingCampaign(null);
        setEditBudget('');
    };

    // Calculations
    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPlatform = platformFilter === 'All' || c.platform === platformFilter;
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const instName = c.instituteName || 'HARTRON GANAUR';
        const matchesInstitute = instituteFilter === 'All' || instName === instituteFilter;
        return matchesSearch && matchesPlatform && matchesStatus && matchesInstitute;
    });

    const totalCampaignsCount = filteredCampaigns.length;
    const totalAdsCount = filteredCampaigns.reduce((acc, c) => acc + (c.totalAds || 1), 0);
    const totalLeadsCount = filteredCampaigns.reduce((acc, c) => acc + c.leads, 0);
    const totalSpend = filteredCampaigns.reduce((acc, c) => acc + c.spent, 0);
    const totalBudget = filteredCampaigns.reduce((acc, c) => acc + c.budget, 0);

    // Pagination calculations
    const totalPages = Math.ceil(filteredCampaigns.length / rowsPerPage) || 1;
    const indexOfLastCamp = currentPage * rowsPerPage;
    const indexOfFirstCamp = indexOfLastCamp - rowsPerPage;
    const currentCampaigns = filteredCampaigns.slice(indexOfFirstCamp, indexOfLastCamp);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const importCampaignsRef = useRef(null);

    const exportCampaigns = (format) => {
        const listToExport = filteredCampaigns;
        if (!listToExport || listToExport.length === 0) {
            toast.error('No campaign data to export');
            return;
        }

        const dataRows = listToExport.map((c, idx) => ({
            'S.No': idx + 1,
            'Campaign Name': c.name || 'N/A',
            'Platform': c.platform || 'Google Ads',
            'Status': c.status || 'Active',
            'Budget (INR)': c.budget || 0,
            'Spent (INR)': c.spent || 0,
            'Total Impressions': c.impressions || 0,
            'Total Clicks': c.clicks || 0,
            'Total Leads': c.leads || 0,
            'Start Date': c.startDate || 'N/A',
            'End Date': c.endDate || 'N/A',
            'Institute': c.instituteName || c.institute?.name || 'N/A',
            'Total Ads Count': c.ads?.length || 0
        }));

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(dataRows, null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Advertising_Campaigns_Report_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${dataRows.length} campaigns to JSON`);
        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(dataRows);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Advertising_Campaigns_Report_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${dataRows.length} campaigns to CSV`);
        } else if (format === 'excel') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dataRows);
            XLSX.utils.book_append_sheet(wb, ws, 'Advertising Campaigns');
            XLSX.writeFile(wb, `Advertising_Campaigns_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Exported ${dataRows.length} campaigns to Excel`);
        }
    };

    const handleImportCampaigns = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                let importedList = [];
                if (file.name.endsWith('.json')) {
                    importedList = JSON.parse(evt.target.result);
                } else {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    importedList = XLSX.utils.sheet_to_json(worksheet);
                }

                if (!Array.isArray(importedList) || importedList.length === 0) {
                    toast.error('No valid campaign records found in file');
                    return;
                }

                const formattedNewCampaigns = importedList.map((row, idx) => ({
                    _id: `imp_camp_${Date.now()}_${idx}`,
                    name: row['Campaign Name'] || row.name || 'Imported Campaign',
                    platform: row['Platform'] || row.platform || 'Google Ads',
                    status: row['Status'] || row.status || 'Active',
                    budget: Number(row['Budget (INR)'] || row.budget) || 10000,
                    spent: Number(row['Spent (INR)'] || row.spent) || 0,
                    clicks: Number(row['Total Clicks'] || row.clicks) || 0,
                    impressions: Number(row['Total Impressions'] || row.impressions) || 0,
                    leads: Number(row['Total Leads'] || row.leads) || 0,
                    startDate: row['Start Date'] || row.startDate || new Date().toISOString().split('T')[0],
                    endDate: row['End Date'] || row.endDate || '',
                    ads: []
                }));

                setCampaigns(prev => [...prev, ...formattedNewCampaigns]);
                toast.success(`Successfully imported ${formattedNewCampaigns.length} ad campaigns!`);
            } catch (err) {
                console.error("Import error:", err);
                toast.error("Failed to parse file. Please check format.");
            }
        };

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }

        e.target.value = '';
    };

    return (
        <DashboardLayout role={user?.role || 'Institute'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Megaphone className="text-indigo-600" /> Advertising Campaigns Desk
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Track ad spends, return on ad spend (ROAS), click-through-rates, and cost per lead</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="file"
                        ref={importCampaignsRef}
                        onChange={handleImportCampaigns}
                        accept=".json,.csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => importCampaignsRef.current?.click()}
                        className="px-4 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0b1329]/10 active:scale-95 whitespace-nowrap"
                    >
                        <Upload size={14} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-4 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0b1329]/10 active:scale-95 whitespace-nowrap"
                        >
                            <Download size={14} /> Export <ChevronDown size={12} />
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { exportCampaigns('excel'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportCampaigns('csv'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportCampaigns('json'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
                    >
                        <Plus size={14} /> New Campaign
                    </button>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Campaign</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalCampaignsCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Ads</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalAdsCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Lead</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalLeadsCount.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Ad Spend</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                            {formatCurrency(totalSpend)} <span className="text-[10px] text-slate-450 font-normal">/ {formatCurrency(totalBudget)}</span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Institute:</span>
                            <select
                                value={instituteFilter}
                                onChange={(e) => setInstituteFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Institutes</option>
                                {institutes.map(inst => (
                                    <option key={inst._id || inst.name} value={inst.name}>{inst.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Platform:</span>
                            <select
                                value={platformFilter}
                                onChange={(e) => setPlatformFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Platforms</option>
                                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Rows / Page:</span>
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setRowsPerPage(val);
                                    setCurrentPage(1);
                                }}
                                className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 outline-none text-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left mb-8">
                <div className="responsive-table-wrapper">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                <th className="p-4 font-semibold">Campaign Info</th>
                                <th className="p-4 font-semibold">Created By</th>
                                <th className="p-4 font-semibold">Institute</th>
                                <th className="p-4 font-semibold text-center">Total Ads in this</th>
                                <th className="p-4 font-semibold">Budgets Spend</th>
                                <th className="p-4 font-semibold">Traffic stats</th>
                                <th className="p-4 font-semibold">Leads</th>
                                <th className="p-4 font-semibold">CPA</th>
                                <th className="p-4 font-semibold">Dates</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                            {currentCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-slate-400 font-semibold text-sm">
                                        No campaigns found matching your criteria.
                                    </td>
                                </tr>
                            ) : currentCampaigns.map(c => {
                                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';
                                const cpa = c.leads > 0 ? (c.spent / c.leads).toFixed(0) : '0';
                                const percentSpent = c.budget > 0 ? ((c.spent / c.budget) * 100).toFixed(0) : '0';

                                return (
                                    <tr key={c._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-fit mt-1">{c.platform}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-750 font-bold">
                                            {c.createdBy || user?.name || 'Ankush Antil'}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-600 font-bold">
                                            {c.instituteName || 'HARTRON GANAUR'}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => setPreviewModalCampaign(c)}
                                                className="px-3 py-1 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                                title="Click to Preview Ads in Table"
                                            >
                                                <Eye size={12} /> {c.adsList?.length || c.totalAds || 1} Ads
                                            </button>
                                        </td>
                                        <td className="p-4 min-w-[150px] whitespace-nowrap">
                                            <div className="flex flex-col justify-center">
                                                <div className="flex justify-between items-center text-[10px] text-slate-550 mb-1">
                                                    <span>{formatCurrency(c.spent)}</span>
                                                    <span>{percentSpent}% of {formatCurrency(c.budget)}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${parseFloat(percentSpent) > 90 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                                        style={{ width: `${Math.min(parseFloat(percentSpent), 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{c.clicks.toLocaleString()} clicks</span>
                                                <span className="text-[10px] text-slate-450 font-semibold mt-0.5">{c.impressions.toLocaleString()} views · {ctr}% CTR</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap font-extrabold text-emerald-600">
                                            {c.leads} leads
                                        </td>
                                        <td className="p-4 whitespace-nowrap font-bold text-slate-700">
                                            {formatCurrency(parseFloat(cpa))}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                                            {c.startDate} — {c.endDate}
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Preview Button */}
                                                <button
                                                    onClick={() => setPreviewModalCampaign(c)}
                                                    className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-650 hover:bg-indigo-100 hover:text-indigo-750 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold text-xs"
                                                    title="Preview Ads Table"
                                                >
                                                    <Eye size={14} /> Preview
                                                </button>

                                                {/* Status Toggle Badge / Button */}
                                                <button
                                                    onClick={() => handleToggleStatus(c._id, c.status)}
                                                    className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                                                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-150 hover:bg-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                    title="Click to Toggle Active / Paused"
                                                >
                                                    {c.status}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-semibold text-slate-500">
                        Showing <span className="font-bold text-slate-800">{filteredCampaigns.length > 0 ? indexOfFirstCamp + 1 : 0}</span> to{' '}
                        <span className="font-bold text-slate-800">{Math.min(indexOfLastCamp, filteredCampaigns.length)}</span> of{' '}
                        <span className="font-bold text-slate-800">{filteredCampaigns.length}</span> campaigns
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-5 py-2 rounded-full border border-slate-200/80 text-xs font-extrabold text-slate-400 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        >
                            Previous
                        </button>

                        {(() => {
                            const pages = [];
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                                if (currentPage <= 4) {
                                    pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                } else if (currentPage >= totalPages - 3) {
                                    pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                                } else {
                                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                                }
                            }

                            return pages.map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span key={`dots-${index}`} className="px-1 text-slate-400 font-black text-xs">
                                            ...
                                        </span>
                                    );
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                            currentPage === page
                                                ? 'bg-[#0B132B] text-white shadow-md'
                                                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            });
                        })()}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-5 py-2 rounded-full border border-slate-200/80 text-xs font-extrabold text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Budget Modal */}
            {editingCampaign && createPortal(
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5">
                            <h3 className="font-extrabold text-sm flex items-center gap-1.5">Modify Monthly Budget</h3>
                            <p className="text-[10px] text-slate-350 font-bold mt-0.5 truncate">{editingCampaign.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Budget (INR)</label>
                                <input
                                    type="number"
                                    value={editBudget}
                                    onChange={(e) => setEditBudget(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="Enter budget limit"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                onClick={() => setEditingCampaign(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveBudget(editingCampaign._id)}
                                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Campaign Modal */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateCampaign} className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5 flex justify-between items-center">
                            <h3 className="font-extrabold text-sm flex items-center gap-2">Create New Campaign</h3>
                            <button 
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newCampaignForm.name}
                                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. Google Search - Cyber Security"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ad Network</label>
                                    <select
                                        value={newCampaignForm.platform}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, platform: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Monthly Budget (INR)</label>
                                    <input
                                        type="number"
                                        required
                                        value={newCampaignForm.budget}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, budget: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. 15000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newCampaignForm.startDate}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, startDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newCampaignForm.endDate}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, endDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Launch Campaign
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Preview Ads Table Modal */}
            {previewModalCampaign && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-left animate-slide-up">
                        {/* Modal Header */}
                        <div className="bg-[#0b132b] text-white p-6 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 rounded-full">
                                    {previewModalCampaign.platform}
                                </span>
                                <h2 className="text-lg font-black mt-1.5 flex items-center gap-2">
                                    <Megaphone size={18} className="text-indigo-400" />
                                    {previewModalCampaign.name}
                                </h2>
                                <p className="text-xs text-slate-350 mt-1">
                                    Institute: <span className="text-white font-bold">{previewModalCampaign.instituteName || 'HARTRON GANAUR'}</span> · Created By: <span className="text-white font-bold">{previewModalCampaign.createdBy || 'Ankush Antil'}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewModalCampaign(null)}
                                className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Body / Ads Table */}
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-150 gap-2">
                                <div className="text-xs font-bold text-slate-600">
                                    Total Ads in this Campaign: <span className="text-indigo-650 font-black text-sm ml-1">{previewModalCampaign.adsList?.length || previewModalCampaign.totalAds || 0} Ads</span>
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    Enabled: <span className="text-emerald-600 font-extrabold mr-2">{previewModalCampaign.adsList?.filter(a => a.status === 'Active').length || 0}</span>
                                    Disabled: <span className="text-rose-500 font-extrabold">{previewModalCampaign.adsList?.filter(a => a.status !== 'Active').length || 0}</span>
                                </div>
                            </div>

                            {/* Ads Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="responsive-table-wrapper">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                                                <th className="p-3.5 pl-5 font-semibold">Ad Headline / Creative</th>
                                                <th className="p-3.5 font-semibold">Format / Type</th>
                                                <th className="p-3.5 font-semibold">Traffic Stats</th>
                                                <th className="p-3.5 font-semibold">Leads</th>
                                                <th className="p-3.5 pr-5 text-right font-semibold">Enable / Disable</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                                            {(!previewModalCampaign.adsList || previewModalCampaign.adsList.length === 0) ? (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold text-xs">
                                                        No individual ads found in this campaign.
                                                    </td>
                                                </tr>
                                            ) : (
                                                previewModalCampaign.adsList.map((ad, idx) => (
                                                    <tr key={ad.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-3.5 pl-5">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-xs">{ad.name}</span>
                                                                <span className="text-[10px] font-mono text-slate-400">ID: {ad.id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                                                                {ad.type}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap">
                                                            <div className="flex flex-col text-[11px]">
                                                                <span className="font-bold text-slate-800">{ad.clicks.toLocaleString()} Clicks</span>
                                                                <span className="text-[10px] text-slate-400">{ad.impressions.toLocaleString()} Views</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3.5 whitespace-nowrap font-extrabold text-emerald-600">
                                                            {ad.leads} Leads
                                                        </td>
                                                        <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleToggleAdStatus(previewModalCampaign._id, ad.id)}
                                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs border ${
                                                                        ad.status === 'Active'
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                                    }`}
                                                                    title="Click to Enable or Disable this Ad"
                                                                >
                                                                    {ad.status === 'Active' ? '✓ Enabled' : '✕ Disabled'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSingleAd(previewModalCampaign._id, ad.id)}
                                                                    className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-all"
                                                                    title="Delete Ad from Campaign"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setPreviewModalCampaign(null)}
                                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default AdsManagement;
