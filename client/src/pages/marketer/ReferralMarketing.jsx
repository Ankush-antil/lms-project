import { useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    UserPlus, Search, Gift, Award, CheckCircle, RefreshCw, 
    ArrowRight, Sparkles, Filter, Mail, Phone, Calendar, 
    ChevronRight, Settings, Plus, X, AlertCircle
} from 'lucide-react';

const ReferralMarketing = () => {
    // Rich Realistic Referral Data
    const [referrals, setReferrals] = useState([
        {
            _id: 'ref_1',
            referrerName: 'Rohan Sen',
            referrerEmail: 'rohan.sen@gmail.com',
            code: 'ROHANS50',
            friendName: 'Vikram Malhotra',
            friendEmail: 'vikram.m@yahoo.com',
            friendPhone: '7654321098',
            status: 'Enrolled', // 'Pending Contact' | 'Joined Demo' | 'Enrolled' | 'Lost'
            rewardStatus: 'Disbursed', // 'N/A' | 'Pending Approval' | 'Disbursed'
            rewardDetail: 'Rs. 1,000 Amazon Voucher',
            date: '2026-07-09'
        },
        {
            _id: 'ref_2',
            referrerName: 'Neha Deshmukh',
            referrerEmail: 'neha.d@gmail.com',
            code: 'NEHAD20',
            friendName: 'Siddharth Roy',
            friendEmail: 'sid.roy@outlook.com',
            friendPhone: '9001122334',
            status: 'Enrolled',
            rewardStatus: 'Pending Approval',
            rewardDetail: '20% Course Fee Cashback',
            date: '2026-07-12'
        },
        {
            _id: 'ref_3',
            referrerName: 'Karan Mehra',
            referrerEmail: 'karan.mehra@gmail.com',
            code: 'KARANM10',
            friendName: 'Aisha Khan',
            friendEmail: 'aisha.khan@gmail.com',
            friendPhone: '9543219087',
            status: 'Joined Demo',
            rewardStatus: 'N/A',
            rewardDetail: 'None (Demo stage)',
            date: '2026-07-13'
        },
        {
            _id: 'ref_4',
            referrerName: 'Pooja Hegde',
            referrerEmail: 'pooja.hegde@outlook.com',
            code: 'POOJAH30',
            friendName: 'Kunal Verma',
            friendEmail: 'kunal.v@gmail.com',
            friendPhone: '8877665599',
            status: 'Pending Contact',
            rewardStatus: 'N/A',
            rewardDetail: 'None (Pending)',
            date: '2026-07-14'
        },
        {
            _id: 'ref_5',
            referrerName: 'Amit Patel',
            referrerEmail: 'amit.patel@gmail.com',
            code: 'AMITP40',
            friendName: 'Deepak Rao',
            friendEmail: 'deepak.rao@gmail.com',
            friendPhone: '9988776655',
            status: 'Enrolled',
            rewardStatus: 'Disbursed',
            rewardDetail: 'Rs. 1,000 Wallet Cash',
            date: '2026-06-25'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    
    // Reward Configuration Rule State
    const [rewardRules, setRewardRules] = useState({
        referrerReward: 'Rs. 1,000 Cashback',
        refereeReward: '10% Discount on Enrollment',
        minDays: '30'
    });

    const handleDisburseReward = (id) => {
        setReferrals(prev => prev.map(r => r._id === id ? { ...r, rewardStatus: 'Disbursed', rewardDetail: rewardRules.referrerReward } : r));
        toast.success("Reward disbursed successfully!");
    };

    const handleSaveRules = (e) => {
        e.preventDefault();
        toast.success("Referral reward configuration updated!");
        setIsRuleModalOpen(false);
    };

    // Filters
    const filteredReferrals = referrals.filter(r => {
        const matchesSearch = 
            r.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.friendName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Counts
    const totalSignups = referrals.length;
    const enrolledReferrals = referrals.filter(r => r.status === 'Enrolled').length;
    const pendingRewardsCount = referrals.filter(r => r.rewardStatus === 'Pending Approval').length;
    const totalDisbursed = referrals.filter(r => r.rewardStatus === 'Disbursed').length;

    return (
        <DashboardLayout role="Marketer">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <UserPlus className="text-indigo-600" /> Referral Marketing Desk
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Manage word-of-mouth student invite programs, track signups, and verify reward payouts</p>
                </div>
                <button
                    onClick={() => setIsRuleModalOpen(true)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm self-start"
                >
                    <Settings size={14} /> Program Settings
                </button>
            </div>

            {/* Referral Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Referral Signups</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalSignups}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Converted Sales</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{enrolledReferrals}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <Gift size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rewards Pending</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{pendingRewardsCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rewards Paid</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalDisbursed}</h3>
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
                            placeholder="Search by student, invitee, or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wide">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Stages</option>
                                <option value="Enrolled">Enrolled</option>
                                <option value="Joined Demo">Joined Demo</option>
                                <option value="Pending Contact">Pending Contact</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Referrals table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                <div className="responsive-table-wrapper">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th className="p-4 font-semibold">Student Referrer</th>
                                <th className="p-4 font-semibold">Referred Friend</th>
                                <th className="p-4 font-semibold">Referral Code</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Reward Details</th>
                                <th className="p-4 font-semibold text-center">Referral Status</th>
                                <th className="p-4 font-semibold text-right">Reward Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                            {filteredReferrals.map(r => (
                                <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-sm">{r.referrerName}</span>
                                            <span className="text-slate-400 text-[10px] font-semibold mt-0.5">{r.referrerEmail}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-750 text-sm">{r.friendName}</span>
                                            <span className="text-slate-400 text-[10px] font-semibold mt-0.5 flex items-center gap-1"><Phone size={10} /> {r.friendPhone}</span>
                                            {r.friendEmail && (
                                                <span className="text-slate-450 text-[10px] font-mono mt-0.5 flex items-center gap-1"><Mail size={10} /> {r.friendEmail}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{r.code}</span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                                        {new Date(r.date).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{r.rewardDetail}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 w-fit ${
                                                r.rewardStatus === 'Disbursed' ? 'text-emerald-600' :
                                                r.rewardStatus === 'Pending Approval' ? 'text-amber-500' : 'text-slate-400'
                                            }`}>
                                                {r.rewardStatus}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <span className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            r.status === 'Enrolled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            r.status === 'Joined Demo' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                            'bg-slate-50 text-slate-450 border-slate-200'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {r.rewardStatus === 'Pending Approval' ? (
                                            <button
                                                onClick={() => handleDisburseReward(r._id)}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                                            >
                                                Approve Reward
                                            </button>
                                        ) : r.rewardStatus === 'Disbursed' ? (
                                            <span className="text-[10px] text-slate-400 font-bold">Claimed & Paid</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-350 italic">Not eligible yet</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settings Modal */}
            {isRuleModalOpen && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSaveRules} className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5 flex justify-between items-center">
                            <h3 className="font-extrabold text-sm flex items-center gap-2">
                                <Settings size={18} className="text-indigo-400" /> Program Rules Setup
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsRuleModalOpen(false)}
                                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Referrer Reward (Existing Student)</label>
                                <input
                                    type="text"
                                    required
                                    value={rewardRules.referrerReward}
                                    onChange={(e) => setRewardRules({ ...rewardRules, referrerReward: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. Rs. 1,000 Cash Reward"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Referee Discount (New Invitee Friend)</label>
                                <input
                                    type="text"
                                    required
                                    value={rewardRules.refereeReward}
                                    onChange={(e) => setNewCampaignForm({ ...rewardRules, refereeReward: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. 10% Discount on Enrollment"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Minimum Retention Period (Days)</label>
                                <input
                                    type="number"
                                    required
                                    value={rewardRules.minDays}
                                    onChange={(e) => setRewardRules({ ...rewardRules, minDays: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="30"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 pl-1">Days friend must remain enrolled before reward disbursal.</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsRuleModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
};

export default ReferralMarketing;
