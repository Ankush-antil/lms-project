import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    X, Search, FolderOpen, School, Book, Layers, LayoutGrid, ChevronDown,
    FileText, BarChart2, Link2, Check, Edit, Trash2, Folder, Download, Upload, Plus
} from 'lucide-react';


const TestFolderStructure = ({ isOpen, onClose, tests, onOpenResponses, onDelete, onImportSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [coursesList, setCoursesList] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const fetchCourses = async () => {
                try {
                    const { data } = await axios.get('/api/setup/courses');
                    setCoursesList(data || []);
                } catch (err) {
                    console.error("Error fetching courses for folder explorer:", err);
                }
            };
            fetchCourses();
        }
    }, [isOpen]);

    // Folder Explorer state
    const [explorerPath, setExplorerPath] = useState(() => {
        try {
            const saved = sessionStorage.getItem('folderExplorer_explorerPath');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [selectedTreePath, setSelectedTreePath] = useState(() => {
        try {
            const saved = sessionStorage.getItem('folderExplorer_selectedTreePath');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [expandedFolders, setExpandedFolders] = useState(() => {
        try {
            const saved = sessionStorage.getItem('folderExplorer_expandedFolders');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [selectedExplorerTestId, setSelectedExplorerTestId] = useState(null);
    const [selectedExplorerFolderName, setSelectedExplorerFolderName] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    const handleCreateFormClick = () => {
        const inst = explorerPath[0] || '';
        const crs = explorerPath[1] || '';
        const subj = explorerPath[2] || '';
        const inbox = explorerPath[3] || 'Inbox 1';
        
        onClose();
        
        const builderPath = user?.role === 'Institute' 
            ? '/institute/activities-builder' 
            : (user?.role === 'Editor' 
                ? '/editor/activities-builder' 
                : (user?.role === 'Teacher' 
                    ? '/teacher/activities-builder' 
                    : '/admin/activities-builder'));
                    
        navigate(`${builderPath}?institute=${encodeURIComponent(inst)}&course=${encodeURIComponent(crs)}&subject=${encodeURIComponent(subj)}&inbox=${encodeURIComponent(inbox)}&locked=true`);
    };

    const handleContextMenu = (e) => {
        if (explorerPath.length >= 3) {
            e.preventDefault();
            setContextMenu({
                x: e.clientX,
                y: e.clientY
            });
        }
    };

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);
    const [explorerSearch, setExplorerSearch] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        sessionStorage.setItem('folderExplorer_explorerPath', JSON.stringify(explorerPath));
    }, [explorerPath]);

    useEffect(() => {
        sessionStorage.setItem('folderExplorer_selectedTreePath', JSON.stringify(selectedTreePath));
    }, [selectedTreePath]);

    useEffect(() => {
        sessionStorage.setItem('folderExplorer_expandedFolders', JSON.stringify(expandedFolders));
    }, [expandedFolders]);

    useEffect(() => {
        if (isOpen) {
            const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
            document.body.dataset.modalCount = count.toString();
            document.body.style.overflow = 'hidden';
            return () => {
                const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
                document.body.dataset.modalCount = newCount.toString();
                if (newCount === 0) {
                    document.body.style.overflow = '';
                }
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Aggregated tree: Institute -> Course -> Subject -> Inbox -> [Tests]
    const folderTree = (() => {
        const tree = {};

        // 1. Populate tree structure from coursesList to ensure empty courses, subjects, and day-inboxes are shown
        coursesList.forEach(course => {
            if (!course) return;
            const inst = (course.institute?.name || 'Unassigned Institute').trim();
            const crs = (course.name || 'Unassigned Course').trim();

            if (!tree[inst]) {
                tree[inst] = {};
            }
            if (!tree[inst][crs]) {
                tree[inst][crs] = {};
            }

            // Populate subjects
            const subjects = course.subjects || [];
            subjects.forEach(subjectName => {
                const subj = subjectName.trim();
                if (!tree[inst][crs][subj]) {
                    tree[inst][crs][subj] = {};
                }

                // Populate day inboxes based on duration (days)
                const subjectDur = course.subjectDurations?.find(
                    sd => sd.subjectName?.toLowerCase() === subj.toLowerCase()
                );
                const duration = subjectDur ? Number(subjectDur.duration) : 0;
                for (let d = 1; d <= duration; d++) {
                    const inboxName = `Inbox ${d}`;
                    if (!tree[inst][crs][subj][inboxName]) {
                        tree[inst][crs][subj][inboxName] = [];
                    }
                }
            });
        });

        // 2. Populate tests into the tree
        tests.forEach(test => {
            if (!test) return;
            const inst = (test.institute || 'Unassigned Institute').trim();
            const crs = (test.course || 'Unassigned Course').trim();
            const subj = (test.subject || 'Unassigned Subject').trim();
            const inbox = (test.index || 'Inbox 1').trim();

            if (!tree[inst]) {
                tree[inst] = {};
            }
            if (!tree[inst][crs]) {
                tree[inst][crs] = {};
            }
            if (!tree[inst][crs][subj]) {
                tree[inst][crs][subj] = {};
            }
            if (!tree[inst][crs][subj][inbox]) {
                tree[inst][crs][subj][inbox] = [];
            }
            tree[inst][crs][subj][inbox].push(test);
        });

        return tree;
    })();

    const getFolderStats = (path) => {
        let testCount = 0;
        let coursesInPath = new Set();
        let subjectsInPath = new Set();
        let inboxesInPath = new Set();

        tests.forEach(t => {
            if (!t) return;
            const inst = (t.institute || 'Unassigned Institute').trim();
            const crs = (t.course || 'Unassigned Course').trim();
            const subj = (t.subject || 'Unassigned Subject').trim();
            const inbox = (t.index || 'Inbox 1').trim();

            if (path.length >= 1 && inst !== path[0]) return;
            if (path.length >= 2 && crs !== path[1]) return;
            if (path.length >= 3 && subj !== path[2]) return;
            if (path.length >= 4 && inbox !== path[3]) return;

            testCount++;
            coursesInPath.add(crs);
            subjectsInPath.add(subj);
            inboxesInPath.add(inbox);
        });

        // Merging empty courses/subjects from coursesList to stats so the counts match UI folders
        coursesList.forEach(course => {
            if (!course) return;
            const inst = (course.institute?.name || 'Unassigned Institute').trim();
            const crs = (course.name || 'Unassigned Course').trim();
            
            if (path.length >= 1 && inst !== path[0]) return;
            coursesInPath.add(crs);

            if (path.length >= 2 && crs !== path[1]) return;
            (course.subjects || []).forEach(subjectName => {
                const subj = subjectName.trim();
                subjectsInPath.add(subj);

                if (path.length >= 3 && subj !== path[2]) return;
                const subjectDur = course.subjectDurations?.find(
                    sd => sd.subjectName?.toLowerCase() === subj.toLowerCase()
                );
                const duration = subjectDur ? Number(subjectDur.duration) : 0;
                for (let d = 1; d <= duration; d++) {
                    inboxesInPath.add(`Inbox ${d}`);
                }
            });
        });

        return {
            testCount,
            courseCount: coursesInPath.size,
            subjectCount: subjectsInPath.size,
            inboxCount: inboxesInPath.size
        };
    };

    const handleCopyUrl = (testId) => {
        const url = `${window.location.origin}/take-test/${testId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(testId);
            toast.success("URL copied to clipboard!");
            setTimeout(() => setCopiedId(null), 1500);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopiedId(testId);
            toast.success("URL copied to clipboard!");
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    const handleDownloadFolder = async (path, folderName) => {
        try {
            toast.loading("Preparing folder download...", { id: "zip-progress" });
            
            // Load JSZip from CDN dynamically
            const JSZip = await new Promise((resolve, reject) => {
                if (window.JSZip) {
                    resolve(window.JSZip);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.onload = () => resolve(window.JSZip);
                script.onerror = () => reject(new Error("Failed to load JSZip library."));
                document.head.appendChild(script);
            });

            const zip = new JSZip();

            // Filter tests matching the path
            const filteredTests = tests.filter(t => {
                const inst = (t.institute || 'Unassigned Institute').trim();
                const crs = (t.course || 'Unassigned Course').trim();
                const subj = (t.subject || 'Unassigned Subject').trim();
                const inbox = (t.index || 'Inbox 1').trim();

                if (path.length >= 1 && inst !== path[0]) return false;
                if (path.length >= 2 && crs !== path[1]) return false;
                if (path.length >= 3 && subj !== path[2]) return false;
                if (path.length >= 4 && inbox !== path[3]) return false;
                return true;
            });

            if (filteredTests.length === 0) {
                toast.dismiss("zip-progress");
                toast.error("No tests found in this folder to download.");
                return;
            }

            // Group and add tests to ZIP structure
            filteredTests.forEach(t => {
                const crs = (t.course || 'Unassigned Course').trim().replace(/[^a-z0-9]/gi, ' ');
                const subj = (t.subject || 'Unassigned Subject').trim().replace(/[^a-z0-9]/gi, ' ');
                const inbox = (t.index || 'Inbox 1').trim().replace(/[^a-z0-9]/gi, ' ');
                const testTitle = (t.title || 'Untitled Test').trim().replace(/[^a-z0-9]/gi, ' ');

                let relativePath = '';
                if (path.length === 1) {
                    relativePath = `${crs}/${subj}/${inbox}/${testTitle}.json`;
                } else if (path.length === 2) {
                    relativePath = `${subj}/${inbox}/${testTitle}.json`;
                } else if (path.length === 3) {
                    relativePath = `${inbox}/${testTitle}.json`;
                } else {
                    relativePath = `${testTitle}.json`;
                }

                zip.file(relativePath, JSON.stringify(t, null, 2));
            });

            // Generate ZIP file
            const content = await zip.generateAsync({ type: "blob" });
            
            // Trigger browser download
            const url = URL.createObjectURL(content);
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = url;
            downloadAnchor.download = `${folderName.replace(/[^a-z0-9]/gi, ' ')}.zip`;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            URL.revokeObjectURL(url);

            toast.dismiss("zip-progress");
            toast.success(`Folder downloaded: ${filteredTests.length} tests exported inside ZIP!`);
        } catch (error) {
            console.error("Error creating folder zip:", error);
            toast.dismiss("zip-progress");
            toast.error("Failed to generate folder zip download.");
        }
    };

    const handleDownloadTest = (test) => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(test, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `${(test.title || 'test').replace(/[^a-z0-9]/gi, '_')}_export.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success(`Test downloaded successfully!`);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = '';

        const fileType = file.name.split('.').pop()?.toLowerCase();
        if (fileType !== 'json' && fileType !== 'zip') {
            toast.error("Please upload a valid .json or .zip backup file.");
            return;
        }

        toast.loading(`Importing ${file.name}...`, { id: "import-progress" });

        try {
            if (fileType === 'json') {
                const reader = new FileReader();
                const fileText = await new Promise((resolve, reject) => {
                    reader.onload = (event) => resolve(event.target?.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsText(file);
                });

                const testObj = JSON.parse(fileText);
                const testArray = Array.isArray(testObj) ? testObj : [testObj];

                const importPromises = testArray.map(async (t) => {
                    const payload = {
                        testDetails: {
                            title: t.title || t.testDetails?.title || 'Imported Test',
                            description: t.description || t.testDetails?.description || '',
                            institute: t.institute || t.testDetails?.institute || '',
                            course: t.course || t.testDetails?.course || '',
                            subject: t.subject || t.testDetails?.subject || '',
                            date: t.date || t.testDetails?.date || new Date().toISOString().split('T')[0],
                            index: t.index || t.testDetails?.index || 'Inbox 1',
                            activity: t.activity || t.testDetails?.activity || 'Quiz',
                            publishMode: t.publishMode || t.testDetails?.publishMode || 'draft'
                        },
                        questions: t.questions || [],
                        settings: t.settings || { duration: 60, passingMarks: 40 }
                    };
                    await axios.post('/api/tests', payload);
                });

                await Promise.all(importPromises);
                toast.dismiss("import-progress");
                toast.success(testArray.length > 1 ? `Imported ${testArray.length} tests successfully!` : "Test backup imported successfully!");
                if (typeof onImportSuccess === 'function') onImportSuccess();

            } else if (fileType === 'zip') {
                const JSZip = await new Promise((resolve, reject) => {
                    if (window.JSZip) {
                        resolve(window.JSZip);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                    script.onload = () => resolve(window.JSZip);
                    script.onerror = () => reject(new Error("Failed to load JSZip library."));
                    document.head.appendChild(script);
                });

                const zip = await JSZip.loadAsync(file);
                const importPromises = [];

                zip.forEach((relativePath, fileEntry) => {
                    if (!fileEntry.dir && relativePath.endsWith('.json')) {
                        const promise = fileEntry.async("string").then(async (content) => {
                            const testObj = JSON.parse(content);
                            const payload = {
                                testDetails: {
                                    title: testObj.title || testObj.testDetails?.title || 'Imported Test',
                                    description: testObj.description || testObj.testDetails?.description || '',
                                    institute: testObj.institute || testObj.testDetails?.institute || '',
                                    course: testObj.course || testObj.testDetails?.course || '',
                                    subject: testObj.subject || testObj.testDetails?.subject || '',
                                    date: testObj.date || testObj.testDetails?.date || new Date().toISOString().split('T')[0],
                                    index: testObj.index || testObj.testDetails?.index || 'Inbox 1',
                                    activity: testObj.activity || testObj.testDetails?.activity || 'Quiz',
                                    publishMode: testObj.publishMode || testObj.testDetails?.publishMode || 'draft'
                                },
                                questions: testObj.questions || [],
                                settings: testObj.settings || { duration: 60, passingMarks: 40 }
                            };
                            await axios.post('/api/tests', payload);
                        });
                        importPromises.push(promise);
                    }
                });

                if (importPromises.length === 0) {
                    toast.dismiss("import-progress");
                    toast.error("No test files found in the uploaded ZIP backup.");
                    return;
                }

                await Promise.all(importPromises);
                toast.dismiss("import-progress");
                toast.success(`Successfully imported folder backup: ${importPromises.length} tests created!`);
                if (typeof onImportSuccess === 'function') onImportSuccess();
            }
        } catch (error) {
            console.error("Error importing file/folder:", error);
            toast.dismiss("import-progress");
            toast.error(error.response?.data?.message || "Failed to import backup files.");
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[150] bg-white font-sans animate-fade-in">
            <div className="w-full h-full bg-white overflow-hidden flex flex-col select-none">
                {/* WINDOW TITLE BAR */}
                <div className="flex items-center justify-between p-5 border-b border-slate-150 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FolderOpen size={16} className="text-[#0b1329]" />
                            <span>LMS Directory Explorer</span>
                        </h3>
                        {/* Import Button */}
                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b1329] text-white hover:bg-slate-800 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Import Folder / Test Backup (.zip or .json)"
                        >
                            <Upload size={12} />
                            <span>Import Backup</span>
                        </button>
                        {/* Create Form Button */}
                        {explorerPath.length >= 3 && (
                            <button
                                onClick={handleCreateFormClick}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm active:scale-95"
                                title="Create new test in this folder"
                            >
                                <Plus size={12} />
                                <span>Create Form</span>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileImport}
                            accept=".json,.zip"
                            className="hidden"
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={18} className="text-slate-455 hover:text-slate-700" />
                    </button>
                </div>

                {/* SUB-HEADER (Breadcrumbs & Navigation controls + Search) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-slate-100 gap-3 bg-white">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <button
                            onClick={() => {
                                setExplorerPath([]);
                                setSelectedExplorerFolderName(null);
                                setSelectedExplorerTestId(null);
                            }}
                            className="hover:text-[#0b1329] transition-colors flex items-center gap-1"
                        >
                            <LayoutGrid size={13} />
                            <span>All Institutes</span>
                        </button>

                        {explorerPath.map((folder, idx) => {
                            const pathUpTo = explorerPath.slice(0, idx + 1);
                            return (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <span className="text-slate-300 font-normal">/</span>
                                    <button
                                        onClick={() => {
                                            setExplorerPath(pathUpTo);
                                            setSelectedExplorerFolderName(null);
                                            setSelectedExplorerTestId(null);
                                        }}
                                        className="hover:text-[#0b1329] transition-colors text-slate-700 font-bold"
                                    >
                                        {folder}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Search bar inside the window */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search tests in directory..."
                            value={explorerSearch}
                            onChange={(e) => {
                                setExplorerSearch(e.target.value);
                                setSelectedExplorerTestId(null);
                                setSelectedExplorerFolderName(null);
                            }}
                            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-500 transition-all font-medium text-slate-700"
                        />
                        {explorerSearch && (
                            <button
                                onClick={() => setExplorerSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-650"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* THREE PANEL CONTENT */}
                <div className="flex-1 flex overflow-hidden min-h-0 bg-white">

                    {/* 1. SIDEBAR TREE VIEW (LEFT PANEL) */}
                    <div className="w-64 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-3.5 custom-scrollbar select-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">Directories</span>
                        <div className="space-y-1 text-xs">
                            {Object.keys(folderTree).map(instName => {
                                const isInstExpanded = !!expandedFolders[instName];
                                const isInstSelected = selectedTreePath.length === 1 && selectedTreePath[0] === instName;

                                return (
                                    <div key={instName} className="space-y-1">
                                        <div
                                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${isInstSelected ? 'bg-slate-100 text-[#0b1329] font-bold' : 'hover:bg-slate-150/60 text-slate-700'
                                                }`}
                                            onClick={() => {
                                                setExplorerPath([instName]);
                                                setSelectedTreePath([instName]);
                                                setSelectedExplorerFolderName(null);
                                                setSelectedExplorerTestId(null);
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedFolders(prev => ({ ...prev, [instName]: !prev[instName] }));
                                                }}
                                                className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                            >
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isInstExpanded ? '' : '-rotate-90'}`} />
                                            </button>
                                            <School size={14} className="text-[#0b1329]" />
                                            <span className="truncate flex-1">{instName}</span>
                                        </div>

                                        {/* Courses under Institute */}
                                        {isInstExpanded && (
                                            <div className="pl-4 border-l border-slate-200 ml-3.5 space-y-1">
                                                {Object.keys(folderTree[instName] || {}).map(courseName => {
                                                    const courseKey = `${instName} > ${courseName}`;
                                                    const isCourseExpanded = !!expandedFolders[courseKey];
                                                    const isCourseSelected = selectedTreePath.length === 2 && selectedTreePath[0] === instName && selectedTreePath[1] === courseName;

                                                    return (
                                                        <div key={courseName} className="space-y-1">
                                                            <div
                                                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isCourseSelected ? 'bg-slate-100 text-[#0b1329] font-bold' : 'hover:bg-slate-150/60 text-slate-655'
                                                                    }`}
                                                                onClick={() => {
                                                                    setExplorerPath([instName, courseName]);
                                                                    setSelectedTreePath([instName, courseName]);
                                                                    setSelectedExplorerFolderName(null);
                                                                    setSelectedExplorerTestId(null);
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedFolders(prev => ({ ...prev, [courseKey]: !prev[courseKey] }));
                                                                    }}
                                                                    className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                                                >
                                                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCourseExpanded ? '' : '-rotate-90'}`} />
                                                                </button>
                                                                <Book size={14} className="text-amber-500" />
                                                                <span className="truncate flex-1">{courseName}</span>
                                                            </div>
                                    {/* Subjects under Course */}
                                                            {isCourseExpanded && (
                                                                <div className="pl-4 border-l border-slate-200 ml-3.5 space-y-1">
                                                                    {Object.keys(folderTree[instName][courseName] || {}).map(subjectName => {
                                                                        const subjKey = `${instName} > ${courseName} > ${subjectName}`;
                                                                        const isSubjExpanded = !!expandedFolders[subjKey];
                                                                        const isSubjSelected = selectedTreePath.length === 3 && selectedTreePath[0] === instName && selectedTreePath[1] === courseName && selectedTreePath[2] === subjectName;

                                                                        return (
                                                                            <div key={subjectName} className="space-y-1">
                                                                                <div
                                                                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isSubjSelected ? 'bg-slate-100 text-[#0b1329] font-bold' : 'hover:bg-slate-150/60 text-slate-600'
                                                                                        }`}
                                                                                    onClick={() => {
                                                                                        setExplorerPath([instName, courseName, subjectName]);
                                                                                        setSelectedTreePath([instName, courseName, subjectName]);
                                                                                        setSelectedExplorerFolderName(null);
                                                                                        setSelectedExplorerTestId(null);
                                                                                    }}
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setExpandedFolders(prev => ({ ...prev, [subjKey]: !prev[subjKey] }));
                                                                                        }}
                                                                                        className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                                                                    >
                                                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSubjExpanded ? '' : '-rotate-90'}`} />
                                                                                    </button>
                                                                                    <Layers size={13} className="text-emerald-500" />
                                                                                    <span className="truncate flex-1">{subjectName}</span>
                                                                                </div>

                                                                                {/* Inboxes under Subject */}
                                                                                {isSubjExpanded && (
                                                                                    <div className="pl-4 border-l border-slate-200 ml-3.5 space-y-1">
                                                                                        {Object.keys(folderTree[instName][courseName][subjectName] || {}).map(inboxName => {
                                                                                            const isInboxSelected = selectedTreePath.length === 4 && selectedTreePath[0] === instName && selectedTreePath[1] === courseName && selectedTreePath[2] === subjectName && selectedTreePath[3] === inboxName;

                                                                                            return (
                                                                                                <div
                                                                                                    key={inboxName}
                                                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${isInboxSelected ? 'bg-slate-100 text-[#0b1329] font-bold' : 'hover:bg-slate-150/60 text-slate-500'
                                                                                                        }`}
                                                                                                    onClick={() => {
                                                                                                        setExplorerPath([instName, courseName, subjectName, inboxName]);
                                                                                                        setSelectedTreePath([instName, courseName, subjectName, inboxName]);
                                                                                                        setSelectedExplorerFolderName(null);
                                                                                                        setSelectedExplorerTestId(null);
                                                                                                    }}
                                                                                                >
                                                                                                    <Folder size={13} className="text-amber-500/80" />
                                                                                                    <span className="truncate flex-1">{inboxName}</span>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. GRID PANEL (MIDDLE VIEW) */}
                    <div 
                        className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/10"
                        onContextMenu={handleContextMenu}
                    >

                        {explorerSearch ? (
                            /* Flat Search Results Mode */
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-550">
                                        Search Results for "{explorerSearch}"
                                    </span>
                                    <span className="text-[10px] bg-slate-100 text-[#0b1329] px-2 py-0.5 rounded font-black">
                                        {tests.filter(t => (t.title || '').toLowerCase().includes(explorerSearch.toLowerCase())).length} Found
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {tests
                                        .filter(t => (t.title || '').toLowerCase().includes(explorerSearch.toLowerCase()))
                                        .map(test => (
                                            <div
                                                key={test._id}
                                                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between gap-3 select-none"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="text-[#0b1329] flex-shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h5 className="font-bold text-slate-800 text-xs truncate" title={test.title || 'Untitled'}>
                                                            {test.title || 'Untitled'}
                                                        </h5>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                                            {test.institute || 'Default'} &bull; {test.questions?.length || 0} Qs
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Test Action Buttons */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {/* Copy Link */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyUrl(test._id);
                                                        }}
                                                        className={`p-1.5 border rounded-lg transition-all ${copiedId === test._id
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                                            }`}
                                                        title="Copy Link"
                                                    >
                                                        {copiedId === test._id ? <Check size={12} /> : <Link2 size={12} />}
                                                    </button>

                                                    {/* View Responses */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onClose();
                                                            onOpenResponses(test, 'connected');
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all"
                                                        title="View Responses"
                                                    >
                                                        <BarChart2 size={12} />
                                                    </button>

                                                    {/* Download Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadTest(test);
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all cursor-pointer"
                                                        title="Download Test JSON"
                                                    >
                                                        <Download size={12} />
                                                    </button>

                                                    {/* Edit Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`${user?.role === 'Institute' ? '/institute/activities/edit' : (user?.role === 'Editor' ? '/editor/activities-edit' : '/admin/activities-edit')}/${test._id}`);
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all"
                                                        title="Edit Test"
                                                    >
                                                        <Edit size={12} />
                                                    </button>

                                                    {/* Delete Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(test._id);
                                                        }}
                                                        className="p-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-105 hover:border-rose-200 text-rose-600 rounded-lg transition-all"
                                                        title="Delete Test"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            /* Directory Levels Mode */
                            <div>
                                {/* Path header stats */}
                                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-505">
                                        {explorerPath.length === 0 ? 'All Institutes' : explorerPath[explorerPath.length - 1]}
                                    </span>
                                    <span className="text-[10px] bg-slate-150 text-slate-606 px-2 py-0.5 rounded font-black">
                                        {getFolderStats(explorerPath).testCount} Tests Total
                                    </span>
                                </div>

                                {/* Level 0: List Institutes */}
                                {explorerPath.length === 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {Object.keys(folderTree).map(inst => {
                                            const stats = getFolderStats([inst]);
                                            return (
                                                <div
                                                    key={inst}
                                                    onClick={() => {
                                                        setExplorerPath([inst]);
                                                        setSelectedTreePath([inst]);
                                                        setSelectedExplorerFolderName(null);
                                                        setSelectedExplorerTestId(null);
                                                        setExpandedFolders(prev => ({ ...prev, [inst]: true }));
                                                    }}
                                                    className="w-full cursor-pointer select-none animate-fade-in"
                                                >
                                                    {/* Folder Card Body */}
                                                    <div className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 hover:shadow-sm transition-all flex items-center gap-2">
                                                        {/* Realistic 3D Folder Icon */}
                                                        <div className="relative w-[36px] h-[26px] flex-shrink-0 select-none mr-1">
                                                            {/* Back Flap */}
                                                            <div className="absolute inset-0 bg-[#ca8a04] rounded-[3px] shadow-sm">
                                                                <div className="absolute -top-[3px] left-[2px] w-[14px] h-[3px] bg-[#ca8a04] rounded-t-[1px]" />
                                                            </div>
                                                            {/* Paper Sheet */}
                                                            <div className="absolute top-[2px] left-[5px] w-[16px] h-[18px] bg-white rounded-[1px] shadow-sm border border-slate-100/50 transform -rotate-[4deg] origin-bottom-left" />
                                                            {/* Front Cover */}
                                                            <div className="absolute left-0 right-0 bottom-0 top-[8px] bg-gradient-to-b from-[#fde047] to-[#ca8a04] rounded-b-[3px] rounded-t-[1px] shadow border-t border-[#fef08a]/60" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="font-bold text-slate-800 text-xs truncate" title={inst}>{inst}</h5>
                                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                                                                {stats.courseCount} Courses &bull; {stats.testCount} Tests
                                                            </p>
                                                        </div>
                                                        {/* Download Folder Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadFolder([inst], inst);
                                                            }}
                                                            className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-700 transition-colors flex-shrink-0 cursor-pointer"
                                                            title="Download Folder JSON"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Level 1: List Courses in Selected Institute */}
                                {explorerPath.length === 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {Object.keys(folderTree[explorerPath[0]] || {}).map(course => {
                                            const stats = getFolderStats([explorerPath[0], course]);
                                            return (
                                                <div
                                                    key={course}
                                                    onClick={() => {
                                                        setExplorerPath([explorerPath[0], course]);
                                                        setSelectedTreePath([explorerPath[0], course]);
                                                        setSelectedExplorerFolderName(null);
                                                        setSelectedExplorerTestId(null);
                                                        setExpandedFolders(prev => ({
                                                            ...prev,
                                                            [explorerPath[0]]: true,
                                                            [`${explorerPath[0]} > ${course}`]: true
                                                        }));
                                                    }}
                                                    className="w-full cursor-pointer select-none animate-fade-in"
                                                >
                                                    {/* Folder Card Body */}
                                                    <div className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 hover:shadow-sm transition-all flex items-center gap-2">
                                                        {/* Realistic 3D Folder Icon */}
                                                        <div className="relative w-[36px] h-[26px] flex-shrink-0 select-none mr-1">
                                                            {/* Back Flap */}
                                                            <div className="absolute inset-0 bg-[#ca8a04] rounded-[3px] shadow-sm">
                                                                <div className="absolute -top-[3px] left-[2px] w-[14px] h-[3px] bg-[#ca8a04] rounded-t-[1px]" />
                                                            </div>
                                                            {/* Paper Sheet */}
                                                            <div className="absolute top-[2px] left-[5px] w-[16px] h-[18px] bg-white rounded-[1px] shadow-sm border border-slate-100/50 transform -rotate-[4deg] origin-bottom-left" />
                                                            {/* Front Cover */}
                                                            <div className="absolute left-0 right-0 bottom-0 top-[8px] bg-gradient-to-b from-[#fde047] to-[#ca8a04] rounded-b-[3px] rounded-t-[1px] shadow border-t border-[#fef08a]/60" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="font-bold text-slate-800 text-xs truncate" title={course}>{course}</h5>
                                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                                                                {stats.subjectCount} Subjects &bull; {stats.testCount} Tests
                                                            </p>
                                                        </div>
                                                        {/* Download Folder Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadFolder([explorerPath[0], course], course);
                                                            }}
                                                            className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-700 transition-colors flex-shrink-0 cursor-pointer"
                                                            title="Download Folder JSON"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(folderTree[explorerPath[0]] || {}).length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400 text-xs font-semibold">
                                                No courses found under this institute.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Level 2: List Subjects in Course */}
                                {explorerPath.length === 2 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {Object.keys(folderTree[explorerPath[0]]?.[explorerPath[1]] || {}).map(subj => {
                                            const stats = getFolderStats([explorerPath[0], explorerPath[1], subj]);
                                            return (
                                                <div
                                                    key={subj}
                                                    onClick={() => {
                                                        setExplorerPath([explorerPath[0], explorerPath[1], subj]);
                                                        setSelectedTreePath([explorerPath[0], explorerPath[1], subj]);
                                                        setSelectedExplorerFolderName(null);
                                                        setSelectedExplorerTestId(null);
                                                    }}
                                                    className="w-full cursor-pointer select-none animate-fade-in"
                                                >
                                                    {/* Folder Card Body */}
                                                    <div className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 hover:shadow-sm transition-all flex items-center gap-2">
                                                        {/* Realistic 3D Folder Icon */}
                                                        <div className="relative w-[36px] h-[26px] flex-shrink-0 select-none mr-1">
                                                            {/* Back Flap */}
                                                            <div className="absolute inset-0 bg-[#ca8a04] rounded-[3px] shadow-sm">
                                                                <div className="absolute -top-[3px] left-[2px] w-[14px] h-[3px] bg-[#ca8a04] rounded-t-[1px]" />
                                                            </div>
                                                            {/* Paper Sheet */}
                                                            <div className="absolute top-[2px] left-[5px] w-[16px] h-[18px] bg-white rounded-[1px] shadow-sm border border-slate-100/50 transform -rotate-[4deg] origin-bottom-left" />
                                                            {/* Front Cover */}
                                                            <div className="absolute left-0 right-0 bottom-0 top-[8px] bg-gradient-to-b from-[#fde047] to-[#ca8a04] rounded-b-[3px] rounded-t-[1px] shadow border-t border-[#fef08a]/60" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="font-bold text-slate-800 text-xs truncate" title={subj}>{subj}</h5>
                                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                                                                {stats.inboxCount} Inboxes &bull; {stats.testCount} Tests
                                                            </p>
                                                        </div>
                                                        {/* Download Folder Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadFolder([explorerPath[0], explorerPath[1], subj], subj);
                                                            }}
                                                            className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-700 transition-colors flex-shrink-0 cursor-pointer"
                                                            title="Download Folder JSON"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(folderTree[explorerPath[0]]?.[explorerPath[1]] || {}).length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400 text-xs font-semibold">
                                                No subjects found under this course.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Level 3: List Inboxes in Subject */}
                                {explorerPath.length === 3 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {Object.keys(folderTree[explorerPath[0]]?.[explorerPath[1]]?.[explorerPath[2]] || {}).map(inboxName => {
                                            const stats = getFolderStats([explorerPath[0], explorerPath[1], explorerPath[2], inboxName]);
                                            return (
                                                <div
                                                    key={inboxName}
                                                    onClick={() => {
                                                        setExplorerPath([explorerPath[0], explorerPath[1], explorerPath[2], inboxName]);
                                                        setSelectedTreePath([explorerPath[0], explorerPath[1], explorerPath[2], inboxName]);
                                                        setSelectedExplorerFolderName(null);
                                                        setSelectedExplorerTestId(null);
                                                    }}
                                                    className="w-full cursor-pointer select-none animate-fade-in"
                                                >
                                                    {/* Folder Card Body */}
                                                    <div className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 hover:shadow-sm transition-all flex items-center gap-2">
                                                        {/* Realistic 3D Folder Icon */}
                                                        <div className="relative w-[36px] h-[26px] flex-shrink-0 select-none mr-1">
                                                            {/* Back Flap */}
                                                            <div className="absolute inset-0 bg-[#ca8a04] rounded-[3px] shadow-sm">
                                                                <div className="absolute -top-[3px] left-[2px] w-[14px] h-[3px] bg-[#ca8a04] rounded-t-[1px]" />
                                                            </div>
                                                            {/* Paper Sheet */}
                                                            <div className="absolute top-[2px] left-[5px] w-[16px] h-[18px] bg-white rounded-[1px] shadow-sm border border-slate-100/50 transform -rotate-[4deg] origin-bottom-left" />
                                                            {/* Front Cover */}
                                                            <div className="absolute left-0 right-0 bottom-0 top-[8px] bg-gradient-to-b from-[#fde047] to-[#ca8a04] rounded-b-[3px] rounded-t-[1px] shadow border-t border-[#fef08a]/60" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="font-bold text-slate-800 text-xs truncate" title={inboxName}>{inboxName}</h5>
                                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                                                                {stats.testCount} Tests inside
                                                            </p>
                                                        </div>
                                                        {/* Download Folder Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadFolder([explorerPath[0], explorerPath[1], explorerPath[2], inboxName], inboxName);
                                                            }}
                                                            className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-700 transition-colors flex-shrink-0 cursor-pointer"
                                                            title="Download Folder JSON"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(folderTree[explorerPath[0]]?.[explorerPath[1]]?.[explorerPath[2]] || {}).length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400 text-xs font-semibold">
                                                No inboxes found under this subject.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Level 4: List Tests in Inbox */}
                                {explorerPath.length === 4 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {(folderTree[explorerPath[0]]?.[explorerPath[1]]?.[explorerPath[2]]?.[explorerPath[3]] || []).map(test => (
                                            <div
                                                key={test._id}
                                                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between gap-3 select-none"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="text-[#0b1329] flex-shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h5 className="font-bold text-slate-800 text-xs truncate" title={test.title || 'Untitled'}>
                                                            {test.title || 'Untitled'}
                                                        </h5>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {test.questions?.length || 0} Qs &bull; {test.settings?.duration || 0} mins
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Test Action Buttons */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {/* Copy Link */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyUrl(test._id);
                                                        }}
                                                        className={`p-1.5 border rounded-lg transition-all ${copiedId === test._id
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                                            }`}
                                                        title="Copy Link"
                                                    >
                                                        {copiedId === test._id ? <Check size={12} /> : <Link2 size={12} />}
                                                    </button>

                                                    {/* View Responses */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onClose();
                                                            onOpenResponses(test, 'connected');
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all"
                                                        title="View Responses"
                                                    >
                                                        <BarChart2 size={12} />
                                                    </button>

                                                    {/* Download Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadTest(test);
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all cursor-pointer"
                                                        title="Download Test JSON"
                                                    >
                                                        <Download size={12} />
                                                    </button>

                                                    {/* Edit Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`${user?.role === 'Institute' ? '/institute/activities/edit' : (user?.role === 'Editor' ? '/editor/activities-edit' : '/admin/activities-edit')}/${test._id}`);
                                                        }}
                                                        className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:text-[#0b1329] rounded-lg text-slate-600 transition-all"
                                                        title="Edit Test"
                                                    >
                                                        <Edit size={12} />
                                                    </button>

                                                    {/* Delete Test */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(test._id);
                                                        }}
                                                        className="p-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-105 hover:border-rose-200 text-rose-600 rounded-lg transition-all"
                                                        title="Delete Test"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(folderTree[explorerPath[0]]?.[explorerPath[1]]?.[explorerPath[2]]?.[explorerPath[3]] || []).length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400 text-xs font-semibold">
                                                No tests found under this inbox.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                </div>
            </div>
            {/* Custom Context Menu */}
            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[200] py-1.5 w-40 animate-fade-in font-sans"
                >
                    <button
                        onClick={handleCreateFormClick}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Plus size={14} className="text-[#0b1329]" />
                        <span>Create Form</span>
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
};

export default TestFolderStructure;
