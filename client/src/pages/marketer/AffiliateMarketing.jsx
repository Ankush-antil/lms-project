import { useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    DollarSign, Users, Award, Search, Plus, ExternalLink, 
    Check, ArrowRight, Sparkles, Filter, Mail, Phone, Calendar, 
    X, Clipboard, Percent, Briefcase, ListFilter
} from 'lucide-react';

const AffiliateMarketing = () => {
    // Rich Realistic Affiliate Partners Data
    const [affiliates, setAffiliates] = useState([
        {
            _id: 'aff_1',
            partnerName: 'TechPrep Tutorial Blog',
            contactName: 'Rohit Verma',
            email: 'contact@techpreptutorial.com',
            link: 'https://digitalstudyacademy.com/apply?ref=techprep',
            clicks: 1450,
            sales: 18,
            totalEarnings: 36000, // Monthly in INR
            unpaidCommission: 12000,
            rate: 10 // Percentage
        },
        {
            _id: 'aff_2',
            partnerName: 'Careers in Tech (YouTube)',
            contactName: 'Sanjay Dutt',
            email: 'sanjay.dutt@careersintech.io',
            link: 'https://digitalstudyacademy.com/apply?ref=careersintech',
            clicks: 3820,
            sales: 42,
            totalEarnings: 84000,
            unpaidCommission: 0,
            rate: 10
        },
        {
            _id: 'aff_3',
            partnerName: 'Coding Bootcamps India',
            contactName: 'Priya Sen',
            email: 'info@codingbootcamps.in',
            link: 'https://digitalstudyacademy.com/apply?ref=bootcampsin',
            clicks: 890,
            sales: 7,
            totalEarnings: 21000,
            unpaidCommission: 7000,
            rate: 12
        },
        {
            _id: 'aff_4',
            partnerName: 'DSA Prep Community',
            contactName: 'Aman Goyal',
            email: 'aman@dsaprep.com',
            link: 'https://digitalstudyacademy.com/apply?ref=dsaprep',
            clicks: 1220,
            sales: 11,
            totalEarnings: 22000,
            unpaidCommission: 5500,
            rate: 10
        },
        {
            _id: 'aff_5',
            partnerName: 'Campus Ambassador - IIT Delhi',
            contactName: 'Aditya Raj',
            email: 'aditya.raj@iitd.ac.in',
            link: 'https://digitalstudyacademy.com/apply?ref=adityaiitd',
            clicks: 450,
            sales: 5,
            totalEarnings: 15000,
            unpaidCommission: 0,
            rate: 15
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // New Affiliate State
    const [newAffiliateForm, setNewAffiliateForm] = useState({
        partnerName: '',
        contactName: '',
        email: '',
        linkCode: '',
        rate: '10'
    });

    const handleCreateAffiliate = (e) => {
        e.preventDefault();
        if (!newAffiliateForm.partnerName || !newAffiliateForm.contactName || !newAffiliateForm.linkCode) {
            toast.error("Please fill in required fields");
            return;
        }

        const newAff = {
            _id: 'manual_' + Math.random().toString(36).substr(2, 9),
            partnerName: newAffiliateForm.partnerName,
            contactName: newAffiliateForm.contactName,
            email: newAffiliateForm.email || 'N/A',
            link: `https://digitalstudyacademy.com/apply?ref=${newAffiliateForm.linkCode}`,
            clicks: 0,
            sales: 0,
            totalEarnings: 0,
            unpaidCommission: 0,
            rate: parseFloat(newAffiliateForm.rate)
        };

        setAffiliates([...affiliates, newAff]);
        toast.success("Affiliate Partner onboarded successfully!");
        setIsAddModalOpen(false);
        setNewAffiliateForm({
            partnerName: '',
            contactName: '',
            email: '',
            linkCode: '',
            rate: '10'
        });
    };

    const handleCopyLink = (link) => {
        navigator.clipboard.writeText(link);
        toast.success("Affiliate link copied to clipboard!");
    };

    const handlePayCommission = (id) => {
        setAffiliates(prev => prev.map(a => a._id === id ? { ...a, unpaidCommission: 0 } : a));
        toast.success("Payout processed & unpaid balance cleared!");
    };

    // Filter
    const filteredAffiliates = affiliates.filter(a => 
        a.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculations
    const totalPartners = filteredAffiliates.length;
    const totalClicks = filteredAffiliates.reduce((acc, a) => acc + a.clicks, 0);
    const totalSales = filteredAffiliates.reduce((acc, a) => acc + a.sales, 0);
    const totalUnpaid = filteredAffiliates.reduce((acc, a) => acc + a.unpaidCommission, 0);
    const totalEarnings = filteredAffiliates.reduce((acc, a) => acc + a.totalEarnings, 0);

    const conversionRate = totalClicks > 0 ? ((totalSales / totalClicks) * 100).toFixed(1) : '0';

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <DashboardLayout role="Marketer">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Award className="text-indigo-600" /> Affiliate Marketing Program
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Manage publisher relations, track web referrals, and process payouts</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 self-start"
                >
                    <Plus size={14} /> Onboard Affiliate
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Affiliates</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalPartners}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Clipboard size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sales (CVR)</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                            {totalSales} <span className="text-[10px] text-slate-450 font-normal">({conversionRate}%)</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Earnings Disbursed</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalEarnings - totalUnpaid)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unpaid Dues</p>
                        <h3 className="text-xl font-extrabold text-rose-650 mt-1">{formatCurrency(totalUnpaid)}</h3>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-grow max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search partners by brand or contact..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Partners Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                <div className="responsive-table-wrapper">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th className="p-4 font-semibold">Affiliate Brand</th>
                                <th className="p-4 font-semibold">Contact Details</th>
                                <th className="p-4 font-semibold text-center">Comm. Rate</th>
                                <th className="p-4 font-semibold text-center">Traffic (Clicks)</th>
                                <th className="p-4 font-semibold text-center">Sales</th>
                                <th className="p-4 font-semibold">Financial Status</th>
                                <th className="p-4 font-semibold text-right">Commission Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                            {filteredAffiliates.map(a => (
                                <tr key={a._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-sm">{a.partnerName}</span>
                                            <button
                                                onClick={() => handleCopyLink(a.link)}
                                                className="text-[10px] text-indigo-650 hover:underline flex items-center gap-1 mt-1 font-mono font-bold text-left cursor-pointer"
                                                title="Copy Affiliate Link"
                                            >
                                                <Clipboard size={10} /> Link: ...{a.link.split('?ref=')[1]}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-750">{a.contactName}</span>
                                            <span className="text-slate-400 text-[10px] font-semibold mt-0.5">{a.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <span className="bg-slate-100 border border-slate-200 text-slate-750 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 justify-center w-fit mx-auto text-[10px]">
                                            <Percent size={10} /> {a.rate}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap font-medium text-slate-600">
                                        {a.clicks.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap font-extrabold text-indigo-650">
                                        {a.sales}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">Total: {formatCurrency(a.totalEarnings)}</span>
                                            <span className={`text-[10px] font-bold mt-0.5 ${a.unpaidCommission > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                Unpaid: {formatCurrency(a.unpaidCommission)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {a.unpaidCommission > 0 ? (
                                            <button
                                                onClick={() => handlePayCommission(a._id)}
                                                className="px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                                            >
                                                Clear Payout
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold">Cleared & Settled</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Onboard Affiliate Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateAffiliate} className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5 flex justify-between items-center">
                            <h3 className="font-extrabold text-sm flex items-center gap-2">Onboard Affiliate Partner</h3>
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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Affiliate Brand / Website Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newAffiliateForm.partnerName}
                                    onChange={(e) => setNewAffiliateForm({ ...newAffiliateForm, partnerName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. Code Academy India Blog"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contact Manager Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newAffiliateForm.contactName}
                                        onChange={(e) => setNewAffiliateForm({ ...newAffiliateForm, contactName: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. Sanjay Verma"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={newAffiliateForm.email}
                                        onChange={(e) => setNewAffiliateForm({ ...newAffiliateForm, email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. name@brand.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unique Referral Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newAffiliateForm.linkCode}
                                        onChange={(e) => setNewAffiliateForm({ ...newAffiliateForm, linkCode: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-mono"
                                        placeholder="e.g. codeambassador"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        required
                                        value={newAffiliateForm.rate}
                                        onChange={(e) => setNewAffiliateForm({ ...newAffiliateForm, rate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="10"
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
                                Add Partner
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AffiliateMarketing;
