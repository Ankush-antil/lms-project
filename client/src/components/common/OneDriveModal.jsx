import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Folder, File, ArrowLeft, Download, Loader2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─── AZURE CONFIG ─────────────────────────────────────────────────────────────
// Register at https://portal.azure.com → Azure AD → App Registrations
// Redirect URI: http://localhost:5173 (type: Single-page application)
// Permissions: Files.ReadWrite, User.Read
// Then add to .env: VITE_AZURE_CLIENT_ID=your-client-id-here
const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || 'YOUR_AZURE_CLIENT_ID';
const MSAL_CDN = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
const GRAPH_SCOPES = ['Files.ReadWrite', 'User.Read'];
const LS_TOKEN = 'lms_onedrive_token';
const LS_USER  = 'lms_onedrive_user';

const OneDriveModal = ({ isOpen, onClose, currentParentId, onSaveSuccess, inline = false }) => {
    const [step, setStep] = useState(1);
    const [msalReady, setMsalReady] = useState(false);
    const msalRef = useRef(null);
    const [account, setAccount] = useState(null);
    const [accessToken, setAccessToken] = useState('');
    const [files, setFiles] = useState([]);
    const [navStack, setNavStack] = useState([{ id: 'root', name: 'OneDrive' }]);
    const [loading, setLoading] = useState(false);
    const [importingId, setImportingId] = useState('');
    const [importedIds, setImportedIds] = useState(new Set());

    // Load MSAL SDK
    useEffect(() => {
        const initMsal = async () => {
            if (!window.msal) return;
            try {
                const instance = new window.msal.PublicClientApplication({
                    auth: {
                        clientId: AZURE_CLIENT_ID,
                        authority: 'https://login.microsoftonline.com/common',
                        redirectUri: window.location.origin,
                    },
                    cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
                });
                await instance.initialize();
                msalRef.current = instance;
                setMsalReady(true);
            } catch (e) { console.error('MSAL init failed:', e); }
        };

        const id = 'msal-browser-sdk';
        if (document.getElementById(id)) {
            if (window.msal) initMsal();
            else document.getElementById(id).addEventListener('load', initMsal);
        } else {
            const script = document.createElement('script');
            script.id = id; script.src = MSAL_CDN; script.async = true;
            script.onload = initMsal;
            document.body.appendChild(script);
        }
    }, []);

    // Auto-restore session
    useEffect(() => {
        if (!isOpen || !msalReady) return;
        const tok = localStorage.getItem(LS_TOKEN);
        const usr = localStorage.getItem(LS_USER);
        if (tok && usr) {
            try {
                setAccount(JSON.parse(usr));
                setAccessToken(tok);
                setStep(2);
                loadFolder('root', tok);
            } catch { clearAuth(); }
        }
    }, [isOpen, msalReady]);

    const clearAuth = () => {
        localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER);
        setAccount(null); setAccessToken(''); setFiles([]); setStep(1);
        setNavStack([{ id: 'root', name: 'OneDrive' }]);
        if (msalRef.current) msalRef.current.clearCache();
    };

    const handleSignIn = async () => {
        if (!msalReady || !msalRef.current) { toast.error('Microsoft SDK loading...'); return; }
        if (AZURE_CLIENT_ID === 'YOUR_AZURE_CLIENT_ID') {
            toast.error('Add VITE_AZURE_CLIENT_ID to your .env file first.'); return;
        }
        try {
            const loginResp = await msalRef.current.loginPopup({ scopes: GRAPH_SCOPES, prompt: 'select_account' });
            const tokenResp = await msalRef.current.acquireTokenSilent({ scopes: GRAPH_SCOPES, account: loginResp.account });
            const userInfo = { name: loginResp.account.name, email: loginResp.account.username };
            setAccount(userInfo); setAccessToken(tokenResp.accessToken);
            localStorage.setItem(LS_TOKEN, tokenResp.accessToken);
            localStorage.setItem(LS_USER, JSON.stringify(userInfo));
            setStep(2); loadFolder('root', tokenResp.accessToken);
        } catch (err) { console.error('OneDrive login:', err); toast.error('Microsoft sign-in failed.'); }
    };

    const loadFolder = async (folderId, token) => {
        setLoading(true); setFiles([]);
        try {
            const base = folderId === 'root'
                ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
                : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
            const res = await fetch(`${base}?$select=id,name,file,folder,size,createdDateTime,webUrl&$top=200`, {
                headers: { Authorization: `Bearer ${token || accessToken}` }
            });
            if (!res.ok) { if (res.status === 401 || res.status === 403) { clearAuth(); return; } throw new Error(`Graph API ${res.status}`); }
            const data = await res.json();
            const sorted = (data.value || []).sort((a, b) => {
                if (a.folder && !b.folder) return -1; if (!a.folder && b.folder) return 1;
                return a.name.localeCompare(b.name);
            });
            setFiles(sorted);
        } catch (err) { toast.error(err.message || 'Failed to load files.'); }
        finally { setLoading(false); }
    };

    const openFolder = (folder) => {
        setNavStack(s => [...s, { id: folder.id, name: folder.name }]);
        loadFolder(folder.id);
    };

    const goTo = (item, idx) => {
        setNavStack(s => s.slice(0, idx + 1));
        loadFolder(item.id);
    };

    const handleImport = async (file) => {
        setImportingId(file.id);
        const toastId = toast.loading(`Importing "${file.name}"...`);
        try {
            const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!res.ok) throw new Error(`Download failed (${res.status})`);
            const blob = await res.blob();
            const fd = new FormData();
            fd.append('file', blob, file.name);
            if (currentParentId) fd.append('parentId', currentParentId);
            await axios.post('/api/drive/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`"${file.name}" imported!`, { id: toastId });
            setImportedIds(prev => new Set([...prev, file.id]));
            if (onSaveSuccess) onSaveSuccess();
        } catch (err) { toast.error(err.message || 'Import failed.', { id: toastId }); }
        finally { setImportingId(''); }
    };

    const fmtSize = (b) => {
        if (!b) return '';
        if (b < 1024) return `${b} B`;
        if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
        return `${(b/1048576).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    const cardContent = (
        <div className={inline
            ? 'bg-white rounded-3xl shadow-sm border border-slate-100 w-full overflow-hidden flex flex-col font-sans'
            : 'bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans'
        }>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
                        <path fill="#0078D4" d="M28.6 18.8c1.3-.7 2.8-1.1 4.4-1.1 5.3 0 9.6 4.3 9.6 9.6 0 .3 0 .7-.1 1H43c2.2 0 4 1.8 4 4s-1.8 4-4 4H15c-3.3 0-6-2.7-6-6 0-3 2.2-5.5 5-5.9v-.1c0-5.5 4.5-10 10-10 1.9 0 3.6.5 5.1 1.4z"/>
                        <path fill="#28A8E0" d="M14.2 22.4C11.8 22.9 10 25.1 10 27.7c0 3 2.5 5.5 5.6 5.5H28c.7-1.1 1-2.4 1-3.7 0-4.4-3.8-7.9-8.3-7.7-.8-1.7-2.1-3-3.8-3.8-1-.5-2.1-.7-3.2-.6z"/>
                    </svg>
                    <div>
                        <span className="font-extrabold text-slate-800 text-sm block">OneDrive Storage</span>
                        {account && <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Connected: {account.email}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {step === 2 && (
                        <button onClick={clearAuth} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all flex items-center gap-1 text-[10px] font-black uppercase border border-transparent hover:border-red-200">
                            <LogOut size={13}/><span className="hidden sm:inline">Disconnect</span>
                        </button>
                    )}
                    {!inline && <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                {step === 1 && (
                    <div className="space-y-6 py-6 text-center max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                            <svg className="w-9 h-9" viewBox="0 0 48 48">
                                <path fill="#0078D4" d="M28.6 18.8c1.3-.7 2.8-1.1 4.4-1.1 5.3 0 9.6 4.3 9.6 9.6 0 .3 0 .7-.1 1H43c2.2 0 4 1.8 4 4s-1.8 4-4 4H15c-3.3 0-6-2.7-6-6 0-3 2.2-5.5 5-5.9v-.1c0-5.5 4.5-10 10-10 1.9 0 3.6.5 5.1 1.4z"/>
                                <path fill="#28A8E0" d="M14.2 22.4C11.8 22.9 10 25.1 10 27.7c0 3 2.5 5.5 5.6 5.5H28c.7-1.1 1-2.4 1-3.7 0-4.4-3.8-7.9-8.3-7.7-.8-1.7-2.1-3-3.8-3.8-1-.5-2.1-.7-3.2-.6z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Sign in with Microsoft</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Browse and import OneDrive files into LMS Drive.</p>
                        </div>
                        {AZURE_CLIENT_ID === 'YOUR_AZURE_CLIENT_ID' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left">
                                <p className="text-xs font-bold text-amber-700">⚙️ Azure Setup Required</p>
                                <p className="text-[11px] text-amber-600 mt-1">Add <code className="bg-amber-100 px-1 rounded">VITE_AZURE_CLIENT_ID=your-id</code> to <code>.env</code>. Register app at <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline">portal.azure.com</a>.</p>
                            </div>
                        )}
                        <button
                            onClick={handleSignIn}
                            disabled={!msalReady || AZURE_CLIENT_ID === 'YOUR_AZURE_CLIENT_ID'}
                            className="w-full flex items-center justify-center gap-3 p-4 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 21 21"><path fill="#fff" d="M1 1h9v9H1zm10 0h9v9h-9zM1 11h9v9H1zm10 0h9v9h-9z"/></svg>
                            {msalReady ? 'Sign in with Microsoft' : 'Loading SDK...'}
                        </button>
                        <p className="text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-4 text-left">Requires <strong>Files.ReadWrite</strong> and <strong>User.Read</strong> permissions from Microsoft.</p>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-3">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 flex-wrap text-xs">
                            {navStack.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <ChevronRight size={12} className="text-slate-300"/>}
                                    <button onClick={() => goTo(item, idx)} className={`font-bold px-1.5 py-0.5 rounded transition-colors ${idx === navStack.length-1 ? 'text-[#0078D4]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>{item.name}</button>
                                </React.Fragment>
                            ))}
                        </div>
                        {navStack.length > 1 && (
                            <button onClick={() => goTo(navStack[navStack.length-2], navStack.length-2)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                                <ArrowLeft size={13}/> Back
                            </button>
                        )}
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-[#0078D4]"/></div>
                        ) : files.length === 0 ? (
                            <div className="text-center py-12 text-slate-400"><Folder size={36} className="mx-auto mb-2 opacity-40"/><p className="text-xs font-bold">Folder is empty</p></div>
                        ) : (
                            <div className="space-y-0.5">
                                {files.map(item => {
                                    const isFolder = !!item.folder;
                                    const done = importedIds.has(item.id);
                                    return (
                                        <div key={item.id} onClick={() => isFolder && openFolder(item)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all ${isFolder ? 'hover:bg-blue-50 hover:border-blue-100 cursor-pointer' : 'hover:bg-slate-50'}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFolder ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-200'}`}>
                                                {isFolder ? <Folder size={17} className="text-[#0078D4]"/> : <File size={15} className="text-slate-400"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400">{isFolder ? 'Folder' : fmtSize(item.size)}{item.createdDateTime && ` • ${new Date(item.createdDateTime).toLocaleDateString()}`}</p>
                                            </div>
                                            {!isFolder && (
                                                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                    {item.webUrl && <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors" title="Open in OneDrive"><Download size={14}/></a>}
                                                    {done ? (
                                                        <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>Imported
                                                        </span>
                                                    ) : (
                                                        <button disabled={importingId === item.id} onClick={() => handleImport(item)} className="px-2.5 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50">
                                                            {importingId === item.id ? 'Importing...' : 'Import'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{__html:`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fadeIn .25s cubic-bezier(.16,1,.3,1) forwards}`}}/>
        </div>
    );

    if (inline) return cardContent;
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">{cardContent}</div>;
};

export default OneDriveModal;
