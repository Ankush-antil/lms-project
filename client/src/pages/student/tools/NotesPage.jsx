import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, FileText, Plus, Save, Trash, Search,
    Share2, Eye, EyeOff, BookOpen, Clock, PenTool,
    Mic, MicOff, FolderPlus, Folder, Tag, X, Edit2,
    Pin, Bell, UploadCloud, Image as ImageIcon, Sparkles,
    Volume2, CheckSquare, Sparkle, AlertCircle, Paperclip,
    Book, Layers, Bookmark, Tags, ChevronDown, ChevronRight
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getTodayDdMmYyyy } from '../../../utils/dateUtils';
import { useAuth } from '../../../context/AuthContext';

const DEFAULT_NOTEBOOKS = ['Notebook 1'];
const DEFAULT_SECTIONS = ['Section 1'];
const DEFAULT_CATEGORIES = ['Category 1'];

// Web Audio Alarm Tone Synthesizer
const playAlarmSound = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const playTone = (freq, duration, delay) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            }, delay);
        };

        // Alarm Chime Pattern
        playTone(587.33, 0.4, 0);   // D5
        playTone(880, 0.5, 350);    // A5
        playTone(1174.66, 0.7, 750); // D6
    } catch (e) {
        console.error("Audio playback error:", e);
    }
};

const NotesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const getControls = (feature) => {
        const roleProfileMap = {
            Student: user?.studentProfile?.controls,
            Teacher: user?.teacherProfile?.controls,
            Editor: user?.editorProfile?.controls,
            Accountant: user?.accountantProfile?.controls,
            Marketer: user?.marketerProfile?.controls,
            Staff: user?.staffProfile?.controls,
            Parent: user?.parentProfile?.controls,
        };
        const controls = roleProfileMap[user?.role];
        return controls?.[feature];
    };

    const canPerform = (feature, subAction) => {
        if (!user?.role || user?.role === 'Admin') return true;
        const ctrl = getControls(feature);
        if (!ctrl) return true;
        if (ctrl.enabled === false) return false;
        if (subAction && ctrl[subAction] === false) return false;
        return true;
    };

    // Parse inbox, noteId and date parameters
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const noteIdParam = searchParams.get('noteId');
    const todayDdMmYyyy = getTodayDdMmYyyy();

    // States
    const [drafts, setDrafts] = useState(() => {
        const saved = localStorage.getItem('practice_notes_drafts');
        return saved ? JSON.parse(saved) : [];
    });
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [shareWithTeacher, setShareWithTeacher] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notesTab, setNotesTab] = useState('saved'); // 'saved' | 'drafts'

    // Google Keep style expand state & Feature States
    const [isKeepExpanded, setIsKeepExpanded] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [reminderAt, setReminderAt] = useState('');
    const [images, setImages] = useState([]);
    const [attachedFile, setAttachedFile] = useState(null);

    // AI Processing Modal States
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiFile, setAiFile] = useState(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);

    // Reminder Picker Modal States
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderInput, setReminderInput] = useState('');
    const [triggeredReminder, setTriggeredReminder] = useState(null);

    // Tag Category Modal State
    const [isTagCategoryModalOpen, setIsTagCategoryModalOpen] = useState(false);

    // Drill-Down Navigation State (notebooks -> sections -> categories -> notes)
    const [navLevel, setNavLevel] = useState('notebooks');

    // Tier 1: Notebook States
    const [notebooks, setNotebooks] = useState(() => {
        const saved = localStorage.getItem('lms_notebooks');
        return saved ? JSON.parse(saved) : DEFAULT_NOTEBOOKS;
    });
    const [activeNotebook, setActiveNotebook] = useState('Notebook 1');
    const [noteNotebook, setNoteNotebook] = useState('Notebook 1');
    const [isAddNotebookModalOpen, setIsAddNotebookModalOpen] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [editingNotebook, setEditingNotebook] = useState(null);
    const [renameNotebookName, setRenameNotebookName] = useState('');

    // Tier 2: Section States (Notebook-scoped)
    const [sectionsMap, setSectionsMap] = useState(() => {
        const saved = localStorage.getItem('lms_notebook_sections_map');
        return saved ? JSON.parse(saved) : { 'Notebook 1': ['Section 1'] };
    });
    const sections = useMemo(() => {
        return sectionsMap[activeNotebook] || ['Section 1'];
    }, [sectionsMap, activeNotebook]);

    const [activeSection, setActiveSection] = useState('Section 1');
    const [noteSection, setNoteSection] = useState('Section 1');
    const [expandedSection, setExpandedSection] = useState(null);
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSection, setEditingSection] = useState(null);
    const [renameSectionName, setRenameSectionName] = useState('');

    // Tier 3: Category States
    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('lms_notes_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });
    const [activeCategory, setActiveCategory] = useState('All Categories');
    const [noteCategory, setNoteCategory] = useState('Category 1');
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [renameCategoryName, setRenameCategoryName] = useState('');

    // Drill-down Level Click Handlers
    const handleSelectNotebookCard = (nb) => {
        setActiveNotebook(nb);
        setNoteNotebook(nb);
        setNavLevel('sections');
    };

    const handleSelectSectionCard = (sec) => {
        setActiveSection(sec);
        setNoteSection(sec);
        setNavLevel('categories');
    };

    const handleSelectCategoryCard = (cat) => {
        setActiveCategory(cat);
        if (cat !== 'All Categories') {
            setNoteCategory(cat);
        }
        setNavLevel('notes');
    };

    const handleNavBack = () => {
        if (navLevel === 'notes') setNavLevel('categories');
        else if (navLevel === 'categories') setNavLevel('sections');
        else if (navLevel === 'sections') setNavLevel('notebooks');
    };

    // Auto-Save States & Refs
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '' | 'saving' | 'saved'
    const isInitialMount = useRef(true);
    const isSelectingNote = useRef(false);
    const isCreatingNewNote = useRef(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Voice Typing (Speech Recognition) States
    const [isListening, setIsListening] = useState(false);
    const recognition = useMemo(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;
        
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        
        return rec;
    }, []);

    useEffect(() => {
        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [recognition]);

    const toggleListening = () => {
        if (!recognition) {
            toast.error("Voice typing is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            toast.success("Voice typing stopped");
        } else {
            setIsListening(true);
            toast.success("Voice typing started... Speak now!");
            
            recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                setContent(prev => prev + (prev ? ' ' : '') + transcript);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone permission denied.");
                } else {
                    toast.error("Voice typing error: " + event.error);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        }
    };

    // Fetch notes
    const fetchNotes = async () => {
        try {
            setLoading(true);
            const url = inboxParam ? `/api/notes?inboxId=${encodeURIComponent(inboxParam)}` : '/api/notes';
            const { data } = await axios.get(url);
            setNotes(data);

            // Auto select note by noteIdParam or first note if available and not creating a new note
            if (data.length > 0 && !isCreatingNewNote.current) {
                if (noteIdParam) {
                    const target = data.find(n => n._id === noteIdParam);
                    if (target) {
                        handleSelectNote(target);
                    } else {
                        handleSelectNote(data[0]);
                    }
                } else if (!selectedNote) {
                    handleSelectNote(data[0]);
                }
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
    }, [inboxParam, noteIdParam]);

    // Handle note selection
    const handleSelectNote = (note) => {
        isSelectingNote.current = true;
        isCreatingNewNote.current = false;
        setSelectedNote(note);
        setTitle(note.title || '');
        setContent(note.content || '');
        setShareWithTeacher(note.shareWithTeacher || false);
        setNoteNotebook(note.notebook || 'Notebook 1');
        setActiveNotebook(note.notebook || 'Notebook 1');
        setNoteSection(note.section || 'Section 1');
        setActiveSection(note.section || 'Section 1');
        setNoteCategory(note.category || 'Category 1');
        setActiveCategory(note.category || 'All Categories');
        setIsPinned(note.isPinned || false);
        setReminderAt(note.reminderAt || '');
        setImages(note.images || []);
        setAttachedFile(note.attachedFile || null);
        setIsKeepExpanded(true);
        setAutoSaveStatus('');
    };

    // Initialize clean state for a new note
    const handleNewNote = () => {
        isSelectingNote.current = true;
        isCreatingNewNote.current = true;
        setSelectedNote(null);
        setTitle('');
        setContent('');
        setShareWithTeacher(false);
        setNoteNotebook(activeNotebook || 'Notebook 1');
        setNoteSection(activeSection || 'Section 1');
        setNoteCategory(activeCategory !== 'All Categories' ? activeCategory : 'Category 1');
        setIsPinned(false);
        setReminderAt('');
        setImages([]);
        setAttachedFile(null);
        setIsKeepExpanded(true);
        setAutoSaveStatus('');
    };

    // Synced Tier 1-3 Handlers
    const handleSelectNotebook = (nb) => {
        setActiveNotebook(nb);
        setNoteNotebook(nb);
        const nbSections = sectionsMap[nb] || ['Section 1'];
        const firstSec = nbSections[0] || 'Section 1';
        setActiveSection(firstSec);
        setNoteSection(firstSec);
        setActiveCategory('All Categories');
    };

    const handleSelectSection = (sec) => {
        setActiveSection(sec);
        setNoteSection(sec);
        setActiveCategory('All Categories');
        setExpandedSection(prev => prev === sec ? null : sec);
    };

    const handleSelectCategory = (cat) => {
        setActiveCategory(cat);
        if (cat !== 'All Categories') {
            setNoteCategory(cat);
            if (selectedNote && !selectedNote.isDraft) {
                setNotes(prev => prev.map(n => n._id === selectedNote._id ? { ...n, category: cat } : n));
            }
        }
    };

    const handleAddNotebook = (e) => {
        if (e) e.preventDefault();
        const name = newNotebookName.trim();
        if (!name) return;
        if (notebooks.includes(name)) {
            toast.error("Notebook already exists!");
            return;
        }
        const updated = [...notebooks, name];
        setNotebooks(updated);
        localStorage.setItem('lms_notebooks', JSON.stringify(updated));

        // Initialize isolated section list for this specific notebook
        const updatedMap = { ...sectionsMap, [name]: ['Section 1'] };
        setSectionsMap(updatedMap);
        localStorage.setItem('lms_notebook_sections_map', JSON.stringify(updatedMap));

        setActiveNotebook(name);
        setNoteNotebook(name);
        setActiveSection('Section 1');
        setNoteSection('Section 1');
        setNewNotebookName('');
        setIsAddNotebookModalOpen(false);
        toast.success(`Notebook "${name}" created! 📚`);
    };

    const handleAddCategory = (e) => {
        if (e) e.preventDefault();
        const name = newCategoryName.trim();
        if (!name) return;
        if (categories.includes(name)) {
            toast.error("Category already exists!");
            return;
        }
        const updated = [...categories, name];
        setCategories(updated);
        localStorage.setItem('lms_notes_categories', JSON.stringify(updated));
        setActiveCategory(name);
        setNoteCategory(name);
        setNewCategoryName('');
        setIsAddCategoryModalOpen(false);
        toast.success(`Category "${name}" created! 🏷️`);
    };



    // Pin Toggle Handlers
    const togglePinCurrentNote = () => {
        const nextPinned = !isPinned;
        setIsPinned(nextPinned);
        if (selectedNote && !selectedNote.isDraft) {
            setNotes(prev => prev.map(n => n._id === selectedNote._id ? { ...n, isPinned: nextPinned } : n));
        }
        toast.success(nextPinned ? "Note pinned to top 📌" : "Note unpinned");
    };

    const togglePinNote = (noteToPin, e) => {
        if (e) e.stopPropagation();
        const updatedPinned = !noteToPin.isPinned;
        setNotes(prev => prev.map(n => n._id === noteToPin._id ? { ...n, isPinned: updatedPinned } : n));
        if (selectedNote?._id === noteToPin._id) {
            setIsPinned(updatedPinned);
        }
        toast.success(updatedPinned ? "Note pinned to top 📌" : "Note unpinned");
    };

    // Regular Direct File Upload Handler
    const handleDirectFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachedFile({ name: file.name, size: file.size, type: file.type });
        setIsKeepExpanded(true);
        toast.success(`Attached file: ${file.name}`);
    };

    // Image Upload Handler
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            setImages(prev => [...prev, base64]);
            setIsKeepExpanded(true);
            toast.success("Image attached to note!");
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // AI File Processor Handler
    const handleProcessAiFile = async (e) => {
        if (e) e.preventDefault();
        if (!aiFile) {
            toast.error("Please select a file to process");
            return;
        }

        setAiProcessing(true);
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileText = event.target.result;
                const promptText = aiPrompt.trim() || "Summarize file content into key bullet points";

                let generatedContent = `\n\n--- 📄 AI Processed File: ${aiFile.name} ---\n`;
                generatedContent += `**Instruction:** ${promptText}\n\n`;

                if (promptText.toLowerCase().includes('convert') || promptText.toLowerCase().includes('qa') || promptText.toLowerCase().includes('q&a')) {
                    generatedContent += `### Q&A Summary:\n1. What is this document about?\n> ${aiFile.name} - Contains structured technical & operational notes.\n2. Key Highlights:\n> ${typeof fileText === 'string' ? fileText.substring(0, 300) : 'File extracted successfully.'}`;
                } else if (promptText.toLowerCase().includes('translate')) {
                    generatedContent += `### Translated Output:\n${typeof fileText === 'string' ? fileText.substring(0, 500) : 'Translated content ready.'}`;
                } else {
                    generatedContent += `### Key Notes & Bullet Summary:\n• File Name: ${aiFile.name}\n• File Size: ${(aiFile.size / 1024).toFixed(1)} KB\n• Content Snippet:\n${typeof fileText === 'string' ? fileText.substring(0, 400) : 'Extracted data.'}`;
                }

                setContent(prev => (prev ? prev + generatedContent : generatedContent));
                setAttachedFile({ name: aiFile.name, size: aiFile.size, type: aiFile.type });
                setIsKeepExpanded(true);
                setIsAiModalOpen(false);
                setAiFile(null);
                setAiPrompt('');
                toast.success(`AI processed ${aiFile.name} successfully! ✨`);
            };

            if (aiFile.type.includes('text') || aiFile.name.endsWith('.txt') || aiFile.name.endsWith('.json') || aiFile.name.endsWith('.md') || aiFile.name.endsWith('.csv')) {
                reader.readAsText(aiFile);
            } else {
                reader.readAsDataURL(aiFile);
            }
        } catch (err) {
            console.error("AI File error:", err);
            toast.error("Failed to process file with AI");
        } finally {
            setAiProcessing(false);
        }
    };

    // Save Reminder Handler
    const handleSaveReminder = (e) => {
        if (e) e.preventDefault();
        if (!reminderInput) {
            toast.error("Please select date and time for reminder");
            return;
        }

        const selectedTime = new Date(reminderInput).getTime();
        if (selectedTime <= Date.now()) {
            toast.error("Please select a future date and time for the reminder");
            return;
        }

        setReminderAt(reminderInput);
        setIsReminderModalOpen(false);
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        toast.success(`Reminder set for ${new Date(reminderInput).toLocaleString()} ⏰`);
    };

    // Auto-Save Effect on typing / section / notebook / category change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (isSelectingNote.current) {
            isSelectingNote.current = false;
            return;
        }

        if (!title.trim() && !content.trim() && images.length === 0 && !attachedFile) return;

        setAutoSaveStatus('saving');
        const timer = setTimeout(async () => {
            try {
                const payload = {
                    id: selectedNote && !selectedNote.isDraft ? selectedNote._id : undefined,
                    title: title.trim() || 'Untitled Note',
                    content: content.trim(),
                    inboxId: inboxParam || '',
                    shareWithTeacher,
                    notebook: noteNotebook || 'My Notebook',
                    section: noteSection || 'General',
                    category: noteCategory || 'General',
                    isPinned,
                    reminderAt,
                    images,
                    attachedFile
                };

                const { data } = await axios.post('/api/notes', payload);

                setNotes(prev => {
                    const exists = prev.some(n => n._id === data._id);
                    if (exists) {
                        return prev.map(n => n._id === data._id ? data : n);
                    } else {
                        return [data, ...prev];
                    }
                });

                if (!selectedNote || selectedNote._id !== data._id) {
                    setSelectedNote(data);
                }

                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(''), 2500);
            } catch (err) {
                console.error("Auto-save error:", err);
                setAutoSaveStatus('');
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [title, content, noteNotebook, noteSection, noteCategory, shareWithTeacher, isPinned, reminderAt, images, attachedFile]);

    // Section Handlers (Notebook-scoped)
    const handleAddSection = (e) => {
        e.preventDefault();
        const name = newSectionName.trim();
        if (!name) return;
        const currentSections = sectionsMap[activeNotebook] || ['General'];
        if (currentSections.includes(name)) {
            toast.error("Section already exists in this notebook!");
            return;
        }
        const updated = [...currentSections, name];
        const updatedMap = { ...sectionsMap, [activeNotebook]: updated };
        setSectionsMap(updatedMap);
        localStorage.setItem('lms_notebook_sections_map', JSON.stringify(updatedMap));

        setActiveSection(name);
        setNoteSection(name);
        setNewSectionName('');
        setIsAddSectionModalOpen(false);
        toast.success(`Section "${name}" created under ${activeNotebook}! 📂`);
    };

    const handleRenameSection = (e) => {
        e.preventDefault();
        const newName = renameSectionName.trim();
        if (!newName || !editingSection) return;
        if (newName === editingSection) {
            setEditingSection(null);
            return;
        }
        const currentSections = sectionsMap[activeNotebook] || ['General'];
        if (currentSections.includes(newName)) {
            toast.error("A section with this name already exists in this notebook!");
            return;
        }

        const updatedSections = currentSections.map(s => s === editingSection ? newName : s);
        const updatedMap = { ...sectionsMap, [activeNotebook]: updatedSections };
        setSectionsMap(updatedMap);
        localStorage.setItem('lms_notebook_sections_map', JSON.stringify(updatedMap));

        if (activeSection === editingSection) setActiveSection(newName);
        if (noteSection === editingSection) setNoteSection(newName);

        setNotes(prev => prev.map(n => {
            const matchesNb = (n.notebook || 'General') === activeNotebook;
            const matchesSec = (n.section || 'General') === editingSection;
            return (matchesNb && matchesSec) ? { ...n, section: newName } : n;
        }));

        setEditingSection(null);
        setRenameSectionName('');
        toast.success("Section renamed successfully!");
    };

    // Notebook Rename & Cascading Delete Handlers
    const handleRenameNotebook = (e) => {
        if (e) e.preventDefault();
        const newName = renameNotebookName.trim();
        if (!newName || !editingNotebook) return;
        if (newName === editingNotebook) {
            setEditingNotebook(null);
            return;
        }
        if (notebooks.includes(newName)) {
            toast.error("A notebook with this name already exists!");
            return;
        }

        const updated = notebooks.map(nb => nb === editingNotebook ? newName : nb);
        setNotebooks(updated);
        localStorage.setItem('lms_notebooks', JSON.stringify(updated));

        // Update sections map key
        setSectionsMap(prev => {
            const copy = { ...prev };
            if (copy[editingNotebook]) {
                copy[newName] = copy[editingNotebook];
                delete copy[editingNotebook];
            }
            localStorage.setItem('lms_notebook_sections_map', JSON.stringify(copy));
            return copy;
        });

        if (activeNotebook === editingNotebook) setActiveNotebook(newName);
        if (noteNotebook === editingNotebook) setNoteNotebook(newName);

        setNotes(prev => prev.map(n => ((n.notebook || 'General') === editingNotebook ? { ...n, notebook: newName } : n)));
        setEditingNotebook(null);
        setRenameNotebookName('');
        toast.success("Notebook renamed successfully! 📖");
    };

    const handleDeleteNotebook = async (nbToDelete, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete notebook "${nbToDelete}"? All sections and notes inside it will be permanently deleted!`)) return;

        // 1. Remove Notebook
        const updatedNb = notebooks.filter(nb => nb !== nbToDelete);
        setNotebooks(updatedNb);
        localStorage.setItem('lms_notebooks', JSON.stringify(updatedNb));

        // 2. Remove Sections Map entry
        setSectionsMap(prev => {
            const copy = { ...prev };
            delete copy[nbToDelete];
            localStorage.setItem('lms_notebook_sections_map', JSON.stringify(copy));
            return copy;
        });

        // 3. Delete matching notes from frontend state
        setNotes(prev => prev.filter(n => (n.notebook || 'General') !== nbToDelete));

        // 4. Delete matching notes from Database (backend endpoint)
        try {
            await axios.delete(`/api/notes/notebook/${encodeURIComponent(nbToDelete)}`);
        } catch (err) {
            console.error("Error deleting notebook notes on server:", err);
        }

        const nextNb = updatedNb[0] || 'General';
        setActiveNotebook(nextNb);
        setNoteNotebook(nextNb);
        setActiveSection('General');
        setNoteSection('General');

        toast.success(`Notebook "${nbToDelete}" and all its sections & notes deleted! 🗑️`);
    };

    const handleDeleteSection = (secToDelete, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete section "${secToDelete}" from ${activeNotebook}?`)) return;
        const currentSections = sectionsMap[activeNotebook] || ['General'];
        const updated = currentSections.filter(s => s !== secToDelete);
        const updatedMap = { ...sectionsMap, [activeNotebook]: updated };
        setSectionsMap(updatedMap);
        localStorage.setItem('lms_notebook_sections_map', JSON.stringify(updatedMap));

        const nextSec = updated[0] || 'General';
        if (activeSection === secToDelete) setActiveSection(nextSec);
        if (noteSection === secToDelete) setNoteSection(nextSec);
        toast.success(`Section "${secToDelete}" deleted`);
    };

    // Category Rename & Delete Handlers
    const handleRenameCategory = (e) => {
        if (e) e.preventDefault();
        const newName = renameCategoryName.trim();
        if (!newName || !editingCategory) return;
        if (newName === editingCategory) {
            setEditingCategory(null);
            return;
        }
        if (categories.includes(newName)) {
            toast.error("A category with this name already exists!");
            return;
        }

        const updated = categories.map(c => c === editingCategory ? newName : c);
        setCategories(updated);
        localStorage.setItem('lms_notes_categories', JSON.stringify(updated));

        if (activeCategory === editingCategory) setActiveCategory(newName);
        if (noteCategory === editingCategory) setNoteCategory(newName);

        setNotes(prev => prev.map(n => ((n.category || 'General') === editingCategory ? { ...n, category: newName } : n)));
        setEditingCategory(null);
        setRenameCategoryName('');
        toast.success("Category renamed successfully! 🏷️");
    };

    const handleDeleteCategory = (catToDelete, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete category "${catToDelete}"?`)) return;
        const updated = categories.filter(c => c !== catToDelete);
        setCategories(updated);
        localStorage.setItem('lms_notes_categories', JSON.stringify(updated));
        if (activeCategory === catToDelete) setActiveCategory('All Categories');
        if (noteCategory === catToDelete) setNoteCategory(updated[0] || 'General');
        toast.success(`Category "${catToDelete}" deleted`);
    };

    // Save Note (Create or Update)
    const handleSaveNote = async (e) => {
        if (e) e.preventDefault();
        if (!canPerform('notes', 'createNotes')) {
            return toast.error("You do not have permission to create or edit notes");
        }
        if (!title.trim()) {
            toast.error("Please enter a note title");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                id: selectedNote && !selectedNote.isDraft ? selectedNote._id : undefined,
                title: title.trim(),
                content: content.trim(),
                inboxId: inboxParam || '',
                shareWithTeacher,
                section: noteSection || 'General'
            };

            const { data } = await axios.post('/api/notes', payload);

            toast.success(selectedNote && !selectedNote.isDraft ? "Note updated successfully!" : "Note saved successfully!");
            setNotesTab('saved');

            // If it was a draft, remove it from drafts
            if (selectedNote?.isDraft) {
                setDrafts(prev => {
                    const updated = prev.filter(d => d.id !== selectedNote.id);
                    localStorage.setItem('practice_notes_drafts', JSON.stringify(updated));
                    return updated;
                });
            }

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

    // Save Note as Draft Locally
    const handleSaveDraft = (e) => {
        if (e) e.preventDefault();
        if (!canPerform('notes', 'createNotes')) {
            return toast.error("You do not have permission to create drafts");
        }
        if (!title.trim()) {
            toast.error("Please enter a note title");
            return;
        }

        const draftId = selectedNote?.isDraft ? selectedNote.id : 'draft_note_' + Date.now();
        const newDraft = {
            id: draftId,
            title: title.trim(),
            content: content.trim(),
            shareWithTeacher,
            section: noteSection || 'General',
            isDraft: true,
            createdAt: new Date().toISOString()
        };

        setDrafts(prev => {
            const updated = prev.some(d => d.id === draftId)
                ? prev.map(d => d.id === draftId ? newDraft : d)
                : [newDraft, ...prev];
            localStorage.setItem('practice_notes_drafts', JSON.stringify(updated));
            return updated;
        });

        setSelectedNote(newDraft);
        setNotesTab('drafts');
        toast.success("Note saved as draft locally!");
    };

    // Delete Note
    const handleDeleteNote = async (id) => {
        if (!canPerform('notes', 'deleteNotes')) {
            return toast.error("You do not have permission to delete notes");
        }
        if (!id) return;
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        if (selectedNote?.isDraft) {
            setDrafts(prev => {
                const updated = prev.filter(d => d.id !== selectedNote.id);
                localStorage.setItem('practice_notes_drafts', JSON.stringify(updated));
                return updated;
            });
            toast.success("Draft deleted successfully");
            handleNewNote();
            return;
        }

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

    // Filter notes based on 3-Tier hierarchy (Notebook -> Section -> Category)
    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = !searchQuery.trim() || 
                (note.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const noteNb = note.notebook || 'Notebook 1';
            const matchesNotebook = activeNotebook === 'All' || noteNb === activeNotebook || noteNb === 'General' || noteNb === 'My Notebook';

            const noteSec = note.section || 'Section 1';
            const matchesSection = activeSection === 'All' || noteSec === activeSection || noteSec === 'General';

            const noteCat = note.category || 'Category 1';
            const matchesCategory = activeCategory === 'All Categories' || noteCat.trim().toLowerCase() === activeCategory.trim().toLowerCase() || noteCat === 'General';

            return matchesSearch && matchesNotebook && matchesSection && matchesCategory;
        });
    }, [notes, searchQuery, activeNotebook, activeSection, activeCategory]);

    // Filter drafts based on search query and section
    const filteredDrafts = useMemo(() => {
        return drafts.filter(draft => {
            const matchesSearch = draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                draft.content.toLowerCase().includes(searchQuery.toLowerCase());
            const draftSec = draft.section || 'Section 1';
            const matchesSection = activeSection === 'All' || draftSec === activeSection;
            return matchesSearch && matchesSection;
        });
    }, [drafts, searchQuery, activeSection]);

    // Back navigation helper
    const handleBack = () => {
        if (inboxParam) {
            navigate(`/student/tests?tab=practice`);
        } else {
            const rolePath = user?.role && user.role !== 'Student'
                ? `/${user.role.toLowerCase()}/tools`
                : '/student/practice-tools';
            navigate(rolePath);
        }
    };

    return (
        <DashboardLayout role={user?.role || 'Student'} fullWidth={true}>
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

                    <div className="flex items-center gap-3">
                        {/* New Note Button */}
                        {canPerform('notes', 'newNote') && (
                            <button
                                type="button"
                                onClick={handleNewNote}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>New Note</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Search + Horizontal Notebooks Scrollbar + Vertical Sections + Category Pills */}
                    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden text-left">
                        {/* Search Bar at Top */}
                        <div className="p-3 border-b border-slate-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-medium"
                                />
                            </div>
                        </div>

                        {/* Horizontal Scroll Bar for NOTEBOOKS right below Search Bar */}
                        <div className="p-3 bg-indigo-50/40 border-b border-indigo-100/60 shrink-0 space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                                    <Book size={13} className="text-indigo-600" /> Notebooks ({notebooks.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsAddNotebookModalOpen(true)}
                                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs cursor-pointer"
                                    title="Create New Notebook"
                                >
                                    <Plus size={11} /> New Notebook
                                </button>
                            </div>

                            {/* Horizontal Scrollable Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
                                {notebooks.map(nb => {
                                    const isActive = activeNotebook === nb;
                                    const count = (sectionsMap[nb] || []).length;
                                    return (
                                        <div key={nb} className="relative group/nb flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectNotebook(nb)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-extrabold'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                                }`}
                                            >
                                                <Book size={12} className={isActive ? 'text-white' : 'text-indigo-600'} />
                                                <span className="max-w-[100px] truncate">{nb}</span>
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    {count}
                                                </span>
                                            </button>
                                            {/* Hover Actions */}
                                            <div className="hidden group-hover/nb:flex items-center gap-0.5 absolute -top-2 -right-1 bg-white border border-slate-200 rounded-lg shadow-md p-0.5 z-10">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingNotebook(nb);
                                                        setRenameNotebookName(nb);
                                                    }}
                                                    className="p-0.5 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                                    title="Rename Notebook"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteNotebook(nb, e)}
                                                    className="p-0.5 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                                                    title="Delete Notebook"
                                                >
                                                    <Trash size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col divide-y divide-slate-100">
                            {/* Vertical SECTIONS Navigation List for Active Notebook */}
                            <div className="p-3 space-y-1.5 shrink-0 bg-slate-50/40">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Folder size={12} className="text-indigo-600" /> Sections ({sections.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddSectionModalOpen(true)}
                                        className="text-[10px] font-extrabold text-indigo-650 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                                        title="Create New Section"
                                    >
                                        <Plus size={11} /> Add Section
                                    </button>
                                </div>

                                {/* Vertical list of sections */}
                                <div className="space-y-1 mt-1">
                                    {sections.map(sec => {
                                        const isActive = activeSection === sec;
                                        const isExpanded = expandedSection === sec;
                                        const count = notes.filter(n => (n.notebook || 'General') === activeNotebook && (n.section || 'General') === sec).length;
                                        return (
                                            <div key={sec} className="space-y-1.5">
                                                <div className="group/item flex items-center justify-between w-full">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectSection(sec)}
                                                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                                                                : 'text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate pr-1">
                                                            <Folder size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                            <span className="truncate">{sec}</span>
                                                            {isExpanded ? <ChevronDown size={12} className="ml-1 text-amber-300 shrink-0" /> : <ChevronRight size={12} className="ml-1 opacity-50 shrink-0" />}
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-150 text-slate-600'}`}>
                                                            {count}
                                                        </span>
                                                    </button>
                                                    <div className="hidden group-hover/item:flex items-center gap-0.5 ml-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingSection(sec);
                                                                setRenameSectionName(sec);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
                                                            title={`Rename ${sec} Section`}
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteSection(sec, e)}
                                                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                                                            title={`Delete ${sec} Section`}
                                                        >
                                                            <Trash size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* CATEGORIES Filter Pills - ONLY RENDERED WHEN THIS SECTION IS CLICKED */}
                                                {isExpanded && (
                                                    <div className="pl-3 py-2 bg-amber-50/50 border-l-2 border-amber-400 space-y-2 rounded-r-xl my-1 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between pr-2">
                                                            <span className="text-[9px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-1">
                                                                <Tags size={11} className="text-amber-600" /> {sec} Categories
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsAddCategoryModalOpen(true)}
                                                                className="text-[9px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-1.5 py-0.5 rounded-md transition-all cursor-pointer"
                                                            >
                                                                + Add Category
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 pr-1">
                                                            {['All Categories', ...categories].map(cat => {
                                                                const isCatActive = activeCategory === cat;
                                                                const isAll = cat === 'All Categories';
                                                                return (
                                                                    <div key={cat} className="relative group/cat">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectCategory(cat)}
                                                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                                                                isCatActive
                                                                                    ? 'bg-amber-500 text-white font-black'
                                                                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-100/60'
                                                                            }`}
                                                                        >
                                                                            {cat}
                                                                        </button>
                                                                        {!isAll && (
                                                                            <div className="hidden group-hover/cat:flex items-center gap-0.5 absolute -top-2 -right-1 bg-white border border-slate-200 rounded shadow p-0.5 z-10">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setEditingCategory(cat);
                                                                                        setRenameCategoryName(cat);
                                                                                    }}
                                                                                    className="p-0.5 text-slate-500 hover:text-amber-600 rounded cursor-pointer"
                                                                                >
                                                                                    <Edit2 size={8} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => handleDeleteCategory(cat, e)}
                                                                                    className="p-0.5 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                                                                                >
                                                                                    <Trash size={8} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Note Cards List */}
                            <div className="p-3 space-y-3">
                                {filteredNotes.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-xs font-medium">
                                        No notes found in {activeSection}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <h4 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                            <span>Notes ({activeSection})</span>
                                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[9px] font-bold">
                                                {filteredNotes.length}
                                            </span>
                                        </h4>
                                        {filteredNotes.map(note => {
                                            const isActive = selectedNote && !selectedNote.isDraft && selectedNote._id === note._id;
                                            const snippet = note.content ? (note.content.length > 35 ? `${note.content.substring(0, 35)}...` : note.content) : 'No content...';
                                            return (
                                                <div
                                                    key={note._id}
                                                    onClick={() => handleSelectNote(note)}
                                                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-left space-y-1.5 relative group ${isActive
                                                        ? 'border-indigo-500 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-500/10'
                                                        : 'border-slate-100 bg-white hover:border-indigo-500/40 hover:bg-slate-50/30'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className={`font-bold text-xs truncate flex-1 ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {note.title || 'Untitled Note'}
                                                        </h3>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {note.isPinned && <Pin size={11} className="fill-amber-500 text-amber-600" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 truncate">{snippet}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Right Pane - Workspace Editor */}
                    <main className="flex-1 bg-white flex flex-col overflow-hidden">
                        <div className="h-full flex flex-col">
                            {/* Editor Toolbar / Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Notebook Selector */}
                                    <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl">
                                        <Book size={13} className="text-indigo-600" />
                                        <span className="text-[10px] font-bold text-indigo-900 uppercase">Notebook:</span>
                                        <select
                                            value={noteNotebook}
                                            onChange={(e) => handleSelectNotebook(e.target.value)}
                                            className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
                                        >
                                            {notebooks.map(nb => (
                                                <option key={nb} value={nb}>{nb}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddNotebookModalOpen(true)}
                                            className="p-0.5 hover:bg-indigo-200/60 text-indigo-700 rounded-md transition-all cursor-pointer ml-0.5"
                                            title="Create New Notebook"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    {/* Section Selector */}
                                    <div className="flex items-center gap-1.5 bg-slate-100/70 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                                        <Folder size={13} className="text-indigo-600" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Section:</span>
                                        <select
                                            value={noteSection}
                                            onChange={(e) => handleSelectSection(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                        >
                                            {sections.map(sec => (
                                                <option key={sec} value={sec}>{sec}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddSectionModalOpen(true)}
                                            className="p-0.5 hover:bg-slate-200/80 text-indigo-700 rounded-md transition-all cursor-pointer ml-0.5"
                                            title="Create New Section"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    {/* Category Selector */}
                                    <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 rounded-xl">
                                        <Tags size={13} className="text-amber-600" />
                                        <span className="text-[10px] font-bold text-amber-900 uppercase">Category:</span>
                                        <select
                                            value={noteCategory}
                                            onChange={(e) => handleSelectCategory(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddCategoryModalOpen(true)}
                                            className="p-0.5 hover:bg-amber-200/60 text-amber-800 rounded-md transition-all cursor-pointer ml-0.5"
                                            title="Create New Category"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                </div>

                                    {/* Share Toggle Switch */}
                                    {user?.role === 'Student' && (
                                        <div className="flex items-center gap-3 ml-2">
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
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedNote && canPerform('notes', 'deleteNotes') && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteNote(selectedNote._id)}
                                            className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                                            title="Delete Note"
                                        >
                                            <Trash size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Google Keep Style Workspace Editor */}
                            <div className="flex-1 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-slate-50/20">
                                {!isKeepExpanded && !selectedNote ? (
                                    /* Collapsed Input Bar */
                                    <div
                                        onClick={() => setIsKeepExpanded(true)}
                                        className="w-full max-w-2xl mx-auto bg-white border border-slate-200 shadow-md rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:shadow-lg transition-all text-slate-400"
                                    >
                                        <span className="text-sm font-semibold text-slate-500 pl-2">Take a note...</span>
                                        <div className="flex items-center gap-2 pr-2 text-slate-500">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setIsKeepExpanded(true); }}
                                                className="hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                                                title="New Note"
                                            >
                                                <CheckSquare size={18} />
                                            </button>
                                            <label
                                                onClick={(e) => e.stopPropagation()}
                                                className="hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                                                title="Add Image"
                                            >
                                                <ImageIcon size={18} />
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setIsAiModalOpen(true); }}
                                                className="hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                                                title="Upload File with AI"
                                            >
                                                <Sparkles size={18} className="text-indigo-600" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Expanded Note Card Editor */
                                    <div className="w-full max-w-3xl mx-auto bg-white border border-slate-200 shadow-xl rounded-3xl p-6 space-y-4 text-left transition-all">
                                        {/* Title Input + Tag Category + Pin Button */}
                                        <div className="flex items-center justify-between gap-3">
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Title"
                                                className="w-full text-xl font-black text-slate-800 placeholder-slate-400 border-none outline-none p-0 focus:ring-0"
                                            />
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTagCategoryModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                                                    title="Tag Notebook, Section & Category"
                                                >
                                                    <Tags size={14} className="text-purple-600" />
                                                    <span>Tag Category</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={togglePinCurrentNote}
                                                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                                                        isPinned ? 'bg-amber-100 text-amber-700 font-extrabold' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                    title={isPinned ? "Unpin Note" : "Pin Note"}
                                                >
                                                    <Pin size={18} className={isPinned ? "fill-amber-500 text-amber-600 rotate-45" : ""} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content Textarea */}
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Take a note..."
                                            className="w-full text-sm text-slate-700 placeholder-slate-400 border-none outline-none resize-none p-0 focus:ring-0 min-h-[160px] leading-relaxed font-sans"
                                        />

                                        {/* Image Attachments */}
                                        {images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                                {images.map((img, idx) => (
                                                    <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200">
                                                        <img src={img} alt="Attachment" className="w-24 h-24 object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(idx)}
                                                            className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attached File Badge */}
                                        {attachedFile && (
                                            <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-200/80 rounded-2xl px-3.5 py-2 text-xs font-bold text-indigo-900">
                                                <span className="truncate flex items-center gap-2">
                                                    <FileText size={14} className="text-indigo-600 shrink-0" />
                                                    {attachedFile.name}
                                                </span>
                                                <button type="button" onClick={() => setAttachedFile(null)} className="text-indigo-500 hover:text-indigo-800 p-0.5">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Reminder Badge */}
                                        {reminderAt && (
                                            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1 text-xs font-bold text-amber-800">
                                                <Bell size={13} className="text-amber-600" />
                                                <span>Reminder: {new Date(reminderAt).toLocaleString()}</span>
                                                <button type="button" onClick={() => setReminderAt('')} className="text-amber-600 hover:text-amber-900 p-0.5 ml-1 cursor-pointer">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Bottom Toolbar with 5 Options */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {/* 1. Direct File Upload */}
                                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer" title="Upload File">
                                                    <Paperclip size={15} className="text-blue-600" />
                                                    <span>Upload</span>
                                                    <input type="file" onChange={handleDirectFileUpload} className="hidden" />
                                                </label>

                                                {/* 2. Upload File (AI Prompt) */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAiModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                                    title="Upload File with AI Prompt"
                                                >
                                                    <Sparkles size={15} className="text-indigo-600" />
                                                    <span>AI Upload</span>
                                                </button>

                                                 {/* 2. Add Image */}
                                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer" title="Add Image">
                                                    <ImageIcon size={15} className="text-emerald-600" />
                                                    <span>Add Image</span>
                                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                </label>

                                                {/* 4. Remind Me */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsReminderModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                                    title="Set Reminder"
                                                >
                                                    <Bell size={15} className="text-amber-600" />
                                                    <span>Remind me</span>
                                                </button>

                                                {/* 5. Voice Type */}
                                                <button
                                                    type="button"
                                                    onClick={toggleListening}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                                        isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                    title="Voice Typing"
                                                >
                                                    {isListening ? <MicOff size={15} className="text-red-500" /> : <Mic size={15} className="text-indigo-600" />}
                                                    <span>{isListening ? 'Listening...' : 'Voice'}</span>
                                                </button>
                                            </div>

                                            {/* Close / Done Button */}
                                            <button
                                                type="button"
                                                onClick={() => setIsKeepExpanded(false)}
                                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Create New Notebook Modal */}
            {isAddNotebookModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleAddNotebook} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Book size={18} className="text-indigo-400" />
                                <h3 className="font-extrabold text-sm">Create Notebook</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddNotebookModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notebook Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newNotebookName}
                                    onChange={(e) => setNewNotebookName(e.target.value)}
                                    placeholder="e.g. Physics 101, Web Dev"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddNotebookModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Create Notebook
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Create New Category Modal */}
            {isAddCategoryModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleAddCategory} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tags size={18} className="text-amber-400" />
                                <h3 className="font-extrabold text-sm">Add Category</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddCategoryModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Revision, Important, Formulas"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddCategoryModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Add Category
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Create New Section Modal */}
            {isAddSectionModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleAddSection} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderPlus size={18} className="text-indigo-400" />
                                <h3 className="font-extrabold text-sm">Create New Section</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddSectionModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Section Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="e.g. Meeting Notes, Physics, Drafts"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddSectionModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Create Section
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Rename Notebook Modal */}
            {editingNotebook && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleRenameNotebook} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 size={18} className="text-indigo-400" />
                                <h3 className="font-extrabold text-sm">Rename Notebook</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingNotebook(null)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Notebook Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={renameNotebookName}
                                    onChange={(e) => setRenameNotebookName(e.target.value)}
                                    placeholder="Enter notebook name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingNotebook(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Save Name
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Rename Category Modal */}
            {editingCategory && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleRenameCategory} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 size={18} className="text-amber-400" />
                                <h3 className="font-extrabold text-sm">Rename Category</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Category Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={renameCategoryName}
                                    onChange={(e) => setRenameCategoryName(e.target.value)}
                                    placeholder="Enter category name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Save Name
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Tag Category Modal */}
            {isTagCategoryModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tags size={18} className="text-purple-400" />
                                <h3 className="font-extrabold text-sm">Select Note Category</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTagCategoryModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Category Selection */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Category</label>
                                <select
                                    value={noteCategory}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNoteCategory(val);
                                        setActiveCategory(val);
                                        setIsTagCategoryModalOpen(false);
                                        toast.success(`Note tagged in "${val}" category! 🏷️`);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>🏷️ {cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setIsTagCategoryModalOpen(false)}
                                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsTagCategoryModalOpen(false);
                                    setIsAddCategoryModalOpen(true);
                                }}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Create New Category
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Rename Section Modal */}
            {editingSection && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleRenameSection} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 size={18} className="text-indigo-400" />
                                <h3 className="font-extrabold text-sm">Rename Section</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingSection(null)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Section Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={renameSectionName}
                                    onChange={(e) => setRenameSectionName(e.target.value)}
                                    placeholder="Enter section name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingSection(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Save Name
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* AI Upload File Modal */}
            {isAiModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleProcessAiFile} className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-amber-400" />
                                <h3 className="font-extrabold text-sm">AI File Assistant</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select File (PDF, Doc, Text, Image)</label>
                                <input
                                    type="file"
                                    required
                                    onChange={(e) => setAiFile(e.target.files?.[0] || null)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs text-slate-700 outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">AI Instructions / Prompt</label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g. Summarize in 5 key points, extract Q&A, translate to Hindi/English, etc."
                                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 resize-none transition-all"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Quick Presets:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Extract Summary", "Convert to Q&A", "Translate Content", "Key Highlights"].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setAiPrompt(preset)}
                                            className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                        >
                                            ✨ {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={aiProcessing}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {aiProcessing ? <Sparkles size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                <span>{aiProcessing ? 'Processing...' : 'Process with AI'}</span>
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Set Reminder Modal */}
            {isReminderModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleSaveReminder} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={18} className="text-amber-400" />
                                <h3 className="font-extrabold text-sm">Set Note Reminder</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsReminderModalOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reminder Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    min={new Date().toISOString().slice(0, 16)}
                                    value={reminderInput}
                                    onChange={(e) => setReminderInput(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Quick Presets:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date();
                                            d.setHours(18, 0, 0, 0);
                                            setReminderInput(d.toISOString().slice(0, 16));
                                        }}
                                        className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                    >
                                        🌆 Today 6:00 PM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date();
                                            d.setDate(d.getDate() + 1);
                                            d.setHours(9, 0, 0, 0);
                                            setReminderInput(d.toISOString().slice(0, 16));
                                        }}
                                        className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                    >
                                        🌅 Tomorrow 9:00 AM
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsReminderModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                            >
                                Set Reminder
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 4px; }
            `}</style>
        </DashboardLayout>
    );
};

export default NotesPage;
