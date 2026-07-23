import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Database, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const DbTemplatesPage = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-4xl mx-auto px-4 py-16 font-sans text-center flex flex-col items-center justify-center min-h-[70vh]">
                {/* Icon Card */}
                <div className="relative mb-8">
                    <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex items-center justify-center text-blue-600 animate-pulse shadow-sm">
                        <Database size={40} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow">
                        <Clock size={14} />
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-md">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Coming Soon
                    </span>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-4">
                        Database Creator Tool
                    </h2>
                    <p className="text-slate-400 font-semibold text-sm mt-3 leading-relaxed">
                        Design custom tables, data fields, schemas, and relational database records. We are building a powerful visual database designer for your creators suite.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default DbTemplatesPage;
