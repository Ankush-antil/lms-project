import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, FileText, Plus, Save, Trash, Search,
    Share2, Eye, EyeOff, BookOpen, Clock, PenTool
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getTodayDdMmYyyy } from '../../../utils/dateUtils';

const NotesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Parse inbox and date parameters
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();

    // States
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [shareWithTeacher, setShareWithTeacher] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch notes
    const fetchNotes = async () => {
        try {
            setLoading(true);
            const url = inboxParam ? `/api/notes?inboxId=${encodeURIComponent(inboxParam)}` : '/api/notes';
            const { data } = await axios.get(url);
            setNotes(data);

            // Auto select the first note if available
            if (data.length > 0 && !selectedNote) {
                handleSelectNote(data[0]);
            }
        } catch (err) {
            console.error("Error fetching notes:", err);
            toast.error("Failed to load notes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [inboxParam]);

    // Handle note selection
    const handleSelectNote = (note) => {
        setSelectedNote(note);
        setTitle(note.title);
        setContent(note.content);
        setShareWithTeacher(note.shareWithTeacher);
    };

    // Initialize clean state for a new note
    const handleNewNote = () => {
        setSelectedNote(null);
        setTitle('');
        setContent('');
        setShareWithTeacher(false);
    };

    // Save Note (Create or Update)
    const handleSaveNote = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Please enter a note title");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                id: selectedNote?._id,
                title: title.trim(),
                content: content.trim(),
                inboxId: inboxParam || '',
                shareWithTeacher
            };

            const { data } = await axios.post('/api/notes', payload);

            toast.success(selectedNote ? "Note updated successfully!" : "Note saved successfully!");

            // Refresh list
            const url = inboxParam ? `/api/notes?inboxId=${encodeURIComponent(inboxParam)}` : '/api/notes';
            const res = await axios.get(url);
            setNotes(res.data);

            // Set currently saved note as selected
            const savedNote = res.data.find(n => n._id === data._id);
            if (savedNote) {
                setSelectedNote(savedNote);
            }
        } catch (err) {
            console.error("Error saving note:", err);
            toast.error("Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    // Delete Note
    const handleDeleteNote = async (id) => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        try {
            await axios.delete(`/api/notes/${id}`);
            toast.success("Note deleted successfully");

            const updatedNotes = notes.filter(n => n._id !== id);
            setNotes(updatedNotes);

            if (updatedNotes.length > 0) {
                handleSelectNote(updatedNotes[0]);
            } else {
                handleNewNote();
            }
        } catch (err) {
            console.error("Error deleting note:", err);
            toast.error("Failed to delete note");
        }
    };

    // Filter notes based on search query
    const filteredNotes = useMemo(() => {
        return notes.filter(note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [notes, searchQuery]);

    // Back navigation helper
    const handleBack = () => {
        if (inboxParam) {
            navigate(`/student/tests?tab=practice`);
        } else {
            navigate(`/student/practice-tools?date=${dateParam || todayDdMmYyyy}`);
        }
    };

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50/50 rounded-3xl border border-slate-200 overflow-hidden font-sans">

                {/* Header Navbar */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
                            title="Back"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <PenTool size={18} />
                            </div>
                            <div>
                                <h1 className="text-md font-extrabold text-slate-800 tracking-tight">Notes Writing</h1>
                                {inboxParam && (
                                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
                                        Linked to: {inboxParam}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNewNote}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={14} />
                        <span>New Note</span>
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Note List */}
                    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/10">
                            {loading && notes.length === 0 ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                                    ))}
                                </div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                                    {searchQuery ? "No matching notes found." : "No notes written yet."}
                                </div>
                            ) : (
                                filteredNotes.map(note => {
                                    const isActive = selectedNote?._id === note._id;
                                    const snippet = note.content ? (note.content.length > 60 ? `${note.content.substring(0, 60)}...` : note.content) : 'No content...';
                                    return (
                                        <div
                                            key={note._id}
                                            onClick={() => handleSelectNote(note)}
                                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 relative group ${isActive
                                                ? 'border-indigo-500 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-500/10'
                                                : 'border-slate-100 bg-white hover:border-indigo-500/40 hover:bg-slate-50/30'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className={`font-bold text-xs truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                    {note.title}
                                                </h3>
                                                {note.shareWithTeacher ? (
                                                    <span className="shrink-0 text-emerald-600 bg-emerald-50 p-1 rounded-lg" title="Shared with Teacher">
                                                        <Eye size={10} />
                                                    </span>
                                                ) : (
                                                    <span className="shrink-0 text-slate-400 bg-slate-50 p-1 rounded-lg" title="Private">
                                                        <EyeOff size={10} />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                                {snippet}
                                            </p>
                                            <div className="flex items-center gap-1 text-[9px] text-slate-450 font-bold uppercase tracking-wider pt-1.5 border-t border-slate-100/50">
                                                <Clock size={10} />
                                                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </aside>

                    {/* Right Pane - Workspace Editor */}
                    <main className="flex-1 bg-white flex flex-col overflow-hidden">
                        <form onSubmit={handleSaveNote} className="h-full flex flex-col">
                            {/* Editor Toolbar / Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
                                {/* Share Toggle Switch */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Share2 size={14} className={shareWithTeacher ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span className="text-xs font-semibold text-slate-655">Share with Instructor</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shareWithTeacher}
                                            onChange={(e) => setShareWithTeacher(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedNote && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteNote(selectedNote._id)}
                                            className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                                            title="Delete Note"
                                        >
                                            <Trash size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-40 flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <Save size={14} />
                                        <span>{saving ? 'Saving...' : 'Save Note'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Editor Workspace */}
                            <div className="flex-1 p-8 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                                {/* Title Input */}
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Note Title..."
                                    className="w-full text-2xl font-black text-slate-800 placeholder-slate-300 border-none outline-none focus:ring-0 p-0"
                                />

                                {/* Content Textarea */}
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your notes here..."
                                    className="flex-1 w-full text-sm text-slate-655 placeholder-slate-400 border-none outline-none focus:ring-0 resize-none p-0 leading-relaxed font-sans"
                                />
                            </div>
                        </form>
                    </main>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 4px; }
            `}</style>
        </DashboardLayout>
    );
};

export default NotesPage;
