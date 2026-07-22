import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, CheckCircle2, ChevronRight, Lock, Eye, AlertCircle, Trash, 
    Folder, FolderOpen, ArrowLeft, RefreshCw, LogOut, Camera, Video, 
    Mic, Phone, FileText, Download, Loader2, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const TARGET_FOLDERS = [
    "Screenshot Tool",
    "Screen Recorder",
    "Voice Recorder",
    "Video Recorder",
    "Web-Calling Tool",
    "File Uploader"
];

const FOLDER_ICONS = {
    "Screenshot Tool": Camera,
    "Screen Recorder": Video,
    "Voice Recorder": Mic,
    "Video Recorder": Video,
    "Web-Calling Tool": Phone,
    "File Uploader": Upload
};

const FOLDER_COLORS = {
    "Screenshot Tool": "bg-indigo-50 border-indigo-150 text-indigo-700",
    "Screen Recorder": "bg-emerald-50 border-emerald-150 text-emerald-700",
    "Voice Recorder": "bg-blue-50 border-blue-150 text-blue-700",
    "Video Recorder": "bg-purple-50 border-purple-150 text-purple-700",
    "Web-Calling Tool": "bg-pink-50 border-pink-150 text-pink-700",
    "File Uploader": "bg-amber-50 border-amber-150 text-amber-700"
};

