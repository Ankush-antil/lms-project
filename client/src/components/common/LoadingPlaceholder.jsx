import React from 'react';

const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`}></div>
);

const LoadingPlaceholder = ({ type = 'dashboard' }) => {
    if (type === 'dashboard') {
        return (
            <div className="p-8 space-y-8 w-full animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 font-bold" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                            <Skeleton className="h-14 w-14 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-[32px] p-8 space-y-6 border border-slate-100 shadow-sm">
                        <div className="flex justify-between border-b border-slate-50 pb-6">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-8 w-24 rounded-xl" />
                        </div>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[32px] p-8 h-64 relative overflow-hidden">
                            <Skeleton className="h-6 w-32 bg-slate-800" />
                            <div className="mt-8 space-y-3">
                                <Skeleton className="h-3 w-full bg-slate-800" />
                                <Skeleton className="h-3 w-full bg-slate-800" />
                                <Skeleton className="h-3 w-2/3 bg-slate-800" />
                            </div>
                            <Skeleton className="h-12 w-full mt-10 rounded-2xl bg-slate-800" />
                        </div>
                        <Skeleton className="h-32 w-full rounded-[32px] bg-indigo-50/50" />
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'activities') {
        return (
            <div className="flex h-screen bg-slate-50 animate-fade-in overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-200 hidden md:flex flex-col p-6 space-y-6">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <div className="space-y-4 pt-10">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                </aside>
                <main className="flex-1 p-10 space-y-8 overflow-y-auto">
                    <div className="flex justify-between border-b border-slate-100 pb-8">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-12 w-64" />
                        </div>
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-32 w-full rounded-[32px]" />
                        <Skeleton className="h-32 w-full rounded-[32px]" />
                    </div>
                    <div className="space-y-4 pt-6">
                        <Skeleton className="h-6 w-48" />
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-28 w-full rounded-[32px]" />
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    if (type === 'test') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col animate-fade-in">
                <div className="h-20 bg-purple-700/90 p-6 flex justify-between items-center">
                    <Skeleton className="h-6 w-64 bg-purple-600/50" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-40 rounded-full bg-purple-600/50" />
                        <Skeleton className="h-10 w-10 rounded-full bg-orange-400/50" />
                    </div>
                </div>
                <div className="max-w-4xl mx-auto w-full p-8 mt-10 space-y-12">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-8">
                            <div className="flex justify-between items-start">
                                <Skeleton className="h-8 w-2/3" />
                                <Skeleton className="h-6 w-20 rounded-lg" />
                            </div>
                            <Skeleton className="h-48 w-full rounded-2xl" />
                            <div className="flex justify-between border-t pt-6">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-32 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-3xl"></div>
            <div className="grid grid-cols-3 gap-6">
                <div className="h-32 bg-slate-200 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 rounded-3xl"></div>
            </div>
        </div>
    );
};

export default LoadingPlaceholder;
