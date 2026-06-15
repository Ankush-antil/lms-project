import { PieChart, X, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { addonsList } from '../constants';

const AssistiveDrawer = ({
    element,
    setActiveFooterTab,
    onUpdateField,
    onRemoveAddon,
    onApplyAddonToAll
}) => {
    const currentAddons = element.addons || [];

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const addonData = e.dataTransfer.getData('addonType');
        if (addonData) {
            const addon = JSON.parse(addonData);
            const nextAddons = element.addons || [];
            if (nextAddons.includes(addon.label)) {
                toast.error(`${addon.label} is already added!`);
            } else if (nextAddons.length >= 5) {
                toast.error("Maximum of 5 addons allowed!");
            } else {
                onUpdateField('addons', [...nextAddons, addon.label]);
                toast.success(`${addon.label} added!`);
            }
        }
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDrop={handleDrop}
            className="bg-white rounded-2xl border border-slate-150 p-4 space-y-4 animate-fade-in shadow-inner w-full relative"
        >
            {/* Header Row */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 select-none">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                    <PieChart size={14} className="text-purple-600 animate-pulse" /> Addons Window
                </span>
                <button
                    type="button"
                    onClick={() => setActiveFooterTab(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Dropped Addons list */}
            <div className="flex flex-wrap items-center gap-4 py-3 min-h-[85px] border border-dashed border-slate-200 rounded-xl bg-slate-50/50 px-3.5 relative">
                {currentAddons.length > 0 ? (
                    currentAddons.map((addonLabel) => {
                        const addonObj = addonsList.find(a => a.label === addonLabel) || { icon: HelpCircle };
                        const IconComponent = addonObj.icon;
                        const isSyncing = (element.appliedToAllAddons || []).includes(addonLabel);
                        return (
                            <div key={addonLabel} className="flex flex-col items-center gap-1.5 shrink-0 animate-fade-in">
                                {/* Addon Card/Badge */}
                                <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 shadow-sm hover:border-purple-400 transition-all text-xs font-bold text-slate-700 min-w-[140px]">
                                    <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                        <IconComponent size={14} />
                                    </div>
                                    <span className="truncate max-w-[80px]">{addonLabel}</span>

                                    {/* Cancel Cross inside the card */}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAddon(addonLabel)}
                                        className="absolute right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all"
                                        title="Remove Addon"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                {/* Apply to all button under each card */}
                                <button
                                    type="button"
                                    onClick={() => onApplyAddonToAll(addonLabel, !isSyncing)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border w-full text-center ${isSyncing
                                        ? 'bg-purple-100 border-purple-200 text-purple-700 font-extrabold shadow-sm'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                        }`}
                                >
                                    {isSyncing ? 'Applied to all' : 'Apply to all'}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <span className="text-xs text-slate-400 font-semibold italic mx-auto select-none py-4">
                        Drag and drop Addons here to activate them
                    </span>
                )}
            </div>
        </div>
    );
};

export default AssistiveDrawer;