const GoogleDriveModal = ({ isOpen, onClose, fileName, fileBlob, onSaveSuccess, toolName, currentParentId, inline = false }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Connect Account, 2: Workspace / Dashboard
    const [selectedAccount, setSelectedAccount] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [googleUser, setGoogleUser] = useState(null);

    // General Google Drive Browser states (used when fileBlob is not passed)
    const [currentDriveFolder, setCurrentDriveFolder] = useState({ id: 'root', name: 'Google Drive' });
    const [driveNavStack, setDriveNavStack] = useState([{ id: 'root', name: 'Google Drive' }]);
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
    const [importingFileId, setImportingFileId] = useState('');
    const [importedFileIds, setImportedFileIds] = useState(new Set());

    // Folders & Upload state
    const [foldersMap, setFoldersMap] = useState({}); // { name: id }
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
    const [driveFileId, setDriveFileId] = useState('');

    // Tabs & History state
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history'
    const [historyFiles, setHistoryFiles] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Multi-level History state
    const [historyLevel, setHistoryLevel] = useState(0); // 0: Date Folders list, 1: Tool Folders list, 2: Files list
    const [selectedDateFolder, setSelectedDateFolder] = useState(null); // { id, name }
    const [selectedToolFolder, setSelectedToolFolder] = useState(null); // { id, name }
    const [dateFolders, setDateFolders] = useState([]); // List of date folders in LMS folder
    const [allDriveFiles, setAllDriveFiles] = useState([]);
    const [driveItemMap, setDriveItemMap] = useState({});

    // Preview state
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Load GSI SDK
    useEffect(() => {
        const id = 'google-gsi-client';
        if (!document.getElementById(id)) {
            const script = document.createElement('script');
            script.id = id;
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, []);

    // Set initial step and check token
    useEffect(() => {
        if (isOpen) {
            // Reset states
            setUploadProgress(0);
            setUploadState('idle');
            setDriveFileId('');
            setPreviewFile(null);
            setPreviewUrl('');
            setPreviewText('');
            
            // Reset multi-level history states
            setHistoryLevel(0);
            setSelectedDateFolder(null);
            setSelectedToolFolder(null);
            setDateFolders([]);

            const savedToken = localStorage.getItem('lms_google_access_token');
            const savedUserStr = localStorage.getItem('lms_google_user');

            if (savedToken && savedUserStr) {
                try {
                    const savedUser = JSON.parse(savedUserStr);
                    setAccessToken(savedToken);
                    setGoogleUser(savedUser);
                    setSelectedAccount(savedUser.email);
                    setStep(2);
                    setActiveTab(fileBlob ? 'upload' : 'history');
                    
                    if (fileBlob) {
                        autoSaveFlow(savedToken);
                    } else {
                        setCurrentDriveFolder({ id: 'root', name: 'Google Drive' });
                        setDriveNavStack([{ id: 'root', name: 'Google Drive' }]);
                        loadDriveFolder('root', savedToken);
                    }
                } catch (e) {
                    console.error("Error parsing saved Google user info:", e);
                    clearGoogleAuth();
                }
            } else {
                setStep(1);
                setSelectedAccount('');
                setAccessToken('');
                setGoogleUser(null);
            }
        }
    }, [isOpen, fileBlob, accessToken]);

    // Clean up preview URLs
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const clearGoogleAuth = () => {
        localStorage.removeItem('lms_google_access_token');
        localStorage.removeItem('lms_google_user');
        setAccessToken('');
        setGoogleUser(null);
        setSelectedAccount('');
        setFoldersMap({});
        setHistoryLevel(0);
        setSelectedDateFolder(null);
        setSelectedToolFolder(null);
        setDateFolders([]);
        setAllDriveFiles([]);
        setDriveItemMap({});
        setStep(1);
    };

    const handleGoogleSignIn = (forceSelect = false) => {
        if (!window.google) {
            toast.error("Google Client SDK is still loading. Please try again.");
            return;
        }

        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: '1091703484552-ogtcuj2470cnoh22bvke65ul96a0n5hc.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        const token = tokenResponse.access_token;
                        setAccessToken(token);
                        localStorage.setItem('lms_google_access_token', token);
                        
                        try {
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                            const data = await res.json();
                            
                            const googleUserData = {
                                name: data.name,
                                email: data.email,
                                picture: data.picture
                            };
                            setGoogleUser(googleUserData);
                            localStorage.setItem('lms_google_user', JSON.stringify(googleUserData));
                            setSelectedAccount(data.email);
                            setStep(2);
                            setActiveTab(fileBlob ? 'upload' : 'history');
                            
                            if (fileBlob) {
                                autoSaveFlow(token);
                            } else {
                                setCurrentDriveFolder({ id: 'root', name: 'Google Drive' });
                                setDriveNavStack([{ id: 'root', name: 'Google Drive' }]);
                                loadDriveFolder('root', token);
                            }
                        } catch (err) {
                            console.error("Failed to fetch Google profile info:", err);
                            const fallbackUser = {
                                name: user?.name || 'Google User',
                                email: user?.email || 'student.lms@gmail.com',
                                picture: ''
                            };
                            setGoogleUser(fallbackUser);
                            localStorage.setItem('lms_google_user', JSON.stringify(fallbackUser));
                            setSelectedAccount(fallbackUser.email);
                            setStep(2);
                            setActiveTab(fileBlob ? 'upload' : 'history');
                            
                            if (fileBlob) {
                                autoSaveFlow(token);
                            } else {
                                setCurrentDriveFolder({ id: 'root', name: 'Google Drive' });
                                setDriveNavStack([{ id: 'root', name: 'Google Drive' }]);
                                loadDriveFolder('root', token);
                            }
                        }
                    }
                },
            });
            
            client.requestAccessToken(forceSelect ? { prompt: 'select_account' } : undefined);
        } catch (err) {
            console.error("GSI token client initialization failed:", err);
            toast.error("Failed to initialize Google Authentication.");
        }
    };

    // Reorganize Google Drive structure and get/create directories (LMS -> date -> tool)
    const getOrCreateLmsStructure = async (token, targetFolderName = null) => {
        // 1. Check or create LMS folder in root
        let lmsFolderId = '';
        const lmsQuery = encodeURIComponent("name = 'LMS' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false");
        const lmsRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${lmsQuery}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!lmsRes.ok) throw new Error(`LMS folder query error: ${lmsRes.status}`);
        const lmsData = await lmsRes.json();
        if (lmsData.files && lmsData.files.length > 0) {
            lmsFolderId = lmsData.files[0].id;
        } else {
            const createLms = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'LMS',
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['root']
                })
            });
            if (!createLms.ok) throw new Error(`LMS folder creation error: ${createLms.status}`);
            const newLms = await createLms.json();
            lmsFolderId = newLms.id;
        }

        // 2. Check or create date folder (DD-MM-YYYY) inside LMS folder
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const todayStr = `${dd}-${mm}-${yyyy}`;

        let dateFolderId = '';
        const dateQuery = encodeURIComponent(`name = '${todayStr}' and mimeType = 'application/vnd.google-apps.folder' and '${lmsFolderId}' in parents and trashed = false`);
        const dateRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${dateQuery}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!dateRes.ok) throw new Error(`Date folder query error: ${dateRes.status}`);
        const dateData = await dateRes.json();
        if (dateData.files && dateData.files.length > 0) {
            dateFolderId = dateData.files[0].id;
        } else {
            const createDate = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: todayStr,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [lmsFolderId]
                })
            });
            if (!createDate.ok) throw new Error(`Date folder creation error: ${createDate.status}`);
            const newDate = await createDate.json();
            dateFolderId = newDate.id;
        }

        // 3. Check or create the target tool folder inside dateFolderId
        const toolQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and '${dateFolderId}' in parents and trashed = false`);
        const toolRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${toolQuery}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!toolRes.ok) throw new Error(`Tool folders query error: ${toolRes.status}`);
        const toolData = await toolRes.json();
        const existingTools = toolData.files || [];
        const tempMap = {};
        existingTools.forEach(f => {
            if (TARGET_FOLDERS.includes(f.name)) {
                tempMap[f.name] = f.id;
            }
        });

        if (targetFolderName && TARGET_FOLDERS.includes(targetFolderName)) {
            if (!tempMap[targetFolderName]) {
                const createTool = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: targetFolderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [dateFolderId]
                    })
                });
                if (!createTool.ok) throw new Error(`Tool folder creation error [${targetFolderName}]: ${createTool.status}`);
                const newTool = await createTool.json();
                tempMap[targetFolderName] = newTool.id;
            }
        }

        return { lmsFolderId, dateFolderId, foldersMap: tempMap };
    };

    const detectDefaultFolder = (name) => {
        if (toolName) return toolName;
        if (!name) return "Screenshot Tool";
        const lower = name.toLowerCase();
        if (lower.includes('screenshot') || lower.includes('.png') || lower.includes('.jpg')) {
            return "Screenshot Tool";
        } else if (lower.includes('screen_recording') || (lower.includes('screen') && lower.includes('rec'))) {
            return "Screen Recorder";
        } else if (lower.includes('video_recording') || lower.includes('video') || lower.includes('.webm') || lower.includes('.mp4')) {
            return "Video Recorder";
        } else if (lower.includes('voice_recording') || lower.includes('voice') || lower.includes('audio') || lower.includes('.wav') || lower.includes('.mp3')) {
            return "Voice Recorder";
        } else if (lower.includes('call_log') || lower.includes('call') || lower.includes('.txt')) {
            return "Web-Calling Tool";
        } else if (lower.includes('file_uploader') || lower.includes('upload')) {
            return "File Uploader";
        }
        return "Screenshot Tool";
    };

    // Auto save flow (creates dirs, checks files count for f1/f2/f3 index, and uploads)
    const autoSaveFlow = async (token) => {
        setUploadState('uploading');
        setUploadProgress(5);
        try {
            // 1. Detect default tool folder based on type first
            const defaultFolder = detectDefaultFolder(fileName);

            // 2. Reorganize directory structure and get today's folders, creating only defaultFolder
            const { foldersMap: tempMap } = await getOrCreateLmsStructure(token, defaultFolder);
            setFoldersMap(tempMap);
            setUploadProgress(20);

            // 3. Select default tool folder ID
            const targetFolderId = tempMap[defaultFolder];
            if (!targetFolderId) {
                throw new Error(`Failed to map target folder for ${defaultFolder}`);
            }

            // 3. Count existing files in folder to calculate next sequential index (f1, f2...)
            const filesQuery = encodeURIComponent(`'${targetFolderId}' in parents and trashed = false`);
            const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id,name)`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!filesRes.ok) throw new Error(`Files listing error: ${filesRes.status}`);
            const filesData = await filesRes.json();
            const existingFiles = filesData.files || [];
            
            const nextIndex = existingFiles.length + 1;
            const extension = fileName ? fileName.split('.').pop() : (fileBlob.type?.split('/')?.[1] || 'png');
            const finalName = `f${nextIndex}_${defaultFolder}.${extension}`;

            setUploadProgress(40);

            // 4. Perform upload
            await performUpload(token, targetFolderId, finalName);
        } catch (err) {
            console.error("Auto save flow error:", err);
            // Check if token expired (401/403)
            if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('unauthorized'))) {
                clearGoogleAuth();
                return;
            }
            setUploadState('error');
            toast.error(err.message || "Failed to auto-save to Google Drive");
        }
    };

    const performUpload = (token, folderId, finalName) => {
        return new Promise((resolve, reject) => {
            let toolType = 'screenshot';
            if (toolName === "Video Recorder") {
                toolType = 'video-recorder';
            } else if (toolName === "Voice Recorder") {
                toolType = 'voice-recorder';
            } else if (toolName === "Screen Recorder") {
                toolType = 'screen-recorder';
            } else if (toolName === "Web-Calling Tool") {
                toolType = 'web-calling';
            } else if (toolName === "File Uploader") {
                toolType = 'file-uploader';
            } else {
                const nameLower = finalName ? finalName.toLowerCase() : '';
                if (nameLower.includes('video_recording') || nameLower.includes('video')) {
                    toolType = 'video-recorder';
                } else if (nameLower.includes('voice_recording') || nameLower.includes('voice') || nameLower.includes('audio')) {
                    toolType = 'voice-recorder';
                } else if (nameLower.includes('screen_recording') || nameLower.includes('screen')) {
                    toolType = 'screen-recorder';
                } else if (nameLower.includes('call_log')) {
                    toolType = 'web-calling';
                } else if (nameLower.includes('file_uploader') || nameLower.includes('upload')) {
                    toolType = 'file-uploader';
                }
            }

            const metadata = {
                name: finalName,
                mimeType: fileBlob.type,
                parents: [folderId]
            };

            const boundary = 'lms_google_drive_upload_boundary';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const reader = new FileReader();
            reader.readAsArrayBuffer(fileBlob);
            reader.onload = function (e) {
                const fileBytes = new Uint8Array(e.target.result);
                const encoder = new TextEncoder();
                
                const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
                const mediaPartHeader = `Content-Type: ${fileBlob.type}\r\n\r\n`;
                
                const part1 = encoder.encode(delimiter + metadataPart + delimiter + mediaPartHeader);
                const part2 = fileBytes;
                const part3 = encoder.encode(closeDelimiter);
                
                const bodyBlob = new Blob([part1, part2, part3], { type: `multipart/related; boundary=${boundary}` });
                
                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const pct = Math.round((event.loaded * 100) / event.total);
                        setUploadProgress(Math.round(40 + pct * 0.6)); // Scale from 40% to 100%
                    }
                };
                
                xhr.onload = async () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const driveData = JSON.parse(xhr.responseText);
                            setDriveFileId(driveData.id);

                            // Sync local database record
                            const formData = new FormData();
                            formData.append('file', fileBlob, finalName);
                            formData.append('toolType', toolType);
                            formData.append('resolution', '1080p');
                            formData.append('format', finalName.toLowerCase().endsWith('.jpg') ? 'JPG' : (finalName.toLowerCase().endsWith('.txt') ? 'TXT' : (finalName.toLowerCase().endsWith('.webm') ? 'WEBM' : 'PNG')));
                            formData.append('googleDriveEmail', selectedAccount);

                            await axios.post('/api/practice-files/upload', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });

                            setUploadProgress(100);
                            setUploadState('success');
                            if (onSaveSuccess) onSaveSuccess(driveData);
                            resolve(driveData);
                        } catch (err) {
                            console.error("LMS server local registration failed:", err);
                            // Still mark as success since Google Drive upload succeeded
                            setUploadProgress(100);
                            setUploadState('success');
                            if (onSaveSuccess) onSaveSuccess({ id: driveData.id });
                            resolve({ id: driveData.id });
                        }
                    } else {
                        console.error("Google Drive upload API failed:", xhr.status, xhr.responseText);
                        setUploadState('error');
                        reject(new Error(`Drive Upload Error (${xhr.status})`));
                    }
                };
                
                xhr.onerror = () => {
                    setUploadState('error');
                    reject(new Error("Network error during Drive upload."));
                };
                
                xhr.send(bodyBlob);
            };
            
            reader.onerror = () => {
                setUploadState('error');
                reject(new Error("Failed to read file buffer."));
            };
        });
    };

    // Load General Drive Folder contents
    const loadDriveFolder = async (folderId, tokenVal = accessToken) => {
        setLoadingDriveFiles(true);
        setDriveFiles([]);
        try {
            const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
            const fields = encodeURIComponent("files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime)");
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`, {
                headers: { Authorization: `Bearer ${tokenVal || accessToken}` }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    clearGoogleAuth();
                    return; // silently reset to step 1
                }
                throw new Error(`Google Drive API returned status ${res.status}`);
            }
            const data = await res.json();
            
            // Sort: folders first, then files alphabetically
            const sortedItems = (data.files || []).sort((a, b) => {
                const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
                const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';
                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            });
            setDriveFiles(sortedItems);
        } catch (err) {
            console.error("Failed to load Google Drive folder:", err);
            toast.error(err.message || "Failed to load files from Google Drive.");
        } finally {
            setLoadingDriveFiles(false);
        }
    };

    const handleDriveFolderClick = (folder) => {
        const newStack = [...driveNavStack, { id: folder.id, name: folder.name }];
        setDriveNavStack(newStack);
        setCurrentDriveFolder({ id: folder.id, name: folder.name });
        loadDriveFolder(folder.id);
    };

    const handleDriveBreadcrumbClick = (folder, index) => {
        const newStack = driveNavStack.slice(0, index + 1);
        setDriveNavStack(newStack);
        setCurrentDriveFolder(folder);
        loadDriveFolder(folder.id);
    };

    const handleImportToLMS = async (file) => {
        setImportingFileId(file.id);
        const toastId = toast.loading(`Importing "${file.name}" to LMS Drive...`);
        try {
            // 1. Fetch file data as blob from Google Drive
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!res.ok) {
                throw new Error(`Failed to download from Google Drive (HTTP ${res.status})`);
            }
            const blob = await res.blob();

            // 2. Upload file data to LMS Drive using FormData
            const formData = new FormData();
            formData.append('file', blob, file.name);
            if (currentParentId) {
                formData.append('parentId', currentParentId);
            }

            await axios.post('/api/drive/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success(`"${file.name}" imported to LMS Drive!`, { id: toastId });
            setImportedFileIds(prev => new Set([...prev, file.id]));
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (err) {
            console.error("Failed to import file to LMS Drive:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to import file.", { id: toastId });
        } finally {
            setImportingFileId('');
        }
    };

    // Load History Root (Level 0: Dates)
    const loadHistoryRoot = async (token) => {
        setLoadingHistory(true);
        setHistoryLevel(0);
        setSelectedDateFolder(null);
        setSelectedToolFolder(null);
        setDateFolders([]);
        setAllDriveFiles([]);
        setDriveItemMap({});
        try {
            // Fetch all non-deleted files and folders in drive.file scope in a single query
            const query = encodeURIComponent("trashed = false");
            const fields = encodeURIComponent("files(id, name, mimeType, parents, size, webViewLink, thumbnailLink, createdTime)");
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                let errorMsg = `Google Drive fetch error: ${res.status}`;
                try {
                    const errBody = await res.json();
                    if (errBody?.error?.message) {
                        errorMsg = `Google Drive: ${errBody.error.message}`;
                    }
                } catch (e) {}
                throw new Error(errorMsg);
            }
            const data = await res.json();
            const allItems = data.files || [];

            // Find root LMS folder
            const lmsFolder = allItems.find(f => f.name === 'LMS' && f.mimeType === 'application/vnd.google-apps.folder');
            if (!lmsFolder) {
                setDateFolders([]);
                return;
            }
            const lmsFolderId = lmsFolder.id;

            // Map all items by ID for quick parent lookup
            const itemMap = {};
            allItems.forEach(item => {
                itemMap[item.id] = item;
            });

            // Filter and find valid practice files under target folder structures
            const validFiles = [];
            allItems.forEach(file => {
                if (file.mimeType === 'application/vnd.google-apps.folder') return;
                
                const parentId = file.parents?.[0];
                if (!parentId) return;
                
                const parentFolder = itemMap[parentId];
                if (!parentFolder || parentFolder.mimeType !== 'application/vnd.google-apps.folder') return;
                if (!TARGET_FOLDERS.includes(parentFolder.name)) return;
                
                const grandparentId = parentFolder.parents?.[0];
                if (!grandparentId) return;
                
                const grandparentFolder = itemMap[grandparentId];
                if (!grandparentFolder || grandparentFolder.mimeType !== 'application/vnd.google-apps.folder') return;
                
                // grandparentFolder is the Date Folder (e.g. DD-MM-YYYY)
                // Check if its parent is LMS
                if (grandparentFolder.parents?.[0] !== lmsFolderId) return;
                
                validFiles.push({
                    ...file,
                    toolName: parentFolder.name,
                    toolFolderId: parentId,
                    dateFolderName: grandparentFolder.name,
                    dateFolderId: grandparentId
                });
            });

            // Extract non-empty date folders
            const datesMap = {};
            validFiles.forEach(f => {
                datesMap[f.dateFolderId] = f.dateFolderName;
            });

            // Sort date folders by parsed date descending (newest first)
            const sortedDateIds = Object.keys(datesMap).sort((a, b) => {
                const nameA = datesMap[a];
                const nameB = datesMap[b];
                const partsA = nameA.split('-');
                const partsB = nameB.split('-');
                const timeA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime();
                const timeB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
                return timeB - timeA;
            });

            const dateFoldersList = sortedDateIds.map(id => ({
                id: id,
                name: datesMap[id]
            }));

            setAllDriveFiles(validFiles);
            setDriveItemMap(itemMap);
            setDateFolders(dateFoldersList);
        } catch (err) {
            console.error("Failed to load history root:", err);
            // Check if token expired (401/403)
            if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('unauthorized'))) {
                clearGoogleAuth();
                return;
            }
            toast.error(`History Load Error: ${err.message}`);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Open Date Folder (Level 1: Tool Folders)
    const handleOpenDateFolder = async (dateFolder) => {
        setSelectedDateFolder(dateFolder);
        setHistoryLevel(1);
        setSelectedToolFolder(null);

        // Find all files on this date from local cache
        const filesForDate = allDriveFiles.filter(f => f.dateFolderId === dateFolder.id);
        const tempMap = {};
        filesForDate.forEach(f => {
            tempMap[f.toolName] = f.toolFolderId;
        });
        setFoldersMap(tempMap);
    };

    // Open Tool Folder (Level 2: Files list)
    const handleOpenToolFolder = async (folderName, folderId) => {
        setSelectedToolFolder({ id: folderId, name: folderName });
        setHistoryLevel(2);
        setHistoryFiles([]);

        // Filter files for this date and tool type from local cache
        const filtered = allDriveFiles.filter(f => 
            f.dateFolderId === selectedDateFolder.id && 
            f.toolName === folderName
        );

        // Sort files numerically by index f1, f2, f3...
        const sortedFiles = filtered.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        setHistoryFiles(sortedFiles);
    };

    // Fetch and Preview File content directly inside the popup using alt=media
    const handlePreviewFile = async (file) => {
        setPreviewFile(file);
        setLoadingPreview(true);
        setPreviewText('');
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl('');
        }

        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP error ${res.status}: ${errText}`);
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            setPreviewUrl(objectUrl);

            // Read as text if file is text/log
            if (file.mimeType.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.log')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreviewText(e.target.result);
                };
                reader.readAsText(blob);
            }
        } catch (err) {
            console.error("Failed to preview Google Drive file content:", err);
            // Check if token expired (401/403)
            if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('unauthorized'))) {
                clearGoogleAuth();
                return;
            }
            toast.error(`Failed to load file preview: ${err.message}`);
            setPreviewFile(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    // Delete file from Google Drive
    const handleDeleteFile = async (fileId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this file from Google Drive?");
        if (!confirmDelete) return;

        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP error ${res.status}: ${errText}`);
            }
            
            toast.success("File deleted from Google Drive!");

            // Update local state to remove the deleted file
            const updatedFiles = allDriveFiles.filter(f => f.id !== fileId);
            setAllDriveFiles(updatedFiles);

            // Re-render based on current history level
            if (selectedToolFolder) {
                const remainingInTool = updatedFiles.filter(f => 
                    f.dateFolderId === selectedDateFolder.id && 
                    f.toolName === selectedToolFolder.name
                );

                if (remainingInTool.length === 0) {
                    // Check if date folder has any files at all
                    const remainingInDate = updatedFiles.filter(f => f.dateFolderId === selectedDateFolder.id);
                    if (remainingInDate.length === 0) {
                        // Go back to Level 0 (Dates list) and update dateFolders
                        const datesMap = {};
                        updatedFiles.forEach(f => {
                            datesMap[f.dateFolderId] = f.dateFolderName;
                        });
                        const sortedDateIds = Object.keys(datesMap).sort((a, b) => {
                            const nameA = datesMap[a];
                            const nameB = datesMap[b];
                            const partsA = nameA.split('-');
                            const partsB = nameB.split('-');
                            const timeA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime();
                            const timeB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
                            return timeB - timeA;
                        });
                        const dateFoldersList = sortedDateIds.map(id => ({
                            id: id,
                            name: datesMap[id]
                        }));
                        setDateFolders(dateFoldersList);
                        setHistoryLevel(0);
                        setSelectedDateFolder(null);
                        setSelectedToolFolder(null);
                    } else {
                        // Go back to Level 1 (Tools list)
                        const tempMap = {};
                        remainingInDate.forEach(f => {
                            tempMap[f.toolName] = f.toolFolderId;
                        });
                        setFoldersMap(tempMap);
                        setHistoryLevel(1);
                        setSelectedToolFolder(null);
                    }
                } else {
                    // Refresh level 2 files list
                    const sortedFiles = remainingInTool.sort((a, b) => {
                        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    setHistoryFiles(sortedFiles);
                }
            }
        } catch (err) {
            console.error("Delete file from Drive failed:", err);
            // Check if token expired (401/403)
            if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('unauthorized'))) {
                clearGoogleAuth();
                return;
            }
            toast.error(`Failed to delete file: ${err.message}`);
        }
    };

    if (!isOpen && !inline) return null;
    if (inline && !isOpen) return null;

    const outerClass = inline
        ? "bg-[#f5f5f5] rounded-3xl shadow-sm border border-slate-100 w-full overflow-hidden relative transition-all duration-300 flex flex-col text-left font-sans"
        : "fixed inset-0 z-[9999] flex items-center justify-center bg-[whitesmoke]/80 backdrop-blur-sm p-4 text-left font-sans";
    const innerClass = inline
        ? ""
        : "bg-[#f5f5f5] rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden relative transition-all duration-300 flex flex-col max-h-[85vh]";

    const content = (
        <div className={inline ? outerClass : innerClass}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                            <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                            <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                        </svg>
                        <div>
                            <span className="font-extrabold text-slate-800 text-sm tracking-tight block">Google Drive Storage</span>
                            {googleUser && (
                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                    Connected: {googleUser.email}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button 
                                onClick={clearGoogleAuth} 
                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-655 rounded-xl transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider border border-transparent hover:border-red-200"
                                title="Disconnect Google Drive"
                            >
                                <LogOut size={13} />
                                <span className="hidden sm:inline">Disconnect</span>
                            </button>
                        )}
                        {!inline && (
                            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs Selector (Shown only when logged in and we have a staged file) */}
                {step === 2 && fileBlob && uploadState !== 'uploading' && uploadState !== 'success' && (
                    <div className="flex bg-slate-50 border-b border-slate-100 p-1.5 shrink-0 gap-1.5">
                        <button
                            onClick={() => {
                                setActiveTab('upload');
                                setPreviewFile(null);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 ${
                                activeTab === 'upload'
                                    ? 'bg-[#3E3ADD] text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <FolderOpen size={14} />
                            Save File
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('history');
                                setPreviewFile(null);
                                loadHistoryRoot(accessToken);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 ${
                                activeTab === 'history'
                                    ? 'bg-[#3E3ADD] text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <RefreshCw size={14} />
                            Drive History
                        </button>
                    </div>
                )}

                {/* Scrollable Main Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    
                    {/* STEP 1: Connect Account */}
                    {step === 1 && (
                        <div className="space-y-6 py-6 text-center max-w-sm mx-auto animate-fade-in">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 leading-tight">Sign in with Google</h3>
                                <p className="text-xs text-slate-500 font-medium">Connect Google Drive to save and browse your practice history folders.</p>
                            </div>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleGoogleSignIn(false)}
                                    className="w-full flex items-center justify-between p-4 border border-slate-200 hover:border-[#3E3ADD] hover:bg-[#3E3ADD]/5 rounded-2xl transition-all text-left shadow-sm cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                            {user?.name?.[0].toUpperCase() || 'G'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{user?.name || 'Google Account'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{user?.email || 'Click to link'}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-450" />
                                </button>
                                
                                <button
                                    onClick={() => handleGoogleSignIn(true)}
                                    className="w-full flex items-center gap-3 p-4 border border-dashed border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-2xl transition-all text-left cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center font-bold text-base">
                                        +
                                    </div>
                                    <span className="text-xs font-bold text-slate-655">Use another device/account</span>
                                </button>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-100 pt-4 text-left">
                                LMS Portal requires access to upload files to your Google Drive (`drive.file` scope) and view user info. Google will share your profile parameters.
                            </p>
                        </div>
                    )}

                    {/* STEP 2: Dashboard Content */}
                    {step === 2 && (
                        <div className="h-full">
                            
                            {/* TAB: UPLOAD FILE */}
                            {activeTab === 'upload' && (
                                <div className="space-y-6 animate-fade-in">
                                    {(uploadState === 'idle' || uploadState === 'uploading') && (
                                        <div className="space-y-6 py-8 text-center animate-fade-in">
                                            <div className="w-16 h-16 border-4 border-indigo-50 border-t-[#3E3ADD] rounded-full animate-spin mx-auto"></div>
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                                    {uploadState === 'idle' ? 'Coordinating Google Drive Folders...' : 'Uploading practice file...'}
                                                </h3>
                                                <p className="text-xs text-slate-500 truncate max-w-sm mx-auto font-medium">Filename: {fileName}</p>
                                            </div>
                                            {uploadState === 'uploading' && (
                                                <>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 max-w-sm mx-auto">
                                                        <div className="bg-[#3E3ADD] h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-black text-indigo-700 block">{uploadProgress}% Uploaded</span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Success upload view */}
                                    {uploadState === 'success' && (
                                        <div className="space-y-6 text-center py-6 animate-fade-in max-w-md mx-auto">
                                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
                                                <CheckCircle2 size={36} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-black text-slate-900 leading-tight">Uploaded Successfully!</h3>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">Your practice file has been uploaded into your selected Google Drive folder.</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-left space-y-2">
                                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    <span>Target File Detail</span>
                                                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">ACTIVE</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">Uploaded in: <b>{detectDefaultFolder(fileName)}</b></p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => window.open(`https://drive.google.com/file/d/${driveFileId}/view`, '_blank')}
                                                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                                >
                                                    <Eye size={14} /> Open in Drive
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error upload view */}
                                    {uploadState === 'error' && (
                                        <div className="space-y-6 text-center py-6 animate-fade-in max-w-md mx-auto">
                                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-md">
                                                <AlertCircle size={36} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-black text-slate-900 leading-tight">Upload Failed</h3>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">Something went wrong during folder mapping or data transfer to Google Drive.</p>
                                            </div>
                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={() => autoSaveFlow(accessToken)}
                                                    className="flex-1 py-3 bg-[#3E3ADD] hover:bg-indigo-650 text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer shadow-md"
                                                >
                                                    Retry Upload
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: BROWSE DRIVE HISTORY */}
                            {activeTab === 'history' && fileBlob && (
                                <div className="h-full animate-fade-in flex flex-col">
                                    
                                    {/* Level 0: Date Folders List */}
                                    {historyLevel === 0 && !previewFile && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Drive History (Dates)</h3>
                                                <button 
                                                    onClick={() => loadHistoryRoot(accessToken)}
                                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                                                    title="Refresh Dates"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>

                                            {loadingHistory ? (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-3 text-slate-400">
                                                    <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Loading Dates...</span>
                                                </div>
                                            ) : dateFolders.length === 0 ? (
                                                <div className="text-center py-12 text-slate-400">
                                                    <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                                    <p className="text-xs italic font-medium">No history found.</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Upload practice files to see history by day</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                                                    {dateFolders.map((dateFolder) => (
                                                        <button
                                                            key={dateFolder.id}
                                                            onClick={() => handleOpenDateFolder(dateFolder)}
                                                            className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300 text-left flex items-center justify-between group transition-all cursor-pointer outline-none"
                                                        >
                                                            <div className="flex items-center gap-3.5 min-w-0">
                                                                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 group-hover:scale-105 transition-transform">
                                                                    <FolderOpen size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{dateFolder.name}</h4>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Day Folder</p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Level 1: Tool Folders inside selectedDateFolder */}
                                    {historyLevel === 1 && !previewFile && selectedDateFolder && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <button
                                                    onClick={() => {
                                                        setHistoryLevel(0);
                                                        setSelectedDateFolder(null);
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-black text-slate-505 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                                >
                                                    <ArrowLeft size={14} />
                                                    Back to Dates
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">LMS / {selectedDateFolder.name}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mt-2">
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Practice Tools</h3>
                                                {loadingHistory && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                                            </div>

                                            {TARGET_FOLDERS.filter(folderName => !!foldersMap[folderName]).length === 0 ? (
                                                <div className="text-center py-12 text-slate-400 col-span-2">
                                                    <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                                    <p className="text-xs italic font-medium">No uploads found for this date.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                    {TARGET_FOLDERS.filter(folderName => !!foldersMap[folderName]).map((folderName) => {
                                                        const folderId = foldersMap[folderName];
                                                        const IconComponent = FOLDER_ICONS[folderName] || Folder;
                                                        const folderStyle = FOLDER_COLORS[folderName] || "bg-slate-50 border-slate-155 text-slate-700";

                                                        return (
                                                            <button
                                                                key={folderName}
                                                                onClick={() => handleOpenToolFolder(folderName, folderId)}
                                                                className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-left flex items-center justify-between group transition-all outline-none"
                                                            >
                                                                <div className="flex items-center gap-3.5 min-w-0">
                                                                    <div className={`p-3 rounded-xl ${folderStyle} group-hover:scale-105 transition-transform`}>
                                                                        <IconComponent size={18} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{folderName}</h4>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                            View files
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Level 2: Files listing inside selectedToolFolder */}
                                    {historyLevel === 2 && !previewFile && selectedToolFolder && selectedDateFolder && (
                                        <div className="space-y-4 flex flex-col h-full">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <button
                                                    onClick={() => handleOpenDateFolder(selectedDateFolder)}
                                                    className="flex items-center gap-1.5 text-xs font-black text-slate-550 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                                >
                                                    <ArrowLeft size={14} />
                                                    Back to Tools
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">{selectedDateFolder.name}</span>
                                                    <span className="text-slate-300">/</span>
                                                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">{selectedToolFolder.name}</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-h-[220px]">
                                                {loadingHistory ? (
                                                    <div className="flex flex-col items-center justify-center py-10 space-y-3 text-slate-400">
                                                        <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Loading Files from Drive...</span>
                                                    </div>
                                                ) : historyFiles.length === 0 ? (
                                                    <div className="text-center py-12 text-slate-400">
                                                        <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                                        <p className="text-xs italic font-medium">This folder is empty.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                                        {historyFiles.map(file => {
                                                            const isImage = file.mimeType.startsWith('image/');
                                                            return (
                                                                <div 
                                                                    key={file.id} 
                                                                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl hover:border-slate-300 transition-colors gap-3"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        {isImage && file.thumbnailLink ? (
                                                                            <img
                                                                                src={file.thumbnailLink}
                                                                                alt="thumbnail"
                                                                                className="w-12 h-9 object-cover rounded-lg border border-slate-200 bg-white"
                                                                                referrerPolicy="no-referrer"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-12 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-505 shrink-0">
                                                                                <FileText size={16} />
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="min-w-0 flex-1">
                                                                            <h5 className="text-[11px] font-black text-slate-700 truncate leading-tight">{file.name}</h5>
                                                                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                                {file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Unknown Size'} • {new Date(file.createdTime).toLocaleDateString()}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button
                                                                            onClick={() => handlePreviewFile(file)}
                                                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-550 hover:text-slate-800"
                                                                            title="Preview File"
                                                                        >
                                                                            <Eye size={13} />
                                                                        </button>
                                                                        <a
                                                                            href={file.webViewLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-555 hover:text-slate-800"
                                                                            title="Open in Drive Web"
                                                                        >
                                                                            <Download size={13} />
                                                                        </a>
                                                                        <button
                                                                            onClick={() => handleDeleteFile(file.id)}
                                                                            className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                                                            title="Delete File"
                                                                        >
                                                                            <Trash size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-View: Direct Media Preview */}
                                    {previewFile && (
                                        <div className="space-y-4 animate-fade-in flex flex-col">
                                            {/* Preview header navigation */}
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <button
                                                    onClick={() => {
                                                        setPreviewFile(null);
                                                        setPreviewUrl('');
                                                        setPreviewText('');
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-black text-slate-505 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                                >
                                                    <ArrowLeft size={14} />
                                                    Back to List
                                                </button>
                                                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">
                                                    File Preview
                                                </span>
                                            </div>

                                            <div className="text-center py-2">
                                                <h4 className="text-xs font-black text-slate-800 truncate mb-1">{previewFile.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                    Type: {previewFile.mimeType} • Size: {previewFile.size ? `${(parseInt(previewFile.size) / 1024).toFixed(1)} KB` : 'N/A'}
                                                </p>
                                            </div>

                                            {/* Display container */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center min-h-[220px] max-h-[320px] overflow-hidden relative">
                                                {loadingPreview ? (
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Loading Preview...</span>
                                                    </div>
                                                ) : previewUrl ? (
                                                    <>
                                                        {previewFile.mimeType.startsWith('image/') && (
                                                            <img 
                                                                src={previewUrl} 
                                                                alt="preview" 
                                                                className="max-w-full max-h-[280px] object-contain rounded-xl shadow-sm"
                                                            />
                                                        )}
                                                        {previewFile.mimeType.startsWith('video/') && (
                                                            <video 
                                                                src={previewUrl} 
                                                                controls 
                                                                className="max-w-full max-h-[280px] rounded-xl shadow-sm"
                                                            />
                                                        )}
                                                        {previewFile.mimeType.startsWith('audio/') && (
                                                            <div className="w-full max-w-sm text-center space-y-4 py-8">
                                                                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-[#3E3ADD] mx-auto shadow-sm">
                                                                    <Mic size={20} />
                                                                </div>
                                                                <audio src={previewUrl} controls className="w-full" />
                                                            </div>
                                                        )}
                                                        {(previewFile.mimeType.startsWith('text/') || previewFile.name.endsWith('.txt') || previewFile.name.endsWith('.log')) && (
                                                            <pre className="w-full text-left font-mono text-[10px] bg-[#0b1329] text-slate-250 p-4 rounded-xl overflow-auto max-h-[280px] leading-relaxed shadow-inner">
                                                                {previewText || 'No text content available.'}
                                                            </pre>
                                                        )}
                                                        {!previewFile.mimeType.startsWith('image/') && 
                                                         !previewFile.mimeType.startsWith('video/') && 
                                                         !previewFile.mimeType.startsWith('audio/') && 
                                                         !previewFile.mimeType.startsWith('text/') && 
                                                         !previewFile.name.endsWith('.txt') && 
                                                         !previewFile.name.endsWith('.log') && (
                                                            <div className="text-center space-y-3 py-6">
                                                                <FileText size={40} className="mx-auto text-slate-350" />
                                                                <p className="text-xs font-bold text-slate-655 leading-relaxed">
                                                                    Direct preview is not supported for this file type.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-slate-400 text-xs italic font-medium">Failed to construct file preview URL.</div>
                                                )}
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => window.open(previewFile.webViewLink, '_blank')}
                                                    className="flex-1 py-3 bg-[#3E3ADD] hover:bg-indigo-655 text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                                >
                                                    <Eye size={13} /> View on Google Drive
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const fileId = previewFile.id;
                                                        setPreviewFile(null);
                                                        setPreviewUrl('');
                                                        setPreviewText('');
                                                        handleDeleteFile(fileId);
                                                    }}
                                                    className="py-3 px-4 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <Trash size={13} /> Delete File
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* GENERAL BROWSER (If fileBlob is NOT present) */}
                            {!fileBlob && (
                                <div className="h-full animate-fade-in flex flex-col">
                                    {/* Breadcrumbs / Path */}
                                    <div className="flex items-center gap-2 flex-wrap mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                                        {driveNavStack.map((folder, idx) => (
                                            <div key={folder.id} className="flex items-center gap-1.5">
                                                {idx > 0 && <span className="text-slate-350">/</span>}
                                                <button
                                                    onClick={() => handleDriveBreadcrumbClick(folder, idx)}
                                                    className="hover:text-[#3E3ADD] transition-colors cursor-pointer"
                                                >
                                                    {folder.name}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Preview pane inside the browser if a file is selected for preview */}
                                    {previewFile ? (
                                        <div className="space-y-4 border border-slate-150 p-4 rounded-2xl bg-slate-50 animate-fade-in">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#3E3ADD] flex items-center justify-center shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-slate-800 truncate">{previewFile.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                            {previewFile.size ? `${(parseInt(previewFile.size) / 1024).toFixed(1)} KB` : 'Unknown Size'} • {new Date(previewFile.createdTime).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setPreviewFile(null);
                                                        if (previewUrl) {
                                                            URL.revokeObjectURL(previewUrl);
                                                            setPreviewUrl('');
                                                        }
                                                        setPreviewText('');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            {loadingPreview ? (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                                                    <Loader2 size={20} className="animate-spin text-[#3E3ADD]" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Loading Preview...</span>
                                                </div>
                                            ) : (
                                                <div className="border border-slate-150 rounded-xl overflow-hidden bg-white max-h-[220px] overflow-y-auto p-3">
                                                    {previewText ? (
                                                        <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">{previewText}</pre>
                                                    ) : previewUrl && (previewFile.mimeType.startsWith('image/') || previewFile.name.endsWith('.png') || previewFile.name.endsWith('.jpg') || previewFile.name.endsWith('.jpeg')) ? (
                                                        <img src={previewUrl} alt="Preview" className="max-w-full h-auto mx-auto max-h-[200px] object-contain rounded" />
                                                    ) : previewUrl && (previewFile.mimeType.startsWith('video/') || previewFile.name.endsWith('.mp4')) ? (
                                                        <video src={previewUrl} controls className="max-w-full mx-auto max-h-[200px] rounded" />
                                                    ) : previewUrl && (previewFile.mimeType.startsWith('audio/') || previewFile.name.endsWith('.mp3') || previewFile.name.endsWith('.wav') || previewFile.name.endsWith('.ogg')) ? (
                                                        <audio src={previewUrl} controls className="w-full" />
                                                    ) : (
                                                        <div className="text-center py-6 text-slate-400">
                                                            <p className="text-[10px] font-semibold">Preview not supported for this file type.</p>
                                                            <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" className="text-[#3E3ADD] text-[10px] hover:underline font-bold mt-1 inline-block">Open in Google Drive Web</a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    disabled={importingFileId === previewFile.id}
                                                    onClick={() => handleImportToLMS(previewFile)}
                                                    className="px-4 py-2 bg-[#3E3ADD] hover:bg-[#322fba] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                >
                                                    {importingFileId === previewFile.id ? "Importing..." : "Import to LMS"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* General list of files and folders */
                                        <>
                                            {loadingDriveFiles ? (
                                                <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
                                                    <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Loading Files...</span>
                                                </div>
                                            ) : driveFiles.length === 0 ? (
                                                <div className="text-center py-16 text-slate-400">
                                                    <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                                    <p className="text-xs font-semibold">This folder is empty.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {driveFiles.map((item) => {
                                                        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                                                        return (
                                                            <div 
                                                                key={item.id} 
                                                                className={`p-3 border rounded-2xl flex items-center justify-between gap-4 transition-all ${
                                                                    isFolder 
                                                                        ? 'bg-slate-50 border-slate-100 hover:border-slate-250 hover:bg-slate-100/50 cursor-pointer' 
                                                                        : 'bg-white border-slate-100 hover:border-indigo-150'
                                                                }`}
                                                                onClick={() => {
                                                                    if (isFolder) handleDriveFolderClick(item);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="shrink-0">
                                                                        {isFolder ? (
                                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                                                <FolderOpen size={16} />
                                                                            </div>
                                                                        ) : item.thumbnailLink ? (
                                                                            <img src={item.thumbnailLink} alt="Thumb" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
                                                                                <FileText size={16} />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <h5 className="text-[11px] font-black text-slate-800 truncate leading-tight">{item.name}</h5>
                                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                            {isFolder ? 'Folder' : (item.size ? `${(parseInt(item.size) / 1024).toFixed(1)} KB` : 'File')} • {new Date(item.createdTime).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                {!isFolder && (
                                                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={() => handlePreviewFile(item)}
                                                                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                                                                            title="Preview File"
                                                                        >
                                                                            <Eye size={14} />
                                                                        </button>
                                                                        <a
                                                                            href={item.webViewLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                                                                            title="Open in Google Drive Web"
                                                                        >
                                                                            <Download size={14} />
                                                                        </a>
                                                                        {importedFileIds.has(item.id) ? (
                                                                            <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                                Imported
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                disabled={importingFileId === item.id}
                                                                                onClick={() => handleImportToLMS(item)}
                                                                                className="px-2.5 py-1.5 bg-[#3E3ADD] hover:bg-[#322fba] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                                                title="Import this file to LMS Drive"
                                                                            >
                                                                                {importingFileId === item.id ? "Importing..." : "Import"}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>
    );

    if (inline) return content;

    return createPortal(
        <div className={outerClass}>
            {content}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>,
        document.body
    );
};

export default GoogleDriveModal;
