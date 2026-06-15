import { Share2, Instagram, Twitter, Facebook, Linkedin, Link2, ExternalLink } from 'lucide-react';

const PLATFORMS = [
    { key: 'instagram',  label: 'Instagram',  icon: Instagram,  color: 'text-pink-500',    bg: 'bg-pink-50',   border: 'border-pink-200',   placeholder: 'https://www.instagram.com/p/...' },
    { key: 'twitter',    label: 'X (Twitter)', icon: Twitter,    color: 'text-sky-500',     bg: 'bg-sky-50',    border: 'border-sky-200',    placeholder: 'https://twitter.com/user/status/...' },
    { key: 'facebook',   label: 'Facebook',   icon: Facebook,   color: 'text-blue-600',    bg: 'bg-blue-50',   border: 'border-blue-200',   placeholder: 'https://www.facebook.com/...' },
    { key: 'linkedin',   label: 'LinkedIn',   icon: Linkedin,   color: 'text-sky-700',     bg: 'bg-sky-50',    border: 'border-sky-200',    placeholder: 'https://www.linkedin.com/posts/...' },
];

const EmbeddedSMBuilder = ({ element, onUpdateField }) => {
    const activePlatform = element.smPlatform || 'instagram';
    const platform = PLATFORMS.find(p => p.key === activePlatform) || PLATFORMS[0];
    const postUrl = element.smPostUrl || '';

    // Build embed iframe/blockquote preview hint (social embeds are client-restricted, so we show a preview card)
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            {/* Platform Selector */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Social Media Platform
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {PLATFORMS.map((p) => {
                        const Icon = p.icon;
                        const isActive = activePlatform === p.key;
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => onUpdateField('smPlatform', p.key)}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                    isActive
                                        ? `${p.bg} ${p.border} ${p.color} shadow-sm`
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="text-[10px] leading-none">{p.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Post URL */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {platform.label} Post URL
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Link2 size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${platform.color}`} />
                        <input
                            type="url"
                            value={postUrl}
                            onChange={(e) => onUpdateField('smPostUrl', e.target.value)}
                            placeholder={platform.placeholder}
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                        />
                    </div>
                    {postUrl && (
                        <a
                            href={postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                        >
                            <ExternalLink size={13} />
                        </a>
                    )}
                </div>
            </div>

            {/* Preview Card */}
            {postUrl ? (
                <div className={`flex items-start gap-3 p-4 ${platform.bg} border ${platform.border} rounded-xl`}>
                    <div className={`p-2 rounded-lg bg-white border ${platform.border} shadow-sm shrink-0`}>
                        <platform.icon size={18} className={platform.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${platform.color} mb-0.5`}>{platform.label} Post</p>
                        <p className="text-xs text-slate-500 font-medium truncate">{postUrl}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Social media posts will be embedded in the student view.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Share2 size={16} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 font-medium">
                        Paste a social media post URL to embed it for students.
                    </span>
                </div>
            )}
        </div>
    );
};

export default EmbeddedSMBuilder;
